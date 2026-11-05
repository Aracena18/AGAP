import { z } from 'zod';
import { RecordMode, VerificationSchema, CONTRACT_VERSION, Id, MoneyAmount, SignedMoney, PositiveMoneyAmount, CalendarDay, Instant, Version, Text, Currency, Role, FactValueSchema, PolicyCheckSchema, OfferSchema, SourceReferenceSchema, ModelArtifactSchema } from './common.js';
export * from './common.js';
import { workflowSchemas, WorkflowScenario } from './workflow.js';
export * from './workflow.js';

export const ApiErrorSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string(), correlationId: z.string(), fields: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional() }),
});
export const SessionSchema = z.strictObject({
  user: z.strictObject({ id: Id, displayName: z.string(), organizationId: Id, branchIds: z.array(Id), branches: z.array(z.strictObject({id:Id,name:z.string()})), roles: z.array(Role) }),
  csrfToken: z.string(), expiresAt: Instant, privacyNoticeVersion: z.string(), contractVersion: z.literal(CONTRACT_VERSION), recordMode:RecordMode.optional(),
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
  requestedTermMonths: z.number().int(), currency: Currency, status: z.enum(['draft', 'submitted', 'evidence_review', 'clarification', 'assessment_ready', 'recommended', 'decision_recorded']),
  version: Version, assessmentInputVersion: Version, assignedOfficerId: Id.nullable(), createdAt: Instant, updatedAt: Instant,
});
export const ApplicationPageSchema = z.strictObject({ items: z.array(ApplicationSchema), nextCursor: Id.nullable() });
export const EvidenceCorrectionSchema = z.strictObject({
  factId: Id, value: FactValueSchema, sourceId: Id.nullable(), effectiveDate: CalendarDay, cashDate: CalendarDay, reason: Text,
});

export const AssessmentCreateSchema = z.strictObject({ inputVersion: Version, offerVersionIds: z.array(Id).min(1).max(20), periodStart: CalendarDay, periodEnd: CalendarDay });
export const LegacyScenarioSchema = z.strictObject({
  offerVersionId: Id, monthlyRemainingCentavos: SignedMoney, lowestBalanceCentavos: SignedMoney, closingBalanceCentavos: SignedMoney,
  totalRepaymentCentavos: MoneyAmount, financingCostCentavos: SignedMoney, shortageDates: z.array(CalendarDay), policyChecks: z.array(PolicyCheckSchema),
});
/** A horizon result is never converted into an average or a single monthly value. */
export const DatedScenarioSchema = LegacyScenarioSchema.omit({ monthlyRemainingCentavos: true }).extend({
  format: z.literal('dated-scenario/v1'), monthlyRemainingCentavos: z.null(), workflow: WorkflowScenario,
}).superRefine((s, ctx) => {
  const w = s.workflow;
  const reject = () => ctx.addIssue({code:'custom',message:'The dated scenario projection differs from its saved assessment.'});
  if (s.offerVersionId !== w.offerId || s.lowestBalanceCentavos !== w.lowestBalanceCentavos
    || s.closingBalanceCentavos !== w.closingBalanceCentavos || s.totalRepaymentCentavos !== w.totalRepaymentCentavos
    || s.financingCostCentavos !== w.financingCostCentavos || JSON.stringify(s.shortageDates) !== JSON.stringify(w.shortageDates)) reject();
  if (s.policyChecks.length !== w.checks.length || s.policyChecks.some((p, i) =>
    p.policyId !== w.checks[i].id || p.passed !== w.checks[i].passed || p.overridable)) reject();
});
export const ScenarioSchema = z.union([LegacyScenarioSchema, DatedScenarioSchema]);
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
const Sha256=z.string().regex(/^[a-f0-9]{64}$/);
const DecisionAction=z.enum(['approve','decline','return']);
export const DecisionPreviewCreateSchema=DecisionCreateSchema.omit({explanationReviewed:true});
export const DecisionPreviewSchema=z.strictObject({id:Id,decisionId:Id,applicationVersion:Version,basisHash:Sha256,expiresAt:Instant,explanation:Text,terms:z.string().nullable()});
export const DecisionRecordCreateSchema=z.strictObject({previewId:Id,decision:DecisionCreateSchema});
export const StaffDecisionWorkspaceSchema=z.strictObject({
  application:ApplicationSchema,basisHash:Sha256,periodStart:CalendarDay,periodEnd:CalendarDay,
  assessment:z.strictObject({id:Id,inputVersion:Version,state:z.enum(['complete','incomplete','unavailable','stale']),issues:z.array(Text)}).nullable(),
  offers:z.array(z.strictObject({offer:OfferSchema,checked:ScenarioSchema.nullable(),recommend:z.boolean(),outcomes:z.array(DecisionAction)})),
  recommendation:z.strictObject({id:Id,offerVersionId:Id,preparedBy:Id,preparedAt:Instant,reason:Text}).nullable(),
  canReturn:z.boolean(),blockedReason:Text.nullable(),currentDecisionId:Id.nullable(),
});
export const StaffDecisionHistoryPageSchema=z.strictObject({items:z.array(DecisionSchema.extend({accepted:z.boolean()})).max(50),nextCursor:Id.nullable()});
export const StaffDecisionBriefSchema=z.strictObject({
  id:Id,applicationId:Id,memberName:z.string(),inputVersion:Version,recordedAt:Instant,reviewerId:Id,outcome:DecisionAction,
  explanation:Text,origin:z.enum(['template','manual']),reviewDate:CalendarDay,periodStart:CalendarDay,periodEnd:CalendarDay,
  considered:z.strictObject({offer:OfferSchema,checked:ScenarioSchema}).nullable(),snapshotHash:Sha256,
  document:z.strictObject({id:Id,sha256:Sha256}).nullable(),
  sources:z.array(z.strictObject({sourceId:Id,sourceVersion:Version,verification:z.enum(['not_checked','supported','mismatch','unavailable']),effectiveDates:z.array(CalendarDay)})),
});
export const DecisionConflictCreateSchema=z.strictObject({status:z.enum(['clear','restricted']),reference:Text});
const ReviewBasis={evidenceBasisHash:Sha256};
export const DecisionReviewConfirmSchema=z.strictObject({...ReviewBasis,mode:z.literal('manual'),reviewedSources:z.literal(true),reviewedScenarios:z.literal(true),reason:Text});
export const DecisionConcernCreateSchema=z.strictObject({...ReviewBasis,source:SourceReferenceSchema,description:Text});
export const DecisionConcernCheckSchema=z.strictObject({...ReviewBasis,outcome:z.enum(['confirmed','corrected','dismissed']),reason:Text,correctedText:z.string().trim().max(2000)})
  .refine(v=>v.outcome==='corrected'?v.correctedText.length>0:v.correctedText==='', 'Supply corrected wording only for a correction.');
