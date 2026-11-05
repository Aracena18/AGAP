import { assessCase } from './assessment';
import { buildExplanation } from './explanation';
import { isCalendarDate } from './format';
import { evaluateReview, synchronizeReview } from './priorityReview';
import type { CaseRecord, DecisionInput, DecisionSnapshot, DecisionValidation, DemoActor } from './types';

export function makeRecommendation(record: CaseRecord, offerId: string, note: string, actor: DemoActor, at: string): CaseRecord {
  if (actor.role !== 'officer') throw new Error('Only the demo officer can make a recommendation.');
  if (!note.trim()) throw new Error('Add a recommendation note explaining the proposed option.');
  if (!record.offers.some(offer => offer.id === offerId && offer.available)) throw new Error('Select an available offer.');
  if (assessCase(record).status !== 'complete') throw new Error('The assessment is incomplete. Resolve the listed evidence gaps before recommending an offer.');
  const updated = synchronizeReview(record, at);
  if (evaluateReview(record).offerId !== offerId) updated.review!.offerRevision = (updated.review!.offerRevision ?? 0) + 1;
  updated.version += 1;
  updated.recommendation = { offerId, note: note.trim(), actor: structuredClone(actor), at, caseVersion: updated.version };
  return synchronizeReview(updated, at);
}

export function validateDecision(record: CaseRecord, input: DecisionInput): DecisionValidation {
  const errors: Record<string, string> = {};
  const assessment = assessCase(record);
  const review = evaluateReview(record);
  const currentRecommendation = record.recommendation?.caseVersion === record.version && record.recommendation.actor.role === 'officer' ? record.recommendation : null;
  if (!['approve', 'decline', 'return'].includes(input.outcome)) errors.outcome = 'Choose a decision outcome.';
  if (!input.rationale.trim()) errors.rationale = input.outcome === 'return' ? 'Explain which information needs clarification and the next step.' : 'Explain the reason for this decision.';
  if (!isCalendarDate(input.reviewDate) || input.reviewDate < record.periodEnd) errors.reviewDate = `Choose a valid review date on or after ${record.periodEnd}.`;
  if (!input.explanationReviewed) errors.explanationReviewed = 'Review the template explanation and confirm it before recording.';
  if (input.outcome !== 'return') {
    if (assessment.status !== 'complete') errors.assessment = 'The assessment is incomplete. Resolve the evidence gaps or return the case for clarification.';
    if (!currentRecommendation) errors.recommendation = record.recommendation ? 'The officer recommendation is out of date. Ask the officer to review the current evidence and recommend again.' : 'An officer recommendation is required before approval or decline.';
    if (!record.offers.some(offer => offer.id === input.offerId && offer.available)) errors.offerId = 'Select an available offer for this decision.';
    if (!review.confirmed) errors.currentness = 'Mara must confirm that the current evidence applies to the modeled period.';
    if (review.pendingConcerns.length) errors.concerns = 'Check all simulated AI concerns against the current sources before approval or decline.';
    if (review.needsClarification) errors.clarification = 'Resolve the pending clarification request before approval or decline.';
    if (input.outcome === 'approve' && review.escalated) errors.escalation = 'The assigned reviewer must verify resolution of the escalation before approval.';
    if (input.outcome === 'decline' && review.escalated && !review.investigated) errors.escalation = 'The assigned reviewer must record an investigation on the current basis before decline.';
  }
  const departs = currentRecommendation && (input.outcome !== 'approve' || input.offerId !== currentRecommendation.offerId);
  if (departs && !input.departureReason.trim()) errors.departureReason = 'Explain why this decision departs from the current officer recommendation.';
  if (input.outcome === 'approve' && assessment.status === 'complete') {
    const scenario = assessment.scenarios.find(item => item.offerId === input.offerId);
    if (!scenario) errors.offerId = 'A checked assessment for the selected available offer is required.';
    for (const check of scenario?.policyChecks ?? []) {
      if (!check.passed) errors[`exception.${check.policyId}`] = `${check.label} is blocking. Correct the evidence or recommend a permitted offer; exception reasons cannot bypass this demo check.`;
    }
    for (const exception of input.exceptions) {
      if (!scenario?.policyChecks.some(check => check.policyId === exception.policyId && !check.passed)) errors.exceptions = 'Exceptions must refer to a failing policy check for the selected offer.';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function recordDecision(record: CaseRecord, input: DecisionInput, actor: DemoActor, at: string): CaseRecord {
  if (actor.role !== 'reviewer') throw new Error('Only the demo reviewer can record a final decision.');
  const validation = validateDecision(record, input);
  if (!validation.valid) throw new Error(Object.values(validation.errors).join(' '));
  const reviewed = synchronizeReview(record, at);
  const active = evaluateReview(reviewed);
  if (input.outcome === 'decline' && active.escalated && active.assignment?.reviewer.name !== actor.name) throw new Error('Only the assigned demo reviewer can decline this escalated application.');
  const normalized: DecisionInput = {
    ...input, offerId: input.outcome === 'return' ? null : input.offerId,
    rationale: input.rationale.trim(), departureReason: input.departureReason.trim(),
    exceptions: input.outcome === 'approve' ? input.exceptions.map(exception => ({ policyId: exception.policyId, reason: exception.reason.trim() })) : [],
  };
  const decisionId = `${record.id}-decision-${record.decisions.length + 1}-${at}`;
  if (input.outcome === 'decline' && active.escalated) reviewed.review!.escalation!.actions.push({ kind: 'declined', basis: active.context, actor: { ...actor }, at, reason: normalized.rationale, decisionId });
  const snapshot: DecisionSnapshot = structuredClone({
    id: decisionId,
    caseId: record.id, caseVersion: record.version, memberName: record.member.name, recordedAt: at, reviewer: actor,
    input: normalized, periodStart: record.periodStart, periodEnd: record.periodEnd,
    facts: record.facts, sources: record.sources, offers: record.offers, recommendation: record.recommendation, assessment: assessCase(record),
    review: reviewed.review,
  });
  snapshot.explanation = buildExplanation(snapshot);
  const updated = reviewed;
  updated.decisions.push(snapshot);
  return updated;
}

export function recordFollowUp(record: CaseRecord, reviewDate: string, note: string, actor: DemoActor, at: string): CaseRecord {
  if (actor.role !== 'officer' && actor.role !== 'reviewer') throw new Error('A demo staff role is required.');
  if (!isCalendarDate(reviewDate) || reviewDate < record.periodEnd) throw new Error(`Choose a valid review date on or after ${record.periodEnd}.`);
  if (note.trim().length > 500) throw new Error('Keep the follow-up note to 500 characters or fewer.');
  const updated: CaseRecord = structuredClone(record);
  updated.followUp = { reviewDate, note: note.trim(), updatedAt: at };
  return updated;
}
