import { z } from 'zod';
import type { MemberTransactionContext, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { ApplicationSchema, DecisionPreviewCreateSchema, DecisionPreviewSchema, Id, Version } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError } from '../../platform/errors.js';
import { Hash, type ReviewContext } from './context.js';

/** Local consumer proposals. Robert/Aaron must supply actual owner adapters. */
export interface DecisionBackendPorts {
  assertReady?(tx:TransactionContext,applicationId:string,stage:'recommend'|'decision'):Promise<void>;
  authorizeStaff(tx: TransactionContext, applicationId: string): Promise<void>;
  loadStaffBasis(tx: TransactionContext, applicationId: string): Promise<Omit<ReviewContext, 'recommendation'>>;
  transitionStaff(tx: TransactionContext, applicationId: string, expectedVersion: number, action: 'recommend' | 'approve' | 'decline' | 'return'): Promise<number>;
  authorizeMember(tx: MemberTransactionContext, applicationId: string): Promise<void>;
  /** Must guard source/input/policy/authority/conflict bindings through commit. */
  loadMemberGuard(tx: MemberTransactionContext, applicationId: string): Promise<z.output<typeof MemberGuardSchema>>;
  /** Owner revision/event bridge, on supplied transaction; never opens a staff UoW. */
  transitionMember(tx: MemberTransactionContext, applicationId: string, expectedVersion: number): Promise<number>;
}
const unavailable = async (): Promise<never> => { throw new ApiError(501, 'module_not_available', 'Current decision integration is unavailable. No change was recorded.'); };
export const unavailableDecisionPorts: DecisionBackendPorts = {
  authorizeStaff: unavailable, loadStaffBasis: unavailable, transitionStaff: unavailable,
  authorizeMember: unavailable, loadMemberGuard: unavailable, transitionMember: unavailable,
};
export const PreviewRequestSchema = DecisionPreviewCreateSchema;
export const MemberGuardSchema = z.strictObject({
  applicationId: Id, organizationId: Id, memberId: Id, applicationVersion: Version, inputVersion: Version,
  applicationStatus: ApplicationSchema.shape.status,
  basisHash: Hash, recommendationId: Id.nullable(), participantsClear: z.boolean(),
});
export const PreviewViewSchema = DecisionPreviewSchema;
