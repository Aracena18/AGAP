import { describe, expect, it } from 'vitest';
import { createDemoCases } from '../demo/cases';
import { makeRecommendation, recordDecision, recordFollowUp, validateDecision } from './review';
import { buildExplanation } from './explanation';
import type { CaseRecord, DecisionInput, DemoActor } from './types';
import { preparedReviewAna } from '../test/reviewFixtures';

const officer: DemoActor = { name: 'Officer', role: 'officer' };
const reviewer: DemoActor = { name: 'Reviewer', role: 'reviewer' };
const at = '2026-10-20T12:00:00.000Z';
function correctedAna(): CaseRecord {
  const record = createDemoCases()[0];
  const income = record.facts.find(fact => fact.id === 'income')!;
  Object.assign(income, { value: 2400000, status: 'document-supported', sourceId: 'payslip', effectiveDate: '2026-10-20' });
  return record;
}
function ready(offerId = 'payday-aligned'): CaseRecord { return preparedReviewAna(offerId); }
function input(patch: Partial<DecisionInput> = {}): DecisionInput {
  return { outcome: 'approve', offerId: 'payday-aligned', rationale: 'Reviewed evidence and discussed household needs.', departureReason: '', exceptions: [], reviewDate: '2026-12-01', explanationReviewed: true, ...patch };
}

describe('officer recommendation', () => {
  it('requires officer, complete assessment, available offer and a note', () => {
    expect(() => makeRecommendation(correctedAna(), 'requested', 'Reason', reviewer, at)).toThrow(/officer/i);
    expect(() => makeRecommendation(createDemoCases()[0], 'requested', 'Reason', officer, at)).toThrow(/incomplete/i);
    expect(() => makeRecommendation(correctedAna(), 'requested', '  ', officer, at)).toThrow(/note/i);
    const unavailable = correctedAna(); unavailable.offers[0].available = false;
    expect(() => makeRecommendation(unavailable, 'requested', 'Reason', officer, at)).toThrow(/available/i);
  });
  it('increments the version and stamps the recommendation without changing its input', () => {
    const original = correctedAna(); const result = makeRecommendation(original, 'payday-aligned', '  Reason  ', officer, at);
    expect(result.version).toBe(2); expect(result.recommendation).toMatchObject({ caseVersion: 2, note: 'Reason', actor: officer });
    expect(original.version).toBe(1); expect(original.recommendation).toBeNull();
  });
});

describe('human decision rules', () => {
  it('requires a rationale, valid review date and explicit explanation review', () => {
    const errors = validateDecision(ready(), input({ rationale: ' ', reviewDate: '2026-02-30', explanationReviewed: false })).errors;
    expect(errors).toHaveProperty('rationale'); expect(errors).toHaveProperty('reviewDate'); expect(errors).toHaveProperty('explanationReviewed');
    expect(validateDecision(ready(), input({ reviewDate: '2026-11-29' })).valid).toBe(false);
    expect(validateDecision(ready(), input({ reviewDate: '2026-11-30' })).valid).toBe(true);
  });
  it('rejects missing or stale officer recommendation for approval and decline', () => {
    expect(validateDecision(correctedAna(), input()).errors).toHaveProperty('recommendation');
    const stale = ready(); stale.version += 1;
    expect(validateDecision(stale, input()).errors).toHaveProperty('recommendation');
    expect(validateDecision(stale, input({ outcome: 'decline' })).errors).toHaveProperty('recommendation');
  });
  it('requires a departure reason when changing, declining or returning a current recommendation', () => {
    const record = ready('requested');
    for (const outcome of ['approve', 'decline', 'return'] as const) {
      expect(validateDecision(record, input({ outcome })).errors).toHaveProperty('departureReason');
      expect(validateDecision(record, input({ outcome, departureReason: 'Member requested further discussion.' })).errors).not.toHaveProperty('departureReason');
    }
  });
  it('rejects approval of failing checks even with explicit exception reasons', () => {
    const record = makeRecommendation(createDemoCases()[1], 'requested', 'Requesting a human review.', officer, at);
    const noExceptions = input({ offerId: 'requested' });
    expect(validateDecision(record, noExceptions).errors).toHaveProperty('exception.monthly-capacity');
    expect(validateDecision(record, noExceptions).errors).toHaveProperty('exception.cash-timing');
    const partiallyExplained = input({ offerId: 'requested', exceptions: [{ policyId: 'monthly-capacity', reason: ' ' }, { policyId: 'cash-timing', reason: 'Recorded timing discussion.' }] });
    expect(validateDecision(record, partiallyExplained).errors).toHaveProperty('exception.monthly-capacity');
    const explained = input({ offerId: 'requested', exceptions: [{ policyId: 'monthly-capacity', reason: 'Explicit fictional exception to negative monthly remaining.' }, { policyId: 'cash-timing', reason: 'Explicit fictional exception to dated shortage.' }] });
    expect(validateDecision(record, explained).valid).toBe(false);
  });
  it('does not turn unavailable offers or incomplete evidence into an approval', () => {
    const unavailable = ready(); unavailable.offers[1].available = false;
    expect(validateDecision(unavailable, input()).errors).toHaveProperty('offerId');
    const incomplete = createDemoCases()[2];
    expect(validateDecision(incomplete, input({ exceptions: [{ policyId: 'monthly-capacity', reason: 'Attempted override' }] })).errors).toHaveProperty('assessment');
    expect(validateDecision(incomplete, input({ outcome: 'decline' })).errors).toHaveProperty('assessment');
  });
  it('allows Cora to return for clarification without an offer or recommendation', () => {
    const cora = createDemoCases()[2];
    const clarification = input({ outcome: 'return', offerId: null, rationale: 'Please clarify take-home income and its source.' });
    expect(validateDecision(cora, clarification).valid).toBe(true);
    expect(validateDecision(cora, { ...clarification, rationale: ' ' }).errors).toHaveProperty('rationale');
    const result = recordDecision(cora, clarification, reviewer, at);
    expect(result.decisions[0].assessment.status).toBe('incomplete');
    expect(result.decisions[0].explanation?.summary).toMatch(/returned.*clarification/i);
    expect(JSON.stringify(result.decisions[0].explanation)).not.toMatch(/₱0|affordable/i);
  });
  it('enforces reviewer role and preserves a deeply independent snapshot', () => {
    const record = ready(); const decisionInput = input();
    expect(() => recordDecision(record, decisionInput, officer, at)).toThrow(/reviewer/i);
    const result = recordDecision(record, decisionInput, reviewer, at);
    const snapshot = result.decisions[0]; const saved = JSON.stringify(snapshot);
    record.facts[0].value = 1; record.sources[0].title = 'Changed'; record.offers[0].payments[0].amount = 1;
    decisionInput.rationale = 'Changed'; reviewer.name = 'Changed';
    result.facts[1].value = 1; result.offers[1].payments[0].amount = 1;
    expect(JSON.stringify(snapshot)).toBe(saved); expect(result.version).toBe(3); expect(record.decisions).toHaveLength(0);
    expect(snapshot.assessment.status).toBe('complete');
    if (snapshot.assessment.status === 'complete') {
      expect(snapshot.assessment.scenarios.find(scenario => scenario.offerId === 'payday-aligned')).toMatchObject({ monthlyRemaining: 200000, lowestBalance: 100000, closingBalance: 1100000, totalRepayment: 3600000, financingCost: 600000 });
    }
  });
});

