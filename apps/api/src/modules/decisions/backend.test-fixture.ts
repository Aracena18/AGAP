import { randomUUID } from 'node:crypto';
import type { MemberTransactionContext, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { ApplicationSchema } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { reviewBasisHash } from './rules.js';
import { termsChecksum } from './decision-documents.js';
import type { ReviewContext } from './context.js';
import type { DecisionBackendPorts } from './backend-contracts.js';

/** Fictional owner-adapter stand-ins only. Never registered in createApp.
 * These test adapters touch shared fixture tables to simulate Robert/Aaron's
 * future public transaction boundaries; production decision code does not.
 */
export function fictionalBasis(application: ReviewContext['application'], reviewerId: string): ReviewContext {
  const offer = randomUUID(), policy = randomUUID(), source = randomUUID();
  return { application, periodStart: '2026-11-01', periodEnd: '2026-11-30', currentAssessmentPolicyVersionId: policy,
    assessment: { id: randomUUID(), applicationId: application.id, inputVersion: application.assessmentInputVersion,
      engineVersion: 'fictional-integration-fixture-v1', policyVersionId: policy, createdAt: new Date(Date.now() - 1000).toISOString(),
      status: 'complete', warnings: [], scenarios: [{ offerVersionId: offer, monthlyRemainingCentavos: 500_000,
        lowestBalanceCentavos: 100_000, closingBalanceCentavos: 600_000, totalRepaymentCentavos: 1_000_000,
        financingCostCentavos: 0, shortageDates: [], policyChecks: [{ policyId: 'fictional-check', passed: true, detail: 'Fictional checked fixture', overridable: false }] }] },
    offers: [{ id: offer, productVersionId: randomUUID(), label: 'Fictional test offer', principalCentavos: 1_000_000,
      netReceivedCentavos: 1_000_000, feesPaidSeparatelyCentavos: 0, termMonths: 1, payments: [{ date: '2026-11-25', amountCentavos: 1_000_000 }], available: true }],
    sources: [{ sourceId: source, sourceVersion: 1, applicationId: application.id, excerpt: 'Fictional statement for integration tests only.',
      sha256: termsChecksum('fictional statement'), verification: 'unavailable' }],
    facts: [{ factId: randomUUID(), value: { availability: 'recorded', amountCentavos: 3_000_000 }, sourceId: source, sourceVersion: 1,
      effectiveDate: '2026-11-01', cashDate: '2026-11-15', critical: true, confirmation: 'accepted' }],
    authority: { status: 'configured', versionId: randomUUID(), effectiveFrom: '2026-01-01', effectiveThrough: '2026-12-31',
      requiredApprovers: 1, approvalValidity: { kind: 'until', date: '2026-12-31' },
      grants: [{ userId: reviewerId, outcomes: ['approve', 'decline', 'return'], approvalLimitCentavos: 2_000_000, exceptionPolicyIds: [] }] },
    conflicts: [{ userId: application.assignedOfficerId!, status: 'clear', reference: 'fictional-officer-declaration' },
      { userId: reviewerId, status: 'clear', reference: 'fictional-reviewer-declaration' }], recommendation: null };
}
type Tx = TransactionContext | MemberTransactionContext;
export function fictionalPorts(hooks: { afterLoad?: () => Promise<void>; failTransition?: boolean } = {}): DecisionBackendPorts {
  async function authorize(tx: Tx, app: string) {
    const rows = await tx.query('SELECT id FROM applications.applications WHERE organization_id=$1 AND id=$2', [tx.actor.organizationId, app]);
    if (!rows.rowCount) throw notFound();
  }
  async function load(tx: Tx, app: string): Promise<ReviewContext> {
    // Shared writer/guard protocol represented only for these fictional tests.
    const row = (await tx.query('SELECT * FROM applications.applications WHERE organization_id=$1 AND id=$2 FOR UPDATE', [tx.actor.organizationId, app])).rows[0];
    if (!row) throw notFound();
    const data = (await tx.query<{ body: ReviewContext }>('SELECT body FROM decisions.test_basis WHERE organization_id=$1 AND application_id=$2 FOR SHARE', [tx.actor.organizationId, app])).rows[0];
    if (!data) throw new ApiError(503, 'fixture_unavailable', 'Fictional adapter unavailable.');
    const c = data.body;
    c.application = ApplicationSchema.parse({ ...c.application, status: row.status, version: Number(row.version),
      assessmentInputVersion: Number(row.assessment_input_version), assignedOfficerId: row.assigned_officer_id,
      purpose: row.purpose, requestedPrincipalCentavos: Number(row.requested_principal_centavos), requestedTermMonths: row.requested_term_months });
    await hooks.afterLoad?.(); return c;
  }
  async function transition(tx: Tx, app: string, version: number, status?: string) {
    const changed = await tx.query('UPDATE applications.applications SET version=version+1,status=COALESCE($4,status) WHERE organization_id=$1 AND id=$2 AND version=$3 RETURNING version',
      [tx.actor.organizationId, app, version, status ?? null]);
    if (!changed.rows[0]) throw new ApiError(412, 'stale_version', 'Fictional aggregate changed.');
    if (hooks.failTransition) throw new Error('PRIVATE injected fixture failure');
    return Number(changed.rows[0].version);
  }
  return { authorizeStaff: authorize, authorizeMember: authorize,
    loadStaffBasis: load,
    transitionStaff: (tx, app, version, action) => transition(tx, app, version, action === 'recommend' ? 'recommended' : action === 'return' ? 'clarification' : 'decision_recorded'),
    loadMemberGuard: async (tx, app) => {
      const c = await load(tx, app);
      const current = (await tx.query<{ result: { recommendationId: string | null } | null }>('SELECT decisions.member_current($1) AS result', [app])).rows[0].result;
      return { applicationId: app, organizationId: c.application.organizationId, memberId: c.application.memberId,
        applicationVersion: c.application.version, applicationStatus: c.application.status, inputVersion: c.application.assessmentInputVersion, basisHash: reviewBasisHash(c),
        recommendationId: current?.recommendationId ?? null, participantsClear: c.conflicts.every(f => f.status === 'clear') };
    },
    transitionMember: (tx, app, version) => transition(tx, app, version),
  };
}
