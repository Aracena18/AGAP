import { z } from 'zod';
import { WorkflowAssessment, WorkflowFact, WorkflowSource } from '../../../../../packages/contracts/src/workflow.js';
import {
  ApplicationSchema, AssessmentSchema, CalendarDay, DecisionCreateSchema, FactValueSchema,
  Id, Instant, MemberAcceptanceSchema, MoneyAmount, OfferSchema,
  RecommendationCreateSchema, Role, SourceReferenceSchema, Text, Version,
} from '../../../../../packages/contracts/src/schemas.js';
import { WorkflowDecisionBasisSchema } from './workflow-basis.js';

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
const IntegrationFields={configurationId:Id,sourceReview:z.enum(['confirmed_statements_permitted','independent_support_required'])};
export const ReviewReadinessSchema=z.discriminatedUnion('state',[
  z.strictObject({state:z.literal('pending'),revision:Version,reason:Text}),
  z.strictObject({state:z.literal('current'),revision:Version,confirmationId:Id,confirmedBy:Id,confirmedAt:Instant,
    evidenceBasisHash:Hash,mode:z.literal('manual'),reviewParticipantIds:z.array(Id).max(100)}),
]);
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
  // Absent for immutable historical v1 records; never default it during decoding.
  workflowBasis: WorkflowDecisionBasisSchema.optional(),
  integration: z.discriminatedUnion('format',[
    z.strictObject({format:z.literal('connected-review/v1'),...IntegrationFields}),
    z.strictObject({format:z.literal('connected-review/v2'),...IntegrationFields}),
  ]).optional(),
  reviewReadiness:ReviewReadinessSchema.optional(),
  // Additive v4 basis: preserve every dated fact/segment; legacy fields remain untouched.
  datedAssessment: WorkflowAssessment.optional(), datedFacts: z.array(WorkflowFact).optional(),
  datedSources: z.array(WorkflowSource).optional(), pilotConfigurationVersion: Id.optional(),
  conflictVersions: z.record(Id, Version).optional(),
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
  format: z.literal('decision-snapshot/v2').optional(),
  id: Id, recordedAt: Instant, reviewerId: Id, reviewerRoles: z.array(Role),
  input: DecisionCreateSchema, basis: ReviewContextSchema,
  document: DocumentSchema.nullable(), explanation: ExplanationSchema,
}).superRefine((s, ctx) => {
  if ((s.format === 'decision-snapshot/v2') !== !!s.basis.workflowBasis)
    ctx.addIssue({code:'custom',message:'The decision snapshot format must match its evidence basis.'});
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
