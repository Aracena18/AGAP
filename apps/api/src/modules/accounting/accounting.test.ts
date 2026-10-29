import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { migrationDirectories } from '../../platform/migrate.js';
import { owner, runtimePool, uow, prepareDatabase, resetFixtures, closePools } from '../../../test/database.js';
import { AccountingService, lockPostingPeriod, type PostingRequest } from './accounting.service.js';

const service = new AccountingService();
let fixture: Awaited<ReturnType<typeof resetFixtures>>, actor: ActorContext, otherActor: ActorContext;
let cash: string, receivable: string, capital: string, otherCash: string, releaseRule: string, repaymentRule: string, period: string;
const day = '2026-10-29';
const seedId = () => randomUUID();
const request = (): PostingRequest => ({ sourceEventId: seedId(), postingKind: 'disbursement', postingRuleVersionId: releaseRule,
  effectiveDate: day, currency: 'PHP', reversalOfJournalId: null,
  lines: [{ accountId: receivable, side: 'debit', amountCentavos: 1_000_000 }, { accountId: cash, side: 'credit', amountCentavos: 1_000_000 }] });
const post = (data: PostingRequest) => uow.run(actor, tx => service.post(tx, data));
const count = async (table: string) => Number((await owner.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
const closing = async () => { await owner.query("UPDATE accounting.periods SET state='closing' WHERE id=$1", [period]); };
function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function waitForLock(pid: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await owner.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid]);
    if (result.rows[0]?.wait_event_type === 'Lock') return;
    await delay(10);
  }
  throw new Error('Expected the competing database operation to wait on a lock.');
}

beforeAll(async () => {
  // Exercise Robert's existing migrator; application registration remains his handoff.
  const directory = 'apps/api/src/modules/accounting/migrations';
  migrationDirectories.push(directory);
  try { await prepareDatabase(); } finally { migrationDirectories.splice(migrationDirectories.indexOf(directory), 1); }
  await owner.query(`CREATE TABLE IF NOT EXISTS accounting.test_caller_effects (
    id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), amount_centavos bigint NOT NULL);
    ALTER TABLE accounting.test_caller_effects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE accounting.test_caller_effects FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS caller_scope ON accounting.test_caller_effects;
    CREATE POLICY caller_scope ON accounting.test_caller_effects USING(organization_id=platform.current_organization()) WITH CHECK(organization_id=platform.current_organization());
    GRANT SELECT,INSERT ON accounting.test_caller_effects TO agap_runtime;`);
});
beforeEach(async () => {
  fixture = await resetFixtures();
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['accountant'] WHERE id=ANY($1::uuid[])", [[fixture.officer.actor.userId, fixture.other.actor.userId]]);
  actor = { ...fixture.officer.actor, roles: ['accountant'] }; otherActor = { ...fixture.other.actor, roles: ['accountant'] };
  cash = seedId(); receivable = seedId(); capital = seedId(); otherCash = seedId(); releaseRule = seedId(); repaymentRule = seedId(); period = seedId();
  await owner.query(`INSERT INTO accounting.accounts(id,organization_id,code,label,currency) VALUES
    ($1,$2,'cash','Fictional Cash','PHP'),($3,$2,'loan','Fictional Loans Receivable','PHP'),
    ($4,$2,'capital','Fictional Capital','PHP'),($5,$6,'cash','Other Fictional Cash','PHP')`, [cash, fixture.org, receivable, capital, otherCash, fixture.otherOrg]);
  await owner.query(`INSERT INTO accounting.posting_rules VALUES ($1,$2,'disbursement','PHP','2026-01-01','2026-12-31'),($3,$2,'repayment','PHP','2026-01-01','2026-12-31')`, [releaseRule, fixture.org, repaymentRule]);
  await owner.query(`INSERT INTO accounting.rule_accounts VALUES ($1,$2,$3,'debit'),($1,$2,$4,'credit'),($1,$5,$4,'debit'),($1,$5,$3,'credit')`, [fixture.org, releaseRule, receivable, cash, repaymentRule]);
  await owner.query("INSERT INTO accounting.periods VALUES($1,$2,'2026-10-01','2026-10-31','open'),($3,$2,'2026-11-01','2026-11-30','open')", [period, fixture.org, seedId()]);
});
afterAll(closePools);

