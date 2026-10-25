import { z } from 'zod';
import type { CalendarDate, Money } from '../../../src/domain/types.js';

export const CONTRACT_VERSION = '0.1.0';
export const Id = z.uuid();
export const MoneyAmount: z.ZodType<Money> = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const SignedMoney: z.ZodType<Money> = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
export const PositiveMoneyAmount: z.ZodType<Money> = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const CalendarDay: z.ZodType<CalendarDate> = z.iso.date();
export const Instant = z.iso.datetime({ offset: true });
export const Version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const Text = z.string().trim().min(1).max(2000);
export const Currency = z.literal('PHP');
export const Role = z.enum(['officer', 'verifier', 'reviewer', 'cashier', 'financial_authorizer', 'accountant', 'auditor', 'administrator']);
export type StaffRole = z.infer<typeof Role>;

export const ApiErrorSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string(), correlationId: z.string(), fields: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional() }),
});
export const SessionSchema = z.strictObject({
  user: z.strictObject({ id: Id, displayName: z.string(), organizationId: Id, branchIds: z.array(Id), branches: z.array(z.strictObject({id:Id,name:z.string()})), roles: z.array(Role) }),
  csrfToken: z.string(), expiresAt: Instant, privacyNoticeVersion: z.string(), contractVersion: z.literal(CONTRACT_VERSION),
});
export const StaffSchema = z.strictObject({ id: Id, displayName: z.string(), branchIds: z.array(Id), roles: z.array(Role), active: z.boolean(), version: Version });
export const StaffPageSchema = z.strictObject({ items: z.array(StaffSchema), nextCursor: Id.nullable() });
export const StaffRevokeSchema = z.strictObject({ reason: Text });
export const AssignmentCreateSchema = z.strictObject({officerId:Id,reason:Text});
export const MemberCreateSchema = z.strictObject({
  externalReference: z.string().trim().min(1).max(64), fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).nullable(), branchId: Id, noticeVersion: z.string().min(1).max(80), noticeAcknowledged: z.literal(true),
});
export const MemberUpdateSchema = z.strictObject({ fullName: z.string().trim().min(2).max(160), phone: z.string().trim().max(40).nullable() });
export const MemberSchema = z.strictObject({
  id: Id, organizationId: Id, branchId: Id, externalReference: z.string(), fullName: z.string(), phone: z.string().nullable(),
  version: Version, noticeVersion: z.string(), noticeAcknowledgedAt: Instant, createdAt: Instant, updatedAt: Instant,
});
export const MemberPageSchema = z.strictObject({ items: z.array(MemberSchema), nextCursor: Id.nullable() });
export const ApplicationCreateSchema = z.strictObject({
  memberId: Id, purpose: z.string().trim().min(3).max(1000), requestedPrincipalCentavos: PositiveMoneyAmount,
  requestedTermMonths: z.number().int().min(1).max(600), currency: Currency,
});
export const ApplicationUpdateSchema = ApplicationCreateSchema.omit({ memberId: true });
export const ApplicationSchema = z.strictObject({
  id: Id, organizationId: Id, branchId: Id, memberId: Id, memberName: z.string(), purpose: z.string(), requestedPrincipalCentavos: MoneyAmount,
  requestedTermMonths: z.number().int(), currency: Currency, status: z.enum(['draft', 'evidence_review', 'clarification', 'assessment_ready', 'recommended', 'decision_recorded']),
  version: Version, assessmentInputVersion: Version, assignedOfficerId: Id, createdAt: Instant, updatedAt: Instant,
});
export const ApplicationPageSchema = z.strictObject({ items: z.array(ApplicationSchema), nextCursor: Id.nullable() });
export const FactValueSchema = z.discriminatedUnion('availability', [
  z.strictObject({ availability: z.literal('recorded'), amountCentavos: MoneyAmount }),
  z.strictObject({ availability: z.literal('unavailable'), reason: Text }),
]);
export const EvidenceCorrectionSchema = z.strictObject({
  factId: Id, value: FactValueSchema, sourceId: Id.nullable(), effectiveDate: CalendarDay, cashDate: CalendarDay, reason: Text,
});
export const VerificationSchema = z.strictObject({ sourceId: Id, method: Text, outcome: z.enum(['supported', 'mismatch', 'unavailable']), checkedOn: CalendarDay, limitations: Text });
export const AssessmentCreateSchema = z.strictObject({ inputVersion: Version, offerVersionIds: z.array(Id).min(1).max(20), periodStart: CalendarDay, periodEnd: CalendarDay });
export const PolicyCheckSchema = z.strictObject({ policyId: z.string(), passed: z.boolean(), detail: Text, overridable: z.boolean() });
export const OfferSchema = z.strictObject({
  id: Id, productVersionId: Id, label: Text, principalCentavos: MoneyAmount, netReceivedCentavos: MoneyAmount, feesPaidSeparatelyCentavos: MoneyAmount,
  termMonths: z.number().int().positive(), payments: z.array(z.strictObject({ date: CalendarDay, amountCentavos: MoneyAmount })).min(1), available: z.boolean(),
});
export const ScenarioSchema = z.strictObject({
  offerVersionId: Id, monthlyRemainingCentavos: SignedMoney, lowestBalanceCentavos: SignedMoney, closingBalanceCentavos: SignedMoney,
  totalRepaymentCentavos: MoneyAmount, financingCostCentavos: SignedMoney, shortageDates: z.array(CalendarDay), policyChecks: z.array(PolicyCheckSchema),
});
const AssessmentBasis = { id: Id, applicationId: Id, inputVersion: Version, engineVersion: Text, policyVersionId: Id, createdAt: Instant };
export const AssessmentSchema = z.discriminatedUnion('status', [
  z.strictObject({ ...AssessmentBasis, status: z.literal('complete'), scenarios: z.array(ScenarioSchema).min(1), warnings: z.array(z.string()) }),
  z.strictObject({ ...AssessmentBasis, status: z.literal('incomplete'), issues: z.array(z.strictObject({ factId: Id.nullable(), message: Text })).min(1) }),
]);
export const RecommendationCreateSchema = z.strictObject({ assessmentId: Id, offerVersionId: Id, inputVersion: Version, reason: Text });
export const DecisionCreateSchema = z.strictObject({
  outcome: z.enum(['approve', 'decline', 'return']), assessmentId: Id.nullable(), recommendationId: Id.nullable(), offerVersionId: Id.nullable(),
  rationale: Text, departureReason: z.string().max(2000), exceptions: z.array(z.strictObject({ policyId: z.string(), reason: Text })),
  reviewDate: CalendarDay, explanationReviewed: z.literal(true),
});
export const DecisionSchema = z.strictObject({ id: Id, applicationId: Id, inputVersion: Version, outcome: z.enum(['approve', 'decline', 'return']), recordedAt: Instant, reviewerId: Id, snapshotHash: z.string().regex(/^[a-f0-9]{64}$/) });
export const AcceptanceCreateSchema = z.strictObject({ decisionId: Id, documentVersionId: Id, acceptedOn: CalendarDay, acknowledgment: Text });
export const FinancialCommandCreateSchema = z.strictObject({
  loanId: Id, amountCentavos: PositiveMoneyAmount, currency: Currency, effectiveDate: CalendarDay, method: z.enum(['cash', 'bank', 'provider']),
  instrumentReference: z.string().trim().min(1).max(160), reason: Text,
});
export const FinancialCommandSchema = z.strictObject({
  id: Id, loanId: Id, version: Version, amountCentavos: MoneyAmount, currency: Currency,
  state: z.enum(['prepared', 'authorized', 'submitted', 'confirmed', 'failed', 'unknown', 'confirmed_unposted']),
  preparedBy: Id, authorizedBy: Id.nullable(), providerReference: z.string().nullable(), receiptId: Id.nullable(), journalId: Id.nullable(),
});
export const JournalLineSchema = z.strictObject({ accountId: Id, side: z.enum(['debit', 'credit']), amountCentavos: PositiveMoneyAmount });
export const PostingRequestSchema = z.strictObject({
  sourceEventId: Id, postingKind: z.string().min(1).max(100), postingRuleVersionId: Id, effectiveDate: CalendarDay, currency: Currency,
  lines: z.array(JournalLineSchema).min(2).max(100), reversalOfJournalId: Id.nullable(),
});
export const JournalReceiptSchema = z.strictObject({ journalId: Id, sourceEventId: Id, postedAt: Instant });
export const LoanPositionSchema = z.strictObject({
  loanId: Id, asOfDate: CalendarDay, principalCentavos: MoneyAmount, interestDueCentavos: MoneyAmount, feesDueCentavos: MoneyAmount,
  overdueCentavos: MoneyAmount, postedThrough: Instant, pendingMovementCount: z.number().int().nonnegative(),
});
const ReviewResponse = z.enum(['yes', 'no', 'unavailable']);
export const HealthReviewCreateSchema = z.strictObject({
  loanId: Id, reviewDate: CalendarDay, canMeetEssentials: ReviewResponse, borrowedToRepay: ReviewResponse,
  financialStrain: z.enum(['reported', 'not_reported', 'unavailable']), source: Text, staffAction: Text, nextReviewDate: CalendarDay,
});
export const HealthReviewSchema = HealthReviewCreateSchema.extend({ id: Id, recordedBy: Id, recordedAt: Instant });
export const CommandReceiptSchema = z.strictObject({ id: Id, version: Version });
export const CapabilitiesSchema = z.strictObject({ contractVersion: z.literal(CONTRACT_VERSION), modules: z.array(z.strictObject({ name: z.string(), owner: z.string(), state: z.enum(['available', 'contract_only']) })) });
export const EventEnvelopeSchema = z.strictObject({ id: Id, type: z.string(), schemaVersion: z.literal(1), organizationId: Id, aggregateId: Id, aggregateVersion: Version, occurredAt: Instant, correlationId: z.string(), payload: z.record(z.string(), z.unknown()) });

