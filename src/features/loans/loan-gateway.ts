import type { z } from 'zod';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import type { LoanWorkspaceSchema, PostedResultSchema } from '../../../apps/api/src/modules/servicing/money-context';
export type LoanWorkspace = z.output<typeof LoanWorkspaceSchema>;
export type PostedReceipt = z.output<typeof PostedResultSchema>;
export type MoneyAction = 'authorize' | 'submit' | 'record_simulation' | 'finalize' | 'prepare_repayment';
/** Consumer proposal only. Robert publishes the canonical generated-client adapter.
 * record_simulation is a development-only gateway operation, never trusted evidence from HTTP JSON. */
export interface LoanGateway {
  workspace(loanId: string, day: string, signal: AbortSignal): Promise<LoanWorkspace>;
  act(loanId: string, input: { action: MoneyAction; commandId: string | null; version: number | null; reason: string }, options: { idempotencyKey: string; csrfToken: string }): Promise<{ recorded: true }>;
}
const unavailable = async (): Promise<never> => { throw new ApiClientError(501, 'module_not_available', 'The loan and payment integration is unavailable. No financial action was recorded.'); };
export const unavailableLoans: LoanGateway = { workspace: unavailable, act: unavailable };
