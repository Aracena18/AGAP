import type { ActorContext, MemberTransactionContext, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import type { ReviewAdapter } from '../../../../../packages/contracts/src/model-review.js';
export type ReviewTx = TransactionContext | MemberTransactionContext;
export interface ReviewDecisionBasis {
 recommendation: null | { id: string; assessmentId: string; inputVersion: number; offerVersionId: string };
 blockers: string[];
 eligibleReviewers: { id: string; displayName: string }[];
}
export interface ReviewDecisionBasisPort { load(tx: ReviewTx, applicationId: string): Promise<ReviewDecisionBasis> }
export type ReviewModelAdapter = ReviewAdapter;
export const isStaff = (tx: ReviewTx): tx is TransactionContext => !('kind' in tx.actor);
export const staffActor = (tx: TransactionContext): ActorContext => tx.actor;
