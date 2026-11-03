import {randomUUID} from 'node:crypto';
import type {INestApplication} from '@nestjs/common';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {createApp} from '../src/app.js';
import {IdentityService,tokenHash} from '../src/modules/identity/identity.service.js';
import {prepareReconciliationFixtures,reconciliationFixture} from '../src/modules/accounting/testing/reconciliation-fixture.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,identityPool,owner,prepareDatabase,resetFixtures,closePools,runtimePool,uow} from './database.js';
import {memberFixture} from './member-fixtures.js';
let app:INestApplication,base:string,f:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>,other:typeof member;
beforeAll(async()=>{await prepareDatabase();app=await createApp(config);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{f=await resetFixtures();member=await memberFixture(f.officer.actor);other=await memberFixture(f.officer.actor);});
afterAll(async()=>{await app?.close();await closePools();});
const input=()=>({loanId:null,message:'Fictional member pays on time but needs help with essentials.',contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION,checkIn:{canMeetEssentials:'no',borrowedToRepay:'declined',financialStrain:'reported'}});
async function call(path:string,options:{method?:string;body?:unknown;key?:string;version?:number;token?:string;staff?:boolean;csrf?:boolean}={}){
 const token=options.token??member.token,headers:Record<string,string>={Cookie:`${options.staff?'agap_session':'agap_member_session'}=${token}`,Origin:config.PUBLIC_ORIGIN};
 if(options.body!==undefined)headers['Content-Type']='application/json';if(options.key)headers['Idempotency-Key']=options.key;if(options.version)headers['If-Match']=`"${options.version}"`;
 if(options.csrf!==false)headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);
 const result=await fetch(`${base}/api/v1${path}`,{method:options.method??'GET',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});return{status:result.status,body:await result.json()};
}
const staff=(token=f.officer.token)=>({staff:true,token});
async function submit(key=randomUUID()){const r=await call('/member/support-requests',{method:'POST',body:input(),key});expect(r.status).toBe(201);return r.body;}
async function assign(id:string,version=1,key=randomUUID()){return call(`/support-requests/${id}/assignments`,{...staff(f.administrator.token),method:'POST',body:{officerId:f.officer.actor.userId,reason:'Fictional branch support assignment'},version,key});}
const response=()=>({response:'Please contact us to discuss the available options.',internalNote:'Private staff note: offer a conversation.',followUpDate:null});
async function respond(id:string,key=randomUUID(),version=2){return call(`/support-requests/${id}/responses`,{...staff(),method:'POST',body:response(),version,key});}
describe('HLT-01 actual member and staff API',()=>{
 it('captures a real public loan position and preserves it after later repayment and replay',async()=>{
  await prepareReconciliationFixtures();const money=await reconciliationFixture(),release=await money.release(),person=money.context.basis.current.application;
  const link=randomUUID(),token=randomUUID().replaceAll('-','')+'abcdefghijk',sessionId=randomUUID();
  await owner.query("INSERT INTO identity.member_links(id,organization_id,member_id,issuer,subject,verification_reference) VALUES($1::uuid,$2,$3,$4,$1::uuid::text,'Fictional verified money member')",[link,person.organizationId,person.memberId,config.OIDC_ISSUER]);
  await owner.query("INSERT INTO identity.member_sessions(id,token_hash,link_id,authenticated_at,expires_at) VALUES($1,$2,$3,now(),now()+interval '30 minutes')",[sessionId,tokenHash(token),link]);
  const key=randomUUID(),body={...input(),loanId:release.loan.id};
  const submitted=await call('/member/support-requests',{method:'POST',body,key,token});expect(submitted.status).toBe(201);
  const original=(await owner.query('SELECT position FROM monitoring.disclosures WHERE request_id=$1',[submitted.body.id])).rows[0].position;
  expect(original).toMatchObject({loanId:release.loan.id,principalCentavos:1_000_000,overdueCentavos:1_000_000});
  const c=await money.money.prepareRepayment(money.cashier,release.loan.id,release.request,randomUUID());await money.money.authorize(money.authorizer,c.id,1,randomUUID());
  const intent=await money.money.submitIntent(money.cashier,c.id,2,randomUUID());await money.money.observe(money.cashier,c.id,await money.paymentEvidence(intent),3,randomUUID());await money.money.finalize(money.authorizer,c.id,4,randomUUID());
  expect((await call('/member/support-requests',{method:'POST',body,key,token})).body).toEqual(submitted.body);
  expect((await owner.query('SELECT position FROM monitoring.disclosures WHERE request_id=$1',[submitted.body.id])).rows[0].position).toEqual(original);
  const current=await call('/member/support-requests',{method:'POST',body,key:randomUUID(),token});expect(current.status).toBe(201);
  const evidence=(await owner.query('SELECT position,check_in FROM monitoring.disclosures WHERE request_id=$1',[current.body.id])).rows[0];
  expect(evidence.position).toMatchObject({principalCentavos:0,overdueCentavos:0});expect(evidence.check_in.financialStrain).toBe('reported');
 });
 it('persists confirmation, assigns and publishes only the response with no financial effects',async()=>{
  const request=await submit();expect((await assign(request.id)).status).toBe(201);
  const detail=await call(`/support-requests/${request.id}`,staff());expect(detail.status).toBe(200);expect(detail.body.checkIn).toEqual(input().checkIn);expect(detail.body.position).toBeNull();
  const result=await respond(request.id);expect(result.status).toBe(201);expect(result.body.version).toBe(3);
  const history=await call('/member/support-requests');expect(history.body.data[0]).toMatchObject({id:request.id,status:'reviewed',response:response().response});expect(JSON.stringify(history.body)).not.toContain(response().internalNote);
  expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0');expect((await owner.query('SELECT count(*) FROM servicing.postings')).rows[0].count).toBe('0');
 });
 it('restricts administrators to metadata and assigned officers to their own disclosures',async()=>{
  const request=await submit();expect((await call('/support-requests',staff())).body.items).toEqual([]);
  const admin=await call('/support-requests',staff(f.administrator.token));expect(admin.body.items).toHaveLength(1);expect(JSON.stringify(admin.body)).not.toContain(input().message);
  expect((await call(`/support-requests/${request.id}`,staff(f.administrator.token))).status).toBe(403);
  expect((await call(`/support-requests/${request.id}`,staff())).status).toBe(404);
  await assign(request.id);expect((await call(`/support-requests/${request.id}`,staff())).status).toBe(200);
  expect((await call('/support-requests',staff(f.auditor.token))).status).toBe(403);
  expect((await call('/support-requests',staff(f.other.token))).body.items).toEqual([]);
 });
 it('keeps different members, raw disclosures and internal notes isolated under runtime RLS',async()=>{
  const request=await submit();expect((await call('/member/support-requests',{token:other.token})).body.data).toEqual([]);
  const muow=new PostgresMemberUnitOfWork(runtimePool);
  await expect(muow.run(member.actor,tx=>tx.query('SELECT * FROM monitoring.disclosures'))).rejects.toMatchObject({code:'42501'});
  expect((await muow.run(member.actor,tx=>tx.query('SELECT * FROM monitoring.staff_actions'))).rows).toEqual([]);
  expect((await uow.run(f.administrator.actor,tx=>tx.query('SELECT * FROM monitoring.staff_disclosures WHERE request_id=$1',[request.id]))).rows).toEqual([]);
 });
 it('replays a submission and rejects changed key reuse, absent confirmation and forged identities',async()=>{
  const key=randomUUID(),first=await submit(key);expect((await call('/member/support-requests',{method:'POST',body:input(),key})).body).toEqual(first);
  expect((await call('/member/support-requests',{method:'POST',body:{...input(),message:'Changed'},key})).status).toBe(409);
  for(const payload of [{...input(),sharingConfirmed:false},{...input(),memberId:other.actor.memberId},{...input(),organizationId:f.otherOrg}])expect((await call('/member/support-requests',{method:'POST',body:payload,key:randomUUID()})).status).toBe(422);
  expect((await call('/member/support-requests',{method:'POST',body:{...input(),noticeVersion:'old'},key:randomUUID()})).status).toBe(409);
 });
 it('deduplicates concurrent submissions and preserves the exact original result',async()=>{
  const key=randomUUID(),results=await Promise.all([submit(key),submit(key)]);expect(results[0]).toEqual(results[1]);
  expect((await owner.query('SELECT count(*) FROM monitoring.requests')).rows[0].count).toBe('1');expect((await owner.query("SELECT count(*) FROM platform.outbox WHERE event_type='support.submitted'")).rows[0].count).toBe('1');
 });
 it('requires CSRF, current identity, fresh MFA and a valid same-branch officer',async()=>{
  expect((await call('/member/support-requests',{method:'POST',body:input(),key:randomUUID(),csrf:false})).status).toBe(403);
  const request=await submit();await owner.query("UPDATE identity.sessions SET authenticated_at=now()-interval '1 hour' WHERE id=$1",[f.administrator.actor.sessionId]);
  expect((await assign(request.id)).status).toBe(403);await owner.query('UPDATE identity.sessions SET authenticated_at=now() WHERE id=$1',[f.administrator.actor.sessionId]);
  expect((await call(`/support-requests/${request.id}/assignments`,{...staff(f.administrator.token),method:'POST',body:{officerId:f.other.actor.userId,reason:'Invalid cross-org target'},version:1,key:randomUUID()})).status).toBe(422);
  await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1',[member.linkId]);expect((await call('/member/support-requests')).status).toBe(401);
 });
 it('requires current versions and replays assignment/response exactly once',async()=>{
  const request=await submit(),key=randomUUID(),first=await assign(request.id,1,key);expect((await assign(request.id,1,key)).body).toEqual(first.body);
  expect((await assign(request.id,1)).status).toBe(412);
  const replyKey=randomUUID(),saved=await respond(request.id,replyKey);expect((await respond(request.id,replyKey)).body).toEqual(saved.body);
  expect((await respond(request.id)).status).toBe(412);expect((await owner.query('SELECT count(*) FROM monitoring.actions')).rows[0].count).toBe('1');
  expect((await respond(request.id,randomUUID(),3)).status).toBe(201);expect((await respond(request.id,replyKey)).body).toEqual(saved.body);
  const cache=await uow.run(f.auditor.actor,tx=>tx.query('SELECT response FROM platform.idempotency'));
  expect(JSON.stringify(cache.rows)).not.toContain(response().internalNote);expect(JSON.stringify(cache.rows)).not.toContain(input().message);expect(JSON.stringify(cache.rows)).not.toContain(response().response);
 });
 it('rejects the old officer before reading or replaying a response after reassignment',async()=>{
  const request=await submit();await assign(request.id);const key=randomUUID();await respond(request.id,key);
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['officer'] WHERE id=$1",[f.revocationTarget.actor.userId]);
  const reassigned=await call(`/support-requests/${request.id}/assignments`,{...staff(f.administrator.token),method:'POST',body:{officerId:f.revocationTarget.actor.userId,reason:'Changed responsible officer'},version:3,key:randomUUID()});expect(reassigned.status).toBe(201);
  expect((await call(`/support-requests/${request.id}`,staff())).status).toBe(404);expect((await respond(request.id,key)).status).toBe(404);
 });
 it('rolls back action, version, idempotency and events together on coordinator failure',async()=>{
  const request=await submit();await assign(request.id);const key=randomUUID();
  const service=new MonitoringService({run:(actor,work)=>uow.run(actor,async tx=>{await work(tx);throw new Error('Fictional failure before commit');})},new LoanReads(uow));
  await expect(service.respond(f.officer.actor,request.id,response(),2,key)).rejects.toMatchObject({status:503});
  expect((await owner.query('SELECT count(*) FROM monitoring.actions')).rows[0].count).toBe('0');expect((await owner.query('SELECT version FROM monitoring.requests WHERE id=$1',[request.id])).rows[0].version).toBe('2');
  expect((await owner.query("SELECT count(*) FROM platform.audit_events WHERE event_type='support.responded'")).rows[0].count).toBe('0');expect((await respond(request.id,key)).status).toBe(201);
 });
 it('preserves immutable disclosures/actions and denies direct runtime writes',async()=>{
  const request=await submit();await assign(request.id);await respond(request.id);
  await expect(uow.run(f.officer.actor,tx=>tx.query("UPDATE monitoring.requests SET status='submitted'"))).rejects.toMatchObject({code:'42501'});
  for(const table of ['disclosures','actions','assignments'])await expect(owner.query(`DELETE FROM monitoring.${table}`)).rejects.toMatchObject({code:'42501'});
 });
 it('paginates scoped metadata and validates linked loan ownership without guessing',async()=>{
  await submit();await submit();const first=await call('/support-requests?limit=1',staff(f.administrator.token));expect(first.body.items).toHaveLength(1);expect(first.body.nextCursor).toBeTruthy();
  const next=await call(`/support-requests?limit=1&cursor=${first.body.nextCursor}`,staff(f.administrator.token));expect(next.body.items[0].id).not.toBe(first.body.items[0].id);
  expect((await call('/member/support-requests',{method:'POST',body:{...input(),loanId:randomUUID()},key:randomUUID()})).status).toBe(404);
 });
});
