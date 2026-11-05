/** Fictional upstream producers and accounting configuration only. Never registered. */
import { randomUUID } from 'node:crypto';
import { owner, uow } from '../../../../test/database.js';
import { AccountingService } from '../../accounting/accounting.service.js';
import { ApiError, notFound } from '../../../platform/errors.js';
import { MoneyService, type MoneyPorts } from '../money.service.js';
import { ServicingService } from '../servicing.service.js';
import { OperationContextSchema, type OperationContext } from '../context.js';
import { PrincipalPolicySchema, type MoneyCommand, type PrincipalPolicy } from '../money-context.js';
import { ruleFixture, times } from './fixtures.js';
import { FictionalManualDriver } from './manual-simulation.js';

export const moneyPorts: MoneyPorts = {
  async authorize(tx, app) { if (!(await tx.query('SELECT id FROM applications.applications WHERE organization_id=$1 AND id=$2', [tx.actor.organizationId, app])).rowCount) throw notFound(); },
  async operation(tx, app) {
    const row = (await tx.query<{ body: OperationContext }>('SELECT body FROM servicing.test_money_context WHERE organization_id=$1 AND application_id=$2 FOR SHARE', [tx.actor.organizationId, app])).rows[0];
    if (!row) throw new ApiError(501, 'module_not_available', 'Fictional source is unavailable.');
    return OperationContextSchema.parse(row.body);
  },
  async observationAuthority(tx, app) { return (await moneyPorts.financial(tx, app)).authority; },
  async financial(tx, app) { const c = await moneyPorts.operation(tx, app); return { authority: c.authority, originalAuthorizer: c.originalAuthorizer }; },
  async policy(tx, loan) {
    const row = (await tx.query<{ policy: PrincipalPolicy }>('SELECT p.policy FROM servicing.test_money_context p JOIN servicing.staff_originations o ON o.organization_id=p.organization_id AND o.application_id=p.application_id WHERE o.organization_id=$1 AND o.id=$2 FOR SHARE OF p', [tx.actor.organizationId, loan])).rows[0];
    if (!row) throw notFound(); return PrincipalPolicySchema.parse(row.policy);
  },
};
export async function seedMoneyFixture(withheldFee = false, paymentDate = '2026-11-02') {
  const f = ruleFixture(withheldFee, paymentDate), a = f.context.basis.current.application;
  let at: string = times.prepare;
  const clock = () => new Date(at), setTime = (value: string) => { at = value; };
  const policy: PrincipalPolicy = { format: 'principal-only-v1', versionId: randomUUID(), organizationId: a.organizationId,
    productVersionId: f.context.basis.current.offers[0].productVersionId, effectiveFrom: '2026-01-01', effectiveThrough: '2026-12-31',
    interestCentavos: 0, feesCentavos: 0, graceDays: 0, allocation: 'scheduled-exact', cashAccountId: randomUUID(), principalAccountId: randomUUID(), releaseRuleId: randomUUID(), repaymentRuleId: randomUUID() };
  if (f.context.execution.status === 'configured') f.context.execution.componentRuleVersionId = policy.versionId;
  await owner.query('INSERT INTO platform.organizations VALUES($1,$2)', [a.organizationId, 'Fictional Phase 5 cooperative']);
  await owner.query('INSERT INTO platform.branches VALUES($1,$2,$3)', [a.branchId, a.organizationId, 'Fictional branch']);
  for (const actor of [f.cashier, f.authorizer, f.officer, f.reviewer]) {
    await owner.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$1::uuid::text,$4,$5,$6)', [actor.userId, actor.organizationId, 'fictional-phase5', 'Fictional staff', actor.branchIds, actor.roles]);
    await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '30 minutes')", [actor.sessionId, randomUUID(), actor.userId, actor.authenticatedAt, actor.authenticationMethods]);
  }
  await owner.query("INSERT INTO members.members(id,organization_id,branch_id,external_reference,full_name,notice_version) VALUES($1,$2,$3,$1::uuid::text,$4,'fictional')", [a.memberId, a.organizationId, a.branchId, a.memberName]);
  await owner.query(`INSERT INTO applications.applications(id,organization_id,branch_id,member_id,purpose,requested_principal_centavos,requested_term_months,currency,status,version,assessment_input_version,assigned_officer_id)
    VALUES($1,$2,$3,$4,$5,1000000,1,'PHP','decision_recorded',3,1,$6)`, [a.id, a.organizationId, a.branchId, a.memberId, a.purpose, a.assignedOfficerId]);
  await owner.query('INSERT INTO servicing.test_money_context VALUES($1,$2,$3,$4)', [a.organizationId, a.id, JSON.stringify(f.context), JSON.stringify(policy)]);
  await owner.query("INSERT INTO accounting.accounts(id,organization_id,code,label,currency) VALUES($1,$2,'cash','Fictional cash','PHP'),($3,$2,'loan','Fictional receivable','PHP')", [policy.cashAccountId, a.organizationId, policy.principalAccountId]);
  await owner.query("INSERT INTO accounting.posting_rules VALUES($1,$2,'disbursement','PHP','2026-01-01','2026-12-31'),($3,$2,'repayment','PHP','2026-01-01','2026-12-31')", [policy.releaseRuleId, a.organizationId, policy.repaymentRuleId]);
  await owner.query("INSERT INTO accounting.rule_accounts VALUES($1,$2,$3,'debit'),($1,$2,$4,'credit'),($1,$5,$4,'debit'),($1,$5,$3,'credit')", [a.organizationId, policy.releaseRuleId, policy.principalAccountId, policy.cashAccountId, policy.repaymentRuleId]);
  const periodId = randomUUID(); await owner.query("INSERT INTO accounting.periods VALUES($1,$2,'2026-11-01','2026-11-30','open')", [periodId, a.organizationId]);
  const legacy = new ServicingService(uow, moneyPorts, undefined, clock), ledger = new AccountingService(), money = new MoneyService(uow, moneyPorts, ledger, undefined, undefined, clock);
  async function settledRelease() {
    setTime(times.prepare); const loan = await legacy.originate(f.cashier, a.id, { method: 'cash' }, randomUUID());
    const request = { loanId: loan.id, amountCentavos: loan.offer.netReceivedCentavos, currency: 'PHP', effectiveDate: '2026-11-02', method: 'cash', instrumentReference: 'FICTIONAL-RELEASE', reason: 'Fictional manual release.' };
    const c = await legacy.prepare(f.cashier, loan.id, request, randomUUID()); setTime(times.authorize);
    await legacy.authorize(f.authorizer, c.id, 1, randomUUID()); setTime(times.submit);
    const submitted = await legacy.submitIntent(f.cashier, c.id, 2, randomUUID()); setTime(times.observe);
    const evidence = new FictionalManualDriver().submit(submitted, { observationId: randomUUID(), movementId: randomUUID(), at, outcome: 'confirmed' });
    const result = await legacy.observe(f.cashier, c.id, evidence, 3, randomUUID()); setTime(times.later);
    return { loan, request, command: result.command, evidence };
  }
  async function paymentEvidence(c: MoneyCommand, outcome: 'confirmed' | 'unknown' | 'failed' = 'confirmed') {
    return { id: randomUUID(), producer: 'fictional-payment-evidence', commandId: c.id, businessEventId: c.eventId, providerKey: c.providerKey, mode: 'simulation', state: outcome,
      movementId: outcome === 'confirmed' ? randomUUID() : null, providerReference: outcome === 'unknown' ? null : 'FICTIONAL-PAYMENT', amountMinorUnits: outcome === 'confirmed' ? c.payload.amountCentavos : null,
      currency: outcome === 'confirmed' ? 'PHP' : null, effectiveDate: outcome === 'confirmed' ? c.payload.effectiveDate : null, occurredAt: outcome === 'confirmed' ? at : null,
      verified: outcome !== 'unknown', evidence: outcome === 'unknown' ? null : { id: randomUUID(), sha256: 'b'.repeat(64) } };
  }
  return { ...f, policy, periodId, clock, setTime, legacy, money, ledger, settledRelease, paymentEvidence };
}
