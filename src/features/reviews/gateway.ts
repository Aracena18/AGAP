import type { z } from 'zod';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import type { WorkflowView } from '../../../packages/contracts/src/workflow';
import type { PriorityReviewRecover, PrioritySourceReview, PriorityRuleConcern, PriorityConcernCheck, PriorityEscalationAssign, PriorityEscalationDisposition, PriorityNoticeAck, PriorityReviewPage, PriorityReviewSummary, PriorityReviewHistory, PriorityReviewers, PriorityReviewNotices, PriorityReviewReceipt } from '../../../packages/contracts/src/priority-review';
export interface PriorityReviewGateway {
 getPriorityReviewQueue(options?:RequestOptions&{cursor?:string;limit?:number;route?:string}):Promise<z.output<typeof PriorityReviewPage>>;
 getPriorityReviewSummary(id:string,options?:RequestOptions):Promise<z.output<typeof PriorityReviewSummary>>;
 getPriorityReviewHistory(id:string,options?:RequestOptions):Promise<z.output<typeof PriorityReviewHistory>>;
 getPriorityReviewers(id:string,options?:RequestOptions):Promise<z.output<typeof PriorityReviewers>>;
 getStaffWorkflow(id:string,options?:RequestOptions):Promise<z.output<typeof WorkflowView>>;
 recoverPrioritySourceReview(id:string,body:z.input<typeof PriorityReviewRecover>,options?:RequestOptions):Promise<z.output<typeof PriorityReviewReceipt>>;
 createPrioritySourceReview(id:string,body:z.input<typeof PrioritySourceReview>,options?:RequestOptions):Promise<z.output<typeof PriorityReviewReceipt>>;
 createPriorityRuleConcern(id:string,body:z.input<typeof PriorityRuleConcern>,options?:RequestOptions):Promise<z.output<typeof PriorityReviewReceipt>>;
 checkPriorityConcern(id:string,body:z.input<typeof PriorityConcernCheck>,options?:RequestOptions):Promise<z.output<typeof PriorityReviewReceipt>>;
 assignPriorityEscalation(id:string,body:z.input<typeof PriorityEscalationAssign>,options?:RequestOptions):Promise<z.output<typeof PriorityReviewReceipt>>;
 recordPriorityEscalationDisposition(id:string,body:z.input<typeof PriorityEscalationDisposition>,options?:RequestOptions):Promise<z.output<typeof PriorityReviewReceipt>>;
 getPriorityReviewNotices(options?:RequestOptions):Promise<z.output<typeof PriorityReviewNotices>>;
 acknowledgePriorityReviewNotice(id:string,body:z.input<typeof PriorityNoticeAck>,options?:RequestOptions):Promise<z.output<typeof PriorityReviewReceipt>>;
}