describe('saved explanation and follow-up', () => {
  it('retains the checked shortfall concerns when a complete case is returned without choosing an offer', () => {
    const ben = createDemoCases()[1];
    const snapshot = recordDecision(ben, input({ outcome: 'return', offerId: null, rationale: 'Discuss the monthly shortfall and clarify household circumstances.' }), reviewer, at).decisions[0];
    const concerns = snapshot.explanation!.sections.find(section => section.title === 'Remaining concerns')!;
    expect(concerns.body).toContain('−₱4,000');
    expect(concerns.body).toContain('Requested schedule');
    expect(concerns.body).toContain('After-payday schedule');
    expect(concerns.body).not.toContain('No failed check');
  });
  it('includes full costs, monthly versus timing, concerns, review date and resolvable sources', () => {
    const snapshot = recordDecision(ready(), input(), reviewer, at).decisions[0];
    const explanation = buildExplanation(snapshot); const text = JSON.stringify(explanation);
    for (const amount of ['₱30,000', '₱36,000', '₱6,000', '₱3,000', '₱2,000', '₱1,000']) expect(text).toContain(amount);
    expect(text).toMatch(/monthly/i); expect(text).toMatch(/dated|daily/i); expect(text).toMatch(/not a guarantee/i); expect(text).toContain('Dec 1, 2026');
    expect(explanation.origin).toBe('template');
    expect(explanation.sections.flatMap(section => section.sourceIds).length).toBeGreaterThan(0);
    expect(explanation.sections.flatMap(section => section.sourceIds).every(id => snapshot.sources.some(source => source.id === id))).toBe(true);
  });
  it('keeps prior print content when recommendations or follow-up change', () => {
    const recorded = recordDecision(ready(), input(), reviewer, at); const frozen = JSON.stringify(recorded.decisions);
    const followUp = recordFollowUp(recorded, '2026-12-15', 'Member check-in arranged.', officer, at);
    expect(followUp.version).toBe(recorded.version); expect(JSON.stringify(followUp.decisions)).toBe(frozen);
    expect(followUp.followUp?.note).toBe('Member check-in arranged.'); expect(recorded.followUp).toBeNull();
    const changed = makeRecommendation(followUp, 'requested', 'New discussion.', officer, at);
    expect(changed.decisions[0].caseVersion).toBeLessThan(changed.version); expect(JSON.stringify(changed.decisions)).toBe(frozen);
    expect(() => recordFollowUp(recorded, '2026-02-30', 'Invalid date', officer, at)).toThrow(/date/i);
    expect(() => recordFollowUp(recorded, '2026-12-15', 'x'.repeat(501), officer, at)).toThrow(/500/);
  });
});
