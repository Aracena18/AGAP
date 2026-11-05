import type { z } from 'zod';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import type { ConnectedLoanWorkspace as LoanWorkspaceSchema, ConnectedPostedResult as PostedResultSchema } from '../../../packages/contracts/src/schemas';
import type {AgapClient} from '../../../packages/api-client/src';
export type LoanWorkspace = z.output<typeof LoanWorkspaceSchema>;
export type PostedReceipt = z.output<typeof PostedResultSchema>;
export type MoneyAction = 'authorize' | 'submit' | 'record_simulation' | 'record_unknown' | 'finalize' | 'prepare_repayment';
/** Internal UI port; connectedLoans composes the canonical generated client.
 * record_simulation is a development-only gateway operation, never trusted evidence from HTTP JSON. */
export interface LoanGateway {
  workspace(loanId: string, day: string, signal: AbortSignal): Promise<LoanWorkspace>;
  act(loanId: string, input: { action: MoneyAction; commandId: string | null; version: number | null; reason: string; scheduledPayment?:{date:string;amountCentavos:number;method:'cash'|'bank'} }, options: { idempotencyKey: string; csrfToken: string }): Promise<{ recorded: true }>;
}
const unavailable = async (): Promise<never> => { throw new ApiClientError(501, 'module_not_available', 'The loan and payment integration is unavailable. No financial action was recorded.'); };
export const unavailableLoans: LoanGateway = { workspace: unavailable, act: unavailable };

export function connectedLoans(client:AgapClient):LoanGateway{
 return {
  workspace:(id,day,signal)=>client.getConnectedLoanWorkspace(id,{asOfDate:day},{signal}),
  async act(loanId,input,options){
   if(input.action==='prepare_repayment'){
    const p=input.scheduledPayment;if(!p)throw new ApiClientError(422,'payment_unavailable','Review the exact scheduled amount and date before preparing a repayment.');
    await client.prepareConnectedRepayment(loanId,{loanId,amountCentavos:p.amountCentavos,currency:'PHP',effectiveDate:p.date,method:p.method,instrumentReference:`FICTIONAL-SCHEDULE-${loanId}-${p.date}`,reason:input.reason},options);
   }else{
    if(!input.commandId||input.version===null)throw new ApiClientError(422,'command_unavailable','Choose the current saved command.');
    const request={reason:input.reason},versioned={...options,version:input.version};
    if(input.action==='authorize')await client.authorizeConnectedFinancialCommand(input.commandId,request,versioned);
    else if(input.action==='submit')await client.submitConnectedFinancialCommand(input.commandId,request,versioned);
    else if(input.action==='finalize')await client.postConnectedFinancialCommand(input.commandId,request,versioned);
    else await client.observeConnectedSimulation(input.commandId,{...request,outcome:input.action==='record_unknown'?'unknown':'confirmed'},versioned);
   }
   return {recorded:true};
  }
 };
}
