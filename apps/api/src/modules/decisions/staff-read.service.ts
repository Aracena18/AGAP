import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ActorContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { Id } from '../../../../../packages/contracts/src/schemas.js';
import { requireRoles } from '../identity/identity.service.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { ReviewContextSchema, type ReviewContext } from './context.js';
import { unavailableDecisionPorts, type DecisionBackendPorts } from './backend-contracts.js';
import { DecisionsRepository } from './decisions.repository.js';
import { decisionOperation } from './decision-errors.js';
import { termsChecksum } from './decision-documents.js';
import { prepareDecision, prepareRecommendation, reviewBasisHash, reviewSourceIds } from './rules.js';
import { HistoryPageSchema, SavedBriefSchema, WorkspaceViewSchema } from './staff-views.js';

/** Advisory hints use the same pure guards as commands; they never authorize a write. */
function availability(actor: ActorContext, c: ReviewContext, at: string) {
  const probeId = randomUUID(), hash = reviewBasisHash(c);
  const currentAssessment = c.assessment?.status === 'complete' && !c.workflowBasis?.assessment.stale && c.assessment.inputVersion === c.application.assessmentInputVersion && c.assessment.policyVersionId === c.currentAssessmentPolicyVersionId;
  const permits = (work: () => unknown) => { try { work(); return true; } catch { return false; } };
  const decision = (outcome: 'approve' | 'decline' | 'return', offerId: string | null) => permits(() => {
    const scenario = c.assessment?.status === 'complete' ? c.assessment.scenarios.find(s => s.offerVersionId === offerId) : undefined;
    return prepareDecision(actor, c, { id: probeId, at, expectedVersion: c.application.version,
      request: { outcome, assessmentId: c.assessment?.id ?? null, recommendationId: c.recommendation?.id ?? null,
        offerVersionId: offerId, rationale: 'Availability probe only; no submitted decision.', departureReason: 'Availability probe only.',
        exceptions: outcome === 'approve' ? (scenario?.policyChecks.filter(p => !p.passed).map(p => ({ policyId: p.policyId, reason: 'Availability probe only.' })) ?? []) : [],
        reviewDate: c.periodEnd, explanationReviewed: true },
      explanation: { origin: 'template', text: 'Availability probe only.', basisHash: hash, sourceIds: reviewSourceIds(c), reviewedBy: actor.userId },
      document: outcome === 'approve' ? { id: probeId, sha256: '0'.repeat(64) } : null });
  });
  return { canReturn: decision('return', null), offers: c.offers.map(offer => ({ offer,
    checked: currentAssessment && c.assessment?.status === 'complete' ? c.assessment.scenarios.find(s => s.offerVersionId === offer.id) ?? null : null,
    recommend: permits(() => prepareRecommendation(actor, c, { id: probeId, at, expectedVersion: c.application.version,
      request: { assessmentId: c.assessment?.id ?? probeId, inputVersion: c.application.assessmentInputVersion, offerVersionId: offer.id, reason: 'Availability probe only.' } })),
    outcomes: (['approve', 'decline'] as const).filter(outcome => decision(outcome, offer.id)) })) };
}
export class DecisionStaffReads {
  constructor(private readonly uow: UnitOfWork, private readonly ports: DecisionBackendPorts = unavailableDecisionPorts,
    private readonly repository = new DecisionsRepository(), private readonly now = () => new Date()) {}
  private authorize(actor: ActorContext) { requireRoles(actor, ['officer', 'reviewer', 'auditor']); }
  workspace(actor: ActorContext, applicationId: string) {
    return decisionOperation(async () => {
      this.authorize(actor); const app = Id.parse(applicationId);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app);
        const c = ReviewContextSchema.parse({ ...await this.ports.loadStaffBasis(tx, app), recommendation: null });
        if (c.application.id !== app || c.application.organizationId !== actor.organizationId || !actor.branchIds.includes(c.application.branchId)) throw notFound();
        const raw = (await tx.query('SELECT decisions.staff_current($1) AS result', [app])).rows[0].result;
        const pointer = z.strictObject({ recommendationId: Id.nullable(), decisionId: Id.nullable() }).nullable().parse(raw);
        c.recommendation = await this.repository.recommendation(tx, pointer?.recommendationId ?? null);
        const hints = availability(actor, c, this.now().toISOString());
        const { recommendation: r, assessment: a } = c;
        return WorkspaceViewSchema.parse({ application: c.application, basisHash: reviewBasisHash(c), periodStart: c.periodStart, periodEnd: c.periodEnd,
          assessment: a ? { id: a.id, inputVersion: a.inputVersion, state: c.workflowBasis?.assessment.stale || a.inputVersion !== c.application.assessmentInputVersion || a.policyVersionId !== c.currentAssessmentPolicyVersionId ? 'stale' : a.status, issues: a.status === 'incomplete' ? a.issues.map(i => i.message) : a.warnings } : null,
          ...hints, recommendation: r ? { id: r.id, offerVersionId: r.offerVersionId, preparedBy: r.preparedBy, preparedAt: r.preparedAt, reason: r.reason } : null,
          blockedReason: hints.canReturn || hints.offers.some(o => o.recommend || o.outcomes.length) ? null : 'No decision action is currently permitted. Current evidence, assignment, authority or conflict review may be required. Contact the authorized review owner.',
          currentDecisionId: pointer?.decisionId ?? null });
      });
    });
  }
  history(actor: ActorContext, applicationId: string, input: unknown = {}) {
    return decisionOperation(async () => {
      this.authorize(actor); const app = Id.parse(applicationId), query = z.strictObject({ cursor: Id.optional(), limit: z.number().int().min(1).max(50).default(20) }).parse(input);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app);
        let cursor: { recorded_at: Date; id: string } | undefined;
        if (query.cursor) {
          cursor = (await tx.query<{ recorded_at: Date; id: string }>('SELECT recorded_at,id FROM decisions.staff_records WHERE organization_id=$1 AND application_id=$2 AND id=$3', [actor.organizationId, app, query.cursor])).rows[0];
          if (!cursor) throw notFound();
        }
        const result = await tx.query<{ id: string; application_id: string; input_version: string; outcome: string; recorded_at: Date; reviewer_id: string; snapshot_hash: string; accepted: boolean }>(`SELECT r.id,r.application_id,r.input_version,r.outcome,r.recorded_at,r.reviewer_id,r.snapshot_hash,
          EXISTS(SELECT 1 FROM decisions.staff_acceptances a WHERE a.organization_id=r.organization_id AND a.decision_id=r.id) AS accepted
          FROM decisions.staff_records r WHERE r.organization_id=$1 AND r.application_id=$2
          AND ($3::timestamptz IS NULL OR (r.recorded_at,r.id)<($3::timestamptz,$4::uuid))
          ORDER BY r.recorded_at DESC,r.id DESC LIMIT $5`, [actor.organizationId, app, cursor?.recorded_at ?? null, cursor?.id ?? null, query.limit + 1]);
        const page = result.rows.slice(0, query.limit);
        return HistoryPageSchema.parse({ items: page.map(r => ({ id: r.id, applicationId: r.application_id, inputVersion: Number(r.input_version), outcome: r.outcome,
          recordedAt: r.recorded_at.toISOString(), reviewerId: r.reviewer_id, snapshotHash: r.snapshot_hash, accepted: r.accepted })), nextCursor: result.rows.length > query.limit ? page.at(-1)!.id : null });
      });
    });
  }
  brief(actor: ActorContext, applicationId: string, decisionId: string) {
    return decisionOperation(async () => {
      this.authorize(actor); const app = Id.parse(applicationId), id = Id.parse(decisionId);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app); const { snapshot: s, snapshotHash } = await this.repository.saved(tx, app, id);
        const offer = s.basis.offers.find(o => o.id === s.input.offerVersionId);
        const scenario = s.basis.assessment?.status === 'complete' ? s.basis.assessment.scenarios.find(x => x.offerVersionId === offer?.id) : undefined;
        return SavedBriefSchema.parse({ id, applicationId: app, memberName: s.basis.application.memberName, inputVersion: s.basis.application.assessmentInputVersion,
          recordedAt: s.recordedAt, reviewerId: s.reviewerId, outcome: s.input.outcome, explanation: s.explanation.text, origin: s.explanation.origin, reviewDate: s.input.reviewDate,
          periodStart: s.basis.periodStart, periodEnd: s.basis.periodEnd, snapshotHash, document: s.document,
          considered: offer && scenario ? { offer, checked: { ...scenario, policyChecks: scenario.policyChecks.map(p => ({ ...p, detail: p.passed ? 'Configured check passed.' : 'Discuss this concern with cooperative staff.' })) } } : null,
          sources: s.basis.workflowBasis ? s.basis.workflowBasis.sources.map(source => ({sourceId:source.sourceId,sourceVersion:source.sourceVersion,verification:source.verification,
            effectiveDates:[...new Set(s.basis.workflowBasis!.facts.filter(f => f.sourceId === source.sourceId && f.sourceVersion === source.sourceVersion).map(f => f.input.effectiveDate))]})) : s.basis.sources.map(source => ({ sourceId: source.sourceId, sourceVersion: source.sourceVersion, verification: source.verification,
            effectiveDates: [...new Set(s.basis.facts.filter(f => f.sourceId === source.sourceId && f.sourceVersion === source.sourceVersion).map(f => f.effectiveDate))] })) });
      });
    });
  }
  document(actor: ActorContext, applicationId: string, decisionId: string) {
    return decisionOperation(async () => {
      this.authorize(actor); const app = Id.parse(applicationId), id = Id.parse(decisionId);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app); const saved = await this.repository.saved(tx, app, id);
        if (!saved.snapshot.document) throw notFound();
        const doc = (await tx.query('SELECT id,bytes,sha256,media_type FROM decisions.staff_documents WHERE organization_id=$1 AND application_id=$2 AND decision_id=$3 AND id=$4',
          [actor.organizationId, app, id, saved.snapshot.document.id])).rows[0];
        if (!doc || !Buffer.isBuffer(doc.bytes) || termsChecksum(doc.bytes.toString('utf8')) !== doc.sha256 || doc.sha256 !== saved.snapshot.document.sha256) throw new ApiError(503, 'document_integrity', 'The saved terms cannot be verified.');
        return { id: doc.id as string, bytes: doc.bytes as Buffer, sha256: doc.sha256 as string, mediaType: doc.media_type as 'text/plain; charset=utf-8' };
      });
    });
  }
}
