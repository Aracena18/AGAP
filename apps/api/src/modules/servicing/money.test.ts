import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import type { PostingPort, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { owner, uow, resetFixtures, prepareDatabase, closePools } from '../../../test/database.js';
import { migrationDirectories } from '../../platform/migrate.js';
import { MoneyService } from './money.service.js';
import { MoneyRepository } from './money.repository.js';
import { moneyPorts, seedMoneyFixture } from './testing/money-db-fixture.js';
import { times } from './testing/fixtures.js';
import { StoredReleaseGuard } from '../decisions/release-guard.js';
import { setTimeout as delay } from 'node:timers/promises';

let f: Awaited<ReturnType<typeof seedMoneyFixture>>;
const key = () => randomUUID();
async function count(table: string) { return Number((await owner.query(`SELECT count(*) FROM ${table}`)).rows[0].count); }
beforeAll(async () => {
  const dirs = ['apps/api/src/modules/accounting/migrations', 'apps/api/src/modules/servicing/migrations']; migrationDirectories.push(...dirs);
  try { await prepareDatabase(); } finally { for (const d of dirs) migrationDirectories.splice(migrationDirectories.indexOf(d), 1); }
  await owner.query(`CREATE TABLE IF NOT EXISTS servicing.test_money_context(organization_id uuid NOT NULL REFERENCES platform.organizations(id),application_id uuid PRIMARY KEY,body jsonb NOT NULL,policy jsonb NOT NULL);
    ALTER TABLE servicing.test_money_context ENABLE ROW LEVEL SECURITY; ALTER TABLE servicing.test_money_context FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS fixture_scope ON servicing.test_money_context;
    CREATE POLICY fixture_scope ON servicing.test_money_context USING(organization_id=platform.current_organization());
    GRANT SELECT,UPDATE ON servicing.test_money_context TO agap_runtime;`);
});
beforeEach(async () => { await resetFixtures(); f = await seedMoneyFixture(); });
afterAll(closePools);
async function released() { const r = await f.settledRelease(); return { ...r, posted: await f.money.finalize(f.authorizer, r.command.id, r.command.version, key()) }; }
async function payment() {
  const r = await released(), c = await f.money.prepareRepayment(f.cashier, r.loan.id, { ...r.request, instrumentReference: 'FICTIONAL-REPAYMENT' }, key());
  await f.money.authorize(f.authorizer, c.id, 1, key()); const submitted = await f.money.submitIntent(f.cashier, c.id, 2, key());
  const result = await f.money.observe(f.cashier, c.id, await f.paymentEvidence(submitted), 3, key()); return { ...r, payment: result };
}
describe('Phase 5 actual servicing/AccountingService with fictional upstream producers', () => {
  it('fails unavailable without approved producer and posting adapters', async () => {
    const r = await f.settledRelease();
    await expect(new MoneyService(uow).finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ status: 501 });
    expect(await count('accounting.journals')).toBe(0);
  });
  it('posts a first release atomically and preserves original Phase 4 snapshots', async () => {
    const r = await f.settledRelease(), original = JSON.stringify(r.loan);
    const result = await f.money.finalize(f.authorizer, r.command.id, 4, key());
    expect(result).toMatchObject({ kind: 'disbursement', principalAfterCentavos: 1_000_000, receiptId: null });
    expect(await count('accounting.journals')).toBe(1); expect(await count('servicing.postings')).toBe(1);
    expect(JSON.stringify((await owner.query('SELECT body FROM servicing.originations WHERE id=$1', [r.loan.id])).rows[0].body)).not.toBe('');
    const stored = await uow.run(f.cashier, tx => new MoneyRepository().get(tx, r.command.id));
    expect(stored.state).toBe('confirmed'); expect(stored.legacyVersion).toBe(4);
    expect(JSON.stringify(r.loan)).toBe(original);
    expect((await f.legacy.read(f.cashier, r.command.id)).command.state).toBe('confirmed_unposted');
  });
  it('posts one scheduled repayment with one receipt and no second debt reduction', async () => {
    const r = await payment(), k = key();
    const p = await f.money.finalize(f.authorizer, r.payment.id, 4, k);
    expect(p).toMatchObject({ kind: 'repayment', principalAfterCentavos: 0 }); expect(p.receiptId).not.toBeNull();
    expect(await f.money.finalize(f.authorizer, r.payment.id, 4, k)).toEqual(p);
    expect(await f.money.finalize(f.authorizer, r.payment.id, 4, key())).toEqual(p);
    expect(await count('accounting.journals')).toBe(2); expect(await count('servicing.postings')).toBe(2);
  });
  it('serializes two different finalization keys to one release and journal', async () => {
    const r = await f.settledRelease();
    const results = await Promise.all([f.money.finalize(f.authorizer, r.command.id, 4, key()), f.money.finalize(f.authorizer, r.command.id, 4, key())]);
    expect(results[0]).toEqual(results[1]); expect(await count('servicing.postings')).toBe(1);
  });
  it('replays after period close but refuses an unposted movement in a closed period', async () => {
    const r = await released();
    await owner.query("UPDATE accounting.periods SET state='closing' WHERE id=$1", [f.periodId]);
    await owner.query("UPDATE accounting.periods SET state='closed' WHERE id=$1", [f.periodId]);
    expect(await f.money.finalize(f.authorizer, r.command.id, 4, key())).toEqual(r.posted);
  });
  it('retains known settlement when posting period is not open', async () => {
    const r = await f.settledRelease(); await owner.query("UPDATE accounting.periods SET state='closing' WHERE id=$1", [f.periodId]);
    await expect(f.money.finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ code: 'period_not_open' });
    expect(await count('servicing.postings')).toBe(0); expect((await f.legacy.read(f.cashier, r.command.id)).recovery.knownSettlement).toBe(true);
  });
  it('rolls back the actual GL after posting when later servicing persistence fails', async () => {
    const r = await f.settledRelease();
    class Broken extends MoneyRepository { override async insertPosted() { throw new Error('PRIVATE injected after actual GL'); } }
    const s = new MoneyService(uow, moneyPorts, f.ledger, new Broken(), undefined, f.clock);
    await expect(s.finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ status: 503 });
    expect(await count('accounting.journals')).toBe(0); expect(await count('servicing.postings')).toBe(0); expect(await count('servicing.money_revisions')).toBe(0);
    expect((await f.legacy.read(f.cashier, r.command.id)).command.state).toBe('confirmed_unposted');
  });
  it('rolls back both modules if the coordinator aborts after all work', async () => {
    const r = await f.settledRelease();
    const broken: UnitOfWork = { run: (actor, work) => uow.run(actor, async tx => { await work(tx); throw new Error('PRIVATE injected before commit'); }) };
    await expect(new MoneyService(broken, moneyPorts, f.ledger, undefined, undefined, f.clock).finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ status: 503 });
    expect(await count('accounting.journals')).toBe(0); expect(await count('servicing.postings')).toBe(0);
  });
  it('does not reapply servicing effects when the accounting event already exists', async () => {
    const r = await f.settledRelease();
    await uow.run(f.authorizer, tx => f.ledger.post(tx, { sourceEventId: r.command.businessEventId, postingKind: 'disbursement', postingRuleVersionId: f.policy.releaseRuleId, effectiveDate: r.request.effectiveDate, currency: 'PHP', reversalOfJournalId: null,
      lines: [{ accountId: f.policy.principalAccountId, side: 'debit', amountCentavos: 1_000_000 }, { accountId: f.policy.cashAccountId, side: 'credit', amountCentavos: 1_000_000 }] }));
    await f.money.finalize(f.authorizer, r.command.id, 4, key()); await f.money.finalize(f.authorizer, r.command.id, 4, key());
    expect(await count('servicing.postings')).toBe(1); expect(await count('accounting.journals')).toBe(1);
  });
  it('rejects self-authorization and stale repayment versions with actual identities', async () => {
    const r = await released(), c = await f.money.prepareRepayment(f.cashier, r.loan.id, r.request, key());
    const both = { ...f.cashier, roles: ['cashier', 'financial_authorizer'] as typeof f.cashier.roles };
    await owner.query('UPDATE identity.staff_users SET roles=$2 WHERE id=$1', [both.userId, both.roles]);
    if (f.context.authority.status === 'configured') f.context.authority.grants[0].actions.push('authorize');
    await owner.query('UPDATE servicing.test_money_context SET body=$2 WHERE application_id=$1', [r.loan.applicationId, JSON.stringify(f.context)]);
    await expect(f.money.authorize(both, c.id, 1, key())).rejects.toMatchObject({ code: 'self_authorization' });
    await expect(f.money.authorize(f.authorizer, c.id, 2, key())).rejects.toMatchObject({ status: 412 });
  });
  it('retains an unsupported already-observed repayment amount for review', async () => {
    const r = await released(), c = await f.money.prepareRepayment(f.cashier, r.loan.id, r.request, key());
    await f.money.authorize(f.authorizer, c.id, 1, key()); const submitted = await f.money.submitIntent(f.cashier, c.id, 2, key());
    const evidence = { ...await f.paymentEvidence(submitted), amountMinorUnits: 1_100_000 };
    const observed = await f.money.observe(f.cashier, c.id, evidence, 3, key());
    expect(observed.conflicts).toContain('payload_mismatch'); expect(observed.observations[0].input.amountMinorUnits).toBe(1_100_000);
    await expect(f.money.finalize(f.authorizer, c.id, 4, key())).rejects.toMatchObject({ code: 'settlement_review_required' });
    expect(await count('servicing.postings')).toBe(1);
  });
  it('does not create a receipt or reduce principal for unknown outcome', async () => {
    const r = await released(), c = await f.money.prepareRepayment(f.cashier, r.loan.id, r.request, key());
    await f.money.authorize(f.authorizer, c.id, 1, key()); const submitted = await f.money.submitIntent(f.cashier, c.id, 2, key());
    await f.money.observe(f.cashier, c.id, await f.paymentEvidence(submitted, 'unknown'), 3, key());
    await expect(f.money.finalize(f.authorizer, c.id, 4, key())).rejects.toMatchObject({ code: 'settlement_review_required' });
    expect(await count('servicing.postings')).toBe(1);
  });
  it('rejects unsupported new payment amounts and duplicate scheduled intents', async () => {
    const r = await released();
    await expect(f.money.prepareRepayment(f.cashier, r.loan.id, { ...r.request, amountCentavos: 1 }, key())).rejects.toMatchObject({ code: 'unsupported_repayment' });
    await f.money.prepareRepayment(f.cashier, r.loan.id, r.request, key());
    await expect(f.money.prepareRepayment(f.cashier, r.loan.id, r.request, key())).rejects.toMatchObject({ status: 409 });
  });
  it('blocks new release posting after a material source change', async () => {
    const r = await f.settledRelease(); f.context.basis.current.application.assessmentInputVersion++;
    await owner.query('UPDATE servicing.test_money_context SET body=$2 WHERE application_id=$1', [r.loan.applicationId, JSON.stringify(f.context)]);
    await expect(f.money.finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ code: 'renewed_review_required' });
  });
  it('refuses an invalid current account and keeps movement unposted', async () => {
    const r = await f.settledRelease(); await owner.query('UPDATE accounting.accounts SET active=false WHERE id=$1', [f.policy.cashAccountId]);
    await expect(f.money.finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ status: 422 });
    expect(await count('servicing.postings')).toBe(0);
  });
  it('requires current MFA and never substitutes an administrator for financial authority', async () => {
    const r = await f.settledRelease(); f.setTime('2026-11-02T02:00:00Z');
    await expect(f.money.finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ code: 'fresh_mfa_required' });
    await expect(f.money.finalize(f.officer, r.command.id, 4, key())).rejects.toMatchObject({ status: 403 });
  });
  it('prevents fake journal receipts from producing SQL-backed posted success', async () => {
    const r = await f.settledRelease();
    const fake: PostingPort = { post: async () => ({ journalId: key(), sourceEventId: r.command.businessEventId, postedAt: times.later }) };
    await expect(new MoneyService(uow, moneyPorts, fake, undefined, undefined, f.clock).finalize(f.authorizer, r.command.id, 4, key())).rejects.toBeDefined();
    expect(await count('servicing.postings')).toBe(0);
  });
  it('implements the canonical pre-dispatch guard in the caller transaction without financial effects', async () => {
    f.setTime(times.prepare);
    const loan = await f.legacy.originate(f.cashier, f.context.basis.current.application.id, { method: 'cash' }, key());
    const c = await f.legacy.prepare(f.cashier, loan.id, { loanId: loan.id, amountCentavos: 1_000_000, currency: 'PHP', effectiveDate: '2026-11-02', method: 'cash', instrumentReference: 'FICTIONAL', reason: 'Fictional preflight.' }, key());
    f.setTime(times.authorize); await f.legacy.authorize(f.authorizer, c.id, 1, key()); f.setTime(times.submit);
    const guard = new StoredReleaseGuard(moneyPorts, undefined, f.clock);
    await uow.run(f.cashier, tx => guard.authorizeRelease(tx, loan.id, c.id));
    expect((await f.legacy.read(f.cashier, c.id)).command.state).toBe('authorized'); expect(await count('accounting.journals')).toBe(0);
    f.context.basis.current.application.assessmentInputVersion++;
    await owner.query('UPDATE servicing.test_money_context SET body=$2 WHERE application_id=$1', [loan.applicationId, JSON.stringify(f.context)]);
    await expect(uow.run(f.cashier, tx => guard.authorizeRelease(tx, loan.id, c.id))).rejects.toMatchObject({ code: 'renewed_review_required' });
  });
  it('does not re-underwrite household changes when collecting the original posted contract', async () => {
    const r = await released(); f.context.basis.current.application.assessmentInputVersion++;
    await owner.query('UPDATE servicing.test_money_context SET body=$2 WHERE application_id=$1', [r.loan.applicationId, JSON.stringify(f.context)]);
    const independent = new MoneyService(uow, { ...moneyPorts, operation: async () => { throw new Error('Must not reload household credit basis'); } }, f.ledger, undefined, undefined, f.clock);
    const c = await independent.prepareRepayment(f.cashier, r.loan.id, r.request, key());
    await independent.authorize(f.authorizer, c.id, 1, key()); const intent = await independent.submitIntent(f.cashier, c.id, 2, key());
    await independent.observe(f.cashier, c.id, await f.paymentEvidence(intent), 3, key());
    expect((await independent.finalize(f.authorizer, c.id, 4, key())).principalAfterCentavos).toBe(0);
  });
  it('refuses withheld fees rather than posting them as a principal-only release', async () => {
    f = await seedMoneyFixture(true); const r = await f.settledRelease();
    await expect(f.money.finalize(f.authorizer, r.command.id, 4, key())).rejects.toMatchObject({ code: 'unsupported_components' });
    expect(await count('accounting.journals')).toBe(0); expect((await f.legacy.read(f.cashier, r.command.id)).recovery.knownSettlement).toBe(true);
  });
  it('holds the accounting period lock through actual servicing commit', async () => {
    const r = await f.settledRelease(); let release!: () => void, signal!: () => void;
    const ready = new Promise<void>(resolve => { signal = resolve; }), hold = new Promise<void>(resolve => { release = resolve; });
    const ledger: PostingPort = { post: async (tx, request) => { const result = await f.ledger.post(tx, request); signal(); await hold; return result; } };
    const posting = new MoneyService(uow, moneyPorts, ledger, undefined, undefined, f.clock).finalize(f.authorizer, r.command.id, 4, key());
    await ready; const client = await owner.connect();
    const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number;
    const closing = client.query("UPDATE accounting.periods SET state='closing' WHERE id=$1", [f.periodId]);
    try {
      let blocked = false;
      for (let n = 0; n < 100; n++) {
        blocked = (await owner.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid])).rows[0].wait_event_type === 'Lock';
        if (blocked) break; await delay(10);
      }
      expect(blocked).toBe(true);
    } finally { release(); await posting; await closing; client.release(); }
    expect(await count('servicing.postings')).toBe(1);
  });
  it('posts under non-superuser non-BYPASSRLS servicing function ownership', async () => {
    const role = 'agap_phase5_money_definer';
    await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
      GRANT USAGE ON SCHEMA servicing,platform,identity,accounting,monitoring TO ${role};
      GRANT SELECT ON ALL TABLES IN SCHEMA servicing,accounting TO ${role};
      GRANT EXECUTE ON FUNCTION platform.current_organization(),platform.allowed_branch(uuid),platform.current_member(),servicing.staff_role(text),monitoring.support_loan_scope(uuid,uuid,uuid) TO ${role};`);
    const functions = ['validate_money_revision()', 'require_posted_effects()', 'require_money_movement()', 'require_money_command()'];
    try {
      for (const fn of functions) await owner.query(`ALTER FUNCTION servicing.${fn} OWNER TO ${role}`);
      const r = await payment(); expect((await f.money.finalize(f.authorizer, r.payment.id, 4, key())).principalAfterCentavos).toBe(0);
    } finally { for (const fn of functions) await owner.query(`ALTER FUNCTION servicing.${fn} OWNER TO agap_owner`); }
  });
});
