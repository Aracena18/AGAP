import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ActorContext, MemberActorContext, QueryResult, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { owner, ownerUrl, runtimePool, uow, resetFixtures, prepareDatabase, closePools } from '../../../test/database.js';
import { createPool, PostgresUnitOfWork } from '../../platform/database.js';
import { PostgresMemberUnitOfWork } from '../../platform/member-database.js';
import { migrationDirectories } from '../../platform/migrate.js';
import { PrincipalReconciliationInputSchema, reconcilePrincipalMovements, type PrincipalReconciliationInput } from '../accounting/reconciliation.js';
import { LoanReads } from './loan-reads.js';
import { seedMoneyFixture, moneyPorts } from './testing/money-db-fixture.js';

let f: Awaited<ReturnType<typeof seedMoneyFixture>>, reads: LoanReads;
const key = () => randomUUID();
beforeAll(async () => {
  const dirs = ['apps/api/src/modules/accounting/migrations', 'apps/api/src/modules/servicing/migrations']; migrationDirectories.push(...dirs);
  try { await prepareDatabase(); } finally { for (const d of dirs) migrationDirectories.splice(migrationDirectories.indexOf(d), 1); }
  await owner.query(`CREATE TABLE IF NOT EXISTS servicing.test_money_context(organization_id uuid NOT NULL REFERENCES platform.organizations(id),application_id uuid PRIMARY KEY,body jsonb NOT NULL,policy jsonb NOT NULL);
    ALTER TABLE servicing.test_money_context ENABLE ROW LEVEL SECURITY; ALTER TABLE servicing.test_money_context FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS fixture_scope ON servicing.test_money_context;
    CREATE POLICY fixture_scope ON servicing.test_money_context USING(organization_id=platform.current_organization());
    GRANT SELECT,UPDATE ON servicing.test_money_context TO agap_runtime;`);
});
beforeEach(async () => { await resetFixtures(); f = await seedMoneyFixture(); reads = new LoanReads(uow, moneyPorts, undefined, undefined, f.clock); });
afterAll(closePools);
async function released() { const r = await f.settledRelease(); const posted = await f.money.finalize(f.authorizer, r.command.id, 4, key()); return { ...r, posted }; }
async function repaid() {
  const r = await released(), c = await f.money.prepareRepayment(f.cashier, r.loan.id, r.request, key());
  await f.money.authorize(f.authorizer, c.id, 1, key()); const intent = await f.money.submitIntent(f.cashier, c.id, 2, key());
  await f.money.observe(f.cashier, c.id, await f.paymentEvidence(intent), 3, key());
  const receipt = await f.money.finalize(f.authorizer, c.id, 4, key()); return { ...r, receipt };
}
async function memberActor(): Promise<MemberActorContext> {
  const a = f.context.basis.current.application, link = key(), session = key();
  await owner.query('INSERT INTO identity.member_links(id,organization_id,member_id,issuer,subject,verification_reference) VALUES($1,$2,$3,$4,$5,$6)', [link, a.organizationId, a.memberId, 'fictional-member-issuer', key(), 'FICTIONAL-LINK-CHECK']);
  await owner.query("INSERT INTO identity.member_sessions(id,token_hash,link_id,authenticated_at,expires_at) VALUES($1,$2,$3,now(),now()+interval '30 minutes')", [session, key(), link]);
  return { kind: 'member', organizationId: a.organizationId, memberId: a.memberId, linkId: link, sessionId: session, correlationId: key() };
}
async function auditor(): Promise<ActorContext> {
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['auditor'] WHERE id=$1", [f.officer.userId]);
  return { ...f.officer, roles: ['auditor'] };
}
async function report(afterServicing?: () => Promise<void>) {
  const actor = await auditor(), url = new URL(ownerUrl); url.username = 'agap_runtime'; url.password = 'development-runtime';
  const pool = createPool(url.href, { options: '-c default_transaction_isolation=serializable' });
  try {
    return await new PostgresUnitOfWork(pool).run(actor, async tx => {
      const scope = { organizationId: actor.organizationId, fromDate: '2026-11-01', throughDate: '2026-11-30', cutoffAt: new Date().toISOString(), snapshotId: key() };
      const servicing = await reads.inventory(tx, scope);
      await afterServicing?.();
      // Fictional Earl evidence-reader stand-in: enumerate ALL scoped journals,
      // not journals selected by servicing IDs. Same real snapshot/transaction.
      const ledger = await tx.query('SELECT id,request,posted_at FROM accounting.journals WHERE organization_id=$1 AND effective_date BETWEEN $2::date AND $3::date AND posted_at<=$4::timestamptz', [actor.organizationId, scope.fromDate, scope.throughDate, scope.cutoffAt]);
      const input: PrincipalReconciliationInput = { scope, servicing, ledger: { state: 'available', snapshotId: scope.snapshotId, complete: true,
        journals: ledger.rows.map(r => ({ ...(r.request as object), organizationId: actor.organizationId, journalId: String(r.id), postedAt: (r.posted_at as Date).toISOString() })) as Extract<PrincipalReconciliationInput['ledger'], { state: 'available' }>['journals'] },
        mappings: ['disbursement', 'repayment'].map(kind => ({ organizationId: actor.organizationId, currency: 'PHP', postingRuleVersionId: kind === 'disbursement' ? f.policy.releaseRuleId : f.policy.repaymentRuleId,
          kind: kind as 'disbursement' | 'repayment', effectiveFrom: f.policy.effectiveFrom, effectiveThrough: f.policy.effectiveThrough, cashAccountId: f.policy.cashAccountId, principalAccountId: f.policy.principalAccountId })) };
      return { input, result: reconcilePrincipalMovements(input) };
    });
  } finally { await pool.end(); }
}
describe('Dated safe projections and actual independent principal reconciliation', () => {
  it('does not fabricate a loan position before posted release', async () => {
    const r = await f.settledRelease(), v = await reads.workspace(f.cashier, r.loan.id, '2026-11-02');
    expect(v.position).toBeNull(); expect(v.commands[0].state).toBe('confirmed_unposted'); expect(v.nextPayment).toBeNull();
  });
  it('reads active and settled positions from actual posted events with original schedule', async () => {
    const r = await repaid(), v = await reads.workspace(f.cashier, r.loan.id, '2026-11-02');
    expect(v.position).toMatchObject({ state: 'settled', principalCentavos: 0, overdueCentavos: 0 });
    expect(v.position?.receipts[0]).toEqual(r.receipt); expect(v.position?.schedule).toEqual(r.loan.offer.payments);
    expect(v.commands.every(c => c.state === 'confirmed')).toBe(true);
    expect((await reads.workspace(f.cashier, r.loan.id, '2026-11-01')).position).toBeNull();
  });
  it('retains the historical next payment before a later effective repayment without including that receipt or freshness', async () => {
    f = await seedMoneyFixture(false, '2026-11-03');
    reads = new LoanReads(uow, moneyPorts, undefined, undefined, f.clock);
    const r = await released();
    const at = '2026-11-03T01:00:00Z';
    f.setTime(at);
    const cashier = { ...f.cashier, authenticatedAt: new Date(at) }, authorizer = { ...f.authorizer, authenticatedAt: new Date(at) };
    for (const actor of [cashier, authorizer]) {
      await owner.query('UPDATE identity.sessions SET authenticated_at=$2 WHERE id=$1', [actor.sessionId, at]);
    }
    const c = await f.money.prepareRepayment(cashier, r.loan.id, { ...r.request, effectiveDate: '2026-11-03' }, key());
    await f.money.authorize(authorizer, c.id, 1, key());
    const intent = await f.money.submitIntent(cashier, c.id, 2, key());
    await f.money.observe(cashier, c.id, await f.paymentEvidence(intent), 3, key());
    await f.money.finalize(authorizer, c.id, 4, key());
    const historical = await reads.workspace(cashier, r.loan.id, '2026-11-02');
    expect(historical.nextPayment).toEqual({ date: '2026-11-03', amountCentavos: 1_000_000 });
    expect(historical.position).toMatchObject({ principalCentavos: 1_000_000, receipts: [], postedThrough: r.posted.postedAt });
    const current = await reads.workspace(cashier, r.loan.id, '2026-11-03');
    expect(current.position?.principalCentavos).toBe(0); expect(current.nextPayment).toBeNull();
  });
  it('keeps submitted and unknown payments out of debt reduction and receipt lists', async () => {
    const r = await released(), c = await f.money.prepareRepayment(f.cashier, r.loan.id, r.request, key());
    await f.money.authorize(f.authorizer, c.id, 1, key()); const intent = await f.money.submitIntent(f.cashier, c.id, 2, key());
    await f.money.observe(f.cashier, c.id, await f.paymentEvidence(intent, 'unknown'), 3, key());
    expect((await reads.workspace(f.cashier, r.loan.id, '2026-11-02')).position).toMatchObject({ principalCentavos: 1_000_000, pendingMovementCount: 1, receipts: [] });
  });
  it('uses canonical own-member projections with real linkage and no staff payload', async () => {
    const r = await repaid(), member = await memberActor(), muow = new PostgresMemberUnitOfWork(runtimePool);
    const v = await muow.run(member, tx => reads.memberLoans(tx));
    expect(v.state).toBe('available'); if (v.state !== 'available') throw new Error('Expected own-member view');
    expect(v.data).toHaveLength(1); expect(v.data[0].id).toBe(r.loan.id); expect(v.data[0].status).toBe('settled');
    expect(v.data[0].receipts[0].id).toBe(r.receipt.receiptId);
    expect(JSON.stringify(v)).not.toMatch(/authority|snapshotHash|preparedBy|sourceId|payloadHash/);
    await expect(muow.run(member, tx => tx.query('SELECT * FROM servicing.money_revisions'))).rejects.toMatchObject({ code: '42501' });
    expect((await muow.run(member, tx => tx.query('SELECT * FROM servicing.staff_money_revisions'))).rowCount).toBe(0);
  });
  it('revoked or forged member linkage cannot return loan information', async () => {
    await released(); const member = await memberActor(), muow = new PostgresMemberUnitOfWork(runtimePool);
    await expect(muow.run({ ...member, memberId: key() }, tx => reads.memberLoans(tx))).rejects.toMatchObject({ status: 401 });
    await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1', [member.linkId]);
    await expect(muow.run(member, tx => reads.memberLoans(tx))).rejects.toMatchObject({ status: 401 });
  });
  it('works under FORCE RLS with a non-superuser member projection owner', async () => {
    await repaid(); const member = await memberActor(), role = 'agap_phase5_reader';
    await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
      GRANT USAGE ON SCHEMA servicing,platform,identity,monitoring TO ${role};
      GRANT SELECT ON servicing.originations,servicing.money_commands,servicing.money_revisions,servicing.postings,identity.member_links TO ${role};
      GRANT EXECUTE ON FUNCTION platform.current_organization(),platform.current_member(),platform.allowed_branch(uuid),servicing.staff_role(text),monitoring.support_loan_scope(uuid,uuid,uuid) TO ${role};
      ALTER FUNCTION servicing.member_loans(date) OWNER TO ${role};`);
    try {
      const v = await new PostgresMemberUnitOfWork(runtimePool).run(member, tx => reads.memberLoans(tx));
      expect(v.state).toBe('available'); if (v.state === 'available') expect(v.data).toHaveLength(1);
    } finally { await owner.query('ALTER FUNCTION servicing.member_loans(date) OWNER TO agap_owner'); }
  });
  it('reconciles actual GL and servicing events using the independent checker', async () => {
    await repaid(); const r = await report();
    expect(r.result.status).toBe('matched'); expect(r.result.events).toHaveLength(2);
  });
  it('exposes orphan journals instead of fetching only known servicing journals', async () => {
    await released(); await uow.run(f.authorizer, tx => f.ledger.post(tx, { sourceEventId: key(), postingKind: 'repayment', postingRuleVersionId: f.policy.repaymentRuleId,
      effectiveDate: '2026-11-02', currency: 'PHP', reversalOfJournalId: null, lines: [{ accountId: f.policy.principalAccountId, side: 'credit', amountCentavos: 1 }, { accountId: f.policy.cashAccountId, side: 'debit', amountCentavos: 1 }] }));
    const r = await report(); expect(r.result.status).toBe('discrepancy'); expect(r.result.events).toHaveLength(2);
  });
  it('reveals per-event errors despite offsetting aggregate amounts', async () => {
    await repaid(); const r = await report();
    const input = PrincipalReconciliationInputSchema.parse(r.input);
    if (input.servicing.state !== 'available') throw new Error('Expected complete servicing inventory');
    input.servicing.allocations[0].principalCentavos += 1; input.servicing.allocations[1].principalCentavos -= 1;
    expect(reconcilePrincipalMovements(input).status).toBe('discrepancy');
  });
  it('keeps both inventories on the same actual snapshot during a concurrent ledger write', async () => {
    await released();
    const r = await report(async () => {
      await uow.run(f.authorizer, tx => f.ledger.post(tx, { sourceEventId: key(), postingKind: 'repayment', postingRuleVersionId: f.policy.repaymentRuleId,
        effectiveDate: '2026-11-02', currency: 'PHP', reversalOfJournalId: null, lines: [{ accountId: f.policy.principalAccountId, side: 'credit', amountCentavos: 1 }, { accountId: f.policy.cashAccountId, side: 'debit', amountCentavos: 1 }] }));
    });
    expect(r.result.status).toBe('matched'); expect(r.result.events).toHaveLength(1);
    expect((await report()).result.status).toBe('discrepancy');
  });
  it('reports known unposted releases as discrepancies and denies READ COMMITTED reports', async () => {
    await f.settledRelease(); expect((await report()).result.status).toBe('discrepancy');
    const actor = await auditor();
    await expect(uow.run(actor, tx => reads.inventory(tx, { organizationId: actor.organizationId, fromDate: '2026-11-01', throughDate: '2026-11-30', cutoffAt: new Date().toISOString(), snapshotId: key() }))).rejects.toMatchObject({ code: 'snapshot_unavailable' });
  });
  it('does not hide incomplete legacy recording times behind complete=true', async () => {
    const r = await f.settledRelease();
    // Simulate a pre-005 row in a private disposable reporting fixture, without
    // weakening the immutable production table: reader sees unknown metadata.
    const proxy: TransactionContext = { actor: await auditor(), query: async <Row extends Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>> => {
      const result = await uow.run(proxy.actor, tx => tx.query<Row>(sql, values));
      if (sql.includes('SHOW transaction_isolation')) return { rows: [{ transaction_isolation: 'serializable' }] as unknown as Row[], rowCount: 1 };
      if (sql.includes('servicing.command_revisions') || sql.includes('servicing.staff_command_revisions')) result.rows.forEach(row => { (row as Record<string, unknown>).recorded_at = null; });
      return result;
    } };
    // This test-only proxy is not snapshot evidence; it tests unknown handling.
    expect((await reads.inventory(proxy, { organizationId: r.loan.organizationId, fromDate: '2026-11-01', throughDate: '2026-11-30', cutoffAt: new Date().toISOString(), snapshotId: key() })).state).toBe('unavailable');
  });
});