export const DecisionReviewAssignmentSchema=z.strictObject({...ReviewBasis,reviewerId:Id,reason:Text});
export const DecisionReviewDispositionSchema=z.strictObject({...ReviewBasis,assignmentId:Id,outcome:z.enum(['investigating','clarification','options','resolved']),reason:Text});
export const DecisionNoticeAcknowledgmentSchema=z.strictObject({acknowledgment:z.literal(true)});
const ReviewEventActor={id:Id,recordedBy:Id,recordedAt:Instant};
const ConcernCheck=z.strictObject({...ReviewEventActor,outcome:z.enum(['confirmed','corrected','dismissed']),reason:Text,correctedText:z.string()});
const ConcernAssignment=z.strictObject({...ReviewEventActor,reviewerId:Id,reviewerName:Text,reason:Text});
const ConcernDisposition=z.strictObject({...ReviewEventActor,outcome:DecisionReviewDispositionSchema.shape.outcome,reason:Text});
export const DecisionReviewSchema=z.strictObject({
  applicationId:Id,version:Version,inputVersion:Version,reviewVersion:Version,evidenceBasisHash:Sha256,
  state:z.enum(['assessment_unavailable','needs_confirmation','awaiting_concern_check','escalated_review','ready']),message:Text,
  confirmation:z.strictObject({...ReviewEventActor,mode:z.literal('manual'),reason:Text,current:z.boolean()}).nullable(),
  ownConflict:z.strictObject({status:z.enum(['clear','restricted','unavailable']),reference:Text.nullable()}),
  canConfirm:z.boolean(),canRaiseConcern:z.boolean(),canCheckConcerns:z.boolean(),
  concerns:z.array(z.strictObject({...ReviewEventActor,origin:z.literal('manual'),source:SourceReferenceSchema,description:Text,
    state:z.enum(['awaiting_check','dismissed','needs_assignment','escalated','resolved']),check:ConcernCheck.nullable(),assignment:ConcernAssignment.nullable(),disposition:ConcernDisposition.nullable()})).max(100),
  reviewers:z.array(z.strictObject({userId:Id,displayName:Text,available:z.boolean(),reason:Text.nullable()})).max(100),
  sources:z.array(z.strictObject({sourceId:Id,sourceVersion:Version,label:Text,kind:z.enum(['document','statement']),date:CalendarDay,pageCount:z.number().int().nonnegative(),referenceable:z.boolean(),verification:z.enum(['not_checked','supported','mismatch','unavailable'])})),
});
export const DecisionReviewEventPayloadSchema=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('confirm_current'),data:DecisionReviewConfirmSchema}),
  z.strictObject({kind:z.literal('raise_concern'),data:DecisionConcernCreateSchema}),
  z.strictObject({kind:z.literal('check_concern'),concernId:Id,data:DecisionConcernCheckSchema}),
  z.strictObject({kind:z.literal('assign_review'),concernId:Id,reviewerName:Text,data:DecisionReviewAssignmentSchema}),
  z.strictObject({kind:z.literal('review_disposition'),concernId:Id,data:DecisionReviewDispositionSchema}),
  z.strictObject({kind:z.literal('reassign_preparation'),data:AssignmentCreateSchema}),
]);
export const DecisionReviewEventSchema=z.strictObject({...ReviewEventActor,version:Version,evidenceBasisHash:Sha256.nullable(),event:DecisionReviewEventPayloadSchema});
export const DecisionReviewEventPageSchema=z.strictObject({items:z.array(DecisionReviewEventSchema).max(100),nextCursor:Id.nullable()});
export const DecisionNoticeSchema=z.strictObject({id:Id,applicationId:Id,concernId:Id,assignmentId:Id,createdAt:Instant,acknowledgedAt:Instant.nullable()});
export const DecisionNoticePageSchema=z.strictObject({items:z.array(DecisionNoticeSchema).max(100),nextCursor:Id.nullable()});
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
// Canonical reporting evidence shared by the owned readers and comparison engine.
const ReconciliationKind = z.enum(['disbursement', 'repayment']);
const ReconciliationScopeSchema = z.strictObject({
  organizationId: Id, fromDate: CalendarDay, throughDate: CalendarDay,
  cutoffAt: Instant, snapshotId: Text,
}).refine(scope => scope.fromDate <= scope.throughDate, 'The date range is reversed.');
const ReconciliationRecordScope = { organizationId: Id, currency: Currency };
const ReconciliationEventSchema = z.strictObject({
  ...ReconciliationRecordScope, id: Id, loanId: Id, kind: ReconciliationKind, effectiveDate: CalendarDay,
  recordedAt: Instant, amountCentavos: PositiveMoneyAmount,
  state: FinancialCommandSchema.shape.state, postingRuleVersionId: Id,
  receiptId: Id.nullable(), journalId: Id.nullable(),
});
const ReconciliationAllocationSchema = z.strictObject({
  ...ReconciliationRecordScope, id: Id, sourceEventId: Id, loanId: Id,
  effectiveDate: CalendarDay, recordedAt: Instant, direction: z.enum(['increase', 'decrease']),
  principalCentavos: MoneyAmount, interestCentavos: MoneyAmount,
  feesCentavos: MoneyAmount, unappliedCentavos: MoneyAmount,
});
const ReconciliationReceiptSchema = z.strictObject({
  ...ReconciliationRecordScope, id: Id, sourceEventId: Id, loanId: Id,
  effectiveDate: CalendarDay, recordedAt: Instant, amountCentavos: PositiveMoneyAmount,
});
const ReconciliationJournalSchema = PostingRequestSchema.extend({ organizationId: Id, journalId: Id, postedAt: Instant });
const ReconciliationMappingSchema = z.strictObject({
  ...ReconciliationRecordScope, postingRuleVersionId: Id, kind: ReconciliationKind,
  effectiveFrom: CalendarDay, effectiveThrough: CalendarDay,
  cashAccountId: Id, principalAccountId: Id,
}).refine(mapping => mapping.effectiveFrom <= mapping.effectiveThrough
  && mapping.cashAccountId !== mapping.principalAccountId, 'Invalid principal posting mapping.');
