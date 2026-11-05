import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ActorContext, MemberActorContext } from '../../../../../packages/contracts/src/ports.js';
import { CalendarDay, Id, Instant, Role } from '../../../../../packages/contracts/src/schemas.js';
import { canonical } from '../../platform/commands.js';
import {
  AcceptancePreparationSchema, DecisionCandidateSchema, DecisionPreparationSchema,
  RecommendationPreparationSchema, ReviewContextSchema,
  type AcceptancePreparation, type DecisionCandidate, type DecisionPreparation,
  type DeepReadonly, type RecommendationPreparation, type ReviewContext,
} from './context.js';
import { datedScenario } from './workflow-basis.js';

/** A pure rule failure, not an HTTP error or proof of authenticated authority. */
export class DecisionRuleError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'DecisionRuleError'; }
}
function requireRule(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DecisionRuleError(code, message);
}
function hash(value: unknown): string { return createHash('sha256').update(canonical(value)).digest('hex'); }
function freeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
function unique(values: string[], code: string): void {
  requireRule(new Set(values).size === values.length, code, 'Duplicate references must be resolved before review.');
}
/** UTC instants are recorded; calendar expiry is inclusive in Asia/Manila. */
function businessDate(at: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(Instant.parse(at)));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return CalendarDay.parse(`${part('year')}-${part('month')}-${part('day')}`);
}
function context(input: DeepReadonly<ReviewContext>): ReviewContext {
  const c = ReviewContextSchema.parse(input);
  requireRule(c.periodStart <= c.periodEnd, 'invalid_horizon', 'The review period must have a valid start and end.');
  unique(c.offers.map(o => o.id), 'duplicate_offer');
  unique(c.sources.map(s => s.sourceId), 'duplicate_source');
  unique(c.facts.map(f => f.factId), 'duplicate_fact');
  unique(c.conflicts.map(f => f.userId), 'duplicate_conflict');
  if (c.authority.status === 'configured') {
    requireRule(c.authority.effectiveFrom <= c.authority.effectiveThrough, 'invalid_authority_period', 'The authority policy needs a valid effective period.');
    unique(c.authority.grants.map(g => g.userId), 'duplicate_grant');
    for (const grant of c.authority.grants) {
      unique(grant.outcomes, 'duplicate_outcome');
      unique(grant.exceptionPolicyIds, 'duplicate_exception_authority');
    }
  }
  for (const source of c.sources) requireRule(source.applicationId === c.application.id, 'source_scope', 'A source belongs to another application.');
  for (const fact of c.facts) {
    requireRule((fact.sourceId === null) === (fact.sourceVersion === null), 'source_reference', 'A fact needs both source identity and version, or neither.');
    if (fact.sourceId !== null) requireRule(c.sources.some(s => s.sourceId === fact.sourceId && s.sourceVersion === fact.sourceVersion), 'source_reference', 'The exact fact source version is unavailable.');
  }
  if (c.assessment) {
    requireRule(c.assessment.applicationId === c.application.id, 'assessment_scope', 'The assessment belongs to another application.');
    if (c.assessment.status === 'complete') {
      unique(c.assessment.scenarios.map(s => s.offerVersionId), 'duplicate_scenario');
      for (const scenario of c.assessment.scenarios) unique(scenario.policyChecks.map(p => p.policyId), 'duplicate_policy_check');
    }
  }
  if (c.recommendation) requireRule(c.recommendation.applicationId === c.application.id, 'recommendation_scope', 'The recommendation belongs to another application.');
  if (c.workflowBasis) {
    requireRule(!c.datedAssessment && !c.datedFacts && !c.datedSources, 'mixed_basis', 'A review must use one complete dated evidence representation.');
    const b = c.workflowBasis, a = b.assessment;
    requireRule(!c.facts.length && !c.sources.length, 'mixed_basis', 'A workflow basis cannot be mixed with legacy evidence projections.');
    requireRule(a.applicationId === c.application.id && a.periodStart === c.periodStart && a.periodEnd === c.periodEnd,
      'workflow_basis_scope', 'The complete workflow horizon and application must be preserved.');
    const projected = a.status === 'complete' ? { id:a.id, applicationId:a.applicationId, inputVersion:a.inputVersion,
      engineVersion:a.engineVersion, policyVersionId:a.policyVersionId, createdAt:a.createdAt, status:'complete',
      scenarios:a.scenarios.map(datedScenario), warnings:[] } : { id:a.id,applicationId:a.applicationId,inputVersion:a.inputVersion,
      engineVersion:a.engineVersion,policyVersionId:a.policyVersionId,createdAt:a.createdAt,status:'incomplete',issues:a.issues.map(message => ({factId:null,message})) };
    requireRule(hash(projected) === hash(c.assessment), 'workflow_assessment_changed', 'Use the exact saved dated assessment, without legacy monthly approximations.');
    requireRule(hash(c.offers) === hash(b.policy.offers.map(({separateFees, ...o}) => { void separateFees; return o; })),
      'workflow_offer_changed', 'Use the exact saved policy offers and their separate fee dates.');
  } else requireRule(!c.assessment || c.assessment.status !== 'complete' || c.assessment.scenarios.every(s => !('workflow' in s)),
    'workflow_basis_unavailable', 'A dated scenario requires its complete immutable workflow basis.');
  return c;
}
export function reviewSourceIds(c: ReviewContext): string[] {
  return c.workflowBasis ? c.workflowBasis.sources.map(s => s.sourceId) : c.sources.map(s => s.sourceId);
}
function clearance(c: ReviewContext, userId: string): void {
  const conflict = c.conflicts.find(f => f.userId === userId);
  requireRule(conflict?.status === 'clear', 'conflict_clearance_required', 'Current conflict clearance is required; restricted or unavailable declarations cannot authorize this action.');
}
function scope(actor: ActorContext, c: ReviewContext, role: 'officer' | 'reviewer'): void {
  const a = z.object({ userId: Id, organizationId: Id, branchIds: z.array(Id), roles: z.array(Role) }).parse(actor);
  requireRule(a.organizationId === c.application.organizationId && a.branchIds.includes(c.application.branchId), 'actor_scope', 'The actor cannot act on this application.');
  requireRule(a.roles.includes(role), 'role_required', `The ${role} role is required for this operation.`);
  clearance(c, a.userId);
}
function version(c: ReviewContext, expected: number): void {
  requireRule(expected === c.application.version, 'stale_version', 'Reload the current application version before submitting.');
}
export function currentAssessment(c: DeepReadonly<ReviewContext>) { return c.datedAssessment ?? c.assessment; }
export function reviewScenarios(c: DeepReadonly<ReviewContext>) {
  if(c.datedAssessment) return c.datedAssessment.scenarios.map(s=>({offerVersionId:s.offerId,policyChecks:s.checks.map(p=>({policyId:p.id,passed:p.passed,detail:p.detail,overridable:false})),dated:s}));
  return c.assessment?.status==='complete'?c.assessment.scenarios.map(s=>({offerVersionId:s.offerVersionId,policyChecks:s.policyChecks,legacy:s})):[];
}
function ready(c: ReviewContext, at: string, evidenceOnly=false) {
  const a = currentAssessment(c);
  requireRule(a?.status === 'complete', 'assessment_incomplete', 'A complete checked assessment is required; clarification remains available.');
  requireRule(a.inputVersion === c.application.assessmentInputVersion && a.policyVersionId === c.currentAssessmentPolicyVersionId, 'stale_assessment', 'The assessment input or financial policy version has changed.');
  requireRule(new Date(a.createdAt).getTime() <= new Date(at).getTime(), 'future_assessment', 'The assessment cannot be recorded after this action.');
  if (c.workflowBasis) {
    const b = c.workflowBasis;
    requireRule(!b.assessment.stale, 'stale_assessment', 'The saved workflow assessment is stale.');
    requireRule(b.facts.length > 0 && b.sources.length > 0, 'evidence_basis_unavailable', 'The checked assessment needs its authorized evidence basis.');
    if(c.integration?.format==='connected-review/v2')
      requireRule(b.sources.every(s=>s.state==='cleared'&&s.verification!=='mismatch'),
        'source_inventory_unavailable','Every supplied source in this fictional review must remain available for inspection without a recorded mismatch.');
    for (const f of b.facts.filter(f => f.input.relevance === 'included')) {
      requireRule(f.input.value.availability === 'recorded', 'critical_evidence_gap', 'Missing confirmed amounts cannot be overridden.');
      requireRule(b.sources.some(s => s.sourceId === f.sourceId && s.sourceVersion === f.sourceVersion && s.state === 'cleared'
        && s.verification !== 'mismatch'
        && (c.integration?.sourceReview !== 'independent_support_required' || s.verification === 'supported')),
      'source_unavailable', 'Each included fact needs its current cleared source and the configured verification standard.');
    }
  } else requireRule(c.sources.length > 0 && (c.datedFacts?.length ?? c.facts.length) > 0, 'evidence_basis_unavailable', 'The checked assessment needs its authorized evidence basis.');
  for (const fact of c.facts) {
    if (fact.critical) requireRule(fact.confirmation === 'accepted' && fact.value.availability === 'recorded', 'critical_evidence_gap', 'Missing or unresolved critical evidence cannot be overridden.');
    if (fact.confirmation === 'accepted' && fact.value.availability === 'recorded') requireRule(fact.sourceId !== null, 'source_reference', 'Accepted recorded facts need an exact source reference.');
  }
  if(c.datedAssessment){
    requireRule(!c.datedAssessment.stale,'stale_assessment','The dated assessment needs renewed review.');
    for(const fact of c.datedFacts??[]) if(fact.input.relevance==='included') requireRule(fact.input.value.availability==='recorded' && c.datedSources?.some(source=>source.id===fact.sourceId&&source.version===fact.sourceVersion&&source.state==='cleared'),'critical_evidence_gap','Included dated facts need current confirmed values and cleared sources.');
  }
  if (!evidenceOnly && c.integration?.format==='connected-review/v2') {
    const proof=c.reviewReadiness;
    requireRule(proof?.state==='current' && proof.evidenceBasisHash===hash(evidenceMaterial(c))
      && proof.confirmedBy===c.application.assignedOfficerId && Date.parse(proof.confirmedAt)<=Date.parse(at),
    'review_readiness_required','The assigned officer must confirm the complete current evidence and assessment after every required concern review.');
    unique(proof.reviewParticipantIds,'duplicate_review_participant');
    for(const participant of proof.reviewParticipantIds)clearance(c,participant);
  }
  return a;
}
/** Check supplied authoritative evidence, without claiming a human review occurred. */
export function validateReviewEvidence(input:DeepReadonly<ReviewContext>,at:string) {return ready(context(input),at,true);}
function offer(c: ReviewContext, offerId: string) {
  const selected = c.offers.find(o => o.id === offerId);
  requireRule(selected?.available, 'offer_unavailable', 'Select an explicitly available offer version.');
  return selected;
}
function authority(c: ReviewContext, actorId: string, outcome: 'approve' | 'decline' | 'return', at: string) {
  const policy = c.authority;
  requireRule(policy.status === 'configured', 'authority_unavailable', 'No applicable authority policy is configured.');
  const date = businessDate(at);
  requireRule(policy.effectiveFrom <= date && date <= policy.effectiveThrough, 'authority_expired', 'The authority policy is not effective for this action.');
  const grant = policy.grants.find(g => g.userId === actorId);
  requireRule(grant !== undefined && grant.outcomes.includes(outcome), 'outcome_forbidden', 'The actor has no configured authority for this outcome.');
  return { policy, grant };
}
/** Excludes workflow/assignment/concurrency metadata; includes actual material bindings. */
function material(c: ReviewContext) {
  const a = c.application;
  return {
    application: { id: a.id, organizationId: a.organizationId, branchId: a.branchId, memberId: a.memberId,
      purpose: a.purpose, requestedPrincipalCentavos: a.requestedPrincipalCentavos,
      requestedTermMonths: a.requestedTermMonths, currency: a.currency, assessmentInputVersion: a.assessmentInputVersion },
    periodStart: c.periodStart, periodEnd: c.periodEnd,
    currentAssessmentPolicyVersionId: c.currentAssessmentPolicyVersionId,
    assessment: c.assessment, offers: [...c.offers].sort((a, b) => a.id.localeCompare(b.id)),
    sources: [...c.sources].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    facts: [...c.facts].sort((a, b) => a.factId.localeCompare(b.factId)), authority: c.authority,
    ...(c.workflowBasis ? { workflowBasis:c.workflowBasis } : {}),
    ...(c.integration ? {integration:c.integration} : {}),
    ...(c.reviewReadiness ? {reviewReadiness:c.reviewReadiness} : {}),
    ...(c.datedAssessment?{datedAssessment:c.datedAssessment,datedFacts:c.datedFacts,datedSources:c.datedSources,pilotConfigurationVersion:c.pilotConfigurationVersion,conflictVersions:c.conflictVersions}:{}),
  };
}
function evidenceMaterial(c:ReviewContext) {
  const {reviewReadiness,...basis}=material(c);void reviewReadiness;return basis;
}
export function reviewEvidenceHash(input:DeepReadonly<ReviewContext>):string {return hash(evidenceMaterial(context(input)));}
export function reviewBasisHash(input: DeepReadonly<ReviewContext>): string { return hash(material(context(input))); }

