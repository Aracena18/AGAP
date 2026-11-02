import { z } from 'zod';
import {
  ApplicationSchema, AssessmentSchema, CalendarDay, DecisionCreateSchema, FactValueSchema,
  Id, Instant, MemberAcceptanceSchema, MoneyAmount, OfferSchema,
  RecommendationCreateSchema, Role, SourceReferenceSchema, Text, Version,
} from '../../../../../packages/contracts/src/schemas.js';

/** Module-local review proposals, not new shared API contracts. */
export const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Unavailable = z.strictObject({ status: z.literal('unavailable'), reason: Text });
const Validity = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('until'), date: CalendarDay }),
  z.strictObject({ kind: z.literal('no_expiry') }),
  z.strictObject({ kind: z.literal('unavailable'), reason: Text }),
]);
const Authority = z.strictObject({
  status: z.literal('configured'), versionId: Id, effectiveFrom: CalendarDay, effectiveThrough: CalendarDay,
  requiredApprovers: z.number().int().min(1).max(100), approvalValidity: Validity,
  grants: z.array(z.strictObject({
    userId: Id, outcomes: z.array(z.enum(['approve', 'decline', 'return'])),
    approvalLimitCentavos: MoneyAmount.nullable(), exceptionPolicyIds: z.array(Text),
  })),
});
export const AuthoritySchema = z.discriminatedUnion('status', [Unavailable, Authority]);
export const SourceSchema = SourceReferenceSchema.extend({
  applicationId: Id, sha256: Hash,
  verification: z.enum(['supported', 'mismatch', 'unavailable']),
});
export const FactSchema = z.strictObject({
  factId: Id, value: FactValueSchema, sourceId: Id.nullable(), sourceVersion: Version.nullable(),
  effectiveDate: CalendarDay, cashDate: CalendarDay, critical: z.boolean(),
  confirmation: z.enum(['accepted', 'unresolved']),
});
export const RecommendationSchema = RecommendationCreateSchema.extend({
  id: Id, applicationId: Id, preparedBy: Id, preparedAt: Instant, basisHash: Hash,
});
export const ReviewContextSchema = z.strictObject({
  application: ApplicationSchema,
  periodStart: CalendarDay, periodEnd: CalendarDay,
  currentAssessmentPolicyVersionId: Id.nullable(),
  assessment: AssessmentSchema.nullable(), offers: z.array(OfferSchema),
  sources: z.array(SourceSchema), facts: z.array(FactSchema),
  authority: AuthoritySchema,
  // Each entry is an externally established declaration/restriction projection.
  // Absence is not a declaration of no conflict, and AI cannot establish clearance.
  conflicts: z.array(z.strictObject({
    userId: Id, status: z.enum(['clear', 'restricted', 'unavailable']), reference: Text,
  })),
  recommendation: RecommendationSchema.nullable(),
});
export const DocumentSchema = z.strictObject({ id: Id, sha256: Hash });
export const ExplanationSchema = z.strictObject({
  origin: z.enum(['template', 'manual']), text: Text, basisHash: Hash,
  sourceIds: z.array(Id), reviewedBy: Id,
});
export const RecommendationPreparationSchema = z.strictObject({
  id: Id, at: Instant, expectedVersion: Version, request: RecommendationCreateSchema,
});
export const DecisionPreparationSchema = z.strictObject({
  id: Id, at: Instant, expectedVersion: Version, request: DecisionCreateSchema,
  document: DocumentSchema.nullable(), explanation: ExplanationSchema,
});
export const DecisionSnapshotSchema = z.strictObject({
  id: Id, recordedAt: Instant, reviewerId: Id, reviewerRoles: z.array(Role),
  input: DecisionCreateSchema, basis: ReviewContextSchema,
  document: DocumentSchema.nullable(), explanation: ExplanationSchema,
});
export const DecisionCandidateSchema = z.strictObject({ snapshot: DecisionSnapshotSchema, snapshotHash: Hash });
export const AcceptancePreparationSchema = z.strictObject({
  at: Instant, expectedVersion: Version, currentDecisionId: Id,
  publishedDocument: DocumentSchema, request: MemberAcceptanceSchema,
});

export type ReviewContext = z.infer<typeof ReviewContextSchema>;
export type RecommendationPreparation = z.input<typeof RecommendationPreparationSchema>;
export type DecisionPreparation = z.input<typeof DecisionPreparationSchema>;
export type AcceptancePreparation = z.input<typeof AcceptancePreparationSchema>;
export type DecisionCandidate = z.infer<typeof DecisionCandidateSchema>;
export type DeepReadonly<T> = T extends readonly (infer Item)[] ? readonly DeepReadonly<Item>[]
  : T extends object ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> } : T;
