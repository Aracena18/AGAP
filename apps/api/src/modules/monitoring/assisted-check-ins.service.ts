import {z} from 'zod';
import type {ActorContext,MemberTransactionContext,TransactionContext,UnitOfWork} from '../../../../../packages/contracts/src/ports.js';
import {schemas,Id,Version} from '../../../../../packages/contracts/src/schemas.js';
import {command,recordEvent} from '../../platform/commands.js';
import {memberCommand} from '../../platform/member-commands.js';
import {ApiError,notFound} from '../../platform/errors.js';
import {requireRoles} from '../identity/identity.service.js';
import type {LoanReads} from '../servicing/loan-reads.js';
import {supportOperation} from './monitoring.errors.js';
type Tx=TransactionContext|MemberTransactionContext;
const checked=<T,>(schema:z.ZodType<T>,value:unknown):T=>{const result=schema.safeParse(value);if(!result.success)throw new ApiError(503,'assisted_check_in_unavailable','The draft could not be validated. Reload or contact the cooperative.');return result.data;};
export class AssistedCheckInsService{
 constructor(private readonly uow:UnitOfWork,private readonly loans:Pick<LoanReads,'memberLoans'>,private readonly noticeVersion:string,private readonly fictional:boolean){}
 private available(){if(!this.fictional)throw new ApiError(501,'module_not_available','Assisted check-ins are available only with fictional records pending institutional approval.');}
 private async read(tx:Tx,id:string){const row=(await tx.query('SELECT monitoring.assisted_read($1) AS data',[id])).rows[0];const draft=checked(schemas.AssistedCheckIn,row?.data);return {...draft,confirmationAllowed:draft.confirmationAllowed&&draft.noticeVersion===this.noticeVersion,reviewMessage:draft.state==='pending'&&draft.noticeVersion!==this.noticeVersion?'The sharing notice changed. Ask staff to revise this draft.':draft.reviewMessage};}
 private async page(tx:Tx,source:string|null,input:unknown){const q=schemas.AssistedCheckInQuery.parse(input),row=(await tx.query('SELECT monitoring.assisted_list($1,$2,$3) AS data',[source,q.cursor??null,q.limit])).rows[0];const page=checked(schemas.AssistedCheckInPage,row?.data);return{...page,items:page.items.map(d=>({...d,confirmationAllowed:d.confirmationAllowed&&d.noticeVersion===this.noticeVersion,reviewMessage:d.state==='pending'&&d.noticeVersion!==this.noticeVersion?'The sharing notice changed. Ask staff to revise this draft.':d.reviewMessage}))};}
 list(actor:ActorContext,source:unknown,input:unknown){return supportOperation(async()=>{this.available();requireRoles(actor,['officer']);return this.uow.run(actor,tx=>this.page(tx,Id.parse(source),input));});}
 get(actor:ActorContext,id:unknown){return supportOperation(async()=>{this.available();requireRoles(actor,['officer']);return this.uow.run(actor,tx=>this.read(tx,Id.parse(id)));});}
 prepare(actor:ActorContext,source:unknown,input:unknown,version:number,key:unknown){return supportOperation(async()=>{
  this.available();requireRoles(actor,['officer']);const id=Id.parse(source),data=schemas.AssistedCheckInContent.parse(input);Version.parse(version);
  return this.uow.run(actor,async tx=>{
   await tx.query('SELECT monitoring.lock_disclosure($1,false)',[id]); // Current assignment before replay.
   return command(tx,`support.assisted.prepare:${id}`,key,{data,version},async()=>{
    const row=(await tx.query('SELECT monitoring.assisted_prepare($1,$2::jsonb,$3,$4) AS data',[id,JSON.stringify(data),this.noticeVersion,version])).rows[0];
    const receipt=checked(schemas.AssistedCheckInReceipt,row?.data);await recordEvent(tx,'support.assisted.prepared',receipt.id,receipt.version);return receipt;
   });
  });
 });}
 revise(actor:ActorContext,id:unknown,input:unknown,version:number,key:unknown){return this.staffChange(actor,id,'revise',schemas.AssistedCheckInContent,input,version,key);}
 withdraw(actor:ActorContext,id:unknown,input:unknown,version:number,key:unknown){return this.staffChange(actor,id,'withdraw',schemas.AssistedCheckInWithdraw,input,version,key);}
 private staffChange(actor:ActorContext,id:unknown,change:'revise'|'withdraw',schema:z.ZodType,input:unknown,version:number,key:unknown){return supportOperation(async()=>{
  this.available();requireRoles(actor,['officer']);const draft=Id.parse(id),data=schema.parse(input);Version.parse(version);
  return this.uow.run(actor,async tx=>{
   await this.read(tx,draft);
   return command(tx,`support.assisted.${change}:${draft}`,key,{data,version},async()=>{
    const row=(await tx.query('SELECT monitoring.assisted_staff_change($1,$2,$3::jsonb,$4,$5) AS data',[draft,change,JSON.stringify(data),this.noticeVersion,version])).rows[0];
    const receipt=checked(schemas.AssistedCheckInReceipt,row?.data);await recordEvent(tx,`support.assisted.${change==='revise'?'revised':'withdrawn'}`,draft,receipt.version);return receipt;
   });
  });
 });}
 memberList(tx:MemberTransactionContext,input:unknown){return supportOperation(async()=>{this.available();return this.page(tx,null,input);});}
 memberGet(tx:MemberTransactionContext,id:unknown){return supportOperation(async()=>{this.available();return this.read(tx,Id.parse(id));});}
 confirm(tx:MemberTransactionContext,id:unknown,input:unknown,version:number,key:string){return supportOperation(async()=>{
  this.available();const draft=Id.parse(id),data=schemas.AssistedCheckInConfirm.parse(input);Version.parse(version);
  await this.read(tx,draft); // Owning-member access is checked before every receipt replay.
  return memberCommand(tx,`support.assisted.confirm:${draft}`,key,{data,version},async()=>{
   const current=await this.read(tx,draft);
   if(current.version!==version)throw new ApiError(412,'stale_version','This draft changed. Reload and review the new version.');
   if(!current.confirmationAllowed||data.noticeVersion!==this.noticeVersion||data.noticeVersion!==current.noticeVersion||data.payloadSha256!==current.payloadSha256)throw new ApiError(409,'draft_review_required','Review the current draft and sharing notice before confirming.');
   let position:unknown=null;
   if(current.content.loanId){
    const inventory=checked(schemas.MemberLoansView,await this.loans.memberLoans(tx));
    if(inventory.state!=='available')throw new ApiError(501,'module_not_available','The linked loan cannot be checked yet.');
    const loan=inventory.data.find(l=>l.id===current.content.loanId);if(!loan)throw notFound();
    if(loan.position.loanId!==loan.id)throw new ApiError(503,'assisted_check_in_unavailable','The linked loan position cannot be validated.');position=loan.position;
   }
   return this.memberChange(tx,draft,'confirm',version,data.payloadSha256,data.noticeVersion,position);
  });
 });}
 decline(tx:MemberTransactionContext,id:unknown,input:unknown,version:number,key:string){return supportOperation(async()=>{
  this.available();const draft=Id.parse(id),data=schemas.AssistedCheckInDecline.parse(input);Version.parse(version);await this.read(tx,draft);
  return memberCommand(tx,`support.assisted.decline:${draft}`,key,{data,version},()=>this.memberChange(tx,draft,'decline',version,null,null,null));
 });}
 private async memberChange(tx:MemberTransactionContext,id:string,change:string,version:number,hash:string|null,notice:string|null,position:unknown){
  const row=(await tx.query('SELECT monitoring.assisted_member_change($1,$2,$3,$4,$5,$6::jsonb,$7,$8) AS data',[id,change,version,hash,notice,position===null?null:JSON.stringify(position),tx.actor.correlationId,tx.actor.sessionId])).rows[0];
  return checked(schemas.AssistedCheckInReceipt,row?.data);
 }
}
