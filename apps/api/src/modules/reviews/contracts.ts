import type { ActorContext, MemberTransactionContext, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import type { z } from 'zod';
import type { ModelArtifactSchema } from '../../../../../packages/contracts/src/common.js';
export type ReviewTx = TransactionContext | MemberTransactionContext;
export interface ReviewDecisionBasis {
 recommendation: null | { id: string; assessmentId: string; inputVersion: number; offerVersionId: string };
 blockers: string[];
 eligibleReviewers: { id: string; displayName: string }[];
}
export interface ReviewDecisionBasisPort { load(tx: ReviewTx, applicationId: string): Promise<ReviewDecisionBasis> }
export interface ReviewModelAdapter {
 origin: 'model' | 'simulated';
 provenance: z.output<typeof ModelArtifactSchema>;
 review(input: {question:string;sources:{source_id:string;quote:string}[]},signal?:AbortSignal): Promise<{
  status:'REQUIRES_HUMAN_REVIEW'|'REJECT_AND_ESCALATE'; reasons:string[];
  payload: null|{issue_code:string;evidence:{source_id:string;quote:string;verification_status:'source_asserted_not_independently_verified'}[];finding:string;clarification_question:string;review_status:'requires_human_review';loan_decision:null};
  financial_semantics_verified:false;loan_decision_permitted:false;source_text_match_verified?:true;attempts_used?:1|2;
 }>;
}
export const isStaff = (tx: ReviewTx): tx is TransactionContext => !('kind' in tx.actor);
export const staffActor = (tx: TransactionContext): ActorContext => tx.actor;
