import { randomUUID } from 'node:crypto';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { PostgresMemberUnitOfWork } from '../src/platform/member-database.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { changeMemberLink } from '../src/modules/identity/member-provisioning.js';
import { config,owner,runtimePool,identityPool,prepareDatabase,resetFixtures,closePools } from './database.js';
import { memberFixture } from './member-fixtures.js';
let app:INestApplication,base:string,fixture:Awaited<ReturnType<typeof resetFixtures>>,first:Awaited<ReturnType<typeof memberFixture>>,second:typeof first,foreign:typeof first;
const uow=new PostgresMemberUnitOfWork(runtimePool);
beforeAll(async()=>{await prepareDatabase();app=await createApp(config);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{fixture=await resetFixtures();first=await memberFixture(fixture.officer.actor);second=await memberFixture(fixture.officer.actor);foreign=await memberFixture(fixture.other.actor);});
afterAll(async()=>{await app?.close();await closePools();});
const input=()=>({purpose:'Fictional school needs',requestedPrincipalCentavos:250_000,requestedTermMonths:6,currency:'PHP',noticeVersion:config.PRIVACY_NOTICE_VERSION,noticeAcknowledged:true});
async function request(path:string,{method='GET',body,key,version,token=first.token,cookie='agap_member_session',csrf=true,origin=config.PUBLIC_ORIGIN}:{method?:string;body?:unknown;key?:string;version?:number;token?:string;cookie?:string;csrf?:boolean;origin?:string}={}){
  const headers:Record<string,string>={Cookie:`${cookie}=${token}`,Origin:origin};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(key)headers['Idempotency-Key']=key;if(version!==undefined)headers['If-Match']=`"${version}"`;
  if(csrf)headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);
  const response=await fetch(`${base}/api/v1${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  return {status:response.status,body:await response.json() as Record<string,unknown>,headers:response.headers};
}
async function draft(token=first.token){const result=await request('/member/applications',{method:'POST',body:input(),key:randomUUID(),token});expect(result.status).toBe(201);return result.body;}
describe('member principal and own-record runtime controls',()=>{
  it('does not accept staff sessions, actor headers or member IDs as authentication',async()=>{
    const session=await request('/member/session');expect(session.status).toBe(200);expect(session.body).toMatchObject({principal:{kind:'member',memberId:first.record.id}});expect(session.body).not.toHaveProperty('user');
    expect((await request('/member/session',{token:fixture.officer.token,cookie:'agap_session'})).status).toBe(401);
    expect((await request('/members')).status).toBe(401);
    expect((await fetch(`${base}/api/v1/member/me`,{headers:{'X-Member-ID':first.record.id,'X-User-Role':'officer'}})).status).toBe(401);
  });
  it('restricts real runtime SQL to the current member and blocks staff/internal tables',async()=>{
    await draft();await draft(second.token);await draft(foreign.token);
    const result=await uow.run(first.actor,async tx=>({members:(await tx.query('SELECT id FROM members.members')).rows,applications:(await tx.query('SELECT member_id FROM applications.applications')).rows,staffCache:(await tx.query('SELECT * FROM platform.idempotency')).rows,audit:(await tx.query('SELECT * FROM platform.audit_events')).rows}));
    expect(result.members).toEqual([{id:first.record.id}]);expect(result.applications).toEqual([{member_id:first.record.id}]);expect(result.staffCache).toEqual([]);expect(result.audit).toEqual([]);
    await expect(uow.run(first.actor,tx=>tx.query('SELECT * FROM identity.staff_users'))).rejects.toMatchObject({code:'42501'});
    await expect(uow.run(first.actor,tx=>tx.query('UPDATE identity.member_links SET active=false'))).rejects.toMatchObject({code:'42501'});
    const changed=await uow.run(first.actor,tx=>tx.query("UPDATE members.members SET full_name='Unauthorized change' WHERE id=$1",[first.record.id]));expect(changed.rowCount).toBe(0);
  });
  it('rejects forged principal/link fields even when a real session ID is known to code',async()=>{
    await expect(uow.run({...first.actor,memberId:second.record.id},async()=>true)).rejects.toMatchObject({status:401});
    await expect(uow.run({...first.actor,organizationId:foreign.actor.organizationId},async()=>true)).rejects.toMatchObject({status:401});
  });
  it('returns the same absence status for another member and an unknown request, including downloads',async()=>{
    const own=await draft(),other=await draft(second.token);
    expect((await request(`/member/applications/${own.id}`)).status).toBe(200);
    for(const id of [other.id,randomUUID()])for(const suffix of ['', '/evidence','/options','/decision',`/documents/${randomUUID()}`])expect((await request(`/member/applications/${id}${suffix}`)).status).toBe(404);
    expect((await request('/member/applications')).body.items).toEqual([expect.objectContaining({id:own.id})]);
  });
  it('validates identity-free input, notice version, money, CSRF and idempotency keys',async()=>{
    const send=(body:unknown,options={})=>request('/member/applications',{method:'POST',body,key:randomUUID(),...options});
    expect((await send({...input(),memberId:second.record.id})).status).toBe(422);
    expect((await send({...input(),organizationId:fixture.otherOrg})).status).toBe(422);
    expect((await send({...input(),assignedOfficerId:fixture.officer.actor.userId})).status).toBe(422);
    for(const amount of [0,-1,null,0.1,Number.MAX_SAFE_INTEGER+1])expect((await send({...input(),requestedPrincipalCentavos:amount})).status).toBe(422);
    expect((await send({...input(),noticeVersion:'old-notice'})).status).toBe(409);
    expect((await send(input(),{csrf:false})).status).toBe(403);
    expect((await send(input(),{origin:'https://other.invalid'})).status).toBe(403);
    expect((await request('/member/applications',{method:'POST',body:input()})).status).toBe(400);
    expect((await owner.query('SELECT count(*) FROM applications.applications')).rows[0].count).toBe('0');
  });
  it('persists one application, history, event and cached response across a concurrent retry',async()=>{
    const key=randomUUID(),send=()=>request('/member/applications',{method:'POST',body:input(),key});
    const [a,b]=await Promise.all([send(),send()]);expect(a.status).toBe(201);expect(b.body).toEqual(a.body);
    expect((await owner.query('SELECT assigned_officer_id FROM applications.applications')).rows).toEqual([{assigned_officer_id:null}]);
    for(const table of ['applications.applications','applications.application_revisions','portal.events','portal.commands'])expect((await owner.query(`SELECT count(*) FROM ${table}`)).rows[0].count).toBe('1');
    expect((await request('/member/applications',{method:'POST',body:{...input(),purpose:'Different purpose'},key})).status).toBe(409);
  });
  it('enforces versions and submission state while preserving the original draft history',async()=>{
    const saved=await draft(),path=`/member/applications/${saved.id}`,update={purpose:'Fictional corrected purpose',requestedPrincipalCentavos:300_000,requestedTermMonths:8,currency:'PHP'};
    expect((await request(path,{method:'PATCH',body:update,key:randomUUID()})).status).toBe(428);
    const changed=await request(path,{method:'PATCH',body:update,key:randomUUID(),version:1});expect(changed.body).toMatchObject({version:2,purpose:update.purpose});
    expect((await request(path,{method:'PATCH',body:update,key:randomUUID(),version:1})).status).toBe(412);
    const key=randomUUID(),body={noticeVersion:config.PRIVACY_NOTICE_VERSION,acknowledgment:true};
    const submitted=await request(`${path}/submission`,{method:'POST',body,key,version:2});expect(submitted.body).toMatchObject({status:'submitted',version:3});
    expect((await request(`${path}/submission`,{method:'POST',body,key,version:2})).body).toEqual(submitted.body);
    expect((await request(path,{method:'PATCH',body:update,key:randomUUID(),version:3})).status).toBe(409);
    const revisions=(await owner.query('SELECT snapshot,recorded_member_id FROM applications.application_revisions ORDER BY version')).rows;
    expect(revisions).toHaveLength(3);expect(revisions[0]).toMatchObject({snapshot:{purpose:input().purpose,status:'draft'},recorded_member_id:first.record.id});
  });
  it('lets a scoped administrator assign a submitted member request without changing its financial inputs',async()=>{
    const saved=await draft();await request(`/member/applications/${saved.id}/submission`,{method:'POST',body:{noticeVersion:config.PRIVACY_NOTICE_VERSION,acknowledgment:true},key:randomUUID(),version:1});
    const assigned=await request(`/applications/${saved.id}/assignments`,{method:'POST',body:{officerId:fixture.officer.actor.userId,reason:'Fictional intake assignment'},key:randomUUID(),version:2,token:fixture.administrator.token,cookie:'agap_session'});
    expect(assigned.status).toBe(201);expect(assigned.body).toMatchObject({assignedOfficerId:fixture.officer.actor.userId,assessmentInputVersion:1,version:3});
  });
  it('saves reminders only for the caller and never changes loan or payment data',async()=>{
    const result=await request('/member/reminder-preferences',{method:'PATCH',body:{noticesEnabled:false},key:randomUUID(),version:1});expect(result.body).toEqual({noticesEnabled:false,version:2});
    expect((await request('/member/reminder-preferences',{token:second.token})).body).toEqual({noticesEnabled:true,version:1});
    expect((await owner.query('SELECT event_type FROM portal.events')).rows).toEqual([{event_type:'member.preferences.updated'}]);
  });
  it('distinguishes integrated empty loans/support from unavailable evidence and decisions',async()=>{
    const saved=await draft();
    for(const path of [`/member/applications/${saved.id}/evidence`,`/member/applications/${saved.id}/options`,`/member/applications/${saved.id}/decision`])expect((await request(path)).body).toMatchObject({state:'unavailable'});
    for(const path of ['/member/loans','/member/support-requests'])expect((await request(path)).body).toMatchObject({state:'available',data:[]});
    expect((await request('/member/support-requests',{method:'POST',body:{loanId:null,message:'Fictional need for help',contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION},key:randomUUID()})).status).toBe(201);
    expect((await owner.query('SELECT count(*) FROM portal.events')).rows[0].count).toBe('2');
  });
  it('rechecks expiry and revocation before cached results, reads and downloads',async()=>{
    const saved=await draft(),key=randomUUID(),body=input();await request('/member/applications',{method:'POST',body,key});
    await changeMemberLink(owner,config.OIDC_ISSUER,{action:'revoke',linkId:first.linkId,expectedVersion:1,operatorReference:'FICTIONAL-REVOKE',reason:'Fictional lost account access'});
    for(const path of ['/member/session','/member/me',`/member/applications/${saved.id}`,`/member/applications/${saved.id}/documents/${randomUUID()}`])expect((await request(path)).status).toBe(401);
    expect((await request('/member/applications',{method:'POST',body,key})).status).toBe(401);
    await expect(uow.run(first.actor,async()=>true)).rejects.toMatchObject({status:401});
    await owner.query("UPDATE identity.member_sessions SET created_at=now()-interval '2 minutes',expires_at=now()-interval '1 second' WHERE id=$1",[second.actor.sessionId]);expect((await request('/member/me',{token:second.token})).status).toBe(401);
  });
  it('holds member access through commit so revocation cannot race an authorized transaction',async()=>{
    let ready!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>{ready=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
    const work=uow.run(first.actor,async()=>{ready();await gate;return true;});await started;
    const revoke=changeMemberLink(owner,config.OIDC_ISSUER,{action:'revoke',linkId:first.linkId,expectedVersion:1,operatorReference:'FICTIONAL-RACE',reason:'Fictional revocation race'});
    await new Promise(resolve=>setTimeout(resolve,30));expect((await owner.query('SELECT active FROM identity.member_links WHERE id=$1',[first.linkId])).rows[0].active).toBe(true);
    release();expect(await work).toBe(true);await revoke;await expect(uow.run(first.actor,async()=>true)).rejects.toMatchObject({status:401});
  });
});
