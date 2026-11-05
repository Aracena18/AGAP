import { z } from 'zod';
import { CalendarDay, Currency, Id, Instant, MoneyAmount, OfferSchema, PositiveMoneyAmount, Text, Version } from './common.js';
import { WorkflowAssessment } from './workflow.js';

const Hash=z.string().regex(/^[a-f0-9]{64}$/);
export const PilotDecisionRecord=z.strictObject({previewId:Id,explanationReviewed:z.literal(true)});
export const PilotConflictDeclaration=z.strictObject({status:z.enum(['clear','restricted','unavailable']),reason:Text});
export const PilotSimulationObservation=z.strictObject({outcome:z.enum(['confirmed','failed','unknown']),reason:Text});
export const PilotAction=z.strictObject({reason:Text});
export const PilotOrigination=z.strictObject({applicationId:Id,method:z.enum(['cash','bank'])});
export const PilotWorkspace=z.strictObject({
 applicationId:Id,applicationVersion:Version,inputVersion:Version,memberName:Text,status:Text,
 assessment:WorkflowAssessment.nullable(),offers:z.array(OfferSchema),
 recommendation:z.strictObject({id:Id,assessmentId:Id,offerVersionId:Id,inputVersion:Version,preparedBy:Id,reason:Text}).nullable(),
 currentDecisionId:Id.nullable(),loanId:Id.nullable(),canRecommend:z.boolean(),canReview:z.boolean(),canReturn:z.boolean(),
 blockedReason:Text.nullable(),configurationVersion:Id,conflict:z.enum(['clear','restricted','unavailable']),
});
export const PilotMemberDecision=z.discriminatedUnion('state',[
 z.strictObject({state:z.literal('unavailable'),message:Text}),
 z.strictObject({state:z.literal('available'),data:z.strictObject({id:Id,applicationVersion:Version,outcome:z.enum(['approve','decline','return']),
  explanation:Text,recordedAt:Instant,accepted:z.boolean(),offer:OfferSchema.nullable(),assessment:WorkflowAssessment.nullable(),
  document:z.strictObject({id:Id,sha256:Hash,text:z.string().max(65536)}).nullable(),
 }).nullable()}),
]);
export const PilotPostedResult=z.strictObject({eventId:Id,commandId:Id,loanId:Id,kind:z.enum(['disbursement','repayment']),
 amountCentavos:PositiveMoneyAmount,currency:Currency,effectiveDate:CalendarDay,postedAt:Instant,
 journalId:Id,receiptId:Id.nullable(),principalAfterCentavos:MoneyAmount,postingRuleVersionId:Id});
export const PilotMoneyCommand=z.strictObject({id:Id,kind:z.enum(['disbursement','repayment']),version:Version,
 state:z.enum(['prepared','authorized','submitted','confirmed','failed','unknown','confirmed_unposted']),
 amountCentavos:PositiveMoneyAmount,effectiveDate:CalendarDay,legacy:z.boolean()});
export const PilotLoanView=z.strictObject({loanId:Id,applicationId:Id,memberLabel:z.string(),state:z.enum(['active','settled']),
 asOfDate:CalendarDay,principalCentavos:MoneyAmount,interestDueCentavos:z.literal(0),feesDueCentavos:z.literal(0),
 overdueCentavos:MoneyAmount,postedThrough:Instant,pendingMovementCount:z.number().int().nonnegative(),
 schedule:z.array(z.strictObject({date:CalendarDay,amountCentavos:PositiveMoneyAmount})),receipts:z.array(PilotPostedResult),commands:z.array(PilotMoneyCommand)});
export const PilotLoanWorkspace=z.strictObject({loanId:Id,organizationId:Id,branchId:Id,memberLabel:z.string(),position:PilotLoanView.nullable(),
 commands:z.array(PilotMoneyCommand),message:z.string(),nextPayment:z.strictObject({date:CalendarDay,amountCentavos:PositiveMoneyAmount}).nullable()});
