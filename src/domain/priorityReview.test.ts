import { describe, expect, it } from 'vitest';
import { createDemoCases } from '../demo/cases';
import { applyCorrection } from './evidence';
import { acknowledgeNotice, assignEscalation, checkConcern, compareReviewQueue, confirmEvidenceCurrent, DEMO_OFFICER as officer, DEMO_REVIEWER as reviewer, evaluateReview, evidenceBasis, recordInvestigation, synchronizeReview } from './priorityReview';
import { makeRecommendation, recordDecision, validateDecision } from './review';
import type { DecisionInput } from './types';
import { preparedReviewAna, reviewTestAt as at } from '../test/reviewFixtures';

const decision = (patch: Partial<DecisionInput> = {}): DecisionInput => ({ outcome: 'approve', offerId: 'requested', rationale: 'Reviewed the recorded evidence.', departureReason: 'Recorded separate human judgment.', exceptions: [], reviewDate: '2026-12-01', explanationReviewed: true, ...patch });

describe('priority review and accountable escalation', () => {
  it('shows simultaneous clarification, AI checking and historical material recheck paths', () => {
    const ana = preparedReviewAna();
    const changed = applyCorrection(ana, { factId: 'income', value: null, status: 'missing', sourceId: null, effectiveDate: '2026-10-20', reason: 'New information needs clarification.' }, officer, at);
    const view = evaluateReview(changed);
    expect(view.paths).toEqual(['Needs clarification', 'Awaiting concern check', 'Escalated review']);
    expect(view.scenario).toBeUndefined();
    expect(view.priority).toBe(0);
    expect(view.escalation!.observations.length).toBeGreaterThan(0);
  });
  it('ranks material concerns first, then original submission and ID without changing age', () => {
    const [ana, ben, cora] = createDemoCases();
    ana.createdAt = '2026-10-10'; cora.createdAt = '2026-10-01';
    const assigned = assignEscalation(ben, 'Please investigate.', officer, at);
    expect(assigned.createdAt).toBe(ben.createdAt);
    expect([ana, assigned, cora].sort(compareReviewQueue).map(record => record.id)).toEqual(['AG-002', 'AG-003', 'AG-001']);
    ana.createdAt = cora.createdAt;
    expect([cora, ana].sort(compareReviewQueue)[0].id).toBe('AG-001');
  });
  it('keeps acknowledgments idempotent and independent of recommendation versions and resolution', () => {
    let record = makeRecommendation(createDemoCases()[1], 'requested', 'Please review.', officer, at);
    const version = record.version;
    record = assignEscalation(record, 'Material concern.', officer, at);
    record = assignEscalation(record, 'Same eligible reviewer.', officer, at);
    const noticeId = record.review!.escalation!.notices[0].id;
    record = acknowledgeNotice(record, noticeId, reviewer, at);
    record = acknowledgeNotice(record, noticeId, reviewer, '2026-10-21T12:00:00Z');
    expect(record.version).toBe(version);
    expect(record.review!.escalation!.assignments).toHaveLength(1);
    expect(record.review!.escalation!.notices).toHaveLength(1);
    expect(record.review!.escalation!.notices[0].acknowledged!.at).toBe(at);
    expect(evaluateReview(record)).toMatchObject({ escalated: true, investigated: false, ready: false });
    expect(() => recordInvestigation(record, 'resolve', 'Read notice.', reviewer, at)).toThrow(/passing active-offer/);
  });
  it('requires currentness and AI checking without letting dismissal clear a computed failure', () => {
    let record = createDemoCases()[0];
    record = checkConcern(record, 'ana-income-sources', 'dismiss', 'A checked suggestion alone is not a financial fact.', '', officer, at);
    expect(record.facts[1].status).toBe('conflicting');
    expect(() => confirmEvidenceCurrent(record, 'Checked.', officer, at)).toThrow(/Resolve evidence/);
    const ready = preparedReviewAna();
    expect(evaluateReview(ready).ready).toBe(true);
    expect(evaluateReview(ready).offerId).toBe('payday-aligned');
    expect(evaluateReview(ready).assessment.status).toBe('complete');
    const withoutCheck = structuredClone(ready); withoutCheck.review!.concernReviews = [];
    expect(validateDecision(withoutCheck, decision({ outcome: 'decline', offerId: 'payday-aligned' })).errors).toHaveProperty('concerns');
    withoutCheck.review!.evidenceConfirmations = [];
    expect(validateDecision(withoutCheck, decision({ outcome: 'decline' })).errors).toHaveProperty('currentness');
  });
  it('blocks exception bypass and allows only an investigated decline on the current basis', () => {
    let ben = confirmEvidenceCurrent(createDemoCases()[1], 'Current fictional sources checked.', officer, at);
    ben = makeRecommendation(ben, 'requested', 'Present recorded shortfall for human decision.', officer, at);
    ben = assignEscalation(ben, 'Both checks fail.', officer, at);
    const attempted = decision({ exceptions: [{ policyId: 'monthly-capacity', reason: 'Attempted exception.' }, { policyId: 'cash-timing', reason: 'Attempted exception.' }] });
    expect(validateDecision(ben, attempted).valid).toBe(false);
    expect(validateDecision(ben, decision({ outcome: 'decline' })).errors).toHaveProperty('escalation');
    ben = recordInvestigation(ben, 'investigate', 'Verified monthly shortfall; changing payment dates cannot remove it.', reviewer, at);
    expect(validateDecision(ben, decision({ outcome: 'decline' })).valid).toBe(true);
    const declined = recordDecision(ben, decision({ outcome: 'decline' }), reviewer, at);
    expect(evaluateReview(declined).completed).toBe(true);
    expect(declined.decisions[0].review!.escalation!.actions.at(-1)!.kind).toBe('declined');
    expect(declined.decisions[0].review!.escalation!.observations[0].checks.some(check => !check.passed)).toBe(true);
    expect(validateDecision(ben, attempted).valid).toBe(false);
  });
  it('retains outstanding clarification requests and lets the officer respond without fabricating facts', () => {
    let record = assignEscalation(createDemoCases()[1], 'Investigate.', officer, at);
    record = recordInvestigation(record, 'clarification', 'Clarify obligation evidence.', reviewer, at);
    expect(evaluateReview(record).paths).toContain('Needs clarification');
    const facts = structuredClone(record.facts);
    record = recordInvestigation(record, 'respond', 'Existing obligation source checked; no value changed.', officer, at);
    expect(record.facts).toEqual(facts);
    expect(evaluateReview(record).needsClarification).toBe(false);
    expect(evaluateReview(record).escalated).toBe(true);
  });
  it('requires reviewer closure after a permitted alternative, preserving immutable decision review history', () => {
    const record = preparedReviewAna();
    expect(evaluateReview(record).ready).toBe(true);
    const saved = recordDecision(record, decision({ offerId: 'payday-aligned', departureReason: '' }), reviewer, at);
    const snapshot = JSON.stringify(saved.decisions[0]);
    const changed = applyCorrection(saved, { factId: 'income', value: 2300000, status: 'document-supported', sourceId: 'payslip', effectiveDate: '2026-10-20', reason: 'Updated fictional circumstances.' }, officer, at);
    expect(evaluateReview(changed)).toMatchObject({ confirmed: false, escalated: true, completed: false, ready: false });
    expect(changed.review!.escalation!.notices).toHaveLength(record.review!.escalation!.notices.length + 1);
    expect(JSON.stringify(changed.decisions[0])).toBe(snapshot);
    expect(synchronizeReview(changed, at).review!.escalation!.notices).toHaveLength(changed.review!.escalation!.notices.length);
  });
  it('keeps workflow actions off the financial basis and reopens checks on source, offer or period changes', () => {
    const ready = preparedReviewAna();
    const before = evidenceBasis(ready);
    const noted = confirmEvidenceCurrent(ready, 'Rechecked the same period.', officer, at);
    expect(evidenceBasis(noted)).toBe(before);
    expect(noted.version).toBe(ready.version);
    const noteOnly = makeRecommendation(noted, 'payday-aligned', 'Updated recommendation note.', officer, at);
    expect(evaluateReview(noteOnly).ready).toBe(true);
    for (const mutate of [(record: typeof ready) => { record.sources[0].excerpt += ' Updated.'; }, (record: typeof ready) => { record.offers[0].policyNote += ' Updated.'; }, (record: typeof ready) => { record.periodEnd = '2026-12-01'; }]) {
      const changed = structuredClone(ready); mutate(changed);
      expect(evaluateReview(changed)).toMatchObject({ confirmed: false, escalated: true, ready: false });
    }
  });
  it('enforces demo action roles and assigned reviewer identity', () => {
    const record = createDemoCases()[1];
    expect(() => assignEscalation(record, 'Reason.', reviewer, at)).toThrow(/officer/);
    const assigned = assignEscalation(record, 'Reason.', officer, at);
    expect(() => acknowledgeNotice(assigned, assigned.review!.escalation!.notices[0].id, { role: 'reviewer', name: 'Other' }, at)).toThrow(/not assigned/);
    expect(() => recordInvestigation(assigned, 'investigate', 'Reason.', officer, at)).toThrow(/reviewer/);
  });
  it('does not resurrect old confirmations or resolutions when financial values or offers are restored', () => {
    const ready = preparedReviewAna();
    const correction = { factId: 'income', value: 2300000, status: 'document-supported' as const, sourceId: 'payslip', effectiveDate: '2026-10-20', reason: 'Updated fictional statement.' };
    const changed = applyCorrection(ready, correction, officer, at);
    const restored = applyCorrection(changed, { ...correction, value: 2400000 }, officer, at);
    expect(evaluateReview(restored)).toMatchObject({ confirmed: false, resolved: false, ready: false });
    const otherOffer = makeRecommendation(ready, 'requested', 'Reconsider requested date.', officer, at);
    const originalOffer = makeRecommendation(otherOffer, 'payday-aligned', 'Return to permitted later date.', officer, at);
    expect(evaluateReview(originalOffer)).toMatchObject({ confirmed: true, resolved: false, ready: false });
  });
  it('permits Cora to return for clarification without inventing financial figures', () => {
    const saved = recordDecision(createDemoCases()[2], decision({ outcome: 'return', offerId: null }), reviewer, at);
    expect(saved.decisions[0].assessment.status).toBe('incomplete');
    expect(evaluateReview(saved).paths).toContain('Needs clarification');
  });
  it('does not clear a returned clarification request by merely rewriting the recommendation', () => {
    const ana = preparedReviewAna();
    const returned = recordDecision(ana, decision({ outcome: 'return', offerId: null }), reviewer, at);
    const rewritten = makeRecommendation(returned, 'payday-aligned', 'Only the recommendation note changed.', officer, at);
    expect(evaluateReview(rewritten)).toMatchObject({ returned: true, ready: false });
    expect(validateDecision(rewritten, decision({ offerId: 'payday-aligned' })).errors).toHaveProperty('clarification');
  });
});
