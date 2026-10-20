import { dateLabel, money } from './format';
import type { DecisionSnapshot, ExplanationDraft } from './types';

/** All money in this template comes from the frozen facts, offer and checked assessment. */
export function buildExplanation(snapshot: DecisionSnapshot): ExplanationDraft {
  const { input, assessment } = snapshot;
  const offer = snapshot.offers.find(item => item.id === input.offerId);
  const scenario = assessment.status === 'complete' ? assessment.scenarios.find(item => item.offerId === input.offerId) : undefined;
  const sourceIds = [...new Set(snapshot.facts.flatMap(fact => fact.sourceId && snapshot.sources.some(source => source.id === fact.sourceId) ? [fact.sourceId] : []))];
  const outcomeText = input.outcome === 'approve' ? 'approved' : input.outcome === 'decline' ? 'declined' : 'returned for clarification';
  const sections: ExplanationDraft['sections'] = [{ title: 'Decision and reason', body: input.rationale.trim() || 'A reviewer rationale is required before recording.', sourceIds: [] }];
  if (offer && scenario) {
    sections.push({ title: 'Option and full cost', sourceIds: [], body: `${offer.label}: principal ${money(offer.principal)}; net amount received ${money(offer.netReceived)}; fees paid separately ${money(offer.feesPaidSeparately)}. Term: ${offer.termMonths} months. Total repayment ${money(scenario.totalRepayment)}; total financing cost ${money(scenario.financingCost)}. Repayment dates and amounts: ${offer.payments.map(payment => `${dateLabel(payment.date)} — ${money(payment.amount)}`).join('; ')}. ${offer.policyNote}` });
    sections.push({ title: 'Monthly money and cash timing', sourceIds, body: `For ${dateLabel(snapshot.periodStart)} to ${dateLabel(snapshot.periodEnd)}, monthly remaining money is ${money(scenario.monthlyRemaining)} after recorded essential expenses, existing obligations not already deducted, and the proposed repayment. The lowest dated end-of-day balance is ${money(scenario.lowestBalance)}; the closing balance is ${money(scenario.closingBalance)}. ${scenario.shortageDates.length ? `Modeled shortage dates: ${scenario.shortageDates.map(dateLabel).join(', ')}.` : 'No dated shortage appears in this recorded cycle.'} A monthly total and a dated cash balance answer different questions. Moving a repayment date does not remove an overall monthly shortfall.` });
  }
  const opening = snapshot.facts.find(fact => fact.category === 'opening');
  sections.push({ title: 'Assumptions and sources', sourceIds, body: `This review uses the recorded evidence for ${dateLabel(snapshot.periodStart)} to ${dateLabel(snapshot.periodEnd)}. Opening spendable cash: ${opening?.value !== null && opening?.value !== undefined && !['missing', 'conflicting'].includes(opening.status) ? money(opening.value) : 'unavailable'}. Opening cash is excluded from monthly remaining money. Loan proceeds are reserved for the financed purchase and excluded from household spendable cash. Obligations already deducted from take-home pay are counted only once. Dates represent end-of-day balances, not intraday spending or future cycles. Member-reported circumstances are statements, not independently verified documents.` });
  const concerns = assessment.status === 'incomplete'
    ? `The assessment is incomplete: ${assessment.issues.map(issue => issue.message).join(' ')} No complete affordability result is available. Clarification does not imply an adverse judgment about the member.`
    : `${scenario?.policyChecks.filter(check => !check.passed).map(check => `${check.label}: ${check.detail}`).join(' ') || 'No failed check is recorded for the selected option.'} ${assessment.warnings.join(' ')} These modeled figures are not a guarantee of affordability or future wellbeing; unreported events and changing circumstances may affect household needs.`;
  sections.push({ title: 'Remaining concerns', sourceIds, body: concerns.trim() });
  if (input.departureReason.trim()) sections.push({ title: 'Departure from the officer recommendation', sourceIds: [], body: input.departureReason.trim() });
  if (input.outcome === 'approve' && input.exceptions.length) sections.push({ title: 'Recorded policy exceptions', sourceIds: [], body: input.exceptions.map(exception => `${scenario?.policyChecks.find(check => check.policyId === exception.policyId)?.label ?? exception.policyId} (${exception.policyId}): ${exception.reason.trim()}`).join(' ') });
  const nextStep = input.outcome === 'return' ? 'Clarify the information described above with staff, then return the case for a new review.' : input.outcome === 'approve' ? 'Discuss the recorded option, full costs, and remaining concerns with staff before any next institutional step.' : 'Discuss the recorded reason and any available next steps with staff. This record does not create a new offer.';
  sections.push({ title: 'Next step and review date', sourceIds: [], body: `${nextStep} Review date: ${dateLabel(input.reviewDate)}.` });
  return { origin: 'template', summary: `${snapshot.memberName} — application ${outcomeText} by the demo reviewer. This is a fictional demonstration decision.`, sections };
}
