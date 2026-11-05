import {randomUUID,randomBytes} from 'node:crypto';
import {owner,uow,runtimePool,config} from './database.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {tokenHash} from '../src/modules/identity/identity.service.js';
import {seedMoneyFixture} from '../src/modules/servicing/testing/money-db-fixture.js';
import {prepareReconciliationFixtures} from '../src/modules/accounting/testing/reconciliation-fixture.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import type {MemberActorContext} from '../../../packages/contracts/src/ports.js';

/** Actual constrained financial/support writers, with fictional public-development-only records. */
export async function supportPositionFixture(){
 await prepareReconciliationFixtures();const f=await seedMoneyFixture(),release=await f.settledRelease();await f.money.finalize(f.authorizer,release.command.id,4,randomUUID());
 const person=f.context.basis.current.application,linkId=randomUUID(),sessionId=randomUUID(),memberToken=randomBytes(32).toString('base64url'),officerToken=randomBytes(32).toString('base64url');
 await owner.query("INSERT INTO identity.member_links(id,organization_id,member_id,issuer,subject,verification_reference) VALUES($1::uuid,$2,$3,$4,$1::uuid::text,'Fictional support position verification')",[linkId,person.organizationId,person.memberId,config.OIDC_ISSUER]);
 await owner.query("INSERT INTO identity.member_sessions(id,token_hash,link_id,authenticated_at,expires_at) VALUES($1,$2,$3,now(),now()+interval '30 minutes')",[sessionId,tokenHash(memberToken),linkId]);
 await owner.query('UPDATE identity.sessions SET token_hash=$2 WHERE id=$1',[f.officer.sessionId,tokenHash(officerToken)]);
 const administrator={...f.reviewer,roles:['administrator'] as const,authenticatedAt:new Date()};await owner.query("UPDATE identity.staff_users SET roles=ARRAY['administrator'] WHERE id=$1",[administrator.userId]);
 const actor:MemberActorContext={kind:'member',organizationId:person.organizationId,memberId:person.memberId,linkId,sessionId,correlationId:randomUUID()},monitoring=new MonitoringService(uow,new LoanReads(uow)),members=new PostgresMemberUnitOfWork(runtimePool);
 const request=await members.run(actor,tx=>monitoring.submit(tx,{loanId:release.loan.id,message:'Fictional current repayment and household strain.',contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION,checkIn:{canMeetEssentials:'no',borrowedToRepay:'declined',financialStrain:'reported'}},randomUUID()));
 await monitoring.assign(administrator,request.id,{officerId:f.officer.userId,reason:'Fictional support position assignment.'},1,randomUUID());
 return{...f,release,request,monitoring,administrator,memberActor:actor,memberToken,officerToken};
}
