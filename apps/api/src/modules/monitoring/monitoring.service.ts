import { z } from 'zod';
import type { ActorContext,MemberTransactionContext,TransactionContext,UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { Id,MemberSupportCreateSchema,MemberSupportSchema,MemberSupportViewSchema,SupportActionSchema,SupportActionPageSchema,SupportAssignmentSchema,SupportDetailSchema,SupportHistorySchema,SupportPageSchema,SupportResponseSchema,SupportSummarySchema,Version } from '../../../../../packages/contracts/src/schemas.js';
import { command,recordEvent } from '../../platform/commands.js';
import { memberCommand } from '../../platform/member-commands.js';
import { ApiError,notFound } from '../../platform/errors.js';
import { requireFreshMfa,requireRoles } from '../identity/identity.service.js';
import type { LoanReads } from '../servicing/loan-reads.js';
import {supportOperation as operation} from './monitoring.errors.js';
import {SupportFollowUps} from './support-follow-ups.service.js';
function summary(row:Record<string,unknown>){return SupportSummarySchema.parse({id:row.id,memberId:row.member_id,branchId:row.branch_id,submittedAt:(row.submitted_at as Date).toISOString(),status:row.status,version:Number(row.version),assignedOfficerId:row.assigned_officer_id});}
const historyQuery=z.strictObject({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(100).default(25)});
const responseReceipt=z.union([z.strictObject({version:Version}),z.strictObject({version:Version,projection:z.literal('staff-history-v1'),pageSize:z.number().int().min(1).max(100)})]);
function action(row:Record<string,unknown>){return SupportActionSchema.parse({id:row.id,recordedAt:(row.recorded_at as Date).toISOString(),recordedBy:row.recorded_by,response:row.response,internalNote:row.internal_note,followUpDate:row.follow_up,version:Number(row.version)});}
export class MonitoringService {
 readonly followUps:SupportFollowUps;
 constructor(private readonly uow:UnitOfWork,private readonly loans:Pick<LoanReads,'memberLoans'>){this.followUps=new SupportFollowUps(uow);}
 private async accessible(tx:TransactionContext,id:string,lock=false){
  if(lock)await tx.query('SELECT monitoring.lock_disclosure($1,false)',[id]);
  const row=(await tx.query('SELECT * FROM monitoring.requests WHERE organization_id=$1 AND id=$2',[tx.actor.organizationId,id])).rows[0];
  if(!row)throw notFound();return row;
 }
 private async disclosure(tx:TransactionContext,id:string){
  const row=await this.accessible(tx,id,true);
  const privateRow=(await tx.query('SELECT * FROM monitoring.staff_disclosures WHERE request_id=$1',[id])).rows[0];
  if(!privateRow)throw new ApiError(403,'support_forbidden','Only the assigned officer can read this disclosure.');
  return {row,privateRow};
 }
 private detailFields(row:Record<string,unknown>,privateRow:Record<string,unknown>){
  return {...summary(row),message:privateRow.message,contactPreference:privateRow.contact_preference,noticeVersion:privateRow.notice_version,checkIn:privateRow.check_in,position:privateRow.position,
   positionMessage:privateRow.position?'Position captured when the member submitted this request. A fresh staff position is unavailable.':'No loan position was captured. This does not mean there is no debt.'};
 }
 private async detail(tx:TransactionContext,id:string,throughVersion?:number){
  const {row,privateRow}=await this.disclosure(tx,id);
  const actions=(await tx.query(`SELECT *,to_char(follow_up_date,'YYYY-MM-DD') AS follow_up FROM monitoring.staff_actions WHERE request_id=$1 AND version<=$2 ORDER BY version DESC LIMIT 101`,[id,throughVersion??Number(row.version)])).rows;
  if(actions.length>100)throw new ApiError(422,'support_history_limit','This request history requires a larger reviewed history reader.');
  return SupportDetailSchema.parse({...this.detailFields(row,privateRow),actions:actions.map(action)});
 }
 private async actionPage(tx:TransactionContext,id:string,limit:number,cursor?:string,throughVersion?:number){
  let beforeVersion:number|null=null;
  if(cursor){
   const found=(await tx.query<{version:string}>('SELECT version FROM monitoring.staff_actions WHERE request_id=$1 AND id=$2',[id,cursor])).rows[0];
   if(!found)throw new ApiError(422,'invalid_history_cursor','Reload this request history before loading older responses.');
   beforeVersion=Version.parse(Number(found.version));
  }
  const rows=(await tx.query(`SELECT *,to_char(follow_up_date,'YYYY-MM-DD') AS follow_up FROM monitoring.staff_actions WHERE request_id=$1 AND ($2::bigint IS NULL OR version<$2) AND ($3::bigint IS NULL OR version<=$3) ORDER BY version DESC LIMIT $4`,[id,beforeVersion,throughVersion??null,limit+1])).rows;
  return SupportActionPageSchema.parse({items:rows.slice(0,limit).map(action),nextCursor:rows.length>limit?rows[limit-1].id:null});
 }
 private async historyDetail(tx:TransactionContext,id:string,throughVersion?:number,pageSize=25){
  const {row,privateRow}=await this.disclosure(tx,id);
  const page=await this.actionPage(tx,id,pageSize,undefined,throughVersion??Number(row.version));
  return SupportHistorySchema.parse({...this.detailFields(row,privateRow),actions:page.items,actionsNextCursor:page.nextCursor});
 }
 list(actor:ActorContext,input:unknown){return operation(async()=>{
  requireRoles(actor,['officer','administrator']);
  const query=z.strictObject({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(100).default(25),status:MemberSupportSchema.shape.status.optional()}).parse(input);
  return this.uow.run(actor,async tx=>{
   const rows=(await tx.query(`SELECT * FROM monitoring.requests WHERE organization_id=$1 AND ($2::uuid IS NULL OR id>$2) AND ($3::text IS NULL OR status=$3) ORDER BY id LIMIT $4`,[actor.organizationId,query.cursor??null,query.status??null,query.limit+1])).rows;
   return SupportPageSchema.parse({items:rows.slice(0,query.limit).map(summary),nextCursor:rows.length>query.limit?rows[query.limit-1].id:null});
  });
 });}
 get(actor:ActorContext,id:unknown){return operation(async()=>{requireRoles(actor,['officer']);return this.uow.run(actor,tx=>this.detail(tx,Id.parse(id)));});}
 history(actor:ActorContext,id:unknown){return operation(async()=>{requireRoles(actor,['officer']);return this.uow.run(actor,tx=>this.historyDetail(tx,Id.parse(id)));});}
 actions(actor:ActorContext,id:unknown,input:unknown){return operation(async()=>{
  requireRoles(actor,['officer']);const request=Id.parse(id),query=historyQuery.parse(input);
  return this.uow.run(actor,async tx=>{const {row}=await this.disclosure(tx,request);return this.actionPage(tx,request,query.limit,query.cursor,Number(row.version));});
 });}
 assign(actor:ActorContext,id:unknown,value:unknown,version:number,key:unknown){return operation(async()=>{
  requireRoles(actor,['administrator']);requireFreshMfa(actor);const request=Id.parse(id),data=SupportAssignmentSchema.parse(value);Version.parse(version);
  return this.uow.run(actor,async tx=>{
   await this.accessible(tx,request);
   return command(tx,`support.assign:${request}`,key,{data,version},async()=>{
    await tx.query('SELECT monitoring.assign_support($1,$2,$3,$4)',[request,data.officerId,data.reason,version]);
    const result=summary(await this.accessible(tx,request));await recordEvent(tx,'support.assigned',request,result.version);return result;
   });
  });
 });}
 respond(actor:ActorContext,id:unknown,value:unknown,version:number,key:unknown){return this.saveResponse(actor,id,value,version,key,false);}
 respondPaged(actor:ActorContext,id:unknown,value:unknown,version:number,key:unknown){return this.saveResponse(actor,id,value,version,key,true);}
 private saveResponse(actor:ActorContext,id:unknown,value:unknown,version:number,key:unknown,paged:boolean){return operation(async()=>{
  requireRoles(actor,['officer']);const request=Id.parse(id),data=SupportResponseSchema.parse(value);Version.parse(version);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());
  if(data.followUpDate&&data.followUpDate<today)throw new ApiError(422,'invalid_follow_up','Choose today or a later follow-up date.');
  return this.uow.run(actor,async tx=>{
   await tx.query('SELECT monitoring.lock_disclosure($1,true)',[request]);
   await this.disclosure(tx,request); // Current assignment is checked before cached command replay, without loading its history.
   const binding=paged?{data,version,projection:'staff-history-v1',pageSize:25}:{data,version};
   const saved=await command<z.output<typeof responseReceipt>>(tx,`support.respond:${request}`,key,binding,async()=>{
    await tx.query('SELECT monitoring.respond_support($1,$2::jsonb,$3)',[request,JSON.stringify(data),version]);
    const result=summary(await this.accessible(tx,request));await recordEvent(tx,'support.responded',request,result.version);
    return paged?{version:result.version,projection:'staff-history-v1' as const,pageSize:25}:{version:result.version};
   });
   // Generic platform cache contains only a receipt, never member disclosures or staff notes.
   const receipt=responseReceipt.parse(saved);
   if('projection' in receipt){
    const result=await this.historyDetail(tx,request,receipt.version,receipt.pageSize);
    return SupportHistorySchema.parse({...result,version:receipt.version,status:'reviewed',assignedOfficerId:actor.userId});
   }
   const result=await this.detail(tx,request,receipt.version);
   return SupportDetailSchema.parse({...result,version:receipt.version,status:'reviewed',assignedOfficerId:actor.userId});
  });
 });}
 memberHistory(tx:MemberTransactionContext){return operation(async()=>{
  const rows=(await tx.query('SELECT * FROM monitoring.member_history ORDER BY submitted_at DESC,id DESC LIMIT 101')).rows;
  if(rows.length>100)throw new ApiError(422,'support_history_limit','Your support history needs a paginated reader. Contact the cooperative.');
  return MemberSupportViewSchema.parse({state:'available',data:rows.map(r=>({id:r.id,submittedAt:(r.submitted_at as Date).toISOString(),status:r.status,message:r.message,response:r.response,checkIn:r.check_in,loanId:r.loan_id}))});
 });}
 submit(tx:MemberTransactionContext,value:unknown,key:string){return operation(async()=>{
  const data=MemberSupportCreateSchema.parse(value);
  // The member coordinator verifies and locks current linkage before this point.
  let position:unknown=null;
  if(data.loanId){const inventory=await this.loans.memberLoans(tx);if(inventory.state!=='available')throw new ApiError(501,'module_not_available','The linked loan cannot be checked yet.');const loan=inventory.data.find(l=>l.id===data.loanId);if(!loan)throw notFound();position=loan.position;}
  return memberCommand(tx,'support.submit',key,data,async()=>{
   const saved=await tx.query<{id:string}>('SELECT monitoring.submit_support($1::jsonb,$2::jsonb,$3) AS id',[JSON.stringify(data),position===null?null:JSON.stringify(position),tx.actor.correlationId]);
   const row=(await tx.query('SELECT * FROM monitoring.member_history WHERE id=$1',[saved.rows[0].id])).rows[0];
   return MemberSupportSchema.parse({id:row.id,submittedAt:(row.submitted_at as Date).toISOString(),status:row.status,message:row.message,response:row.response,checkIn:row.check_in,loanId:row.loan_id});
  });
 });}
}
