import {z} from 'zod';
import type {ActorContext,TransactionContext,UnitOfWork} from '../../../../../packages/contracts/src/ports.js';
import {Id,Version,SupportActionSchema,SupportFollowUpSchema,SupportFollowUpFilterSchema,SupportFollowUpPageSchema,SupportFollowUpDetailSchema,SupportFollowUpEventSchema,SupportFollowUpEventPageSchema,SupportFollowUpCompletionSchema,SupportFollowUpRescheduleSchema} from '../../../../../packages/contracts/src/schemas.js';
import {command,recordEvent} from '../../platform/commands.js';
import {ApiError,notFound} from '../../platform/errors.js';
import {requireRoles} from '../identity/identity.service.js';
import {supportOperation as operation} from './monitoring.errors.js';

type Row=Record<string,unknown>;
const paging=z.strictObject({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(100).default(25)});
const receipt=z.strictObject({version:Version});
const day=(value:unknown)=>(value as Date).toISOString();
export const manilaDay=(at=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(at);
function event(row:Row){return SupportFollowUpEventSchema.parse({id:row.id,version:Number(row.version),kind:row.kind,dueDate:row.due_day,status:row.status,note:row.note,recordedAt:day(row.recorded_at),recordedBy:row.recorded_by});}
function task(row:Row){return SupportFollowUpSchema.parse({id:row.id,requestId:row.request_id,memberId:row.member_id,branchId:row.branch_id,assignedOfficerId:row.assigned_officer_id,sourceActionId:row.source_action_id,sourceActionVersion:Number(row.source_action_version),sourceRecordedAt:day(row.source_recorded_at),originalDate:row.original_day,dueDate:row.due_day,status:row.status,version:Number(row.version),recordedAt:day(row.recorded_at),recordedBy:row.recorded_by,completedAt:row.completed_at?day(row.completed_at):null});}
const taskRead="SELECT *,to_char(due_date,'YYYY-MM-DD') AS due_day,to_char(original_date,'YYYY-MM-DD') AS original_day FROM monitoring.staff_follow_ups";
const eventRead="SELECT *,to_char(due_date,'YYYY-MM-DD') AS due_day FROM monitoring.staff_follow_up_events";

export class SupportFollowUps{
 constructor(private readonly uow:UnitOfWork){}
 private async current(tx:TransactionContext,id:string,exclusive=false){
  const visible=(await tx.query('SELECT request_id FROM monitoring.staff_follow_ups WHERE id=$1',[id])).rows[0];
  if(!visible)throw notFound();
  await tx.query('SELECT monitoring.lock_disclosure($1,$2)',[visible.request_id,exclusive]);
  const row=(await tx.query(`${taskRead} WHERE id=$1`,[id])).rows[0];
  if(!row)throw notFound();return row;
 }
 private async eventPage(tx:TransactionContext,id:string,limit:number,cursor?:string,through?:number){
  let before:number|null=null;
  if(cursor){const row=(await tx.query('SELECT version FROM monitoring.staff_follow_up_events WHERE follow_up_id=$1 AND id=$2',[id,cursor])).rows[0];if(!row)throw new ApiError(422,'invalid_history_cursor','Reload the follow-up history.');before=Number(row.version);}
  const rows=(await tx.query(`${eventRead} WHERE follow_up_id=$1 AND ($2::bigint IS NULL OR version<$2) AND ($3::bigint IS NULL OR version<=$3) ORDER BY version DESC LIMIT $4`,[id,before,through??null,limit+1])).rows;
  return SupportFollowUpEventPageSchema.parse({items:rows.slice(0,limit).map(event),nextCursor:rows.length>limit?rows[limit-1].id:null});
 }
 list(actor:ActorContext,state:unknown,input:unknown){return operation(async()=>{
  requireRoles(actor,['officer']);const filter=SupportFollowUpFilterSchema.parse(state),query=paging.parse(input),today=manilaDay();
  return this.uow.run(actor,async tx=>{
   const rows=(await tx.query(`${taskRead} WHERE ($1::uuid IS NULL OR id>$1) AND
    (($2='completed' AND status='completed') OR (status='open' AND ($2='open' OR ($2='scheduled' AND due_date>$3::date) OR ($2='due' AND due_date=$3::date) OR ($2='overdue' AND due_date<$3::date)))) ORDER BY id LIMIT $4`,[query.cursor??null,filter,today,query.limit+1])).rows;
   // Hold current assignment for every returned disclosure, including the cursor lookahead.
   for(const request of [...new Set(rows.map(row=>String(row.request_id)))].sort())await tx.query('SELECT monitoring.lock_disclosure($1,false)',[request]);
   return SupportFollowUpPageSchema.parse({asOfDate:today,items:rows.slice(0,query.limit).map(task),nextCursor:rows.length>query.limit?rows[query.limit-1].id:null});
  });
 });}
 get(actor:ActorContext,id:unknown){return operation(async()=>{
  requireRoles(actor,['officer']);const key=Id.parse(id);return this.uow.run(actor,async tx=>{
   const row=await this.current(tx,key),events=await this.eventPage(tx,key,25,undefined,Number(row.version));
   const source=(await tx.query("SELECT *,to_char(follow_up_date,'YYYY-MM-DD') AS follow_up FROM monitoring.staff_actions WHERE id=$1",[row.source_action_id])).rows[0];
   if(!source)throw notFound();
   return SupportFollowUpDetailSchema.parse({task:task(row),source:SupportActionSchema.parse({id:source.id,version:Number(source.version),recordedAt:day(source.recorded_at),recordedBy:source.recorded_by,response:source.response,internalNote:source.internal_note,followUpDate:source.follow_up}),events:events.items,eventsNextCursor:events.nextCursor});
  });
 });}
 events(actor:ActorContext,id:unknown,input:unknown){return operation(async()=>{
  requireRoles(actor,['officer']);const key=Id.parse(id),query=paging.parse(input);return this.uow.run(actor,async tx=>{const row=await this.current(tx,key);return this.eventPage(tx,key,query.limit,query.cursor,Number(row.version));});
 });}
 complete(actor:ActorContext,id:unknown,input:unknown,version:number,key:unknown){return this.transition(actor,id,'completed',input,version,key);}
 reschedule(actor:ActorContext,id:unknown,input:unknown,version:number,key:unknown){return this.transition(actor,id,'rescheduled',input,version,key);}
 private transition(actor:ActorContext,id:unknown,kind:'completed'|'rescheduled',input:unknown,version:number,key:unknown){return operation(async()=>{
  requireRoles(actor,['officer']);const taskId=Id.parse(id),data=kind==='completed'?SupportFollowUpCompletionSchema.parse(input):SupportFollowUpRescheduleSchema.parse(input);Version.parse(version);
  return this.uow.run(actor,async tx=>{
   const current=await this.current(tx,taskId,true);
   const saved=receipt.parse(await command(tx,`support.follow_up.${kind}:${taskId}`,key,{data,version},async()=>{
    if('date' in data&&(data.date<manilaDay()||data.date===current.due_day))throw new ApiError(422,'invalid_follow_up','Choose a different follow-up date today or later.');
    const result=await tx.query<{version:string}>('SELECT monitoring.transition_follow_up($1,$2,$3,$4,$5) AS version',[taskId,kind,'date' in data?data.date:null,'reason' in data?data.reason:data.note,version]);
    const next=Version.parse(Number(result.rows[0].version));await recordEvent(tx,`support.follow_up.${kind}`,taskId,next);return {version:next};
   }));
   const original=(await tx.query(`${eventRead} WHERE follow_up_id=$1 AND version=$2`,[taskId,saved.version])).rows[0];if(!original)throw notFound();
   return task({...current,version:original.version,status:original.status,due_day:original.due_day,recorded_at:original.recorded_at,recorded_by:original.recorded_by,completed_at:original.status==='completed'?original.recorded_at:null});
  });
 });}
}