const ReconciliationUnavailable = z.strictObject({ state: z.literal('unavailable'), reason: Text });
const ReconciliationSourceMetadata = { state: z.literal('available'), snapshotId: Text, complete: z.boolean() };

/** Complete inventories, including records without a matching record in the other source. */
export const PrincipalReconciliationInputSchema = z.strictObject({
  scope: ReconciliationScopeSchema,
  servicing: z.discriminatedUnion('state', [ReconciliationUnavailable, z.strictObject({
    ...ReconciliationSourceMetadata, events: z.array(ReconciliationEventSchema), allocations: z.array(ReconciliationAllocationSchema), receipts: z.array(ReconciliationReceiptSchema),
  })]),
  ledger: z.discriminatedUnion('state', [ReconciliationUnavailable, z.strictObject({ ...ReconciliationSourceMetadata, journals: z.array(ReconciliationJournalSchema) })]),
  mappings: z.array(ReconciliationMappingSchema),
}).superRefine((input, context) => {
  const reject = (path: (string | number)[], message: string) => context.addIssue({ code: 'custom', path, message });
  const check = (record: { organizationId: string; effectiveDate: string }, time: string, path: (string | number)[]) => {
    if (record.organizationId !== input.scope.organizationId) reject(path, 'Evidence belongs to another organization.');
    if (record.effectiveDate < input.scope.fromDate || record.effectiveDate > input.scope.throughDate)
      reject(path, 'Evidence is outside the requested effective-date range.');
    if (Date.parse(time) > Date.parse(input.scope.cutoffAt)) reject(path, 'Evidence was recorded after the cutoff.');
  };
  if (input.servicing.state === 'available') {
    for (const collection of ['events', 'allocations', 'receipts'] as const)
      input.servicing[collection].forEach((record, index) => check(record, record.recordedAt, ['servicing', collection, index]));
  }
  if (input.ledger.state === 'available')
    input.ledger.journals.forEach((record, index) => check(record, record.postedAt, ['ledger', 'journals', index]));
  const mappingIds = new Set<string>();
  input.mappings.forEach((mapping, index) => {
    if (mapping.organizationId !== input.scope.organizationId) reject(['mappings', index], 'Mapping belongs to another organization.');
    if (mappingIds.has(mapping.postingRuleVersionId)) reject(['mappings', index], 'Mapping version is ambiguous.');
    mappingIds.add(mapping.postingRuleVersionId);
  });
});


