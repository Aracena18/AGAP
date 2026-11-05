/** Fictional UI simulation only. Not an authoritative producer or application adapter. */
import { CONTRACT_VERSION } from '../../../packages/contracts/src/schemas';
import type { StaffSession } from '../access/StaffContext';
import { createDemoCases } from '../../demo/cases';
import { assessCase } from '../../domain/assessment';
import { HistoryPageSchema, SavedBriefSchema, WorkspaceViewSchema } from '../../../apps/api/src/modules/decisions/staff-views';
import type { SavedBrief, StaffDecisionGateway, WorkspaceView } from './staff-gateway';
export const testId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function staffUiFixture(requested = false) {
  const record = createDemoCases()[0];
  Object.assign(record.facts[1], { value: 2_400_000, status: 'document-supported', sourceId: 'payslip', effectiveDate: '2026-10-20' });
  const a = assessCase(record);
  if (a.status !== 'complete') throw new Error('Canonical fictional Ana must be complete for this UI fixture.');
  const original = record.offers.find(o => o.id === (requested ? 'requested' : 'payday-aligned'))!;
  const checked = a.scenarios.find(s => s.offerId === original.id)!;
  const offer = { id: testId(5), productVersionId: testId(6), label: original.label, principalCentavos: original.principal,
    netReceivedCentavos: original.netReceived, feesPaidSeparatelyCentavos: original.feesPaidSeparately, termMonths: original.termMonths,
    payments: original.payments.map(p => ({ date: p.date, amountCentavos: p.amount })), available: original.available };
  const scenario = { offerVersionId: offer.id, monthlyRemainingCentavos: checked.monthlyRemaining, lowestBalanceCentavos: checked.lowestBalance,
    closingBalanceCentavos: checked.closingBalance, shortageDates: checked.shortageDates, totalRepaymentCentavos: checked.totalRepayment,
    financingCostCentavos: checked.financingCost, policyChecks: checked.policyChecks.map(p => ({ policyId: p.policyId, passed: p.passed, detail: p.detail, overridable: true })) };
  const now = new Date().toISOString();
  const session: StaffSession = { user: { id: testId(8), displayName: 'Fictional reviewer · UI simulation', organizationId: testId(1), branchIds: [testId(2)], branches: [{ id: testId(2), name: 'Fictional branch' }], roles: ['reviewer'] }, csrfToken: 'fictional-ui-test-csrf-not-a-live-token', expiresAt: new Date(Date.now() + 3600_000).toISOString(), privacyNoticeVersion: 'fictional-v1', contractVersion: CONTRACT_VERSION };
  const view: WorkspaceView = WorkspaceViewSchema.parse({ application: { id: testId(3), organizationId: testId(1), branchId: testId(2), memberId: testId(4), memberName: 'Fictional Ana · UI simulation', purpose: record.purpose,
    requestedPrincipalCentavos: offer.principalCentavos, requestedTermMonths: offer.termMonths, currency: 'PHP', status: 'recommended', version: 2, assessmentInputVersion: 1,
    assignedOfficerId: testId(7), createdAt: now, updatedAt: now }, basisHash: '1'.repeat(64), periodStart: record.periodStart, periodEnd: record.periodEnd,
    assessment: { id: testId(9), inputVersion: 1, state: 'complete', issues: [] }, offers: [{ offer, checked: scenario, recommend: false, outcomes: ['approve', 'decline'] }],
    recommendation: { id: testId(10), offerVersionId: offer.id, preparedBy: testId(7), preparedAt: now, reason: 'Fictional officer examined the permitted checked alternative.' },
    canReturn: true, blockedReason: null, currentDecisionId: null });
  const history = HistoryPageSchema.parse({ items: [], nextCursor: null });
  const briefs = new Map<string, SavedBrief>();
  const gateway: StaffDecisionGateway = {
    workspace: async () => structuredClone(view), history: async () => structuredClone(history),
    brief: async (_app, id) => { const b = briefs.get(id); if (!b) throw new Error('Selected saved brief unavailable.'); return structuredClone(b); },
    document: async () => ({ id: testId(12), text: 'Fictional exact saved UTF-8 terms.', sha256: '2'.repeat(64) }),
    recommend: async () => ({ id: testId(10), version: ++view.application.version }),
    preview: async (_app, body, options) => ({ id: testId(11), decisionId: testId(13), applicationVersion: options.version,
      basisHash: view.basisHash, expiresAt: new Date(Date.now() + 900_000).toISOString(), explanation: body.rationale,
      terms: body.outcome === 'approve' ? 'Fictional exact saved UTF-8 terms.' : null }),
    record: async (_app, body) => {
      const id = testId(13), at = new Date().toISOString();
      const brief = SavedBriefSchema.parse({ id, applicationId: view.application.id, memberName: view.application.memberName, inputVersion: 1, recordedAt: at, reviewerId: session.user.id,
        outcome: body.outcome, explanation: body.rationale, origin: 'template', reviewDate: body.reviewDate, periodStart: view.periodStart, periodEnd: view.periodEnd,
        considered: body.outcome === 'return' ? null : { offer, checked: { ...scenario, policyChecks: scenario.policyChecks.map(p => ({ ...p, detail: 'Configured check.' })) } },
        snapshotHash: '3'.repeat(64), document: body.outcome === 'approve' ? { id: testId(12), sha256: '2'.repeat(64) } : null,
        sources: [{ sourceId: testId(14), sourceVersion: 1, verification: 'unavailable', effectiveDates: ['2026-10-20'] }] });
      briefs.set(id, brief); view.currentDecisionId = id; view.application.status = 'decision_recorded'; view.application.version++;
      view.canReturn = false; view.offers.forEach(o => { o.outcomes = []; o.recommend = false; });
      const result = { id, applicationId: view.application.id, inputVersion: 1, outcome: body.outcome, recordedAt: at, reviewerId: session.user.id, snapshotHash: brief.snapshotHash };
      if (!history.items.some(i => i.id === id)) history.items.push({ ...result, accepted: false });
      return result;
    },
  };
  return { session, view, history, briefs, gateway };
}
