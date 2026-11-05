import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { Id } from '../../../../../packages/contracts/src/schemas.js';
import { notFound } from '../../platform/errors.js';
import { requireLendingTransaction } from '../../platform/lending-transaction.js';
import type { MoneyPorts } from './money.service.js';
import { MoneyRepository } from './money.repository.js';
import { ServicingRepository } from './servicing.repository.js';
/** Resolve immutable route ownership before any cached command response. */
export async function financialTarget(tx:TransactionContext,ports:MoneyPorts,loanId:string,commandId:string){
  requireLendingTransaction(tx);Id.parse(loanId);Id.parse(commandId);
  const money=await new MoneyRepository().find(tx,commandId),legacy=!money||money.legacyVersion!==null;
  const c=legacy?await new ServicingRepository().command(tx,commandId):money;
  if(c.loanId!==loanId)throw notFound();
  const loan=await new ServicingRepository().origin(tx,loanId);await ports.authorize(tx,loan.applicationId);
  return {c,loan,legacy,money};
}
