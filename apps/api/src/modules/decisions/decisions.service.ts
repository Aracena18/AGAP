import { randomUUID } from 'node:crypto';
import type { ActorContext, MemberDomainPorts, MemberTransactionContext, TransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { CommandReceiptSchema, DecisionCreateSchema, DecisionSchema, Id, MemberAcceptanceSchema, MemberDecisionViewSchema, RecommendationCreateSchema, Version } from '../../../../../packages/contracts/src/schemas.js';
import { requireRoles } from '../identity/identity.service.js';
import { canonical, command, recordEvent } from '../../platform/commands.js';
import { memberCommand, memberEvent } from '../../platform/member-commands.js';
import { ApiError } from '../../platform/errors.js';
import { ReviewContextSchema } from './context.js';
import { MemberGuardSchema, PreviewRequestSchema, PreviewViewSchema, unavailableDecisionPorts, type DecisionBackendPorts } from './backend-contracts.js';
import { DecisionsRepository } from './decisions.repository.js';
import { decisionOperation } from './decision-errors.js';
import { decisionDocument, termsChecksum } from './decision-documents.js';
import { prepareDecision, prepareRecommendation, reviewBasisHash, reviewChangeEffect } from './rules.js';

export class DecisionsService {
  constructor(private readonly uow: UnitOfWork, private readonly ports: DecisionBackendPorts = unavailableDecisionPorts,
    private readonly repository = new DecisionsRepository(), private readonly now = () => new Date(), private readonly previewTtlMs = 15 * 60_000) {
    if (!Number.isSafeInteger(previewTtlMs) || previewTtlMs < 1000 || previewTtlMs > 3600_000) throw new Error('Invalid technical preview lifetime.');
  }
  private async basis(tx: TransactionContext, app: string) {
    const supplied = await this.ports.loadStaffBasis(tx, app);
    const c = ReviewContextSchema.parse({ ...supplied, recommendation: null });
    if (c.application.id !== app || c.application.organizationId !== tx.actor.organizationId) throw new ApiError(503, 'review_basis_unavailable', 'The current authorized review basis is unavailable.');
    const stream = await this.repository.lock(tx, c);
    c.recommendation = await this.repository.recommendation(tx, stream.recommendation_id);
    return { c, stream };
  }
  recommend(actor: ActorContext, applicationId: string, input: unknown, version: number, key: unknown) {
    return decisionOperation(async () => {
      requireRoles(actor, ['officer']); const app = Id.parse(applicationId), data = RecommendationCreateSchema.parse(input); Version.parse(version);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app);
        return command(tx, `decisions.recommend:${app}`, key, { app, data, version }, async () => {
          const { c, stream } = await this.basis(tx, app);
          const r = prepareRecommendation(actor, c, { id: randomUUID(), at: this.now().toISOString(), expectedVersion: version, request: data });
          await this.repository.insertRecommendation(tx, c, r);
          await this.repository.advance(tx, app, stream.revision, r.id, null);
          const next = Version.parse(await this.ports.transitionStaff(tx, app, version, 'recommend'));
          await recordEvent(tx, 'decision.recommended', app, next);
          return CommandReceiptSchema.parse({ id: r.id, version: next });
        });
      });
    });
  }
  preview(actor: ActorContext, applicationId: string, input: unknown, version: number, key: unknown) {
    return decisionOperation(async () => {
      requireRoles(actor, ['reviewer']); const app = Id.parse(applicationId), data = PreviewRequestSchema.parse(input); Version.parse(version);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app);
        return command(tx, `decisions.preview:${app}`, key, { app, data, version }, async () => {
          const { c } = await this.basis(tx, app), at = this.now(), id = randomUUID(), decisionId = randomUUID();
          const { explanation, terms } = decisionDocument(c, data), documentId = terms === null ? null : randomUUID();
          const explanationData = { origin: 'template' as const, text: explanation, basisHash: reviewBasisHash(c), sourceIds: c.sources.map(s => s.sourceId), reviewedBy: actor.userId };
          const anticipated = { ...data, explanationReviewed: true as const };
          // Validate a provisional candidate only. The preview is not a recorded decision or acknowledgment.
          prepareDecision(actor, c, { id: decisionId, at: at.toISOString(), expectedVersion: version, request: anticipated,
            document: documentId && terms !== null ? { id: documentId, sha256: termsChecksum(terms) } : null, explanation: explanationData });
          const expiresAt = new Date(at.getTime() + this.previewTtlMs).toISOString();
          await tx.query(`INSERT INTO decisions.previews(id,organization_id,application_id,branch_id,reviewer_id,created_at,expires_at,
            application_version,decision_id,basis_hash,request,explanation,document_id,terms_text)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [id, actor.organizationId, app, c.application.branchId, actor.userId, at.toISOString(), expiresAt, version, decisionId,
            explanationData.basisHash, JSON.stringify(anticipated), JSON.stringify(explanationData), documentId, terms]);
          await recordEvent(tx, 'decision.preview_prepared', id, 1);
          return PreviewViewSchema.parse({ id, decisionId, applicationVersion: version, basisHash: explanationData.basisHash, expiresAt, explanation, terms });
        });
      });
    });
  }
  record(actor: ActorContext, applicationId: string, input: unknown, version: number, key: unknown, previewId: string) {
    return decisionOperation(async () => {
      requireRoles(actor, ['reviewer']); const app = Id.parse(applicationId), data = DecisionCreateSchema.parse(input), proof = Id.parse(previewId); Version.parse(version);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app);
        return command(tx, `decisions.record:${app}`, key, { app, data, version, proof }, async () => {
          const { c, stream } = await this.basis(tx, app), preview = await this.repository.preview(tx, app, proof), at = this.now();
          if (preview.application_version !== version || preview.expires_at.getTime() < at.getTime()
            || canonical(preview.request) !== canonical(data) || preview.basis_hash !== reviewBasisHash(c)) {
            throw new ApiError(409, 'review_preview_changed', 'Prepare and review a new preview for this exact request and current basis.');
          }
          const d = prepareDecision(actor, c, { id: preview.decision_id, at: at.toISOString(), expectedVersion: version, request: data,
            document: preview.document_id && preview.terms_text !== null ? { id: preview.document_id, sha256: termsChecksum(preview.terms_text) } : null,
            explanation: preview.explanation });
          await this.repository.insertDecision(tx, d, preview.id, preview.terms_text);
          await this.repository.advance(tx, app, stream.revision, c.recommendation?.id ?? null, d.snapshot.id);
          const next = Version.parse(await this.ports.transitionStaff(tx, app, version, data.outcome));
          await recordEvent(tx, 'decision.recorded', app, next);
          return DecisionSchema.parse({ id: d.snapshot.id, applicationId: app, inputVersion: c.application.assessmentInputVersion,
            outcome: data.outcome, recordedAt: d.snapshot.recordedAt, reviewerId: actor.userId, snapshotHash: d.snapshotHash });
        });
      });
    });
  }
  saved(actor: ActorContext, applicationId: string, decisionId: string) {
    return decisionOperation(async () => {
      requireRoles(actor, ['officer', 'reviewer', 'auditor']); const app = Id.parse(applicationId), id = Id.parse(decisionId);
      return this.uow.run(actor, async tx => { await this.ports.authorizeStaff(tx, app); return this.repository.saved(tx, app, id); });
    });
  }
  reviewBasis(actor: ActorContext, applicationId: string, decisionId: string) {
    return decisionOperation(async () => {
      requireRoles(actor, ['officer', 'reviewer']); const app = Id.parse(applicationId), id = Id.parse(decisionId);
      return this.uow.run(actor, async tx => {
        await this.ports.authorizeStaff(tx, app); const { c, stream } = await this.basis(tx, app), d = await this.repository.saved(tx, app, id);
        const effect = reviewChangeEffect(d, c, 'unreleased');
        const accepted = await tx.query('SELECT id FROM decisions.staff_acceptances WHERE organization_id=$1 AND decision_id=$2', [actor.organizationId, id]);
        return { decisionId: id, currentDecision: stream.decision_id === id, outcome: d.snapshot.input.outcome, accepted: accepted.rowCount === 1,
          document: d.snapshot.document, snapshotHash: d.snapshotHash, review: effect, releaseAuthorized: false as const };
      });
    });
  }
  memberDecision(tx: MemberTransactionContext, applicationId: string) {
    return decisionOperation(async () => {
      const app = Id.parse(applicationId); await this.ports.authorizeMember(tx, app);
      const current = await this.repository.memberCurrent(tx, app);
      if (current?.view.outcome === 'approve') {
        const guard = await this.memberGuard(tx, app);
        const lockedCurrent = await this.repository.memberCurrent(tx, app);
        if (guard.basisHash !== current.basisHash || guard.inputVersion !== current.inputVersion
          || guard.recommendationId !== current.recommendationId || !guard.participantsClear
          || (!current.view.accepted && !current.acceptanceCurrent)
          || guard.applicationStatus !== 'decision_recorded' || lockedCurrent?.view.id !== current.view.id
          || lockedCurrent.snapshotHash !== current.snapshotHash) {
          return MemberDecisionViewSchema.parse({ state: 'unavailable', message: 'These terms need renewed review before acceptance. Contact the cooperative.' });
        }
      }
      return MemberDecisionViewSchema.parse({ state: 'available', data: current?.view ?? null });
    });
  }
  memberAccept(tx: MemberTransactionContext, applicationId: string, input: unknown, version: number, key: unknown) {
    return decisionOperation(async () => {
      const app = Id.parse(applicationId), data = MemberAcceptanceSchema.parse(input); Version.parse(version);
      await this.ports.authorizeMember(tx, app);
      return memberCommand(tx, `decisions.accept:${app}`, key, { app, data, version }, async () => {
        const guard = await this.memberGuard(tx, app);
        if (guard.applicationVersion !== version) throw new ApiError(412, 'stale_version', 'Reload the current application before a new acknowledgment.');
        if (guard.applicationStatus !== 'decision_recorded') throw new ApiError(409, 'decision_review_required', 'The application needs renewed review before acceptance.');
        const result = await tx.query<{ id: string }>('SELECT decisions.accept_member($1,$2,$3,$4,$5,$6,$7) AS id',
          [app, data.decisionId, data.documentVersionId, guard.inputVersion, guard.basisHash, guard.recommendationId, guard.participantsClear]);
        const next = Version.parse(await this.ports.transitionMember(tx, app, version));
        await memberEvent(tx, 'decision.member_accepted', app, next);
        return CommandReceiptSchema.parse({ id: result.rows[0].id, version: next });
      });
    });
  }
  private async memberGuard(tx: MemberTransactionContext, app: string) {
    const guard = MemberGuardSchema.parse(await this.ports.loadMemberGuard(tx, app));
    if (guard.applicationId !== app || guard.organizationId !== tx.actor.organizationId || guard.memberId !== tx.actor.memberId) throw new ApiError(403, 'member_scope', 'This record is unavailable to the current account.');
    return guard;
  }
  memberDocument(tx: MemberTransactionContext, applicationId: string, documentId: string) {
    return decisionOperation(async () => {
      const app = Id.parse(applicationId), id = Id.parse(documentId); await this.ports.authorizeMember(tx, app);
      return this.repository.memberDocument(tx, app, id);
    });
  }
}
/** Export only the owned subset; Robert chooses actual facade registration/order. */
export function decisionMemberPorts(service: DecisionsService): Pick<MemberDomainPorts, 'decision' | 'accept'> {
  return { decision: (tx, id) => service.memberDecision(tx, id), accept: (tx, id, input, version, key) => service.memberAccept(tx, id, input, version, key) };
}
