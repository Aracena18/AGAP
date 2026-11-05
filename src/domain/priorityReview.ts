import { assessCase } from './assessment';
import type { CaseRecord, ConcernReview, DemoActor, EscalationAction, ReviewState, SimulatedConcern } from './types';

export const DEMO_OFFICER: DemoActor = { name: 'Mara Santos', role: 'officer' };
export const DEMO_REVIEWER: DemoActor = { name: 'Luis Reyes', role: 'reviewer' };
export const REVIEW_CAPABILITY_STATUS = 'Working';
export type ReviewPath = 'Needs clarification' | 'Awaiting concern check' | 'Escalated review' | 'Ready for approval';
const emptyReview = (): ReviewState => ({ aiConcerns: [], evidenceConfirmations: [], concernReviews: [] });

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonicalize(item)]));
  return value;
}

/** Exact input identity, not a security hash. Workflow-only actions cannot stale their own basis. */
export function evidenceBasis(record: Pick<CaseRecord, 'periodStart' | 'periodEnd' | 'facts' | 'sources' | 'offers' | 'review'>): string {
  return JSON.stringify(canonicalize([record.review?.evidenceRevision ?? 0, record.periodStart, record.periodEnd, record.facts, record.sources, record.offers]));
}
export function evaluateReview(record: CaseRecord) {
  const assessment = assessCase(record);
  const review = record.review ?? emptyReview();
  const basis = evidenceBasis(record);
  const recommendation = record.recommendation?.caseVersion === record.version && record.recommendation.actor.role === 'officer'
    ? record.recommendation : null;
  const offerId = recommendation?.offerId ?? 'requested';
  const scenario = assessment.status === 'complete' ? assessment.scenarios.find(item => item.offerId === offerId) : undefined;
  const context = JSON.stringify([basis, offerId, review.offerRevision ?? 0]);
  const failures = scenario?.policyChecks.filter(check => !check.passed) ?? [];
  const confirmed = review.evidenceConfirmations.some(action => action.basis === basis);
  const pendingConcerns = review.aiConcerns.filter(concern => !review.concernReviews.some(action => action.concernId === concern.id && action.basis === basis));
  const escalation = review.escalation;
  const assignment = escalation?.assignments.at(-1);
  const resolved = escalation?.actions.at(-1)?.kind === 'resolve' && escalation.actions.at(-1)?.basis === context && assessment.status === 'complete' && failures.length === 0;
  const escalated = failures.length > 0 || Boolean(escalation && !resolved);
  const investigated = Boolean(assignment && escalation?.actions.some(action => action.basis === context && action.actor.name === assignment.reviewer.name && ['investigate', 'clarification', 'options', 'resolve'].includes(action.kind)));
  const lastRequest = escalation ? [...escalation.actions].reverse().find(action => action.basis === context && ['clarification', 'options', 'respond', 'resolve'].includes(action.kind)) : undefined;
  const latest = record.decisions.at(-1);
  const returned = Boolean(latest?.input.outcome === 'return' && evidenceBasis(latest) === basis);
  const completed = latest?.caseVersion === record.version && latest.input.outcome !== 'return';
  const needsClarification = assessment.status === 'incomplete' || returned || lastRequest?.kind === 'clarification';
  const blockers: string[] = [];
  if (assessment.status === 'incomplete') blockers.push(...assessment.issues.map(issue => issue.message));
  if (!confirmed) blockers.push('Mara must confirm that the evidence applies to the modeled period.');
  if (!recommendation || !scenario) blockers.push('A current recommendation for an available, checked offer is required.');
  if (pendingConcerns.length) blockers.push('Mara must check every simulated AI concern against the current sources.');
  if (needsClarification && assessment.status !== 'incomplete') blockers.push('Respond to the clarification request with corrected evidence and a renewed recommendation.');
  if (failures.length) blockers.push(...failures.map(check => check.detail));
  if (escalated) blockers.push(assignment ? 'Luis must investigate and verify resolution of the escalation.' : 'Mara must assign the escalation to Luis Reyes.');
  const ready = blockers.length === 0 && !completed;
  const paths: ReviewPath[] = [];
  if (!completed) {
    if (needsClarification) paths.push('Needs clarification');
    if (pendingConcerns.length) paths.push('Awaiting concern check');
    if (escalated) paths.push('Escalated review');
    if (ready) paths.push('Ready for approval');
  }
  return { assessment, review, basis, context, recommendation, offerId, scenario, failures, confirmed, pendingConcerns, escalation, assignment, escalated, investigated, resolved, lastRequest, completed, returned, needsClarification, blockers, ready, paths, priority: escalated ? 0 : 1 };
}

