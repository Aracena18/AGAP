import { z,ZodError } from 'zod';
import type { ActorContext,MemberTransactionContext,TransactionContext,UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { Id,MemberSupportCreateSchema,MemberSupportSchema,MemberSupportViewSchema,SupportAssignmentSchema,SupportDetailSchema,SupportPageSchema,SupportResponseSchema,SupportSummarySchema,Version } from '../../../../../packages/contracts/src/schemas.js';
import { command,recordEvent } from '../../platform/commands.js';
import { memberCommand } from '../../platform/member-commands.js';
import { ApiError,notFound } from '../../platform/errors.js';
import { requireFreshMfa,requireRoles } from '../identity/identity.service.js';
import type { LoanReads } from '../servicing/loan-reads.js';

async function operation<T>(work:()=>Promise<T>){try{return await work();}catch(error){
 if(error instanceof ApiError)throw error;
 if(error instanceof ZodError)throw new ApiError(422,'invalid_support','Check the support fields.',error.issues.map(i=>({path:i.path.join('.'),message:i.message})));
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
 if(code==='42501')throw new ApiError(403,'support_forbidden','This request is outside your support assignment.');
 if(code==='P0412')throw new ApiError(412,'stale_version','This request changed. Reload before saving.');
 if(code==='23514')throw new ApiError(422,'invalid_support','The officer or support details are unavailable.');
 if(code==='P0002')throw notFound();
 throw new ApiError(503,'support_unavailable','The result could not be confirmed. Retry the same submission.');
}}
function summary(row:Record<string,unknown>){return SupportSummarySchema.parse({id:row.id,memberId:row.member_id,branchId:row.branch_id,submittedAt:(row.submitted_at as Date).toISOString(),status:row.status,version:Number(row.version),assignedOfficerId:row.assigned_officer_id});}
export class MonitoringService {
 constructor(private readonly uow:UnitOfWork,private readonly loans:Pick<LoanReads,'memberLoans'>){}
 private async accessible(tx:TransactionContext,id:string,lock=false){
  if(lock)await tx.query('SELECT monitoring.lock_disclosure($1,false)',[id]);
  const row=(await tx.query('SELECT * FROM monitoring.requests WHERE organization_id=$1 AND id=$2',[tx.actor.organizationId,id])).rows[0];
  if(!row)throw notFound();return row;
 }
 private async detail(tx:TransactionContext,id:string){
  const row=await this.accessible(tx,id,true);
  const privateRow=(await tx.query('SELECT * FROM monitoring.staff_disclosures WHERE request_id=$1',[id])).rows[0];
  if(!privateRow)throw new ApiError(403,'support_forbidden','Only the assigned officer can read this disclosure.');
  const actions=(await tx.query(`SELECT *,to_char(follow_up_date,'YYYY-MM-DD') AS follow_up FROM monitoring.staff_actions WHERE request_id=$1 ORDER BY version DESC LIMIT 101`,[id])).rows;
  if(actions.length>100)throw new ApiError(422,'support_history_limit','This request history requires a larger reviewed history reader.');
  return SupportDetailSchema.parse({...summary(row),message:privateRow.message,contactPreference:privateRow.contact_preference,noticeVersion:privateRow.notice_version,checkIn:privateRow.check_in,position:privateRow.position,
   positionMessage:privateRow.position?'Position captured when the member submitted this request. A fresh staff position is unavailable.':'No loan position was captured. This does not mean there is no debt.',
   actions:actions.map(a=>({id:a.id,recordedAt:(a.recorded_at as Date).toISOString(),recordedBy:a.recorded_by,response:a.response,internalNote:a.internal_note,followUpDate:a.follow_up,version:Number(a.version)}))});
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
 respond(actor:ActorContext,id:unknown,value:unknown,version:number,key:unknown){return operation(async()=>{
  requireRoles(actor,['officer']);const request=Id.parse(id),data=SupportResponseSchema.parse(value);Version.parse(version);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());
  if(data.followUpDate&&data.followUpDate<today)throw new ApiError(422,'invalid_follow_up','Choose today or a later follow-up date.');
  return this.uow.run(actor,async tx=>{
   await tx.query('SELECT monitoring.lock_disclosure($1,true)',[request]);
   await this.detail(tx,request); // Current assignment is checked before cached command replay.
   const receipt=await command(tx,`support.respond:${request}`,key,{data,version},async()=>{
    await tx.query('SELECT monitoring.respond_support($1,$2::jsonb,$3)',[request,JSON.stringify(data),version]);
    const result=summary(await this.accessible(tx,request));await recordEvent(tx,'support.responded',request,result.version);return {version:result.version};
   });
   // Generic platform cache contains only a receipt, never member disclosures or staff notes.
   const result=await this.detail(tx,request);
   return SupportDetailSchema.parse({...result,version:receipt.version,status:'reviewed',assignedOfficerId:actor.userId,actions:result.actions.filter(a=>a.version<=receipt.version)});
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
