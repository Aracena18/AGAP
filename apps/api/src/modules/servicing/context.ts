import { z } from 'zod';
import { CalendarDay, FinancialCommandCreateSchema, FinancialCommandSchema, Id, Instant, OfferSchema, PositiveMoneyAmount, Role, Text, Version } from '../../../../../packages/contracts/src/schemas.js';
import { DecisionCandidateSchema, DocumentSchema, Hash, ReviewContextSchema } from '../decisions/context.js';

/** Local consumer proposals reused by rules and candidate persistence.
 * Not accepted canonical HTTP DTOs; trusted producers supply these contexts. */
export const Action = z.enum(['prepare', 'authorize', 'submit', 'observe', 'reconcile']);
export const FinancialAuthoritySchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('unavailable'), reason: Text }),
  z.strictObject({ status: z.literal('configured'), versionId: Id, organizationId: Id, branchId: Id, productVersionId: Id,
    effectiveFrom: CalendarDay, effectiveThrough: CalendarDay, mfaMaxAgeSeconds: z.number().int().min(1).max(900),
    grants: z.array(z.strictObject({ userId: Id, actions: z.array(Action), methods: z.array(z.enum(['cash', 'bank'])), maximumCentavos: PositiveMoneyAmount })) }),
]);
export const AcceptanceBindingSchema = z.strictObject({ id: Id, decisionId: Id, memberId: Id, linkId: Id,
  documentId: Id, documentSha256: Hash, snapshotHash: Hash, acceptedAt: Instant, acknowledgment: z.literal(true), provenance: z.literal('linked_member') });
export const ReleaseBasisSchema = z.strictObject({ saved: DecisionCandidateSchema, current: ReviewContextSchema, currentDecisionId: Id,
  publishedDocument: DocumentSchema, acceptance: AcceptanceBindingSchema });
export const PendingOriginationSchema = z.strictObject({ id: Id, organizationId: Id, branchId: Id, memberId: Id, applicationId: Id,
  decisionId: Id, decisionSnapshotHash: Hash, acceptance: AcceptanceBindingSchema, assessmentInputVersion: Version,
  offer: OfferSchema, scheduleHash: Hash, state: z.literal('pending_release'), preparedAt: Instant });
export const OperationContextSchema = z.strictObject({ basis: ReleaseBasisSchema, authority: FinancialAuthoritySchema,
  execution: z.discriminatedUnion('status', [z.strictObject({ status: z.literal('unavailable'), reason: Text }),
    z.strictObject({ status: z.literal('configured'), mode: z.enum(['simulation', 'actual']), componentRuleVersionId: Id })]),
  originalAuthorizer: z.discriminatedUnion('status', [z.strictObject({ status: z.literal('unavailable') }),
    z.strictObject({ status: z.literal('current'), userId: Id, active: z.boolean(), organizationId: Id, branchIds: z.array(Id), roles: z.array(Role) })]),
});
export const ObservationContextSchema = z.strictObject({ authority: FinancialAuthoritySchema });
export const AuthorizationSchema = z.strictObject({ userId: Id, at: Instant, policyVersionId: Id, payloadHash: Hash, authenticatedAt: Instant });
export const SubmissionSchema = z.strictObject({ id: Id, submittedBy: Id, at: Instant, payloadHash: Hash, claimVersion: Version });
export const ObservationInputSchema = z.strictObject({ id: Id, producer: z.string().trim().min(1).max(100), commandId: Id,
  businessEventId: Id, providerKey: Id, mode: z.enum(['simulation', 'actual']), state: z.enum(['confirmed', 'failed', 'unknown']),
  movementId: Id.nullable(), providerReference: z.string().trim().min(1).max(160).nullable(), amountMinorUnits: PositiveMoneyAmount.nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(), effectiveDate: CalendarDay.nullable(), occurredAt: Instant.nullable(), verified: z.boolean(),
  evidence: z.strictObject({ id: Id, sha256: Hash }).nullable() }).superRefine((o, ctx) => {
    if (o.state !== 'unknown' && (!o.verified || !o.evidence)) ctx.addIssue({ code: 'custom', message: 'A definitive outcome requires verified evidence.' });
    if (o.state === 'confirmed' && (!o.movementId || !o.providerReference || o.amountMinorUnits === null || o.currency === null || o.effectiveDate === null || o.occurredAt === null)) ctx.addIssue({ code: 'custom', message: 'Known settlement requires its original movement identity/reference.' });
  });
export const ObservationSchema = z.strictObject({ input: ObservationInputSchema, recordedAt: Instant, recordedBy: Id });
const Phase4State = FinancialCommandSchema.shape.state.exclude(['confirmed']);
export const TransitionSchema = z.strictObject({ from: Phase4State.nullable(), to: Phase4State,
  at: Instant, actorId: Id, action: z.enum(['prepare', 'authorize', 'submit', 'observe', 'reconcile']) });
// confirmed belongs to Phase 5; no Phase 4 function may manufacture posted success.
export const CommandSchema = FinancialCommandSchema.extend({ state: Phase4State,
  kind: z.literal('disbursement'), componentRuleVersionId: Id, organizationId: Id, branchId: Id, applicationId: Id, mode: z.enum(['simulation', 'actual']),
  origination: PendingOriginationSchema, payload: FinancialCommandCreateSchema, payloadHash: Hash,
  businessEventId: Id, providerKey: Id, createdAt: Instant, authorization: AuthorizationSchema.nullable(), submission: SubmissionSchema.nullable(),
  observations: z.array(ObservationSchema), conflicts: z.array(z.enum(['outcome_conflict', 'movement_conflict', 'payload_mismatch', 'late_settlement'])),
  history: z.array(TransitionSchema).min(1), receiptId: z.null(), journalId: z.null(),
});
export const RuleRequestSchema = z.strictObject({ id: Id, at: Instant, expectedVersion: Version });
export const PrepareCommandSchema = z.strictObject({ id: Id, businessEventId: Id, providerKey: Id, at: Instant,
  releaseClaim: z.enum(['none', 'reserved', 'settled', 'unavailable']), request: FinancialCommandCreateSchema });
export type OperationContext = z.infer<typeof OperationContextSchema>;
export type PendingOrigination = z.infer<typeof PendingOriginationSchema>;
export type FinancialAuthority = z.infer<typeof FinancialAuthoritySchema>;
export type Command = z.infer<typeof CommandSchema>;
export type ObservationInput = z.infer<typeof ObservationInputSchema>;
export type DeepReadonly<T> = T extends readonly (infer U)[] ? readonly DeepReadonly<U>[] : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