export const PilotPreview=z.strictObject({id:Id,decisionId:Id,applicationVersion:Version,basisHash:Hash,expiresAt:Instant,explanation:Text,terms:z.string().nullable()});
export const PilotHistory=z.strictObject({items:z.array(z.strictObject({id:Id,recordedAt:Instant,outcome:z.enum(['approve','decline','return']),accepted:z.boolean()})),nextCursor:Id.nullable()});
export const PilotSavedBrief=z.strictObject({id:Id,applicationId:Id,inputVersion:Version,recordedAt:Instant,outcome:z.enum(['approve','decline','return']),explanation:Text,snapshotHash:Hash,
 assessment:WorkflowAssessment.nullable(),offer:OfferSchema.nullable(),document:z.strictObject({id:Id,sha256:Hash}).nullable()});
export const lifecycleSchemas={PilotDecisionRecord,PilotConflictDeclaration,PilotSimulationObservation,PilotAction,PilotOrigination,PilotWorkspace,PilotMemberDecision,PilotPostedResult,PilotMoneyCommand,PilotLoanWorkspace,PilotPreview,PilotHistory,PilotSavedBrief};
/** Central registry consumes these only with lifecycleSchemas registered. */
export const lifecycleOperations=[
 {id:'getPilotWorkspace',method:'GET',path:'/applications/{id}/pilot-workspace',response:'PilotWorkspace',owner:'Benedict',implemented:true},
 {id:'declarePilotConflict',method:'POST',path:'/applications/{id}/pilot-conflicts',request:'PilotConflictDeclaration',response:'CommandReceipt',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'recommendPilotOffer',method:'POST',path:'/applications/{id}/pilot-recommendations',request:'RecommendationCreate',response:'CommandReceipt',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'previewPilotDecision',method:'POST',path:'/applications/{id}/pilot-decision-previews',request:'DecisionCreate',response:'PilotPreview',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'recordPilotDecision',method:'POST',path:'/applications/{id}/pilot-decisions',request:'PilotDecisionRecord',response:'Decision',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'reopenPilotReview',method:'POST',path:'/applications/{id}/pilot-reopen',request:'PilotAction',response:'CommandReceipt',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'getPilotDecisionHistory',method:'GET',path:'/applications/{id}/pilot-decisions',response:'PilotHistory',owner:'Benedict',implemented:true},
 {id:'getPilotSavedBrief',method:'GET',path:'/applications/{id}/pilot-decisions/{decisionId}',response:'PilotSavedBrief',owner:'Benedict',implemented:true},
 {id:'getPilotMemberDecision',method:'GET',path:'/member/applications/{id}/pilot-decision',response:'PilotMemberDecision',owner:'Robert',implemented:true,principal:'member'},
 {id:'acceptPilotMemberDecision',method:'POST',path:'/member/applications/{id}/pilot-acceptances',request:'MemberAcceptance',response:'CommandReceipt',owner:'Robert',implemented:true,principal:'member',versioned:true,idempotent:true},
 {id:'originatePilotLoan',method:'POST',path:'/pilot/originations',request:'PilotOrigination',response:'CommandReceipt',owner:'Benedict',implemented:true,idempotent:true},
 {id:'preparePilotDisbursement',method:'POST',path:'/pilot/loans/{id}/disbursements',request:'FinancialCommandCreate',response:'FinancialCommand',owner:'Benedict',implemented:true,idempotent:true},
 {id:'preparePilotRepayment',method:'POST',path:'/pilot/loans/{id}/repayments',request:'FinancialCommandCreate',response:'FinancialCommand',owner:'Benedict',implemented:true,idempotent:true},
 {id:'getPilotCommand',method:'GET',path:'/pilot/commands/{id}',response:'FinancialCommand',owner:'Benedict',implemented:true},
 {id:'authorizePilotCommand',method:'POST',path:'/pilot/commands/{id}/authorizations',response:'FinancialCommand',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'submitPilotCommand',method:'POST',path:'/pilot/commands/{id}/submissions',response:'FinancialCommand',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'simulatePilotCommand',method:'POST',path:'/pilot/commands/{id}/simulations',request:'PilotSimulationObservation',response:'FinancialCommand',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'postPilotCommand',method:'POST',path:'/pilot/commands/{id}/postings',response:'PilotPostedResult',owner:'Benedict',implemented:true,versioned:true,idempotent:true},
 {id:'getPilotLoan',method:'GET',path:'/pilot/loans/{id}',response:'PilotLoanWorkspace',owner:'Benedict',implemented:true},
] as const;
