import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { ObservationInputSchema, type OperationContext, type PendingOrigination, type FinancialAuthority } from './context.js';
import { businessDay, fingerprint, permission, ServicingRuleError } from './command-rules.js';
import { MoneyCommandSchema, PrincipalPolicySchema, type MoneyCommand, type PrincipalPolicy } from './money-context.js';

export function insist(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new ServicingRuleError(code, message);
}
export function principalPolicy(input: unknown, loan: PendingOrigination, day: string): PrincipalPolicy {
  const p = PrincipalPolicySchema.parse(input), o = loan.offer;
  insist(p.organizationId === loan.organizationId && p.productVersionId === o.productVersionId && p.effectiveFrom <= day && day <= p.effectiveThrough,
    'posting_policy_unavailable', 'The exact product/component policy is unavailable for this date.');
  insist(o.principalCentavos === o.netReceivedCentavos && o.feesPaidSeparatelyCentavos === 0
    && o.payments.reduce((n, x) => n + BigInt(x.amountCentavos), 0n) === BigInt(o.principalCentavos),
    'unsupported_components', 'This principal-only slice cannot post interest, fees or withheld proceeds.');
  return p;
}
export function moneyHash(c: Omit<MoneyCommand, 'payloadHash'> | MoneyCommand): string {
  return fingerprint({ format: c.format, id: c.id, organizationId: c.organizationId, branchId: c.branchId,
    applicationId: c.applicationId, loanId: c.loanId, kind: c.kind, eventId: c.eventId, providerKey: c.providerKey,
    payload: c.payload, policy: c.policy, preparedBy: c.preparedBy, createdAt: c.createdAt, scheduleIndex: c.scheduleIndex, legacyVersion: c.legacyVersion, mode: c.mode });
}
export function inspectMoney(input: unknown): MoneyCommand {
  const c = MoneyCommandSchema.parse(input);
  insist(moneyHash(c) === c.payloadHash && c.payload.loanId === c.loanId && c.policy.organizationId === c.organizationId,
    'money_integrity', 'The financial command cannot be verified.');
  insist(c.kind === 'disbursement' ? c.legacyVersion !== null && c.scheduleIndex === null : c.legacyVersion === null && c.scheduleIndex !== null,
    'money_binding', 'Command kind and source bindings disagree.');
  if (c.state !== 'prepared') insist(c.authorization && c.authorization.userId !== c.preparedBy && c.authorization.payloadHash === c.payloadHash,
    'authorization_binding', 'A separate exact-payload authorization is required.');
  if (!['prepared', 'authorized'].includes(c.state)) insist(c.submission?.payloadHash === c.payloadHash, 'submission_binding', 'A submitted intent is required.');
  for (const o of c.observations) insist(o.input.commandId === c.id && o.input.businessEventId === c.eventId && o.input.providerKey === c.providerKey && o.input.mode === c.mode,
    'observation_binding', 'Observation belongs to a different command.');
  insist((c.state === 'confirmed') === (c.posting !== null), 'posting_binding', 'Posted status requires its immutable result.');
  return c;
}
export function financialPermission(actor: ActorContext, authority: FinancialAuthority, loan: PendingOrigination, action: 'prepare' | 'authorize' | 'submit' | 'observe', at: string, c: Pick<MoneyCommand, 'payload' | 'preparedBy'>) {
  const policy = permission(actor, { authority }, loan, action, at, c.payload.amountCentavos, c.payload.method);
  if (action === 'authorize') insist(actor.userId !== c.preparedBy, 'self_authorization', 'A preparer cannot authorize their own command.');
  return policy;
}
export function originalAuthorizer(c: MoneyCommand, context: Pick<OperationContext, 'authority' | 'originalAuthorizer'>, at: string) {
  const a = context.originalAuthorizer, p = context.authority;
  insist(a.status === 'current' && a.active && a.userId === c.authorization?.userId && a.organizationId === c.organizationId
    && a.branchIds.includes(c.branchId) && a.roles.includes('financial_authorizer'), 'authorizer_unavailable', 'Original financial authority is no longer current.');
  insist(p.status === 'configured' && p.versionId === c.authorization.policyVersionId
    && p.grants.some(g => g.userId === a.userId && g.actions.includes('authorize') && g.methods.includes(c.payload.method as 'cash' | 'bank') && g.maximumCentavos >= c.payload.amountCentavos)
    && Date.parse(at) - Date.parse(c.authorization.authenticatedAt) >= 0 && Date.parse(at) - Date.parse(c.authorization.authenticatedAt) <= p.mfaMaxAgeSeconds * 1000,
    'renew_authorization', 'Renew the current financial authorization before submission.');
}
/** Intake retains contradictory known facts instead of losing them to allocation failure. */
export function observeMoney(c: MoneyCommand, input: unknown, actor: ActorContext, at: string): MoneyCommand {
  const o = ObservationInputSchema.parse(input), next = structuredClone(c);
  insist(c.submission && c.state !== 'confirmed', 'workflow_state', 'Observation requires an unposted submitted intent.');
  insist(o.commandId === c.id && o.businessEventId === c.eventId && o.providerKey === c.providerKey && o.mode === 'simulation', 'observation_binding', 'Observation belongs to another intent.');
  const knownId = c.observations.find(x => x.input.id === o.id);
  if (knownId) { insist(fingerprint(knownId.input) === fingerprint(o), 'observation_conflict', 'Observation ID already identifies different evidence.'); return c; }
  const known = c.observations.find(x => x.input.state === 'confirmed');
  if (o.amountMinorUnits !== null && o.amountMinorUnits !== c.payload.amountCentavos || o.currency !== null && o.currency !== 'PHP'
    || o.effectiveDate !== null && o.effectiveDate !== c.payload.effectiveDate || o.occurredAt !== null && (Date.parse(o.occurredAt) < Date.parse(c.submission.at) || Date.parse(o.occurredAt) > Date.parse(at))) next.conflicts.push('payload_mismatch');
  if (known && o.state === 'failed' || known && o.state === 'confirmed' && (known.input.producer !== o.producer || known.input.movementId !== o.movementId)) next.conflicts.push('outcome_conflict');
  if (c.state === 'failed' && o.state === 'confirmed') next.conflicts.push('late_settlement');
  next.conflicts = [...new Set(next.conflicts)]; next.version++;
  next.observations.push({ input: o, recordedBy: actor.userId, recordedAt: at });
  if (!next.conflicts.length) next.state = known || o.state === 'confirmed' ? 'confirmed_unposted' : o.state === 'failed' ? 'failed' : 'unknown';
  return inspectMoney(next);
}
export function postedObservation(c: MoneyCommand, at: string) {
  insist(c.state === 'confirmed_unposted' && c.conflicts.length === 0, 'settlement_review_required', 'Only exact nonconflicting known settlement can be posted.');
  const o = c.observations.find(x => x.input.state === 'confirmed')?.input;
  insist(o?.verified && o.evidence && o.movementId && o.amountMinorUnits === c.payload.amountCentavos && o.currency === 'PHP'
    && o.effectiveDate === c.payload.effectiveDate && o.occurredAt !== null && Date.parse(o.occurredAt) <= Date.parse(at) && c.payload.effectiveDate <= businessDay(at),
    'settlement_required', 'Exact dated settlement evidence is required before posting.');
  return o;
}