export const ReconciliationCreateSchema = z.strictObject({ fromDate: CalendarDay, throughDate: CalendarDay })
  .refine(value => { const days = (Date.parse(value.throughDate) - Date.parse(value.fromDate)) / 86400000;
    return days >= 0 && days < 31; }, 'Choose an inclusive date range of up to 31 days.');
export const ReconciliationStatusSchema = z.enum(['matched','discrepancy','pending','unavailable','empty']);
const ReconciliationFindingSchema = z.strictObject({ code: Text, level: z.enum(['discrepancy','pending','unavailable']), expectedCentavos: MoneyAmount.nullable(), actualCentavos: MoneyAmount.nullable() });
export const PrincipalReconciliationReportSchema = z.strictObject({ scope: ReconciliationScopeSchema, status: ReconciliationStatusSchema, sourceIssues: z.array(Text),
  events: z.array(z.strictObject({ sourceEventId: Id, loanId: Id.nullable(), amountCentavos: MoneyAmount.nullable(), status: z.enum(['matched','discrepancy','pending','unavailable']),
    receiptIds: z.array(Id), allocationIds: z.array(Id), journalIds: z.array(Id), findings: z.array(ReconciliationFindingSchema) })).max(5000) });
export const ReconciliationRunSchema = z.strictObject({ id: Id, organizationId: Id, createdBy: Id, createdAt: Instant,
  checkerVersion: z.literal('principal-reconciliation-v1'), evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/), mappingVersionIds: z.array(Id), report: PrincipalReconciliationReportSchema });
export const ReconciliationSummarySchema = ReconciliationRunSchema.pick({id:true,createdBy:true,createdAt:true}).extend({fromDate:CalendarDay,throughDate:CalendarDay,status:ReconciliationStatusSchema});
export const ReconciliationPageSchema = z.strictObject({items:z.array(ReconciliationSummarySchema).max(20),nextCursor:Id.nullable()});

export const LoanPositionSchema = z.strictObject({
  loanId: Id, asOfDate: CalendarDay, principalCentavos: MoneyAmount, interestDueCentavos: MoneyAmount, feesDueCentavos: MoneyAmount,
  overdueCentavos: MoneyAmount, postedThrough: Instant, pendingMovementCount: z.number().int().nonnegative(),
});
export const PostedResultSchema = z.strictObject({ eventId: Id, commandId: Id, loanId: Id, kind: z.enum(['disbursement', 'repayment']),
  amountCentavos: PositiveMoneyAmount, currency: Currency, effectiveDate: CalendarDay, postedAt: Instant,
  journalId: Id, receiptId: Id.nullable(), principalAfterCentavos: MoneyAmount, postingRuleVersionId: Id });
export const SafeMoneyCommandSchema = z.strictObject({ id: Id, kind: z.enum(['disbursement', 'repayment']), version: Version,
  state: FinancialCommandSchema.shape.state, amountCentavos: PositiveMoneyAmount, effectiveDate: CalendarDay, legacy: z.boolean() });
