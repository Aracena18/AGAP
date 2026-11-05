import {FinancialCommandSchema} from '../../../../../packages/contracts/src/schemas.js';
import {ApiError} from '../../platform/errors.js';
import type {Command,DeepReadonly} from './context.js';
import type {MoneyCommand} from './money-context.js';

/** Safe immutable transport receipt; never serialize a private command header. */
export function publicMoneyCommand(c:DeepReadonly<Command|MoneyCommand>){
 if(!('payload' in c))throw new ApiError(503,'command_unavailable','The saved command amount is unavailable.');
 return FinancialCommandSchema.parse({id:c.id,loanId:c.loanId,version:c.version,amountCentavos:c.payload.amountCentavos,currency:'PHP',state:c.state,
  preparedBy:c.preparedBy,authorizedBy:c.authorization?.userId??null,providerReference:c.observations.at(-1)?.input.providerReference??null,
  receiptId:'posting'in c?c.posting?.receiptId??null:c.receiptId,journalId:'posting'in c?c.posting?.journalId??null:c.journalId});
}