export function prepareRecommendation(actor: ActorContext, input: DeepReadonly<ReviewContext>, preparation: RecommendationPreparation) {
  const c = context(input), p = RecommendationPreparationSchema.parse(preparation);
  scope(actor, c, 'officer'); version(c, p.expectedVersion);
  requireRule(c.application.assignedOfficerId === actor.userId, 'assignment_required', 'Only the assigned officer can prepare this recommendation.');
  requireRule(['assessment_ready', 'recommended'].includes(c.application.status), 'workflow_state', 'The application is not ready for a recommendation.');
  const assessment = ready(c, p.at);
  requireRule(p.request.assessmentId === assessment.id && p.request.inputVersion === assessment.inputVersion, 'recommendation_basis', 'The request must reference the current checked assessment.');
  offer(c, p.request.offerVersionId);
  requireRule(reviewScenarios(c).some(s => s.offerVersionId === p.request.offerVersionId), 'scenario_unavailable', 'A checked scenario is required for the recommended offer.');
  return freeze({ ...p.request, id: p.id, applicationId: c.application.id, preparedBy: actor.userId, preparedAt: new Date(p.at).toISOString(), basisHash: hash(material(c)) });
}

export function prepareDecision(actor: ActorContext, input: DeepReadonly<ReviewContext>, preparation: DecisionPreparation): DeepReadonly<DecisionCandidate> {
  const c = context(input), p = DecisionPreparationSchema.parse(preparation), request = p.request;
  scope(actor, c, 'reviewer'); version(c, p.expectedVersion);
  requireRule(actor.userId !== c.application.assignedOfficerId && actor.userId !== c.recommendation?.preparedBy, 'self_approval', 'A preparer cannot supply the reviewer decision, even when holding both roles.');
  const { policy, grant } = authority(c, actor.userId, request.outcome, p.at);
  requireRule(request.reviewDate >= c.periodEnd, 'review_date', 'The next review date cannot precede the assessed period end.');
  const basisHash = hash(material(c));
  requireRule(p.explanation.basisHash === basisHash && p.explanation.reviewedBy === actor.userId, 'explanation_review', 'Review the explanation against this exact basis before recording.');
  unique(p.explanation.sourceIds, 'duplicate_explanation_source');
  requireRule(p.explanation.sourceIds.every(id => reviewSourceIds(c).includes(id)), 'explanation_source', 'Explanation references must resolve to the saved sources.');
  requireRule(request.assessmentId === null || request.assessmentId === currentAssessment(c)?.id, 'decision_assessment', 'The requested assessment reference is not current.');
  requireRule(request.recommendationId === null || request.recommendationId === c.recommendation?.id, 'decision_recommendation', 'The requested recommendation reference is not current.');
  const recommendation = c.recommendation;
  const currentRecommendation = recommendation && recommendation.basisHash === basisHash
    && recommendation.inputVersion === c.application.assessmentInputVersion
    && recommendation.assessmentId === currentAssessment(c)?.id;
  if (request.outcome === 'return') {
    requireRule(['submitted', 'evidence_review', 'clarification', 'assessment_ready', 'recommended'].includes(c.application.status), 'workflow_state', 'This application cannot be returned from its current state.');
    requireRule(request.offerVersionId === null && request.exceptions.length === 0 && p.document === null, 'clarification_terms', 'Clarification cannot carry approved terms, policy exceptions or an acceptance document.');
  } else {
    requireRule(c.application.status === 'recommended', 'workflow_state', 'A current officer recommendation is required before the reviewer decision.');
    const assessment = ready(c, p.at);
    requireRule(currentRecommendation && recommendation && new Date(recommendation.preparedAt).getTime() <= new Date(p.at).getTime(), 'stale_recommendation', 'The officer must review the current basis and recommend again.');
    clearance(c, recommendation.preparedBy);
    requireRule(request.assessmentId === assessment.id && request.recommendationId === recommendation.id, 'decision_basis', 'Bind the decision to its current assessment and recommendation.');
    requireRule(request.offerVersionId !== null, 'offer_unavailable', 'A reviewer must identify the considered offer.');
    const selected = offer(c, request.offerVersionId);
    const scenario = reviewScenarios(c).find(s => s.offerVersionId === selected.id);
    requireRule(scenario, 'scenario_unavailable', 'The selected offer has no checked scenario.');
    if (request.outcome === 'approve') {
      requireRule(policy.requiredApprovers === 1, 'quorum_not_supported', 'This standalone slice cannot finalize a multi-approver decision.');
      requireRule(grant.approvalLimitCentavos !== null && selected.principalCentavos <= grant.approvalLimitCentavos, 'approval_limit', 'The approval amount exceeds the configured authority or its limit is unavailable.');
      requireRule(policy.approvalValidity.kind !== 'unavailable', 'approval_validity_unavailable', 'An explicit approval-validity rule is required.');
      if (policy.approvalValidity.kind === 'until') requireRule(businessDate(p.at) <= policy.approvalValidity.date, 'approval_expired', 'The approved terms would already be expired.');
      requireRule(p.document !== null, 'acceptance_document_unavailable', 'Approval needs the exact version and checksum of its terms document.');
      unique(request.exceptions.map(e => e.policyId), 'duplicate_exception');
      const failed = scenario.policyChecks.filter(check => !check.passed);
      for (const exception of request.exceptions) requireRule(failed.some(check => check.policyId === exception.policyId), 'irrelevant_exception', 'Exceptions must identify failed checks for the selected scenario.');
      for (const check of failed) {
        requireRule(check.overridable, 'non_overridable_check', 'The failed policy check cannot be overridden.');
        requireRule(grant.exceptionPolicyIds.includes(check.policyId), 'exception_forbidden', 'The reviewer lacks authority for this policy exception.');
        requireRule(request.exceptions.some(e => e.policyId === check.policyId), 'exception_required', 'Record an authorized reason for every failed overridable check.');
      }
    } else requireRule(request.exceptions.length === 0 && p.document === null, 'decline_terms', 'Decline cannot carry approval exceptions or an acceptance document.');
  }
  if (currentRecommendation && (request.outcome !== 'approve' || request.offerVersionId !== recommendation.offerVersionId)) requireRule(request.departureReason.trim(), 'departure_reason', 'Explain the departure from the current officer recommendation.');
  const snapshot = { ...(c.workflowBasis ? {format:'decision-snapshot/v2' as const} : {}), id: p.id, recordedAt: new Date(p.at).toISOString(), reviewerId: actor.userId, reviewerRoles: [...actor.roles],
    input: request, basis: c, document: p.document, explanation: p.explanation };
  return freeze({ snapshot, snapshotHash: hash(snapshot) });
}

