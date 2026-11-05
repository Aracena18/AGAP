import type { z } from 'zod';
import type { AgapClient } from '../../../packages/api-client/src';
import { FinancialCommandCreateSchema } from '../../../packages/contracts/src/schemas';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import type { LoanWorkspaceSchema, PostedResultSchema } from '../../../apps/api/src/modules/servicing/money-context';
export type LoanWorkspace = z.output<typeof LoanWorkspaceSchema>;
export type PostedReceipt = z.output<typeof PostedResultSchema>;
export type MoneyAction = 'authorize' | 'submit' | 'record_simulation' | 'finalize' | 'prepare_repayment' | 'prepare_release' | 'check_simulation';
/** Staff loan consumer boundary backed by the canonical generated-client adapter.
 * record_simulation is a development-only gateway operation, never trusted evidence from HTTP JSON. */
export interface LoanGateway {
  workspace(loanId: string, day: string, signal: AbortSignal): Promise<LoanWorkspace>;
  act(loanId: string, input: { action: MoneyAction; commandId: string | null; version: number | null; reason: string; payload?: z.input<typeof FinancialCommandCreateSchema> }, options: { idempotencyKey: string; csrfToken: string }): Promise<{ recorded: true }>;
}
const unavailable = async (): Promise<never> => { throw new ApiClientError(501, 'module_not_available', 'The loan and payment integration is unavailable. No financial action was recorded.'); };
export const unavailableLoans: LoanGateway = { workspace: unavailable, act: unavailable };

/** Carries the captured request unchanged; retries never reconstruct financial values from a newer read. */
export function connectedLoans(client: AgapClient): LoanGateway {
  return {
    workspace: (id, day, signal) => client.getStaffLoanWorkspace(id, day, { signal }),
    async act(id, input, options) {
      const opts = { ...options, ...(input.version === null ? {} : { version: input.version }) };
      if (input.action === 'prepare_release' || input.action === 'prepare_repayment') {
        const payload = FinancialCommandCreateSchema.parse(input.payload);
        if (payload.loanId !== id) throw new ApiClientError(422, 'invalid_request', 'The captured payment belongs to another loan.');
        if (input.action === 'prepare_release') await client.prepareLoanRelease(id, payload, opts);
        else await client.prepareScheduledRepayment(id, payload, opts);
      } else {
        if (!input.commandId) throw new ApiClientError(422, 'invalid_request', 'Choose an existing financial command.');
        const body = { reason: input.reason };
        const methods = { authorize: 'authorizeLoanCommand', submit: 'submitLoanCommand', record_simulation: 'recordFictionalSettlement', check_simulation: 'checkFictionalSettlement', finalize: 'finalizeLoanCommand' } as const;
        await client[methods[input.action]](id, input.commandId, body, opts);
      }
      return { recorded: true };
    },
  };
}
