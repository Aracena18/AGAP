import {randomUUID} from 'node:crypto';
import {assistedCheckInFixture} from './assisted-check-in-fixture.js';
import {IdentityService} from '../src/modules/identity/identity.service.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {SupportCorrections} from '../src/modules/monitoring/support-expansion.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,identityPool,runtimePool,uow} from './database.js';
/** Dedicated fictional organization, including correction sources beyond the first 100 records. */
export async function supportCorrectionFixture(){
 const f=await assistedCheckInFixture(),identity=new IdentityService(identityPool,config),member=(await identity.authenticateMember(f.member,randomUUID())).actor,officer=(await identity.authenticate(f.officer,randomUUID())).actor,admin=(await identity.authenticate(f.administrator,randomUUID())).actor;
 const members=new PostgresMemberUnitOfWork(runtimePool),monitoring=new MonitoringService(uow,new LoanReads(uow)),corrections=new SupportCorrections(new LoanReads(uow));
 const input={loanId:null,message:'Fictional original correction source',contactPreference:'phone' as const,sharingConfirmed:true as const,noticeVersion:config.PRIVACY_NOTICE_VERSION,checkIn:{canMeetEssentials:'no' as const,borrowedToRepay:'declined' as const,financialStrain:'unavailable' as const}};
 const olderSuccessor=await members.run(member,tx=>corrections.correct(tx,f.requests[0],{...input,message:'Fictional older replacement outside loaded history',reason:'Fictional earlier correction'},randomUUID()));
 await members.run(member,async tx=>{for(let n=1;n<=130;n++)await monitoring.submit(tx,{...input,message:`Fictional later history item ${n}`},randomUUID());});
 const editable=await members.run(member,tx=>monitoring.submit(tx,{...input,message:'Fictional request ready for member correction'},randomUUID()));
 await monitoring.assign(admin,editable.id,{officerId:officer.userId,reason:'Private fictional assignment reason'},1,randomUUID());
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());
 await monitoring.respond(officer,editable.id,{response:'Original published staff response',internalNote:'SECRET correction fixture staff note',followUpDate:today},2,randomUUID());
 return{...f,editableId:editable.id,olderId:f.requests[0],olderSuccessorId:olderSuccessor.id,concurrentId:f.requests[1],privateId:f.requests[2]};
}