export const LoanViewSchema = z.strictObject({ loanId: Id, applicationId: Id, memberLabel: z.string(), state: z.enum(['active', 'settled']),
  asOfDate: CalendarDay, principalCentavos: MoneyAmount, interestDueCentavos: z.literal(0), feesDueCentavos: z.literal(0),
  overdueCentavos: MoneyAmount, postedThrough: Instant, pendingMovementCount: z.number().int().nonnegative(),
  schedule: z.array(z.strictObject({ date: CalendarDay, amountCentavos: PositiveMoneyAmount })),
  receipts: z.array(PostedResultSchema), commands: z.array(SafeMoneyCommandSchema) });
export const LoanWorkspaceSchema = z.strictObject({ loanId: Id, organizationId: Id, branchId: Id, memberLabel: z.string(), position: LoanViewSchema.nullable(),
  origination:z.strictObject({applicationId:Id,principalCentavos:PositiveMoneyAmount,currency:Currency,payments:z.array(z.strictObject({date:CalendarDay,amountCentavos:PositiveMoneyAmount}))}).optional(),
  canPrepareRelease:z.boolean().optional(),releasePreparationMessage:z.string().optional(),
  commands: z.array(SafeMoneyCommandSchema), message: z.string(), nextPayment: z.strictObject({ date: CalendarDay, amountCentavos: PositiveMoneyAmount }).nullable() });
export const FinancialActionReasonSchema=z.strictObject({reason:Text});
export const LendingApplicationSchema=z.strictObject({id:Id,memberLabel:Text,purpose:Text,principalCentavos:PositiveMoneyAmount,acceptanceRecorded:z.boolean(),loanId:Id.nullable(),recordedAt:Instant});
export const LendingApplicationPageSchema=z.strictObject({items:z.array(LendingApplicationSchema).max(100),nextCursor:Id.nullable()});
const ReviewResponse = z.enum(['yes', 'no', 'unavailable']);
export const HealthReviewCreateSchema = z.strictObject({
  loanId: Id, reviewDate: CalendarDay, canMeetEssentials: ReviewResponse, borrowedToRepay: ReviewResponse,
  financialStrain: z.enum(['reported', 'not_reported', 'unavailable']), source: Text, staffAction: Text, nextReviewDate: CalendarDay,
});
export const HealthReviewSchema = HealthReviewCreateSchema.extend({ id: Id, recordedBy: Id, recordedAt: Instant });
export const CommandReceiptSchema = z.strictObject({ id: Id, version: Version });
export const CapabilitiesSchema = z.strictObject({ contractVersion: z.literal(CONTRACT_VERSION), recordMode:RecordMode.optional(), modules: z.array(z.strictObject({ name: z.string(), owner: z.string(), state: z.enum(['available', 'contract_only']) })) });
export const EventEnvelopeSchema = z.strictObject({ id: Id, type: z.string(), schemaVersion: z.literal(1), organizationId: Id, aggregateId: Id, aggregateVersion: Version, occurredAt: Instant, correlationId: z.string(), payload: z.record(z.string(), z.unknown()) });