function checkedDecision(input: DeepReadonly<DecisionCandidate>): DecisionCandidate {
  const d = DecisionCandidateSchema.parse(input);
  requireRule(hash(d.snapshot) === d.snapshotHash, 'snapshot_changed', 'The saved decision snapshot has changed.');
  return d;
}
export function reviewChangeEffect(saved: DeepReadonly<DecisionCandidate>, input: DeepReadonly<ReviewContext>, loanStage: 'unreleased' | 'released') {
  const stage = z.enum(['unreleased', 'released']).parse(loanStage);
  const d = checkedDecision(saved), c = context(input);
  requireRule(c.application.id === d.snapshot.basis.application.id && c.application.organizationId === d.snapshot.basis.application.organizationId && c.application.memberId === d.snapshot.basis.application.memberId, 'decision_scope', 'The decision and current application do not match.');
  const participants = [d.snapshot.reviewerId, d.snapshot.basis.recommendation?.preparedBy].filter((id): id is string => id !== undefined);
  const restricted = participants.some(id => c.conflicts.find(f => f.userId === id)?.status !== 'clear');
  const changed = restricted || hash(material(c)) !== hash(material(d.snapshot.basis))
    || hash(c.recommendation) !== hash(d.snapshot.basis.recommendation);
  return freeze({ changed, preserveSnapshot: true,
    holdUnreleasedLoan: changed && stage === 'unreleased',
    action: !changed ? 'unchanged' : stage === 'unreleased' ? 'renew_review' : 'preserve_contract_and_refer' });
}