/** Observe material checks at save boundaries; never create history while rendering. */
export function synchronizeReview(record: CaseRecord, at: string, concerns?: SimulatedConcern[]): CaseRecord {
  const next = structuredClone(record);
  next.review ??= emptyReview();
  if (concerns) next.review.aiConcerns = structuredClone(concerns);
  const view = evaluateReview(next);
  if (view.failures.length && !next.review.escalation) next.review.escalation = { observations: [], assignments: [], notices: [], actions: [] };
  const escalation = next.review.escalation;
  if (escalation && view.failures.length && !escalation.observations.some(item => item.basis === view.context)) {
    escalation.observations.push({ basis: view.context, offerId: view.offerId, at, checks: structuredClone(view.failures), sourceIds: [...new Set(next.facts.flatMap(fact => fact.sourceId ? [fact.sourceId] : []))] });
  }
  const assignment = escalation?.assignments.at(-1);
  if (escalation && assignment && view.escalated && !view.completed && !escalation.notices.some(notice => notice.basis === view.context)) {
    escalation.notices.push({ id: `${next.id}-notice-${escalation.notices.length + 1}`, basis: view.context, recipient: { ...assignment.reviewer }, at });
  }
  return next;
}

function requireRole(actor: DemoActor, role: 'officer' | 'reviewer') {
  if (actor.role !== role) throw new Error(`Only the demo ${role} can perform this action.`);
}
function reasonText(reason: string) {
  if (!reason.trim() || reason.trim().length > 2000) throw new Error('Record a reason between 1 and 2,000 characters.');
  return reason.trim();
}
function editable(record: CaseRecord) {
  if (evaluateReview(record).completed) throw new Error('This decision is recorded. Material evidence changes require renewed review first.');
}
export function confirmEvidenceCurrent(record: CaseRecord, reason: string, actor: DemoActor, at: string): CaseRecord {
  requireRole(actor, 'officer'); editable(record);
  const next = synchronizeReview(record, at);
  const view = evaluateReview(next);
  if (view.assessment.status !== 'complete') throw new Error('Resolve evidence and assessment issues before confirming currentness.');
  next.review!.evidenceConfirmations.push({ basis: view.basis, reason: reasonText(reason), actor: { ...actor }, at });
  return next;
}
export function checkConcern(record: CaseRecord, concernId: string, outcome: ConcernReview['outcome'], reason: string, correctedText: string, actor: DemoActor, at: string): CaseRecord {
  requireRole(actor, 'officer'); editable(record);
  const next = synchronizeReview(record, at);
  if (!next.review!.aiConcerns.some(concern => concern.id === concernId)) throw new Error('Choose an available simulated concern.');
  if (!['confirm', 'correct', 'dismiss'].includes(outcome)) throw new Error('Choose a concern-check outcome.');
  if (outcome === 'correct' && !correctedText.trim()) throw new Error('Record the corrected observation; change financial facts through Evidence.');
  next.review!.concernReviews.push({ concernId, outcome, reason: reasonText(reason), correctedText: outcome === 'correct' ? reasonText(correctedText) : '', basis: evidenceBasis(next), actor: { ...actor }, at });
  return next;
}
export function assignEscalation(record: CaseRecord, reason: string, actor: DemoActor, at: string): CaseRecord {
  requireRole(actor, 'officer'); editable(record);
  const next = synchronizeReview(record, at);
  const view = evaluateReview(next);
  if (!view.escalated || !next.review!.escalation) throw new Error('There is no active escalation to assign.');
  if (view.assignment) return next;
  next.review!.escalation.assignments.push({ basis: view.context, reason: reasonText(reason), reviewer: { ...DEMO_REVIEWER }, actor: { ...actor }, at });
  return synchronizeReview(next, at);
}
export function acknowledgeNotice(record: CaseRecord, noticeId: string, actor: DemoActor, at: string): CaseRecord {
  requireRole(actor, 'reviewer');
  const next = synchronizeReview(record, at);
  const notice = next.review?.escalation?.notices.find(item => item.id === noticeId);
  if (!notice || notice.recipient.name !== actor.name) throw new Error('This notice is not assigned to this demo reviewer.');
  notice.acknowledged ??= { actor: { ...actor }, at };
  return next;
}
export function recordInvestigation(record: CaseRecord, kind: EscalationAction['kind'], reason: string, actor: DemoActor, at: string): CaseRecord {
  requireRole(actor, kind === 'respond' ? 'officer' : 'reviewer'); editable(record);
  if (!['investigate', 'clarification', 'options', 'respond', 'resolve'].includes(kind)) throw new Error('Choose a valid investigation action.');
  const next = synchronizeReview(record, at);
  const view = evaluateReview(next);
  if (!view.escalated || !view.assignment || (kind !== 'respond' && view.assignment.reviewer.name !== actor.name)) throw new Error('An active escalation must be assigned to this reviewer first.');
  if (kind === 'respond' && !['clarification', 'options'].includes(view.lastRequest?.kind ?? '')) throw new Error('There is no pending reviewer request.');
  if (kind === 'resolve' && (view.assessment.status !== 'complete' || !view.confirmed || view.failures.length > 0)) throw new Error('Current, confirmed evidence and passing active-offer checks are required to resolve this escalation.');
  next.review!.escalation!.actions.push({ kind, reason: reasonText(reason), basis: view.context, actor: { ...actor }, at });
  return next;
}
export function compareReviewQueue(a: CaseRecord, b: CaseRecord): number {
  return evaluateReview(a).priority - evaluateReview(b).priority || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}
