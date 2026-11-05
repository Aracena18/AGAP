import {randomBytes,randomUUID} from 'node:crypto';
import type {ActorContext} from '../../../packages/contracts/src/ports.js';
import {config,owner,uow,runtimePool} from './database.js';
import {tokenHash} from '../src/modules/identity/identity.service.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {memberFixture} from './member-fixtures.js';
/** Dedicated fictional organization: parallel logout/assignment journeys cannot affect this slice. */
export async function assistedCheckInFixture(){
 const org=randomUUID(),branch=randomUUID();await owner.query("INSERT INTO platform.organizations VALUES($1,'Fictional assisted check-in cooperative')",[org]);await owner.query("INSERT INTO platform.branches VALUES($1,$2,'Fictional assisted check-in branch')",[branch,org]);
 async function staff(role:'officer'|'administrator'){
  const userId=randomUUID(),sessionId=randomUUID(),token=randomBytes(32).toString('base64url');
  await owner.query("INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$1::uuid::text,$4,$5,$6)",[userId,org,config.OIDC_ISSUER,`Fictional assisted ${role}`,[branch],[role]]);
  await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,now(),ARRAY['mfa'],now()+interval '30 minutes')",[sessionId,tokenHash(token),userId]);
  const actor:ActorContext={userId,sessionId,organizationId:org,branchIds:[branch],roles:[role],authenticatedAt:new Date(),authenticationMethods:['mfa'],correlationId:randomUUID()};return{actor,token};
 }
 const officer=await staff('officer'),administrator=await staff('administrator'),member=await memberFixture(officer.actor),other=await memberFixture(officer.actor),monitoring=new MonitoringService(uow,new LoanReads(uow)),members=new PostgresMemberUnitOfWork(runtimePool);
 const requests:string[]=[];
 for(let i=0;i<5;i++){
  const r=await members.run(member.actor,tx=>monitoring.submit(tx,{message:`Fictional original support concern ${i+1}`,loanId:null,contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION},randomUUID()));
  await monitoring.assign(administrator.actor,r.id,{officerId:officer.actor.userId,reason:'Fictional assigned assistance.'},1,randomUUID());requests.push(r.id);
 }
 return{officer:officer.token,administrator:administrator.token,member:member.token,otherMember:other.token,requests};
}
