import {createHash,randomUUID} from 'node:crypto';
import {ConnectedFinancialAction,ConnectedFinancialApplication,ConnectedFinancialApplicationPage,ConnectedFinancialApplicationQuery,ConnectedLoanQuery,ConnectedLoanWorkspace,ConnectedPostedResult,ConnectedSimulationObservation,FinancialCommandCreateSchema,FinancialCommandSchema,Id,Version} from '../../../../../packages/contracts/src/schemas.js';
import type {ActorContext,PostingPort,TransactionContext,UnitOfWork} from '../../../../../packages/contracts/src/ports.js';
import {command} from '../../platform/commands.js';
import {ApiError,notFound} from '../../platform/errors.js';
import {requireRoles} from '../identity/identity.service.js';
import {binding,businessDay,ServicingRuleError} from './command-rules.js';
import {LoanReads} from './loan-reads.js';
import {MoneyRepository} from './money.repository.js';
import {MoneyService,type MoneyPorts} from './money.service.js';
import {publicMoneyCommand} from './public-money.js';
import {ServicingRepository} from './servicing.repository.js';
import {ServicingService,servicingOperation} from './servicing.service.js';

type Action='authorize'|'submit'|'observe'|'finalize';
function uuid(value:string){const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}

/** Fictional connected transport; financial effects remain owned by existing services. */
export class ConnectedMoneyService{
 private readonly origins=new ServicingRepository();
 private readonly commands=new MoneyRepository();
 readonly loans:LoanReads;
 constructor(private readonly uow:UnitOfWork,private readonly ports:MoneyPorts,private readonly ledger:PostingPort){this.loans=new LoanReads(uow,ports);}
 private nested(tx:TransactionContext):UnitOfWork{return {run:async(actor,work)=>{if(actor!==tx.actor)throw new ApiError(403,'actor_scope','Use the current authenticated actor.');return work(tx);}};}
 private async current(tx:TransactionContext,id:string){const c=await this.commands.find(tx,id)??await this.origins.command(tx,id);await this.ports.authorize(tx,c.applicationId);return c;}
 private async reason(tx:TransactionContext,loanId:string,commandId:string,action:string,reason:string){
  const loan=await this.origins.origin(tx,loanId);
  await tx.query('INSERT INTO servicing.action_reasons(id,organization_id,branch_id,loan_id,command_id,user_id,action,reason,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),loan.organizationId,loan.branchId,loanId,commandId,tx.actor.userId,action,reason,tx.actor.correlationId]);
 }
 private async applicationIn(tx:TransactionContext,id:string){
  await this.ports.authorize(tx,id);
  const a=(await tx.query('SELECT id,version,member_id,status FROM applications.applications WHERE organization_id=$1 AND id=$2',[tx.actor.organizationId,id])).rows[0];if(!a)throw notFound();
  const loan=await this.origins.originForApplication(tx,id);let terms=loan?.offer??null,available=false;
  try{const context=await this.ports.operation(tx,id),saved=context.basis.saved;if(loan)binding(loan,context,new Date().toISOString());else terms=saved.snapshot.basis.offers.find(o=>o.id===saved.snapshot.input.offerVersionId)??null;available=terms!==null;}
  catch(e){if(!(e instanceof ApiError&&[409,501].includes(e.status))&&!(e instanceof ServicingRuleError))throw e;}
  return ConnectedFinancialApplication.parse({applicationId:id,applicationVersion:a.version,memberName:`Member identifier: ${a.member_id}`,status:a.status,loanId:loan?.id??null,releaseBasisAvailable:available,terms,asOfDate:businessDay(new Date().toISOString())});
 }
 application(actor:ActorContext,id:string){return servicingOperation(()=>{requireRoles(actor,['cashier','financial_authorizer']);const app=Id.parse(id);return this.uow.run(actor,tx=>this.applicationIn(tx,app));});}
 applications(actor:ActorContext,input:unknown){return servicingOperation(async()=>{
  requireRoles(actor,['cashier','financial_authorizer']);const q=ConnectedFinancialApplicationQuery.parse(input);
  return this.uow.run(actor,async tx=>{
   if(q.cursor)await this.ports.authorize(tx,q.cursor);
   const rows=(await tx.query("SELECT id FROM applications.applications WHERE organization_id=$1 AND branch_id=ANY($2::uuid[]) AND status='decision_recorded' AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT $4",[actor.organizationId,actor.branchIds,q.cursor??null,q.limit+1])).rows;
   const items=[];for(const row of rows.slice(0,q.limit))items.push(await this.applicationIn(tx,String(row.id)));
   return ConnectedFinancialApplicationPage.parse({items,nextCursor:rows.length>q.limit?String(rows[q.limit-1].id):null});
  });
 });}
 workspace(actor:ActorContext,id:string,input:unknown){return servicingOperation(async()=>{
  const q=ConnectedLoanQuery.parse(input),loanId=Id.parse(id);
  return this.uow.run(actor,async tx=>{
   const view=await new LoanReads(this.nested(tx),this.ports).workspace(actor,loanId,q.asOfDate),commands=[];
   for(const c of view.commands){const original=await this.current(tx,c.id);commands.push({...c,preparedBy:original.preparedBy,reviewRequired:original.conflicts.length>0});}
   return ConnectedLoanWorkspace.parse({...view,commands,position:view.position?{...view.position,commands}:null});
  });
 });}
 read(actor:ActorContext,id:string){return servicingOperation(()=>{requireRoles(actor,['cashier','financial_authorizer','auditor']);const commandId=Id.parse(id);return this.uow.run(actor,async tx=>publicMoneyCommand(await this.current(tx,commandId)));});}
 prepare(actor:ActorContext,id:string,input:unknown,key:unknown,kind:'release'|'repayment'){
  return servicingOperation(async()=>{
   requireRoles(actor,['cashier']);const loanId=Id.parse(id),data=FinancialCommandCreateSchema.parse(input);
   if(data.loanId!==loanId)throw new ApiError(422,'loan_mismatch','Use the displayed loan reference.');
   return this.uow.run(actor,async tx=>{
    const loan=await this.origins.origin(tx,loanId);await this.ports.authorize(tx,loan.applicationId);
    return command(tx,`connected.prepare-${kind}:${loanId}`,key,{loanId,data},async()=>{
     const uow=this.nested(tx),result=kind==='release'?await new ServicingService(uow,this.ports).prepare(actor,loanId,data,key):await new MoneyService(uow,this.ports,this.ledger).prepareRepayment(actor,loanId,data,key);
     await this.reason(tx,loanId,result.id,kind==='release'?'prepare_release':'prepare_repayment',data.reason);return publicMoneyCommand(result);
    });
   });
  });
 }
 async authorize(actor:ActorContext,id:string,input:unknown,v:number,key:unknown){return FinancialCommandSchema.parse(await this.transition(actor,id,input,v,key,'authorize'));}
 async submit(actor:ActorContext,id:string,input:unknown,v:number,key:unknown){return FinancialCommandSchema.parse(await this.transition(actor,id,input,v,key,'submit'));}
 async observe(actor:ActorContext,id:string,input:unknown,v:number,key:unknown){return FinancialCommandSchema.parse(await this.transition(actor,id,input,v,key,'observe'));}
 async finalize(actor:ActorContext,id:string,input:unknown,v:number,key:unknown){return ConnectedPostedResult.parse(await this.transition(actor,id,input,v,key,'finalize'));}
 private transition(actor:ActorContext,id:string,input:unknown,v:number,key:unknown,action:Action){return servicingOperation(async()=>{
  requireRoles(actor,action==='authorize'||action==='finalize'?['financial_authorizer']:['cashier','financial_authorizer']);
  const commandId=Id.parse(id),data=action==='observe'?ConnectedSimulationObservation.parse(input):ConnectedFinancialAction.parse(input);Version.parse(v);
  return this.uow.run(actor,async tx=>{
   const current=await this.current(tx,commandId);
   return command(tx,`connected.${action}:${commandId}`,key,{commandId,data,v},async()=>{
    const uow=this.nested(tx),money=new MoneyService(uow,this.ports,this.ledger),legacy=new ServicingService(uow,this.ports);let result;
    if(action==='finalize')result=await money.finalize(actor,commandId,v,key);
    else if(action==='authorize')result=publicMoneyCommand('format'in current?await money.authorize(actor,commandId,v,key):await legacy.authorize(actor,commandId,v,key));
    else if(action==='submit')result=publicMoneyCommand('format'in current?await money.submitIntent(actor,commandId,v,key):await legacy.submitIntent(actor,commandId,v,key));
    else{
     const observation=ConnectedSimulationObservation.parse(data),digest=createHash('sha256').update(JSON.stringify({id:commandId,key,data:observation})).digest('hex'),confirmed=observation.outcome==='confirmed';
     const body={id:uuid(digest),producer:'agap-connected-fictional-v1',commandId,businessEventId:'businessEventId'in current?current.businessEventId:current.eventId,providerKey:current.providerKey,mode:'simulation',state:observation.outcome,
      movementId:confirmed?uuid(`connected-movement:${commandId}`):null,providerReference:confirmed?`SIM-${commandId}`:null,amountMinorUnits:confirmed?current.payload.amountCentavos:null,currency:confirmed?'PHP':null,effectiveDate:confirmed?current.payload.effectiveDate:null,occurredAt:confirmed?current.submission?.at??null:null,verified:observation.outcome!=='unknown',evidence:observation.outcome==='unknown'?null:{id:uuid(digest+'evidence'),sha256:digest}};
     result=publicMoneyCommand('format'in current?await money.observe(actor,commandId,body,v,key):(await legacy.observe(actor,commandId,body,v,key)).command);
    }
    await this.reason(tx,current.loanId,commandId,action,data.reason);return result;
   });
  });
 });}
}
