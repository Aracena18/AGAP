import type { ActorContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { CommandReceiptSchema, FinancialActionReasonSchema, FinancialCommandCreateSchema, PostedResultSchema } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError } from '../../platform/errors.js';
import { requireRoles } from '../identity/identity.service.js';
import { financialTarget } from './financial-target.js';
import { FictionalSettlementService } from './fictional-settlement.service.js';
import { MoneyService, type MoneyPorts } from './money.service.js';
import { ServicingService, servicingOperation } from './servicing.service.js';

/** Safe transport composition. Private contexts and observations never enter HTTP. */
export class FinancialActions {
  constructor(private readonly uow:UnitOfWork,private readonly ports:MoneyPorts,private readonly releases:ServicingService,private readonly money:MoneyService,readonly settlement:FictionalSettlementService){}
  prepare(actor:ActorContext,loanId:string,input:unknown,key:unknown){
    return servicingOperation(async()=>{
      const data=FinancialCommandCreateSchema.parse(input);
      if(data.loanId!==loanId)throw new ApiError(422,'loan_binding','The request must refer to this loan.');
      const c=await this.releases.prepare(actor,loanId,data,key);return CommandReceiptSchema.parse({id:c.id,version:c.version});
    });
  }
  prepareRepayment(actor:ActorContext,loanId:string,input:unknown,key:unknown){
    return servicingOperation(async()=>{
      const data=FinancialCommandCreateSchema.parse(input);
      if(data.loanId!==loanId)throw new ApiError(422,'loan_binding','The request must refer to this loan.');
      const c=await this.money.prepareRepayment(actor,loanId,data,key);return CommandReceiptSchema.parse({id:c.id,version:c.version});
    });
  }
  transition(actor:ActorContext,loanId:string,commandId:string,input:unknown,version:number,key:unknown,action:'authorize'|'submit'){
    return servicingOperation(async()=>{
      requireRoles(actor,action==='authorize'?['financial_authorizer']:['cashier','financial_authorizer']);
      const data=FinancialActionReasonSchema.parse(input),target=await this.uow.run(actor,tx=>financialTarget(tx,this.ports,loanId,commandId));
      const service=target.legacy?this.releases:this.money;
      const c=action==='authorize'?await service.authorize(actor,commandId,version,key,data.reason):await service.submitIntent(actor,commandId,version,key,data.reason);
      return CommandReceiptSchema.parse({id:c.id,version:c.version});
    });
  }
  finalize(actor:ActorContext,loanId:string,commandId:string,input:unknown,version:number,key:unknown){
    return servicingOperation(async()=>{
      requireRoles(actor,['financial_authorizer']);const data=FinancialActionReasonSchema.parse(input);
      await this.uow.run(actor,tx=>financialTarget(tx,this.ports,loanId,commandId));
      return PostedResultSchema.parse(await this.money.finalize(actor,commandId,version,key,data.reason));
    });
  }
}
