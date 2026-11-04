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
async function respondPaged(id:string,key=randomUUID(),version=2){return call(`/support-requests/${id}/actions`,{...staff(),method:'POST',body:response(),version,key});}
// Build long fictional histories through the same constrained database writer, under the actual officer role.
async function appendHistory(id:string,count:number){return uow.run(f.officer.actor,async tx=>{
 let version=Number((await tx.query('SELECT version FROM monitoring.requests WHERE id=$1',[id])).rows[0].version);
 for(let index=0;index<count;index++){
  await tx.query('SELECT monitoring.respond_support($1,$2::jsonb,$3)',[id,JSON.stringify({...response(),response:`Fictional history response ${version}`,internalNote:`Private historical note ${version}`}),version]);version++;
 }
 return version;
});}
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
 it('handles empty, exact and overflowing first pages without claiming incomplete history is complete',async()=>{
  const request=await submit();await assign(request.id);
  const empty=await call(`/support-requests/${request.id}/history`,staff());expect(empty.status).toBe(200);expect(empty.body.actions).toEqual([]);expect(empty.body.actionsNextCursor).toBeNull();
  await appendHistory(request.id,24);const partial=await call(`/support-requests/${request.id}/history`,staff());expect(partial.body.actions).toHaveLength(24);expect(partial.body.actionsNextCursor).toBeNull();
  await appendHistory(request.id,1);const exact=await call(`/support-requests/${request.id}/history`,staff());expect(exact.body.actions).toHaveLength(25);expect(exact.body.actionsNextCursor).toBeNull();
  await appendHistory(request.id,1);const more=await call(`/support-requests/${request.id}/history`,staff());expect(more.body.actions).toHaveLength(25);expect(more.body.actionsNextCursor).toBe(more.body.actions.at(-1).id);
  const last=await call(`/support-requests/${request.id}/actions?cursor=${more.body.actionsNextCursor}&limit=25`,staff());expect(last.body.items).toHaveLength(1);expect(last.body.nextCursor).toBeNull();
 });
 it('reads all 125 actions across an intervening append without duplicates or changing the older-page boundary',async()=>{
  const request=await submit();await assign(request.id);const version=await appendHistory(request.id,125);
  const first=await call(`/support-requests/${request.id}/history`,staff());expect(first.status).toBe(200);expect(first.body.actions).toHaveLength(25);
  const saved=await respondPaged(request.id,randomUUID(),version);expect(saved.status).toBe(201);expect(saved.body.version).toBe(version+1);expect(saved.body.actions).toHaveLength(25);
  const items=[...first.body.actions];let cursor=first.body.actionsNextCursor;
  while(cursor){const page=await call(`/support-requests/${request.id}/actions?cursor=${cursor}&limit=25`,staff());expect(page.status).toBe(200);items.push(...page.body.items);cursor=page.body.nextCursor;}
  expect(items).toHaveLength(125);expect(new Set(items.map(item=>item.id)).size).toBe(125);expect(items.map(item=>item.version)).toEqual(Array.from({length:125},(_,i)=>version-i));
  expect(items.some(item=>item.version===saved.body.version)).toBe(false);
  expect((await call(`/support-requests/${request.id}`,staff())).status).toBe(422); // Legacy detail remains explicit about its limit.
  expect((await call('/member/support-requests')).body.data[0].response).toBe(response().response);
 });
 it('records the 101st action exactly once and preserves both legacy and paged replay snapshots after later changes',async()=>{
  const request=await submit();await assign(request.id);const legacyKey=randomUUID(),legacy=await respond(request.id,legacyKey);
  const version=await appendHistory(request.id,99),key=randomUUID();
  const results=await Promise.all([respondPaged(request.id,key,version),respondPaged(request.id,key,version)]);
  expect(results[0].status).toBe(201);expect(results[1].body).toEqual(results[0].body);expect(results[0].body.actions).toHaveLength(25);
  expect((await owner.query('SELECT count(*) FROM monitoring.actions WHERE request_id=$1',[request.id])).rows[0].count).toBe('101');
  await appendHistory(request.id,3);
  expect((await respondPaged(request.id,key,version)).body).toEqual(results[0].body);
  expect((await respond(request.id,legacyKey)).body).toEqual(legacy.body);
  expect((await call(`/support-requests/${request.id}/responses`,{...staff(),method:'POST',body:response(),version,key})).status).toBe(409);
  expect((await call(`/support-requests/${request.id}/actions`,{...staff(),method:'POST',body:{...response(),internalNote:'Changed private draft'},version,key})).status).toBe(409);
  const cache=await uow.run(f.auditor.actor,tx=>tx.query('SELECT response FROM platform.idempotency'));
  const serialized=JSON.stringify(cache.rows);expect(serialized).not.toContain(response().internalNote);expect(serialized).not.toContain(response().response);expect(serialized).not.toContain(input().message);expect(serialized).toContain('staff-history-v1');
 });
 it('validates cursor ownership, unknown query keys and bounded page sizes',async()=>{
  const first=await submit(),second=await submit();await assign(first.id);await assign(second.id);await appendHistory(first.id,2);await appendHistory(second.id,1);
  const foreign=(await call(`/support-requests/${second.id}/history`,staff())).body.actions[0].id;
  for(const query of [`cursor=${foreign}`,`cursor=${randomUUID()}`,'cursor=invalid','limit=0','limit=101','limit=1.5','throughVersion=3']){
   const result=await call(`/support-requests/${first.id}/actions?${query}`,staff());expect(result.status).toBe(422);expect(JSON.stringify(result.body)).not.toContain('Private historical note');
  }
  expect((await call(`/support-requests/${first.id}/actions?limit=1`,staff())).body.items).toHaveLength(1);
 });
 it('denies history and action pages to members, metadata administrators, auditors and unrelated officers',async()=>{
  const request=await submit();await assign(request.id);await appendHistory(request.id,2);
  for(const path of [`/support-requests/${request.id}/history`,`/support-requests/${request.id}/actions`]){
   expect((await call(path)).status).toBe(401);
   for(const token of [f.administrator.token,f.auditor.token,f.revocationTarget.token])expect((await call(path,staff(token))).status).toBe(403);
   expect((await call(path,staff(f.other.token))).status).toBe(404);
  }
 });
 it('rechecks assignment and active identity for each older page and paged command replay',async()=>{
  const request=await submit();await assign(request.id);const version=await appendHistory(request.id,26),key=randomUUID();await respondPaged(request.id,key,version);
  const first=(await call(`/support-requests/${request.id}/history`,staff())).body;
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['officer'] WHERE id=$1",[f.revocationTarget.actor.userId]);
  expect((await call(`/support-requests/${request.id}/assignments`,{...staff(f.administrator.token),method:'POST',body:{officerId:f.revocationTarget.actor.userId,reason:'Fictional pagination reassignment'},version:version+1,key:randomUUID()})).status).toBe(201);
  expect((await call(`/support-requests/${request.id}/actions?cursor=${first.actionsNextCursor}`,staff())).status).toBe(404);
  expect((await respondPaged(request.id,key,version)).status).toBe(404);
  expect((await call(`/support-requests/${request.id}/history`,staff(f.revocationTarget.token))).status).toBe(200);
  await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[f.revocationTarget.actor.userId]);
  expect((await call(`/support-requests/${request.id}/actions`,staff(f.revocationTarget.token))).status).toBe(401);
 });
 it('rolls back a paged response receipt, action and audit together on coordinator failure',async()=>{
  const request=await submit();await assign(request.id);const key=randomUUID();
  const service=new MonitoringService({run:(actor,work)=>uow.run(actor,async tx=>{await work(tx);throw new Error('Fictional pagination rollback');})},new LoanReads(uow));
  await expect(service.respondPaged(f.officer.actor,request.id,response(),2,key)).rejects.toMatchObject({status:503});
  expect((await owner.query('SELECT count(*) FROM monitoring.actions')).rows[0].count).toBe('0');
  expect((await owner.query("SELECT count(*) FROM platform.audit_events WHERE event_type='support.responded'")).rows[0].count).toBe('0');
  expect((await respondPaged(request.id,key)).status).toBe(201);
 });
});