// Member principals and projections deliberately contain no staff authority.
export const MemberSessionSchema = z.strictObject({
  principal: z.strictObject({ kind: z.literal('member'), memberId: Id, displayName: Text }),
  csrfToken: z.string(), expiresAt: Instant, privacyNoticeVersion: Text, contractVersion: z.literal(CONTRACT_VERSION), recordMode:RecordMode.optional(),
});
export const MemberProfileSchema = MemberSchema.pick({id:true,fullName:true,phone:true,externalReference:true});
export const MemberApplicationCreateSchema = ApplicationCreateSchema.omit({memberId:true}).extend({noticeVersion:Text,noticeAcknowledged:z.literal(true)});
export const MemberApplicationSchema = ApplicationSchema.pick({id:true,purpose:true,requestedPrincipalCentavos:true,requestedTermMonths:true,currency:true,status:true,version:true,createdAt:true,updatedAt:true});
export const MemberApplicationPageSchema = z.strictObject({items:z.array(MemberApplicationSchema),nextCursor:Id.nullable()});
export const MemberSubmitSchema = z.strictObject({noticeVersion:Text,acknowledgment:z.literal(true)});
export const ReminderPreferenceUpdateSchema = z.strictObject({noticesEnabled:z.boolean()});
export const ReminderPreferencesSchema = ReminderPreferenceUpdateSchema.extend({version:Version});
export const AiDraftSchema = z.strictObject({id:Id,origin:z.enum(['model','template','simulated']),provenance:ModelArtifactSchema.nullable(),source:SourceReferenceSchema,value:FactValueSchema,question:Text,state:z.literal('suggested')});
export const DraftConfirmationSchema = z.strictObject({draftId:Id,sourceId:Id,sourceVersion:Version,action:z.enum(['confirm','correct','not_applicable']),value:FactValueSchema,effectiveDate:CalendarDay.nullable(),reason:Text});
export const IrregularExpenseSchema = z.strictObject({
  source:SourceReferenceSchema,relevance:z.enum(['confirmed','uncertain','not_applicable']),value:FactValueSchema,
  cashDate:CalendarDay.nullable(),recurrence:z.enum(['one_time','explicit_recurring','unknown']),assumption:Text,horizonEnd:CalendarDay,
});
export const MemberSourceSchema = z.strictObject({id:Id,fileName:Text,state:z.enum(['quarantined','cleared','blocked']),version:Version,verification:z.enum(['not_checked','supported','mismatch','unavailable'])});
export const MemberEvidenceSchema = z.strictObject({sources:z.array(MemberSourceSchema),drafts:z.array(AiDraftSchema)});
export const MemberOptionSchema = z.strictObject({offer:OfferSchema,checked:ScenarioSchema,horizonStart:CalendarDay,horizonEnd:CalendarDay,assumptions:z.array(Text)});
export const MemberDecisionSchema = z.strictObject({id:Id,outcome:z.enum(['approve','decline','return']),explanation:Text,recordedAt:Instant,documentVersionId:Id.nullable(),terms:MemberOptionSchema.nullable(),accepted:z.boolean()});
export const MemberDecisionDocumentSchema=z.strictObject({id:Id,sha256:z.string().regex(/^[a-f0-9]{64}$/),mediaType:z.literal('text/plain; charset=utf-8'),text:z.string().min(1).max(65536)});
export const OriginationCreateSchema=z.strictObject({method:z.enum(['cash','bank'])});
export const MemberReceiptSchema = z.strictObject({id:Id,loanId:Id,paidOn:CalendarDay,amountCentavos:MoneyAmount,reference:Text});
export const MemberLoanSchema = z.strictObject({
  id:Id,label:Text,status:z.enum(['active','settled','restructured','written_off']),position:LoanPositionSchema,
  nextPayment:z.strictObject({date:CalendarDay,amountCentavos:MoneyAmount}).nullable(),
  schedule:z.array(z.strictObject({date:CalendarDay,amountCentavos:MoneyAmount})),receipts:z.array(MemberReceiptSchema),
});
export const SupportCheckInSchema = z.strictObject({canMeetEssentials:z.enum(['yes','no','declined','unavailable']),borrowedToRepay:z.enum(['yes','no','declined','unavailable']),financialStrain:z.enum(['reported','not_reported','declined','unavailable'])});
export const MemberSupportCreateSchema = z.strictObject({loanId:Id.nullable(),message:Text,contactPreference:z.enum(['portal','phone']),sharingConfirmed:z.literal(true),noticeVersion:Text,checkIn:SupportCheckInSchema.optional()});
export const MemberSupportSchema = z.strictObject({id:Id,submittedAt:Instant,status:z.enum(['submitted','assigned','reviewed']),message:Text,response:Text.nullable(),checkIn:SupportCheckInSchema.optional(),loanId:Id.nullable().optional()});
export const SupportAssignmentSchema=z.strictObject({officerId:Id,reason:Text});
export const SupportResponseSchema=z.strictObject({response:Text,internalNote:Text,followUpDate:CalendarDay.nullable()});
export const SupportSummarySchema=z.strictObject({id:Id,memberId:Id,branchId:Id,submittedAt:Instant,status:MemberSupportSchema.shape.status,version:Version,assignedOfficerId:Id.nullable()});
export const SupportPageSchema=z.strictObject({items:z.array(SupportSummarySchema).max(100),nextCursor:Id.nullable()});
export const SupportActionSchema=z.strictObject({id:Id,recordedAt:Instant,recordedBy:Id,response:Text,internalNote:Text,followUpDate:CalendarDay.nullable(),version:Version});
export const SupportFreshPositionViewSchema=z.discriminatedUnion('state',[z.strictObject({state:z.literal('unavailable'),message:Text}),z.strictObject({state:z.literal('available'),data:LoanPositionSchema})]);
export const SupportDetailSchema=SupportSummarySchema.extend({message:Text,contactPreference:z.enum(['portal','phone']),noticeVersion:Text,checkIn:SupportCheckInSchema,position:LoanPositionSchema.nullable(),positionMessage:Text,actions:z.array(SupportActionSchema).max(100)});
export const SupportActionPageSchema=z.strictObject({items:z.array(SupportActionSchema).max(100),nextCursor:Id.nullable()});
export const SupportHistorySchema=SupportDetailSchema.extend({actionsNextCursor:Id.nullable()});
export const SupportFollowUpFilterSchema=z.enum(['open','scheduled','due','overdue','completed']);
export const SupportFollowUpSchema=z.strictObject({id:Id,requestId:Id,memberId:Id,branchId:Id,assignedOfficerId:Id,sourceActionId:Id,sourceActionVersion:Version,sourceRecordedAt:Instant,originalDate:CalendarDay,dueDate:CalendarDay,status:z.enum(['open','completed']),version:Version,recordedAt:Instant,recordedBy:Id,completedAt:Instant.nullable()});
export const SupportFollowUpEventSchema=z.strictObject({id:Id,version:Version,kind:z.enum(['scheduled','rescheduled','completed']),dueDate:CalendarDay,status:z.enum(['open','completed']),note:Text.nullable(),recordedAt:Instant,recordedBy:Id});
export const SupportFollowUpPageSchema=z.strictObject({asOfDate:CalendarDay,items:z.array(SupportFollowUpSchema).max(100),nextCursor:Id.nullable()});
export const SupportFollowUpEventPageSchema=z.strictObject({items:z.array(SupportFollowUpEventSchema).max(100),nextCursor:Id.nullable()});
export const SupportFollowUpDetailSchema=z.strictObject({task:SupportFollowUpSchema,source:SupportActionSchema,events:z.array(SupportFollowUpEventSchema).max(100),eventsNextCursor:Id.nullable()});
export const SupportFollowUpCompletionSchema=z.strictObject({note:Text});
export const SupportFollowUpRescheduleSchema=z.strictObject({date:CalendarDay,reason:Text});
export const MemberAcceptanceSchema = z.strictObject({decisionId:Id,documentVersionId:Id,acknowledgment:z.literal(true)});
export const MemberUploadSchema = z.strictObject({fileName:z.string().trim().min(1).max(160),mediaType:z.enum(['application/pdf','image/jpeg','image/png']),size:z.number().int().min(1).max(10*1024*1024)});
const serviceView = <T extends z.ZodType>(data:T) => z.discriminatedUnion('state',[
  z.strictObject({state:z.literal('available'),data}),z.strictObject({state:z.literal('unavailable'),message:Text}),
]);
export const MemberEvidenceViewSchema = serviceView(MemberEvidenceSchema);
export const MemberOptionsViewSchema = serviceView(z.array(MemberOptionSchema));
export const MemberDecisionViewSchema = serviceView(MemberDecisionSchema.nullable());
export const MemberLoansViewSchema = serviceView(z.array(MemberLoanSchema));
export const MemberSupportViewSchema = serviceView(z.array(MemberSupportSchema));
export const MemberSupportPageSchema=z.strictObject({items:z.array(MemberSupportSchema).max(100),nextCursor:Id.nullable()});
export const MemberSupportPageViewSchema=serviceView(MemberSupportPageSchema);
export const MemberSupportHistoryQuerySchema=z.strictObject({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(100).default(25)});

