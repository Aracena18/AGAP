import {randomUUID} from 'node:crypto';
import type {ActorContext} from '../../../packages/contracts/src/ports.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,runtimePool,uow} from './database.js';
import {memberFixture} from './member-fixtures.js';

/** Test-only long history, using actual member/assignment and constrained action writers. */
export async function supportHistoryFixture(officer:ActorContext,administrator:ActorContext){
 const member=await memberFixture(officer),monitoring=new MonitoringService(uow,new LoanReads(uow)),members=new PostgresMemberUnitOfWork(runtimePool);
 async function create(count:number){
  const request=await members.run(member.actor,tx=>monitoring.submit(tx,{loanId:null,message:`FICTIONAL browser history with ${count} responses.`,contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION},randomUUID()));
  await monitoring.assign(administrator,request.id,{officerId:officer.userId,reason:'Fictional history browser fixture.'},1,randomUUID());
  await uow.run(officer,async tx=>{for(let index=1;index<=count;index++)await tx.query('SELECT monitoring.respond_support($1,$2::jsonb,$3)',[request.id,JSON.stringify({response:`Fictional historical response ${index}`,internalNote:`Private history note ${index}`,followUpDate:null}),index+1]);});
  return request.id;
 }
 return {requestId:await create(125),otherRequestId:await create(1),memberToken:member.token};
}