describe('GL-01 PostgreSQL posting integrity', () => {
  it('posts independently expected principal disbursement and repayment entries', async () => {
    const receipt = await post(request());
    const lines = await owner.query('SELECT account_id,side,amount_centavos FROM accounting.journal_lines WHERE journal_id=$1 ORDER BY line_number', [receipt.journalId]);
    expect(lines.rows).toEqual([{ account_id: receivable, side: 'debit', amount_centavos: '1000000' }, { account_id: cash, side: 'credit', amount_centavos: '1000000' }]);
    const repayment = request(); repayment.postingKind = 'repayment'; repayment.postingRuleVersionId = repaymentRule;
    repayment.lines = [{ accountId: cash, side: 'debit', amountCentavos: 200_000 }, { accountId: receivable, side: 'credit', amountCentavos: 200_000 }];
    await post(repayment);
    const balances = await owner.query("SELECT account_id,sum(CASE side WHEN 'debit' THEN amount_centavos ELSE -amount_centavos END)::text AS net FROM accounting.journal_lines GROUP BY account_id ORDER BY net");
    expect(balances.rows).toEqual([{ account_id: cash, net: '-800000' }, { account_id: receivable, net: '800000' }]);
    expect(await count('platform.audit_events')).toBe(2); expect(await count('platform.outbox')).toBe(2);
  });
  it('replays concurrent identical financial events once, independently of transport keys', async () => {
    const data = request(); const results = await Promise.allSettled(Array.from({ length: 6 }, () => post(data)));
    expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    const receipts = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    expect(new Set(receipts.map(item => item.journalId)).size).toBe(1);
    expect(await count('accounting.journals')).toBe(1); expect(await count('accounting.journal_lines')).toBe(2);
    expect(await count('platform.audit_events')).toBe(1); expect(await count('platform.outbox')).toBe(1);
  });
  it('rejects changed details under a permanent source-event ID', async () => {
    const data = request(); await post(data); data.lines.forEach(line => { line.amountCentavos = 900_000; });
    await expect(post(data)).rejects.toMatchObject({ code: 'financial_event_conflict' });
    expect(await count('accounting.journals')).toBe(1);
  });
  it('deduplicates one event across different authorized staff identities', async () => {
    await owner.query("UPDATE identity.staff_users SET roles=ARRAY['cashier'] WHERE id=$1", [fixture.revocationTarget.actor.userId]);
    const cashier: ActorContext = { ...fixture.revocationTarget.actor, roles: ['cashier'] };
    const data = request(); const receipt = await post(data);
    expect(await uow.run(cashier, tx => service.post(tx, data))).toEqual(receipt);
    expect(await count('accounting.journals')).toBe(1); expect(await count('platform.audit_events')).toBe(1);
  });
  it('allows exactly one winner for concurrent conflicting event details', async () => {
    const data = request(); const changed = { ...data, lines: data.lines.map(line => ({ ...line, amountCentavos: 800_000 })) };
    const results = await Promise.allSettled([post(data), post(changed)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.flatMap(result => result.status === 'rejected' ? [result.reason.code] : [])).toEqual(['financial_event_conflict']);
    expect(await count('accounting.journals')).toBe(1);
  });
  it('replays an exact receipt after its period has closed', async () => {
    const data = request(); const receipt = await post(data); await closing();
    await owner.query("UPDATE accounting.periods SET state='closed' WHERE id=$1", [period]);
    expect(await post(data)).toEqual(receipt);
  });
  it.each(['wrong account', 'wrong organization', 'wrong rule', 'wrong direction', 'inactive account', 'ineffective rule'])('rejects %s', async kind => {
    const data = request();
    if (kind === 'wrong account') data.lines[0].accountId = seedId();
    if (kind === 'wrong organization') data.lines[0].accountId = otherCash;
    if (kind === 'wrong rule') data.postingRuleVersionId = seedId();
    if (kind === 'wrong direction') data.lines = [{ accountId: capital, side: 'debit', amountCentavos: 1_000_000 }, data.lines[1]];
    if (kind === 'inactive account') await owner.query('UPDATE accounting.accounts SET active=false WHERE id=$1', [cash]);
    if (kind === 'ineffective rule') await owner.query("UPDATE accounting.posting_rules SET effective_to='2026-10-28' WHERE id=$1", [releaseRule]);
    await expect(post(data)).rejects.toMatchObject({ code: 'invalid_posting' });
    expect(await count('accounting.journals')).toBe(0);
  });
  it('denies another organization even when its actor has an accounting role', async () => {
    await expect(uow.run(otherActor, tx => service.post(tx, request()))).rejects.toMatchObject({ code: 'period_not_open' });
    expect(await count('accounting.journals')).toBe(0);
  });
  it('denies auditor and administrator posting and rechecks revoked access on replay', async () => {
    for (const denied of [fixture.auditor.actor, fixture.administrator.actor]) {
      await expect(uow.run(denied, tx => service.post(tx, request()))).rejects.toMatchObject({ code: 'posting_forbidden' });
    }
    const data = request(); await post(data);
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1', [actor.userId]);
    await expect(post(data)).rejects.toMatchObject({ code: 'access_changed' });
  });
  it('isolates reads, denies member-context reads and prevents direct runtime journal writes', async () => {
    const receipt = await post(request());
    expect((await runtimePool.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0');
    expect(await uow.run(otherActor, async tx => (await tx.query('SELECT count(*) FROM accounting.journals')).rows[0].count)).toBe('0');
    await uow.run(actor, async tx => {
      await tx.query("SELECT set_config('agap.member_id',$1,true)", [seedId()]);
      expect((await tx.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0');
    });
    for (const sql of ["UPDATE accounting.journals SET currency='PHP'", 'DELETE FROM accounting.journal_lines', `INSERT INTO accounting.journal_lines VALUES('${fixture.org}','${receipt.journalId}',3,'${cash}','credit',1)`]) {
      await expect(uow.run(actor, tx => tx.query(sql))).rejects.toMatchObject({ code: '42501' });
    }
    await expect(owner.query('UPDATE accounting.journals SET source_event_id=$1 WHERE id=$2', [seedId(), receipt.journalId])).rejects.toMatchObject({ code: '23514' });
  });
  it('independently enforces balance in SQL, including direct function calls', async () => {
    const data = request(); data.lines[0].amountCentavos = 999_999;
    await expect(uow.run(actor, tx => tx.query('SELECT accounting.post_journal($1::jsonb,$2)', [JSON.stringify(data), actor.correlationId]))).rejects.toMatchObject({ code: 'AG422' });
    const client = await owner.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO accounting.journals(id,organization_id,source_event_id,posting_kind,posting_rule_version_id,effective_date,period_id,currency,request,posted_by)
        VALUES($1,$2,$3,'disbursement',$4,$5,$6,'PHP',$7,$8)`, [seedId(), fixture.org, seedId(), releaseRule, day, period, JSON.stringify(request()), actor.userId]);
      await expect(client.query('COMMIT')).rejects.toMatchObject({ code: '23514' });
    } finally { await client.query('ROLLBACK'); client.release(); }
    expect(await count('accounting.journals')).toBe(0);
  });
  it.each([0, -1, 1.5, null, '1000000'])('rejects direct-SQL malformed line amount %s', async amount => {
    const data = request(); data.lines.forEach(line => { line.amountCentavos = amount; });
    await expect(uow.run(actor, tx => tx.query('SELECT accounting.post_journal($1::jsonb,$2)', [JSON.stringify(data), actor.correlationId]))).rejects.toMatchObject({ code: 'AG422' });
    expect(await count('accounting.journals')).toBe(0);
  });
  it('rolls back a caller write, journal, event identity, audit and outbox together', async () => {
    const data = request();
    await expect(uow.run(actor, async tx => {
      await tx.query('INSERT INTO accounting.test_caller_effects VALUES($1,$2,1000000)', [seedId(), fixture.org]);
      await service.post(tx, data);
      throw new Error('Fictional caller failure after posting');
    })).rejects.toThrow('Fictional caller failure');
    for (const table of ['accounting.test_caller_effects', 'accounting.journals', 'accounting.journal_lines', 'platform.audit_events', 'platform.outbox']) expect(await count(table)).toBe(0);
    await post(data); expect(await count('accounting.journals')).toBe(1);
  });
  it('conserves a caller delta and journal under concurrent whole-operation retries', async () => {
    const data = request();
    const moneyPath = () => uow.run(actor, async tx => {
      await lockPostingPeriod(tx, day);
      // A test-only stand-in for servicing's own permanent financial-event claim.
      await tx.query('INSERT INTO accounting.test_caller_effects VALUES($1,$2,1000000) ON CONFLICT DO NOTHING', [data.sourceEventId, fixture.org]);
      return service.post(tx, data);
    });
    const results = await Promise.allSettled(Array.from({ length: 4 }, moneyPath));
    expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    expect((await owner.query('SELECT count(*)::integer AS events,sum(amount_centavos)::text AS delta FROM accounting.test_caller_effects')).rows[0]).toEqual({ events: 1, delta: '1000000' });
    expect(await count('accounting.journals')).toBe(1); expect(await count('platform.audit_events')).toBe(1);
  });
  it('preserves used rule/account definitions and mappings while allowing account deactivation', async () => {
    const data = request(); const receipt = await post(data);
    await expect(owner.query("UPDATE accounting.posting_rules SET posting_kind='changed' WHERE id=$1", [releaseRule])).rejects.toMatchObject({ code: '23514' });
    await expect(owner.query('DELETE FROM accounting.rule_accounts WHERE rule_id=$1', [releaseRule])).rejects.toMatchObject({ code: '23514' });
    await expect(owner.query("INSERT INTO accounting.rule_accounts VALUES($1,$2,$3,'debit')", [fixture.org, releaseRule, capital])).rejects.toMatchObject({ code: '23514' });
    await expect(owner.query("UPDATE accounting.accounts SET label='Changed historical account' WHERE id=$1", [cash])).rejects.toMatchObject({ code: '23514' });
    await owner.query('UPDATE accounting.accounts SET active=false WHERE id=$1', [cash]);
    expect(await post(data)).toEqual(receipt);
    await expect(post(request())).rejects.toMatchObject({ code: 'invalid_posting' });
  });
  it('holds account configuration stable until the financial transaction commits', async () => {
    const ready = gate(), finish = gate(); const client = await owner.connect();
    const posting = uow.run(actor, async tx => { const receipt = await service.post(tx, request()); ready.release(); await finish.promise; return receipt; });
    try {
      await ready.promise; await client.query('BEGIN'); const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      const deactivate = client.query('UPDATE accounting.accounts SET active=false WHERE id=$1', [cash]);
      await waitForLock(pid); finish.release(); await posting; await deactivate; await client.query('COMMIT');
      expect(await count('accounting.journals')).toBe(1);
    } finally { finish.release(); await posting.catch(() => {}); await client.query('ROLLBACK'); client.release(); }
  });
  it.each(['account', 'rule'])('rechecks a concurrent %s change before allowing financial commit', async kind => {
    const client = await owner.connect(); const ready = gate(); let pid = 0;
    try {
      await client.query('BEGIN');
      if (kind === 'account') await client.query('UPDATE accounting.accounts SET active=false WHERE id=$1', [cash]);
      else await client.query("UPDATE accounting.posting_rules SET effective_to='2026-10-28' WHERE id=$1", [releaseRule]);
      const posting = uow.run(actor, async tx => { pid = Number((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid); ready.release(); return service.post(tx, request()); });
      const rejected = expect(posting).rejects.toMatchObject({ code: 'invalid_posting' });
      await ready.promise; await waitForLock(pid); await client.query('COMMIT'); await rejected;
      expect(await count('accounting.journals')).toBe(0);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
  it('rejects posting without an open period and prevents overlapping or reopened periods', async () => {
    await closing(); await expect(post(request())).rejects.toMatchObject({ code: 'period_not_open' });
    await expect(owner.query("UPDATE accounting.periods SET state='open' WHERE id=$1", [period])).rejects.toMatchObject({ code: '23514' });
    await expect(owner.query("INSERT INTO accounting.periods VALUES($1,$2,'2026-10-15','2026-11-15','open')", [seedId(), fixture.org])).rejects.toMatchObject({ code: '23514' });
  });
  it('allows one exact full reversal in an open period while preserving the closed-period original', async () => {
    const data = request(); const original = await post(data); await closing();
    await owner.query("UPDATE accounting.periods SET state='closed' WHERE id=$1", [period]);
    const reverse: PostingRequest = { ...data, sourceEventId: seedId(), postingKind: 'reversal', effectiveDate: '2026-11-02', reversalOfJournalId: original.journalId,
      lines: data.lines.map(line => ({ ...line, side: line.side === 'debit' ? 'credit' : 'debit' })) };
    const partial = { ...reverse, lines: reverse.lines.map(line => ({ ...line, amountCentavos: 500_000 })) };
    await expect(post(partial)).rejects.toMatchObject({ code: 'invalid_posting' });
    const receipt = await post(reverse); expect(await post(reverse)).toEqual(receipt);
    await expect(post({ ...reverse, sourceEventId: seedId() })).rejects.toMatchObject({ code: 'financial_event_conflict' });
    await expect(post({ ...reverse, sourceEventId: seedId(), reversalOfJournalId: receipt.journalId })).rejects.toMatchObject({ code: 'invalid_posting' });
    expect((await owner.query('SELECT sum(CASE side WHEN \'debit\' THEN amount_centavos ELSE -amount_centavos END)::text AS net FROM accounting.journal_lines GROUP BY account_id')).rows.every(row => row.net === '0')).toBe(true);
    expect((await owner.query('SELECT request FROM accounting.journals WHERE id=$1', [original.journalId])).rows[0].request).toEqual(data);
  });
  it('holds the period lock until the caller commits, so close waits for posting', async () => {
    const ready = gate(), finish = gate(); const client = await owner.connect();
    const posting = uow.run(actor, async tx => { await lockPostingPeriod(tx, day); ready.release(); await finish.promise; return service.post(tx, request()); });
    try {
      await ready.promise; await client.query('BEGIN'); const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      const close = client.query("UPDATE accounting.periods SET state='closing' WHERE id=$1", [period]);
      await waitForLock(pid); finish.release(); await posting; await close; await client.query('COMMIT');
      expect(await count('accounting.journals')).toBe(1);
    } finally { finish.release(); await posting.catch(() => {}); await client.query('ROLLBACK'); client.release(); }
  });
  it('rejects a posting when closing obtains its lock first', async () => {
    const client = await owner.connect(); const ready = gate(); let pid = 0;
    try {
      await client.query('BEGIN'); await client.query("UPDATE accounting.periods SET state='closing' WHERE id=$1", [period]);
      const posting = uow.run(actor, async tx => { pid = Number((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid); ready.release(); return service.post(tx, request()); });
      const rejected = expect(posting).rejects.toMatchObject({ code: 'period_not_open' });
      await ready.promise; await waitForLock(pid); await client.query('COMMIT'); await rejected;
      expect(await count('accounting.journals')).toBe(0);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
});