export const schemas = {
  SupportFreshPositionView:SupportFreshPositionViewSchema,
  CalendarDay,PostedResult:PostedResultSchema,SafeMoneyCommand:SafeMoneyCommandSchema,StaffLoanView:LoanViewSchema,StaffLoanWorkspace:LoanWorkspaceSchema,FinancialActionReason:FinancialActionReasonSchema,LendingApplicationPage:LendingApplicationPageSchema,
  DecisionPreviewCreate:DecisionPreviewCreateSchema,DecisionPreview:DecisionPreviewSchema,DecisionRecordCreate:DecisionRecordCreateSchema,
  StaffDecisionWorkspace:StaffDecisionWorkspaceSchema,StaffDecisionHistoryPage:StaffDecisionHistoryPageSchema,StaffDecisionBrief:StaffDecisionBriefSchema,
  DecisionConflictCreate:DecisionConflictCreateSchema,DecisionReviewConfirm:DecisionReviewConfirmSchema,DecisionConcernCreate:DecisionConcernCreateSchema,
  DecisionConcernCheck:DecisionConcernCheckSchema,DecisionReviewAssignment:DecisionReviewAssignmentSchema,DecisionReviewDisposition:DecisionReviewDispositionSchema,
  DecisionNoticeAcknowledgment:DecisionNoticeAcknowledgmentSchema,DecisionReview:DecisionReviewSchema,DecisionReviewEventPage:DecisionReviewEventPageSchema,DecisionNoticePage:DecisionNoticePageSchema,
  SupportAssignment:SupportAssignmentSchema,SupportResponse:SupportResponseSchema,SupportPage:SupportPageSchema,SupportDetail:SupportDetailSchema,SupportSummary:SupportSummarySchema,SupportAction:SupportActionSchema,SupportActionPage:SupportActionPageSchema,SupportHistory:SupportHistorySchema,
  ReconciliationCreate:ReconciliationCreateSchema,ReconciliationRun:ReconciliationRunSchema,ReconciliationPage:ReconciliationPageSchema,
  ...workflowSchemas,
  MemberSession:MemberSessionSchema,MemberProfile:MemberProfileSchema,MemberApplicationCreate:MemberApplicationCreateSchema,MemberApplication:MemberApplicationSchema,MemberApplicationPage:MemberApplicationPageSchema,MemberSubmit:MemberSubmitSchema,
  ReminderPreferenceUpdate:ReminderPreferenceUpdateSchema,ReminderPreferences:ReminderPreferencesSchema,ModelArtifact:ModelArtifactSchema,AiDraft:AiDraftSchema,DraftConfirmation:DraftConfirmationSchema.or(workflowSchemas.WorkflowDraftReview),IrregularExpense:IrregularExpenseSchema,
  MemberSource:MemberSourceSchema,MemberEvidenceView:MemberEvidenceViewSchema,MemberOptionsView:MemberOptionsViewSchema,MemberDecisionView:MemberDecisionViewSchema,MemberLoansView:MemberLoansViewSchema,MemberSupportView:MemberSupportViewSchema,MemberSupportCreate:MemberSupportCreateSchema,MemberSupport:MemberSupportSchema,MemberAcceptance:MemberAcceptanceSchema,MemberUpload:MemberUploadSchema,
  MemberOption:MemberOptionSchema,MemberDecision:MemberDecisionSchema,MemberDecisionDocument:MemberDecisionDocumentSchema,OriginationCreate:OriginationCreateSchema,MemberLoan:MemberLoanSchema,MemberReceipt:MemberReceiptSchema,SourceReference:SourceReferenceSchema,
  ApiError: ApiErrorSchema, Session: SessionSchema, Staff: StaffSchema, StaffPage: StaffPageSchema, StaffRevoke: StaffRevokeSchema, MemberCreate: MemberCreateSchema, MemberUpdate: MemberUpdateSchema, Member: MemberSchema, MemberPage: MemberPageSchema,
  ApplicationCreate: ApplicationCreateSchema, ApplicationUpdate: ApplicationUpdateSchema, Application: ApplicationSchema, ApplicationPage: ApplicationPageSchema, AssignmentCreate: AssignmentCreateSchema,
  EvidenceCorrection: EvidenceCorrectionSchema, Verification: VerificationSchema, AssessmentCreate: AssessmentCreateSchema, Assessment: AssessmentSchema, Offer: OfferSchema,
  RecommendationCreate: RecommendationCreateSchema, DecisionCreate: DecisionCreateSchema, Decision: DecisionSchema, AcceptanceCreate: AcceptanceCreateSchema,
  FinancialCommandCreate: FinancialCommandCreateSchema, FinancialCommand: FinancialCommandSchema, PostingRequest: PostingRequestSchema, JournalReceipt: JournalReceiptSchema,
  LoanPosition: LoanPositionSchema, HealthReviewCreate: HealthReviewCreateSchema, HealthReview: HealthReviewSchema, CommandReceipt: CommandReceiptSchema, Capabilities: CapabilitiesSchema, EventEnvelope: EventEnvelopeSchema,
  SupportFollowUpFilter:SupportFollowUpFilterSchema,SupportFollowUp:SupportFollowUpSchema,SupportFollowUpEvent:SupportFollowUpEventSchema,SupportFollowUpPage:SupportFollowUpPageSchema,SupportFollowUpEventPage:SupportFollowUpEventPageSchema,SupportFollowUpDetail:SupportFollowUpDetailSchema,SupportFollowUpCompletion:SupportFollowUpCompletionSchema,SupportFollowUpReschedule:SupportFollowUpRescheduleSchema,
  MemberSupportPage:MemberSupportPageSchema,MemberSupportPageView:MemberSupportPageViewSchema,MemberSupportHistoryQuery:MemberSupportHistoryQuerySchema,
} as const;
export type SchemaName = keyof typeof schemas;
