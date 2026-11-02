import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { CalendarDay, Id, Instant, Role } from '../../../../../packages/contracts/src/schemas.js';
import { canonical } from '../../platform/commands.js';
import { reviewChangeEffect } from '../decisions/rules.js';
import { CommandSchema, ObservationContextSchema, ObservationInputSchema, OperationContextSchema, PendingOriginationSchema, PrepareCommandSchema, RuleRequestSchema,
  type Command, type DeepReadonly, type OperationContext, type PendingOrigination } from './context.js';

export class ServicingRuleError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}
function requireRule(condition: unknown, code: string, message: string): asserts condition { if (!condition) throw new ServicingRuleError(code, message); }
function freeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value as DeepReadonly<T>;
}
export const fingerprint = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export function businessDay(at: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(Instant.parse(at)));
  const part = (kind: string) => parts.find(p => p.type === kind)!.value;
  return CalendarDay.parse(`${part('year')}-${part('month')}-${part('day')}`);
}
const actorShape = z.object({ userId: Id, organizationId: Id, branchIds: z.array(Id), roles: z.array(Role), sessionId: Id,
  authenticatedAt: z.date(), authenticationMethods: z.array(z.string()) });
type Scope = Pick<PendingOrigination, 'organizationId' | 'branchId' | 'offer'>;
export function permission(actor: ActorContext, c: Pick<OperationContext, 'authority'>, scope: Scope, action: 'prepare' | 'authorize' | 'submit' | 'observe' | 'reconcile', at: string, amount: number, method: string) {
  const a = actorShape.parse(actor), p = c.authority;
  requireRule(a.organizationId === scope.organizationId && a.branchIds.includes(scope.branchId), 'actor_scope', 'This actor cannot operate on this origination.');
  const role = action === 'authorize' ? 'financial_authorizer' : action === 'prepare' ? 'cashier' : null;
  requireRule(role ? a.roles.includes(role) : a.roles.some(r => r === 'cashier' || r === 'financial_authorizer'), 'role_required', 'The required financial role is unavailable.');
  requireRule(p.status === 'configured', 'authority_unavailable', 'Financial authority must be explicitly configured.');
  requireRule(p.organizationId === scope.organizationId && p.branchId === scope.branchId && p.productVersionId === scope.offer.productVersionId,
    'authority_scope', 'The financial authority does not apply to this scope and product.');
  requireRule(new Set(p.grants.map(g => g.userId)).size === p.grants.length, 'authority_ambiguous', 'Financial authority grants must be unambiguous.');
  requireRule(p.effectiveFrom <= businessDay(at) && businessDay(at) <= p.effectiveThrough, 'authority_expired', 'The financial authority is not effective.');
  const grant = p.grants.find(g => g.userId === a.userId);
  requireRule(grant && grant.actions.includes(action) && grant.methods.includes(method as 'cash' | 'bank'), 'action_forbidden', 'The actor has no configured authority for this action and method.');
  if (action !== 'observe' && action !== 'reconcile') requireRule(amount <= grant.maximumCentavos, 'amount_limit', 'The amount exceeds current financial authority.');
  if (action === 'authorize' || action === 'submit') {
    const age = Date.parse(at) - a.authenticatedAt.getTime();
    requireRule(a.authenticationMethods.includes('mfa') && age >= 0 && age <= p.mfaMaxAgeSeconds * 1000, 'fresh_mfa_required', 'Current financial authorization requires fresh MFA.');
  }
  return p;
}
/** Preconditions only: the caller must obtain/guard these records through real owner services. */
function releaseBasis(c: OperationContext, at: string) {
  const { saved: d, current: current, acceptance: a, publishedDocument: published } = c.basis, s = d.snapshot, application = current.application;
  requireRule(fingerprint(s) === d.snapshotHash, 'snapshot_changed', 'The saved decision failed integrity verification.');
  requireRule(s.input.outcome === 'approve' && application.status === 'decision_recorded' && c.basis.currentDecisionId === s.id, 'approval_required', 'A current recorded approval is required.');
  requireRule(!reviewChangeEffect(d, current, 'unreleased').changed, 'renewed_review_required', 'Current input, recommendation or conflict changes require renewed review.');
  const doc = s.document;
  requireRule(doc && doc.id === published.id && doc.sha256 === published.sha256 && a.documentId === doc.id && a.documentSha256 === doc.sha256
    && a.decisionId === s.id && a.snapshotHash === d.snapshotHash && a.memberId === application.memberId, 'acceptance_binding', 'The exact approved decision/document must have the linked member acknowledgment.');
  requireRule(Date.parse(s.recordedAt) <= Date.parse(a.acceptedAt) && Date.parse(a.acceptedAt) <= Date.parse(at), 'acceptance_time', 'Acknowledgment time must follow the decision and precede this action.');
  const policy = s.basis.authority;
  requireRule(policy.status === 'configured' && policy.approvalValidity.kind !== 'unavailable', 'validity_unavailable', 'Approval validity must be explicit.');
  if (policy.approvalValidity.kind === 'until') requireRule(businessDay(at) <= policy.approvalValidity.date, 'approval_expired', 'The approved terms have expired.');
  const offer = s.basis.offers.find(o => o.id === s.input.offerVersionId);
  requireRule(offer?.available, 'offer_unavailable', 'The approved offer is unavailable.');
  return { snapshot: s, offer, application, acceptance: a };
}
export function binding(loan: PendingOrigination, c: OperationContext, at: string) {
  requireRule(fingerprint(loan.offer) === loan.scheduleHash, 'schedule_changed', 'The exact saved schedule changed.');
  const b = releaseBasis(c, at);
  requireRule(loan.applicationId === b.application.id && loan.organizationId === b.application.organizationId && loan.branchId === b.application.branchId
    && loan.memberId === b.application.memberId && loan.decisionId === b.snapshot.id && loan.decisionSnapshotHash === c.basis.saved.snapshotHash
    && loan.assessmentInputVersion === b.application.assessmentInputVersion && fingerprint(loan.offer) === fingerprint(b.offer)
    && fingerprint(loan.acceptance) === fingerprint(b.acceptance), 'origination_changed', 'The pending origination does not match the exact accepted basis.');
}
function execution(c: OperationContext, mode: string, expectedRule?: string) {
  requireRule(c.execution.status === 'configured' && c.execution.mode === mode, 'execution_unavailable', 'Execution/component configuration is unavailable.');
  requireRule(expectedRule === undefined || c.execution.componentRuleVersionId === expectedRule, 'renew_execution_review', 'The component configuration changed; renewed financial review is required.');
  // Real execution is deliberately unavailable in this Phase 4 rules slice.
  requireRule(mode === 'simulation', 'actual_execution_unavailable', 'Actual financial execution is not enabled by these rules.');
}
export function preparePendingOrigination(actor: ActorContext, input: unknown, request: { id: string; at: string; method: 'cash' | 'bank'; existingOriginationId: string | null }) {
  const c = OperationContextSchema.parse(input), p = z.strictObject({ id: Id, at: Instant, method: z.enum(['cash', 'bank']), existingOriginationId: Id.nullable() }).parse(request);
  const b = releaseBasis(c, p.at), scope = { organizationId: b.application.organizationId, branchId: b.application.branchId, offer: b.offer };
  requireRule(b.offer.netReceivedCentavos > 0, 'release_amount', 'Positive approved delivered cash is required for this release slice.');
  permission(actor, c, scope, 'prepare', p.at, b.offer.netReceivedCentavos, p.method);
  requireRule(p.existingOriginationId === null, 'origination_exists', 'An origination already exists; another loan ID cannot bypass it.');
  return freeze(PendingOriginationSchema.parse({ id: p.id, organizationId: b.application.organizationId, branchId: b.application.branchId,
    memberId: b.application.memberId, applicationId: b.application.id, decisionId: b.snapshot.id, decisionSnapshotHash: c.basis.saved.snapshotHash,
    acceptance: b.acceptance, assessmentInputVersion: b.application.assessmentInputVersion, offer: b.offer, scheduleHash: fingerprint(b.offer), state: 'pending_release', preparedAt: p.at }));
}
function immutableCommand(c: Command) {
  return { id: c.id, loanId: c.loanId, organizationId: c.organizationId, branchId: c.branchId, applicationId: c.applicationId,
    preparedBy: c.preparedBy, kind: c.kind, componentRuleVersionId: c.componentRuleVersionId, mode: c.mode, createdAt: c.createdAt, origination: c.origination, payload: c.payload,
    businessEventId: c.businessEventId, providerKey: c.providerKey };
}
function checked(input: unknown) {
  const c = CommandSchema.parse(input), last = c.history.at(-1)!;
  requireRule(fingerprint(immutableCommand(c)) === c.payloadHash, 'command_changed', 'The immutable command payload changed.');
  requireRule(c.loanId === c.origination.id && c.payload.loanId === c.loanId && c.organizationId === c.origination.organizationId && c.branchId === c.origination.branchId
    && c.applicationId === c.origination.applicationId && c.currency === c.payload.currency && c.amountCentavos === c.payload.amountCentavos
    && c.amountCentavos === c.origination.offer.netReceivedCentavos && fingerprint(c.origination.offer) === c.origination.scheduleHash, 'command_binding', 'The command and origination bindings disagree.');
  requireRule(c.version === c.history.length && last.to === c.state && c.history[0].from === null && c.history[0].to === 'prepared'
    && c.history.every((entry, i) => i === 0 || entry.from === c.history[i - 1].to && Date.parse(entry.at) >= Date.parse(c.history[i - 1].at)), 'history_changed', 'The command history is inconsistent.');
  const legalHistory = c.history.every((entry, i) => {
    if (i === 0) return entry.action === 'prepare' && entry.actorId === c.preparedBy;
    if (entry.action === 'authorize') return entry.from === 'prepared' && entry.to === 'authorized';
    if (entry.action === 'submit') return entry.from === 'authorized' && entry.to === 'submitted';
    if (entry.action !== 'observe' && entry.action !== 'reconcile') return false;
    const allowed: Partial<Record<Command['state'], Command['state'][]>> = {
      submitted: ['submitted', 'unknown', 'failed', 'confirmed_unposted'], unknown: ['unknown', 'failed', 'confirmed_unposted'],
      failed: ['failed'], confirmed_unposted: ['confirmed_unposted'],
    };
    return entry.from !== null && Boolean(allowed[entry.from]?.includes(entry.to));
  });
  requireRule(legalHistory && c.history.filter(h => h.action === 'observe' || h.action === 'reconcile').length === c.observations.length,
    'history_changed', 'Stored history must follow the same allowed transitions and observation count.');
  requireRule(c.observations.every(o => o.input.commandId === c.id && o.input.businessEventId === c.businessEventId && o.input.providerKey === c.providerKey && o.input.mode === c.mode), 'observation_scope', 'Stored observations must belong to this command.');
  if (c.state === 'prepared') requireRule(c.authorization === null && c.authorizedBy === null && c.submission === null, 'authorization_binding', 'Prepared commands cannot carry authorization/submission.');
  else requireRule(c.authorization && c.authorizedBy === c.authorization.userId && c.authorizedBy !== c.preparedBy && c.authorization.payloadHash === c.payloadHash, 'authorization_binding', 'Financial authorization must bind the exact command and a separate person.');
  if (c.state === 'authorized') requireRule(c.submission === null, 'submission_binding', 'Authorization alone cannot contain a submission intent.');
  if (!['prepared', 'authorized'].includes(c.state)) requireRule(c.submission && c.submission.payloadHash === c.payloadHash, 'submission_binding', 'A durable submission intent is required.');
  return c;
}
function advance(c: Command, actor: ActorContext, at: string, action: 'authorize' | 'submit' | 'observe' | 'reconcile', state: Command['state']) {
  requireRule(c.version < Number.MAX_SAFE_INTEGER, 'version_limit', 'The command version cannot advance safely.');
  requireRule(Date.parse(at) >= Date.parse(c.history.at(-1)!.at), 'transition_time', 'Transition time cannot precede recorded history.');
  const next = structuredClone(c); next.version++; next.state = state;
  next.history.push({ from: c.state, to: state, at, actorId: actor.userId, action }); return next;
}
export function prepareReleaseCommand(actor: ActorContext, context: unknown, origination: unknown, input: unknown) {
  const c = OperationContextSchema.parse(context), loan = PendingOriginationSchema.parse(origination), p = PrepareCommandSchema.parse(input);
  requireRule(Date.parse(p.at) >= Date.parse(loan.preparedAt), 'transition_time', 'The command cannot precede its pending origination.');
  requireRule(p.request.method !== 'provider', 'provider_unavailable', 'Provider execution is not enabled.');
  binding(loan, c, p.at); permission(actor, c, loan, 'prepare', p.at, p.request.amountCentavos, p.request.method);
  requireRule(p.request.loanId === loan.id && p.request.amountCentavos === loan.offer.netReceivedCentavos, 'release_amount', 'The release must use the exact approved delivered-cash amount.');
  requireRule(p.releaseClaim === 'none', 'first_release_unavailable', 'A reserved, settled or unavailable first-release claim cannot create another command.');
  requireRule(c.execution.status === 'configured', 'execution_unavailable', 'Component/execution configuration must be explicit.');
  execution(c, c.execution.mode);
  const candidate: Command = { id: p.id, loanId: loan.id, version: 1, amountCentavos: p.request.amountCentavos, currency: p.request.currency,
    state: 'prepared', preparedBy: actor.userId, authorizedBy: null, providerReference: null, receiptId: null, journalId: null,
    kind: 'disbursement', componentRuleVersionId: c.execution.componentRuleVersionId, organizationId: loan.organizationId, branchId: loan.branchId, applicationId: loan.applicationId,
    mode: c.execution.mode, origination: loan, payload: p.request, payloadHash: '0'.repeat(64), businessEventId: p.businessEventId, providerKey: p.providerKey,
    createdAt: p.at, authorization: null, submission: null, observations: [], conflicts: [], history: [{ from: null, to: 'prepared', at: p.at, actorId: actor.userId, action: 'prepare' }] };
  candidate.payloadHash = fingerprint(immutableCommand(candidate)); return freeze(checked(candidate));
}
export function authorizeCommand(actor: ActorContext, context: unknown, input: unknown, preparation: unknown) {
  const c = OperationContextSchema.parse(context), command = checked(input), p = RuleRequestSchema.parse(preparation);
  requireRule(p.id === command.id && p.expectedVersion === command.version, 'stale_version', 'Reload the exact current command version.');
  requireRule(command.state === 'prepared', 'workflow_state', 'Only a prepared command can be authorized.');
  binding(command.origination, c, p.at); const policy = permission(actor, c, command.origination, 'authorize', p.at, command.amountCentavos, command.payload.method);
  requireRule(actor.userId !== command.preparedBy, 'self_authorization', 'A preparer cannot authorize their own financial command.');
  execution(c, command.mode, command.componentRuleVersionId);
  const next = advance(command, actor, p.at, 'authorize', 'authorized'); next.authorizedBy = actor.userId;
  next.authorization = { userId: actor.userId, at: p.at, policyVersionId: policy.versionId, payloadHash: command.payloadHash, authenticatedAt: actor.authenticatedAt.toISOString() };
  return freeze(checked(next));
}
export function prepareSubmission(actor: ActorContext, context: unknown, input: unknown, preparation: unknown) {
  const c = OperationContextSchema.parse(context), command = checked(input), p = RuleRequestSchema.extend({ attemptId: Id }).parse(preparation);
  requireRule(p.id === command.id && p.expectedVersion === command.version, 'stale_version', 'Reload the exact current command version.');
  requireRule(command.state === 'authorized', 'workflow_state', 'Only one submission intent can follow current authorization.');
  binding(command.origination, c, p.at); const policy = permission(actor, c, command.origination, 'submit', p.at, command.amountCentavos, command.payload.method);
  const authorizer = c.originalAuthorizer;
  requireRule(authorizer.status === 'current' && authorizer.active && authorizer.userId === command.authorizedBy && authorizer.organizationId === command.organizationId
    && authorizer.branchIds.includes(command.branchId) && authorizer.roles.includes('financial_authorizer'), 'authorizer_unavailable', 'Original financial authorizer applicability must be rechecked.');
  requireRule(command.authorization!.policyVersionId === policy.versionId && policy.grants.some(g => g.userId === command.authorizedBy && g.actions.includes('authorize')
    && g.methods.includes(command.payload.method as 'cash' | 'bank') && g.maximumCentavos >= command.amountCentavos), 'renew_authorization', 'Financial authority changed; renewed authorization review is required.');
  requireRule(Date.parse(p.at) - Date.parse(command.authorization!.authenticatedAt) <= policy.mfaMaxAgeSeconds * 1000, 'renew_authorization', 'Original financial-authorizer MFA is no longer current.');
  execution(c, command.mode, command.componentRuleVersionId);
  const next = advance(command, actor, p.at, 'submit', 'submitted');
  next.submission = { id: p.attemptId, submittedBy: actor.userId, at: p.at, payloadHash: command.payloadHash, claimVersion: next.version };
  return freeze(checked(next));
}
function outcomeIdentity(o: z.output<typeof ObservationInputSchema>) {
  return { producer: o.producer, movementId: o.movementId, mode: o.mode, state: o.state, amountMinorUnits: o.amountMinorUnits, currency: o.currency,
    effectiveDate: o.effectiveDate, occurredAt: o.occurredAt, commandId: o.commandId, businessEventId: o.businessEventId, providerKey: o.providerKey, providerReference: o.providerReference };
}
/** Returns a candidate preserving observation conflicts; caller persistence/uniqueness is still required. */
export function recordObservation(actor: ActorContext, context: unknown, input: unknown, request: unknown) {
  const c = ObservationContextSchema.parse(context), command = checked(input), p = RuleRequestSchema.extend({ observation: ObservationInputSchema, action: z.enum(['observe', 'reconcile']), movementClaimedElsewhere: z.boolean().default(false) }).parse(request), o = p.observation;
  permission(actor, c, command.origination, p.action, p.at, command.amountCentavos, command.payload.method);
  requireRule(p.id === command.id && o.commandId === command.id && o.businessEventId === command.businessEventId && o.providerKey === command.providerKey && o.mode === command.mode,
    'observation_scope', 'The observation must belong to this exact command/event/key/mode.');
  const previousId = command.observations.find(x => x.input.id === o.id);
  if (previousId) {
    requireRule(fingerprint(previousId.input) === fingerprint(o), 'observation_id_conflict', 'An observation ID already identifies different evidence.');
    return freeze({ command, disposition: 'duplicate' as const });
  }
  requireRule(p.expectedVersion === command.version, 'stale_version', 'Reload the exact current command version.');
  requireRule(command.submission && !['prepared', 'authorized'].includes(command.state), 'workflow_state', 'Observation requires a prior durable submission intent.');
  const known = command.observations.find(x => x.input.state === 'confirmed');
  const sameMovement = o.movementId === null ? undefined : command.observations.find(x => x.input.producer === o.producer && x.input.movementId === o.movementId);
  const problems: Command['conflicts'] = [];
  if (p.movementClaimedElsewhere) problems.push('movement_conflict');
  if (command.providerReference && o.providerReference && command.providerReference !== o.providerReference) problems.push('outcome_conflict');
  if (sameMovement && fingerprint(outcomeIdentity(sameMovement.input)) !== fingerprint(outcomeIdentity(o))) problems.push('movement_conflict');
  if (o.currency !== null && o.currency !== command.currency || o.amountMinorUnits !== null && o.amountMinorUnits !== command.amountCentavos
    || o.effectiveDate !== null && o.effectiveDate !== command.payload.effectiveDate || o.occurredAt !== null
      && (Date.parse(o.occurredAt) < Date.parse(command.submission.at) || Date.parse(o.occurredAt) > Date.parse(p.at))) problems.push('payload_mismatch');
  if (known && (o.state === 'failed' || o.state === 'confirmed' && (known.input.producer !== o.producer || known.input.movementId !== o.movementId))) problems.push('outcome_conflict');
  if (command.state === 'failed' && o.state === 'confirmed') problems.push('late_settlement');
  const state: Command['state'] = problems.length || command.conflicts.length ? command.state : known ? 'confirmed_unposted' : o.state === 'confirmed' ? 'confirmed_unposted' : o.state === 'failed' ? 'failed' : command.state === 'failed' ? 'failed' : 'unknown';
  const next = advance(command, actor, p.at, p.action, state);
  next.observations.push({ input: o, recordedAt: p.at, recordedBy: actor.userId });
  next.conflicts = [...new Set([...command.conflicts, ...problems])];
  if (o.providerReference && !problems.length) next.providerReference = o.providerReference;
  return freeze({ command: checked(next), disposition: problems.length ? 'conflict' as const : sameMovement ? 'duplicate_movement' as const : 'recorded' as const });
}
/** Read advice only. No transfer, status query, posting or balance calculation. */
export function recoveryAdvice(input: unknown) {
  const c = checked(input), knownSettlement = c.observations.some(o => o.input.state === 'confirmed');
  return freeze({ commandId: c.id, version: c.version, state: c.state, knownSettlement, releaseAuthorized: false,
    nextAction: c.conflicts.length ? 'review_conflicting_evidence' : knownSettlement ? 'posting_integration_required' : c.state === 'submitted' || c.state === 'unknown'
      ? c.providerReference === null ? 'operator_reconciliation_required' : 'query_existing_reference' : c.state === 'failed' ? 'review_failed_without_resubmission' : 'current_authorized_workflow_required',
    canResubmit: false, canActivateLoan: false, canPublishPostedReceipt: false });
}
/** Validated immutable view for local consumers; this does not authenticate or load a record. */
export function inspectCommand(input: unknown) { return freeze(checked(input)); }
