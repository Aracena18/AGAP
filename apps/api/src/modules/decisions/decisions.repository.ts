import { z } from 'zod';
import type { MemberTransactionContext, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { DecisionCreateSchema, Id, MemberDecisionSchema, Version } from '../../../../../packages/contracts/src/schemas.js';
import { canonical } from '../../platform/commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { DecisionCandidateSchema, ExplanationSchema, Hash, RecommendationSchema, type DecisionCandidate, type DeepReadonly, type ReviewContext } from './context.js';
import { termsChecksum } from './decision-documents.js';

const StreamSchema = z.object({ revision: z.coerce.number().pipe(Version), recommendation_id: Id.nullable(), decision_id: Id.nullable() });
export const StoredPreviewSchema = z.object({ id: Id, decision_id: Id, reviewer_id: Id,
  application_version: z.coerce.number().pipe(Version), basis_hash: Hash, request: DecisionCreateSchema,
  explanation: ExplanationSchema, document_id: Id.nullable(), terms_text: z.string().nullable(), expires_at: z.date() });
const MemberCurrentSchema = z.strictObject({ view: MemberDecisionSchema, basisHash: Hash, inputVersion: Version,
  recommendationId: Id.nullable(), snapshotHash: Hash, acceptanceCurrent: z.boolean() });
export class DecisionsRepository {
  async lock(tx: TransactionContext, c: ReviewContext) {
    const a = c.application;
    const result = await tx.query('SELECT decisions.staff_lock($1,$2,$3) AS stream', [a.id, a.branchId, a.memberId]);
    return StreamSchema.parse(result.rows[0].stream);
  }
  async advance(tx: TransactionContext, app: string, revision: number, recommendation: string | null, decision: string | null) {
    await tx.query('SELECT decisions.staff_advance($1,$2,$3,$4)', [app, revision, recommendation, decision]);
  }
  async recommendation(tx: TransactionContext, id: string | null) {
    if (id === null) return null;
    const result = await tx.query('SELECT body FROM decisions.recommendations WHERE organization_id=$1 AND id=$2', [tx.actor.organizationId, id]);
    if (!result.rows[0]) throw notFound();
    return RecommendationSchema.parse(result.rows[0].body);
  }
  async insertRecommendation(tx: TransactionContext, c: ReviewContext, body: z.input<typeof RecommendationSchema>) {
    const r = RecommendationSchema.parse(body), a = c.application;
    await tx.query('INSERT INTO decisions.recommendations(id,organization_id,application_id,branch_id,prepared_by,body) VALUES($1,$2,$3,$4,$5,$6)',
      [r.id, a.organizationId, a.id, a.branchId, r.preparedBy, JSON.stringify(r)]);
  }
  async preview(tx: TransactionContext, app: string, id: string) {
    const result = await tx.query('SELECT * FROM decisions.previews WHERE organization_id=$1 AND application_id=$2 AND id=$3 AND reviewer_id=$4',
      [tx.actor.organizationId, app, id, tx.actor.userId]);
    if (!result.rows[0]) throw notFound();
    return StoredPreviewSchema.parse(result.rows[0]);
  }
  async insertDecision(tx: TransactionContext, candidate: DeepReadonly<DecisionCandidate>, previewId: string, terms: string | null) {
    const d = DecisionCandidateSchema.parse(candidate), s = d.snapshot, a = s.basis.application;
    const selected = s.basis.offers.find(o => o.id === s.input.offerVersionId);
    const scenario = s.basis.assessment?.status === 'complete' ? s.basis.assessment.scenarios.find(x => x.offerVersionId === selected?.id) : undefined;
    const memberView = MemberDecisionSchema.parse({ id: s.id, outcome: s.input.outcome, explanation: s.explanation.text,
      recordedAt: s.recordedAt, documentVersionId: s.document?.id ?? null, accepted: false,
      terms: s.input.outcome === 'approve' && selected && scenario ? { offer: selected,
        checked: { ...scenario, policyChecks: scenario.policyChecks.map(check => ({ ...check,
          detail: check.passed ? 'The configured check passed.' : 'Discuss this check with cooperative staff.' })) },
        horizonStart: s.basis.periodStart, horizonEnd: s.basis.periodEnd, assumptions: ['These supplied checked figures cover the stated horizon.'] } : null });
    await tx.query(`INSERT INTO decisions.records(id,organization_id,application_id,branch_id,member_id,reviewer_id,recommendation_id,preview_id,
      document_id,outcome,input_version,basis_hash,snapshot_format,snapshot_text,snapshot_hash,member_view,recorded_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'decision-snapshot-v1',$13,$14,$15,$16)`,
    [s.id, a.organizationId, a.id, a.branchId, a.memberId, s.reviewerId, s.basis.recommendation?.id ?? null, previewId,
      s.document?.id ?? null, s.input.outcome, a.assessmentInputVersion, s.explanation.basisHash, canonical(s), d.snapshotHash, JSON.stringify(memberView), s.recordedAt]);
    if (s.document && terms !== null) {
      if (termsChecksum(terms) !== s.document.sha256) throw new ApiError(409, 'document_changed', 'The exact reviewed terms changed.');
      await tx.query(`INSERT INTO decisions.documents(id,organization_id,application_id,branch_id,decision_id,bytes,sha256,media_type,member_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,'text/plain; charset=utf-8',$8)`,
      [s.document.id, a.organizationId, a.id, a.branchId, s.id, Buffer.from(terms, 'utf8'), s.document.sha256, a.memberId]);
    }
  }
  async saved(tx: TransactionContext, app: string, id: string) {
    const result = await tx.query('SELECT snapshot,snapshot_hash FROM decisions.staff_records WHERE organization_id=$1 AND application_id=$2 AND id=$3', [tx.actor.organizationId, app, id]);
    if (!result.rows[0]) throw notFound();
    const d = DecisionCandidateSchema.parse({ snapshot: result.rows[0].snapshot, snapshotHash: result.rows[0].snapshot_hash });
    if (termsChecksum(canonical(d.snapshot)) !== d.snapshotHash) throw new ApiError(503, 'snapshot_integrity', 'The saved decision cannot be verified.');
    return d;
  }
  async memberCurrent(tx: MemberTransactionContext, app: string) {
    const result = await tx.query('SELECT decisions.member_current($1) AS result', [app]);
    return result.rows[0].result === null ? null : MemberCurrentSchema.parse(result.rows[0].result);
  }
  async memberDocument(tx: MemberTransactionContext, app: string, document: string) {
    const result = await tx.query('SELECT decisions.member_document($1,$2) AS result', [app, document]);
    if (result.rows[0].result === null) throw notFound();
    const d = z.strictObject({ id: Id, text: z.string(), sha256: Hash }).parse(result.rows[0].result);
    if (termsChecksum(d.text) !== d.sha256) throw new ApiError(503, 'document_integrity', 'The exact saved document cannot be verified.');
    return { id: d.id, mediaType: 'text/plain; charset=utf-8' as const, bytes: Buffer.from(d.text, 'utf8'), sha256: d.sha256 };
  }
}