export function prepareMemberAcceptance(actor: MemberActorContext, input: DeepReadonly<ReviewContext>, saved: DeepReadonly<DecisionCandidate>, preparation: AcceptancePreparation) {
  const c = context(input), d = checkedDecision(saved), p = AcceptancePreparationSchema.parse(preparation);
  z.object({ kind: z.literal('member'), linkId: Id, memberId: Id, organizationId: Id }).parse(actor);
  requireRule(actor.organizationId === c.application.organizationId && actor.memberId === c.application.memberId, 'member_scope', 'Only the linked member can acknowledge these terms.');
  version(c, p.expectedVersion);
  requireRule(c.application.status === 'decision_recorded', 'workflow_state', 'A recorded decision is required before acceptance.');
  requireRule(d.snapshot.input.outcome === 'approve', 'not_approved', 'Only approved terms can be accepted.');
  requireRule(p.currentDecisionId === d.snapshot.id && p.request.decisionId === d.snapshot.id, 'superseded_decision', 'The requested decision is not the current decision.');
  requireRule(!reviewChangeEffect(d, c, 'unreleased').changed, 'renewed_review_required', 'Material changes require renewed review before acceptance.');
  const document = d.snapshot.document;
  requireRule(document && document.id === p.request.documentVersionId && document.id === p.publishedDocument.id && document.sha256 === p.publishedDocument.sha256, 'acceptance_document', 'Acceptance must reference the exact published terms version and checksum.');
  requireRule(new Date(p.at).getTime() >= new Date(d.snapshot.recordedAt).getTime(), 'acceptance_before_decision', 'Acceptance cannot precede the recorded decision.');
  const policy = d.snapshot.basis.authority;
  requireRule(policy.status === 'configured' && policy.approvalValidity.kind !== 'unavailable', 'approval_validity_unavailable', 'The saved approval has no configured acceptance validity.');
  if (policy.approvalValidity.kind === 'until') requireRule(businessDate(p.at) <= policy.approvalValidity.date, 'approval_expired', 'The approved terms have expired; obtain renewed review.');
  return freeze({ decisionId: d.snapshot.id, documentVersionId: document.id, documentSha256: document.sha256,
    snapshotHash: d.snapshotHash, memberId: actor.memberId, linkId: actor.linkId,
    acceptedAt: new Date(p.at).toISOString(), acceptedOn: businessDate(p.at), acknowledgment: p.request.acknowledgment });
}
