import { z } from 'zod';
import { VerificationSchema, Id, Version, Text, CalendarDay, Instant, FactValueSchema, ModelArtifactSchema, SourceReferenceSchema, OfferSchema, SignedMoney, MoneyAmount } from './common.js';

export const WorkflowFactInput = z.strictObject({
  factId: Id.nullable(), relevance:z.enum(['included','not_applicable']).default('included'), label: Text, category: z.enum(['opening','income','expense','obligation']),
  value: FactValueSchema, sourceId: Id.nullable(), sourceVersion: Version.nullable(), statement: Text.nullable(),
  effectiveDate: CalendarDay, coverageStart: CalendarDay.nullable(), coverageEnd: CalendarDay.nullable(), cashDates: z.array(CalendarDay).max(366),
  period: z.enum(['one_time','monthly','weekly','semi_monthly','other','unknown']),
  basis: z.enum(['net','gross','not_applicable','unknown']), deduction: z.enum(['yes','no','unknown']), reason: Text,
});
export const WorkflowSuggestion = WorkflowFactInput.extend({ effectiveDate: CalendarDay.nullable() });
export const WorkflowFact = z.strictObject({ id: Id, revision: Version, input: WorkflowFactInput, sourceId: Id, sourceVersion: Version, recordedAt: Instant });
export const WorkflowSource = z.strictObject({
  id: Id, version: Version, textVersionId: Id.nullable(), kind: z.enum(['document','statement']), label: Text, date: CalendarDay,
  state: z.enum(['quarantined','cleared','blocked']), processing: z.enum(['queued','scanning','extracting','ai','available','failed','manual']),
  message: Text.nullable(), verification: z.enum(['not_checked','supported','mismatch','unavailable']),
  pages: z.array(z.strictObject({ page: z.number().int().positive(), text: z.string().max(100000) })).max(20),
});
export const WorkflowFinding=z.strictObject({page:z.number().int().positive(),excerpt:Text,fact:WorkflowSuggestion});
export const WorkflowDraft = z.strictObject({ id: Id, textVersionId:Id, origin: z.enum(['model','simulated']), source: SourceReferenceSchema, suggestion: WorkflowSuggestion,
  provenance: ModelArtifactSchema, state: z.enum(['suggested','accepted','rejected']) });
export const WorkflowDraftReview = z.strictObject({ draftId: Id, action: z.enum(['confirm','correct','not_applicable']), fact: WorkflowFactInput.nullable(), reason: Text, guidanceVersion:Version.optional() });
export const WorkflowMonth = z.strictObject({ month: z.string().regex(/^\d{4}-\d{2}$/), remainingCentavos: SignedMoney });
export const WorkflowScenario = z.strictObject({ offerId: Id, label: Text, horizonNetCentavos: SignedMoney,
  lowestBalanceCentavos: SignedMoney, closingBalanceCentavos: SignedMoney, totalRepaymentCentavos: MoneyAmount, financingCostCentavos: SignedMoney,
  months: z.array(WorkflowMonth), daily: z.array(z.strictObject({ date: CalendarDay, balanceCentavos: SignedMoney })), shortageDates: z.array(CalendarDay),
  checks: z.array(z.strictObject({ id: Text, passed: z.boolean(), detail: Text,actualCentavos:SignedMoney,minimumCentavos:SignedMoney })),
});
export const WorkflowAssessment = z.strictObject({ id: Id, applicationId: Id, inputVersion: Version, policyVersionId: Id.nullable(),
  engineVersion: Text, createdAt: Instant, periodStart: CalendarDay, periodEnd: CalendarDay, status: z.enum(['complete','incomplete']),
  issues: z.array(Text), scenarios: z.array(WorkflowScenario), stale: z.boolean(),
});
export const WorkflowView = z.strictObject({ applicationId: Id, version: Version, inputVersion: Version,
  sources: z.array(WorkflowSource), facts: z.array(WorkflowFact), drafts: z.array(WorkflowDraft),
  offers: z.array(OfferSchema), latestAssessment: WorkflowAssessment.nullable(), aiAvailable: z.boolean(),
});
export const WorkflowHistory = z.strictObject({ verifications:z.array(z.strictObject({verification:VerificationSchema,actorId:Id,recordedAt:Instant})), facts: z.array(WorkflowFact), assessments: z.array(WorkflowAssessment) });
export const WorkflowPolicy = z.strictObject({ id: Id, label: Text, status: z.enum(['fictional','approved']), approvalReference: Text.nullable(),
  effectiveFrom: CalendarDay, effectiveThrough: CalendarDay, loanProceedsTreatment:z.literal('reserved_for_purpose'), remainingRuleBasis:z.literal('each_reviewed_calendar_month_segment'), minimumRemainingCentavos: SignedMoney, minimumBalanceCentavos: SignedMoney,
  offers: z.array(OfferSchema.extend({ separateFees: z.array(z.strictObject({ date: CalendarDay, amountCentavos: MoneyAmount })).max(100) })).min(1).max(20),
});
export const workflowSchemas = { WorkflowFinding, WorkflowFactInput, WorkflowFact, WorkflowDraftReview, WorkflowView, WorkflowAssessment, WorkflowHistory, WorkflowPolicy };