export const schemas = {
  ApiError: ApiErrorSchema, Session: SessionSchema, Staff: StaffSchema, StaffPage: StaffPageSchema, StaffRevoke: StaffRevokeSchema, MemberCreate: MemberCreateSchema, MemberUpdate: MemberUpdateSchema, Member: MemberSchema, MemberPage: MemberPageSchema,
  ApplicationCreate: ApplicationCreateSchema, ApplicationUpdate: ApplicationUpdateSchema, Application: ApplicationSchema, ApplicationPage: ApplicationPageSchema, AssignmentCreate: AssignmentCreateSchema,
  EvidenceCorrection: EvidenceCorrectionSchema, Verification: VerificationSchema, AssessmentCreate: AssessmentCreateSchema, Assessment: AssessmentSchema, Offer: OfferSchema,
  RecommendationCreate: RecommendationCreateSchema, DecisionCreate: DecisionCreateSchema, Decision: DecisionSchema, AcceptanceCreate: AcceptanceCreateSchema,
  FinancialCommandCreate: FinancialCommandCreateSchema, FinancialCommand: FinancialCommandSchema, PostingRequest: PostingRequestSchema, JournalReceipt: JournalReceiptSchema,
  LoanPosition: LoanPositionSchema, HealthReviewCreate: HealthReviewCreateSchema, HealthReview: HealthReviewSchema, CommandReceipt: CommandReceiptSchema, Capabilities: CapabilitiesSchema, EventEnvelope: EventEnvelopeSchema,
} as const;
export type SchemaName = keyof typeof schemas;
