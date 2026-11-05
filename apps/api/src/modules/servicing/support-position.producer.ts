import type {TransactionContext} from '../../../../../packages/contracts/src/ports.js';
import {Id,SupportFreshPositionViewSchema} from '../../../../../packages/contracts/src/schemas.js';
import type {SupportPositionProducer} from '../monitoring/monitoring.service.js';

/** Only the assigned support purpose can disclose this projection; no raw loan workspace. */
export class SupportLoanPositionProducer implements SupportPositionProducer {
 async position(tx:TransactionContext,requestId:string){
  const result=await tx.query('SELECT servicing.support_position($1::uuid) AS data',[Id.parse(requestId)]);
  return SupportFreshPositionViewSchema.parse(result.rows[0]?.data);
 }
}
