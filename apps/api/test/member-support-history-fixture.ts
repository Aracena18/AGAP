import {randomUUID} from 'node:crypto';
import type {ActorContext} from '../../../packages/contracts/src/ports.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,runtimePool,uow} from './database.js';
import {memberFixture} from './member-fixtures.js';

/** Dedicated fictional browser history, never called by production startup. */
export async function memberSupportHistoryFixture(officer:ActorContext,administrator:ActorContext){
 const member=await memberFixture(officer),other=await memberFixture(officer),monitoring=new MonitoringService(uow,new LoanReads(uow)),members=new PostgresMemberUnitOfWork(runtimePool);
 const ids=await members.run(member.actor,async tx=>{
  const result:string[]=[];for(let i=1;i<=125;i++){const row=await monitoring.submit(tx,{loanId:null,message:`Fictional member history request ${i}.`,contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION,checkIn:{canMeetEssentials:'unavailable',borrowedToRepay:'declined',financialStrain:'reported'}},randomUUID());result.push(row.id);}return result;
 });
 await monitoring.assign(administrator,ids.at(-1)!,{officerId:officer.userId,reason:'PRIVATE browser assignment reason.'},1,randomUUID());
 await monitoring.respondPaged(officer,ids.at(-1)!,{response:'Published fictional response for the member.',internalNote:'PRIVATE browser staff history note.',followUpDate:null},2,randomUUID());
 return{memberToken:member.token,otherMemberToken:other.token};
}
