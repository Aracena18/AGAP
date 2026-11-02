/** Fictional, in-memory rule inputs only. No accepted cooperative policy or DB adapter. */
import { randomUUID } from 'node:crypto';
import type { ActorContext } from '../../../../../../packages/contracts/src/ports.js';
import { ApplicationSchema } from '../../../../../../packages/contracts/src/schemas.js';
import { fictionalBasis } from '../../decisions/backend.test-fixture.js';
import { prepareDecision, prepareRecommendation, reviewBasisHash } from '../../decisions/rules.js';
import { OperationContextSchema } from '../context.js';
import { authorizeCommand, preparePendingOrigination, prepareReleaseCommand, prepareSubmission } from '../command-rules.js';
export const times = { assessment: '2026-11-01T00:00:00Z', recommendation: '2026-11-02T01:00:00Z', decision: '2026-11-02T01:01:00Z', acceptance: '2026-11-02T01:02:00Z',
  authentication: '2026-11-02T01:03:00Z', prepare: '2026-11-02T01:04:00Z', authorize: '2026-11-02T01:05:00Z', submit: '2026-11-02T01:06:00Z', observe: '2026-11-02T01:07:00Z', later: '2026-11-02T01:08:00Z' };
export function ruleFixture(withheldFee = false, paymentDate = '2026-11-25') {
  const organizationId = randomUUID(), branchId = randomUUID(), officerId = randomUUID(), reviewerId = randomUUID();
  const actor = (id: string, roles: ActorContext['roles']): ActorContext => ({ userId: id, organizationId, branchIds: [branchId], roles, sessionId: randomUUID(), authenticatedAt: new Date(times.authentication), authenticationMethods: ['mfa'], correlationId: randomUUID() });
  const officer = actor(officerId, ['officer']), reviewer = actor(reviewerId, ['reviewer']);
  const cashier = actor(randomUUID(), ['cashier']), authorizer = actor(randomUUID(), ['financial_authorizer']);
  const application = ApplicationSchema.parse({ id: randomUUID(), organizationId, branchId, memberId: randomUUID(), memberName: 'Fictional servicing rule member', purpose: 'Fictional rule exercise',
    requestedPrincipalCentavos: 1_000_000, requestedTermMonths: 1, currency: 'PHP', status: 'assessment_ready', version: 1, assessmentInputVersion: 1, assignedOfficerId: officerId,
    createdAt: times.assessment, updatedAt: times.assessment });
  const current = fictionalBasis(application, reviewerId); current.assessment!.createdAt = times.assessment;
  current.offers[0].payments[0].date = paymentDate;
  if (withheldFee) { current.offers[0].netReceivedCentavos = 900_000; if (current.assessment?.status === 'complete') current.assessment.scenarios[0].financingCostCentavos = 100_000; }
  current.recommendation = prepareRecommendation(officer, current, { id: randomUUID(), at: times.recommendation, expectedVersion: 1,
    request: { assessmentId: current.assessment!.id, offerVersionId: current.offers[0].id, inputVersion: 1, reason: 'Fictional supplied checked schedule.' } });
  current.application.status = 'recommended'; current.application.version = 2;
  const document = { id: randomUUID(), sha256: 'a'.repeat(64) };
  const saved = prepareDecision(reviewer, current, { id: randomUUID(), at: times.decision, expectedVersion: 2,
    request: { outcome: 'approve', assessmentId: current.assessment!.id, recommendationId: current.recommendation.id, offerVersionId: current.offers[0].id,
      rationale: 'Fictional reviewed approval, not operational authority.', departureReason: '', exceptions: [], reviewDate: '2026-12-01', explanationReviewed: true }, document,
    explanation: { origin: 'template', text: 'Fictional approved terms.', basisHash: reviewBasisHash(current), sourceIds: current.sources.map(s => s.sourceId), reviewedBy: reviewerId } });
  current.application.status = 'decision_recorded'; current.application.version = 3;
  const context = OperationContextSchema.parse({ basis: { saved, current, currentDecisionId: saved.snapshot.id, publishedDocument: document,
    acceptance: { id: randomUUID(), decisionId: saved.snapshot.id, memberId: current.application.memberId, linkId: randomUUID(), documentId: document.id,
      documentSha256: document.sha256, snapshotHash: saved.snapshotHash, acceptedAt: times.acceptance, acknowledgment: true, provenance: 'linked_member' } },
    authority: { status: 'configured', versionId: randomUUID(), organizationId, branchId, productVersionId: current.offers[0].productVersionId,
      effectiveFrom: '2026-01-01', effectiveThrough: '2026-12-31', mfaMaxAgeSeconds: 900,
      grants: [{ userId: cashier.userId, actions: ['prepare', 'submit', 'observe', 'reconcile'], methods: ['cash', 'bank'], maximumCentavos: 2_000_000 },
        { userId: authorizer.userId, actions: ['authorize', 'submit', 'observe', 'reconcile'], methods: ['cash', 'bank'], maximumCentavos: 2_000_000 }] },
    execution: { status: 'configured', mode: 'simulation', componentRuleVersionId: randomUUID() },
    originalAuthorizer: { status: 'current', userId: authorizer.userId, active: true, organizationId, branchIds: [branchId], roles: ['financial_authorizer'] } });
  return { context, cashier, authorizer, officer, reviewer };
}
export function prepared(f = ruleFixture()) {
  const loan = preparePendingOrigination(f.cashier, f.context, { id: randomUUID(), at: times.prepare, method: 'cash', existingOriginationId: null });
  const command = prepareReleaseCommand(f.cashier, f.context, loan, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: times.prepare, releaseClaim: 'none',
    request: { loanId: loan.id, amountCentavos: loan.offer.netReceivedCentavos, currency: 'PHP', effectiveDate: '2026-11-02', method: 'cash', instrumentReference: 'FICTIONAL-VOUCHER-1', reason: 'Fictional manual simulation.' } });
  return { ...f, loan, command };
}
export function authorized(f = prepared()) {
  return { ...f, command: authorizeCommand(f.authorizer, f.context, f.command, { id: f.command.id, expectedVersion: 1, at: times.authorize }) };
}
export function submitted(f = authorized()) {
  return { ...f, command: prepareSubmission(f.cashier, f.context, f.command, { id: f.command.id, expectedVersion: 2, attemptId: randomUUID(), at: times.submit }) };
}
