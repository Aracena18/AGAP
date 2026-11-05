import { createDemoCases } from '../demo/cases';
import { applyCorrection } from '../domain/evidence';
import { assignEscalation, checkConcern, confirmEvidenceCurrent, DEMO_OFFICER, DEMO_REVIEWER, recordInvestigation } from '../domain/priorityReview';
import { makeRecommendation } from '../domain/review';

export const reviewTestAt = '2026-10-20T12:00:00.000Z';
export function preparedReviewAna(offerId = 'payday-aligned') {
  let record = applyCorrection(createDemoCases()[0], { factId: 'income', value: 2400000, status: 'document-supported', sourceId: 'payslip', effectiveDate: '2026-10-20', reason: 'Current payslip checked.' }, DEMO_OFFICER, reviewTestAt);
  record = checkConcern(record, 'ana-income-sources', 'correct', 'Current payslip applies; old worksheet retained.', 'Current income reconciled against its source.', DEMO_OFFICER, reviewTestAt);
  record = confirmEvidenceCurrent(record, 'Evidence checked for the modeled November period.', DEMO_OFFICER, reviewTestAt);
  record = makeRecommendation(record, offerId, 'Discussed the available dates and full costs.', DEMO_OFFICER, reviewTestAt);
  record = assignEscalation(record, 'Review the material timing concern and permitted alternative.', DEMO_OFFICER, reviewTestAt);
  return recordInvestigation(record, offerId === 'payday-aligned' ? 'resolve' : 'investigate', 'Checked current evidence, active offer and the dated movements.', DEMO_REVIEWER, reviewTestAt);
}
