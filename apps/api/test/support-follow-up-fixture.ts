import {randomUUID} from 'node:crypto';
import type {ActorContext} from '../../../packages/contracts/src/ports.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {manilaDay} from '../src/modules/monitoring/support-follow-ups.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,runtimePool,uow} from './database.js';
import {memberFixture} from './member-fixtures.js';

/** Dedicated fictional browser member; production startup never calls this fixture. */
export async function supportFollowUpFixture(officer:ActorContext,administrator:ActorContext){
 const member=await memberFixture(officer),monitoring=new MonitoringService(uow,new LoanReads(uow)),members=new PostgresMemberUnitOfWork(runtimePool),today=manilaDay();
 const date=(offset:number)=>{const at=new Date(`${today}T00:00:00Z`);at.setUTCDate(at.getUTCDate()+offset);return at.toISOString().slice(0,10);};
 const request=await members.run(member.actor,tx=>monitoring.submit(tx,{loanId:null,message:'FICTIONAL browser follow-up member concern.',contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION},randomUUID()));
 await monitoring.assign(administrator,request.id,{officerId:officer.userId,reason:'Fictional follow-up browser assignment.'},1,randomUUID());
 async function create(when:string,label:string){return uow.run(officer,async tx=>{
  const version=(await tx.query('SELECT version FROM monitoring.requests WHERE id=$1',[request.id])).rows[0].version;
  await tx.query('SELECT monitoring.respond_support($1,$2::jsonb,$3)',[request.id,JSON.stringify({response:`Fictional ${label} follow-up source.`,internalNote:`Private ${label} source note.`,followUpDate:when}),version]);
  return String((await tx.query('SELECT id FROM monitoring.staff_follow_ups WHERE request_id=$1 ORDER BY source_action_version DESC LIMIT 1',[request.id])).rows[0].id);
 });}
 const dueTaskId=await create(today,'due');
 await uow.run(officer,async tx=>{for(let i=1;i<=27;i++)await tx.query("SELECT monitoring.transition_follow_up($1,'rescheduled',$2,$3,$4)",[dueTaskId,i===27?today:date(i%2+1),`Private fictional scheduling history ${i}.`,i]);});
 return {requestId:request.id,dueTaskId,overdueTaskId:await create(date(-2),'overdue'),scheduledTaskId:await create(date(3),'scheduled'),memberToken:member.token,today,tomorrow:date(1)};
}
