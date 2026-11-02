import { LoanWorkspaceSchema } from '../../../apps/api/src/modules/servicing/money-context';
import { staffUiFixture, testId } from '../decision/staff.test-fixture';
import type { LoanGateway } from './loan-gateway';
/** Labeled fictional UI only; no authentication, provider, ledger or canonical demo data. */
export function loanUiFixture(posted = false) {
  const base = staffUiFixture(), loanId = testId(301), commandId = testId(302);
  const session = { ...base.session, user: { ...base.session.user, displayName: 'Fictional financial authorizer', roles: ['financial_authorizer'] as typeof base.session.user.roles } };
  const receipt = { eventId: testId(304), commandId: testId(305), loanId, kind: 'repayment' as const, amountCentavos: 1_000_000, currency: 'PHP' as const,
    effectiveDate: '2026-11-02', postedAt: '2026-11-02T05:00:00Z', journalId: testId(306), receiptId: testId(307), principalAfterCentavos: 0, postingRuleVersionId: testId(308) };
  const commands = [{ id: commandId, kind: 'disbursement' as const, version: 4, state: posted ? 'confirmed' as const : 'confirmed_unposted' as const, amountCentavos: 1_000_000, effectiveDate: '2026-11-02', legacy: !posted }];
  const view = LoanWorkspaceSchema.parse({ loanId, organizationId: session.user.organizationId, branchId: session.user.branchIds[0], memberLabel: 'Fictional member · UI simulation', commands, message: posted ? 'This is a fictional posted-position simulation.' : 'Settlement is recorded; accounting posting is pending.', nextPayment: null,
    position: posted ? { loanId, applicationId: testId(309), memberLabel: 'Fictional member · UI simulation', state: 'settled', asOfDate: '2026-11-02', principalCentavos: 0,
      interestDueCentavos: 0, feesDueCentavos: 0, overdueCentavos: 0, postedThrough: receipt.postedAt, pendingMovementCount: 0,
      schedule: [{ date: '2026-11-02', amountCentavos: 1_000_000 }], receipts: [receipt], commands } : null });
  const gateway: LoanGateway = { workspace: async () => structuredClone(view), act: async () => ({ recorded: true }) };
  return { loanId, commandId, view, session, gateway, receipt };
}
