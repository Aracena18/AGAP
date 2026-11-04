import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { SessionSchema,MemberSessionSchema } from '../../../packages/contracts/src/schemas.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { config,owner,prepareDatabase,resetFixtures,closePools } from './database.js';
import { presentationFixtures } from './presentation-fixtures.js';

afterAll(async()=>{await closePools();});
describe.each([58080,18080])('fictional presentation issuer port %i',port=>{
const originalIssuer=config.OIDC_ISSUER;
const current={...config,OIDC_ISSUER:`http://127.0.0.1:${port}/realms/agap`,NODE_ENV:'development' as const,LOCAL_PRESENTATION_MODE:true};
let app:INestApplication,base:string,fixture:Awaited<ReturnType<typeof presentationFixtures>>;
beforeAll(async()=>{config.OIDC_ISSUER=current.OIDC_ISSUER;await prepareDatabase();app=await createApp(current);await app.listen(0,'127.0.0.1');base=await app.getUrl();current.PUBLIC_ORIGIN=base;});
beforeEach(async()=>{current.LOCAL_PRESENTATION_MODE=true;await resetFixtures();fixture=await presentationFixtures();});
afterAll(async()=>{await app?.close();config.OIDC_ISSUER=originalIssuer;});
async function open(member=false,cookie?:string){
  const response=await fetch(`${base}/api/v1/${member?'member/':''}session`,{headers:cookie?{Cookie:cookie}:{}});
  return {response,cookie:response.headers.getSetCookie()[0]?.split(';')[0],body:await response.json()};
}

it('is opt-in and rejects public, real-record, non-development and non-loopback bindings',()=>{
  const env={NODE_ENV:'development',DATABASE_URL:config.DATABASE_URL,IDENTITY_DATABASE_URL:config.IDENTITY_DATABASE_URL,SESSION_SECRET:config.SESSION_SECRET,OIDC_CLIENT_SECRET:config.OIDC_CLIENT_SECRET};
  expect(loadConfig(env).LOCAL_PRESENTATION_MODE).toBe(false);
  expect(loadConfig({...env,LOCAL_PRESENTATION_MODE:'true'}).LOCAL_PRESENTATION_MODE).toBe(true);
  for(const port of [58080,18080])expect(loadConfig({...env,LOCAL_PRESENTATION_MODE:'true',OIDC_ISSUER:`http://127.0.0.1:${port}/realms/agap`}).LOCAL_PRESENTATION_MODE).toBe(true);
  for(const issuer of ['http://127.0.0.1:18081/realms/agap','http://localhost:18080/realms/agap','https://127.0.0.1:18080/realms/agap','http://127.0.0.1:18080/realms/other','http://127.0.0.1:18080/realms/agap/','http://127.0.0.1:18080/realms/agap?demo=true','http://user@127.0.0.1:18080/realms/agap','http://example.invalid:18080/realms/agap'])expect(()=>loadConfig({...env,LOCAL_PRESENTATION_MODE:'true',OIDC_ISSUER:issuer})).toThrow('fictional loopback');
  for(const override of [{NODE_ENV:'production'},{NODE_ENV:'test'},{PUBLIC_ORIGIN:'https://agap.software'},{API_HOST:'0.0.0.0'},{OIDC_ISSUER:'http://localhost:58080/realms/other'},{EVIDENCE_RECORD_MODE:'real'},{PRIVACY_NOTICE_VERSION:'real-notice'},{DATABASE_URL:'postgresql://runtime@example.invalid/agap'},{IDENTITY_DATABASE_URL:'postgresql://identity@127.0.0.1/real_records'}])expect(()=>loadConfig({...env,...override,LOCAL_PRESENTATION_MODE:'true'})).toThrow('fictional loopback');
});
it('automatically creates separate validated cookie sessions for existing fictional staff and member identities',async()=>{
  const staff=await open(),member=await open(true);
  expect(staff.response.status).toBe(200);expect(member.response.status).toBe(200);
  expect(staff.response.headers.get('X-AGAP-Presentation')).toBe('true');
  expect(SessionSchema.parse(staff.body).user.roles).toEqual(['administrator']);
  expect(MemberSessionSchema.parse(member.body).principal.kind).toBe('member');
  expect(staff.cookie).toMatch(/^agap_session=presentation\./);expect(member.cookie).toMatch(/^agap_member_session=presentation\./);
  for(const session of [staff,member]){expect(session.response.headers.getSetCookie()[0]).toContain('HttpOnly');expect(session.response.headers.getSetCookie()[0]).toContain('SameSite=Lax');}
  expect(member.response.headers.getSetCookie()[0]).toContain('Path=/api/v1/member');
  expect((await owner.query('SELECT methods FROM identity.sessions WHERE user_id=$1',[fixture.staffId])).rows).toEqual([{methods:['local_presentation']}]);
  expect((await open(false,staff.cookie)).cookie).toBeUndefined();
  expect((await open(true,member.cookie)).cookie).toBeUndefined();
});
it('keeps CSRF, fresh MFA and staff/member principal separation enforced',async()=>{
  const staff=await open(),member=await open(true);
  const path=`${base}/api/v1/staff/${fixture.staffId}/revocations`;
  const headers={Cookie:staff.cookie!,Origin:base,'Content-Type':'application/json','If-Match':'"1"','Idempotency-Key':randomUUID()};
  const noCsrf=await fetch(path,{method:'POST',headers,body:JSON.stringify({reason:'Fictional check'})});
  expect(await noCsrf.json()).toMatchObject({error:{code:'csrf_failed'}});
  const noMfa=await fetch(path,{method:'POST',headers:{...headers,'X-CSRF-Token':staff.body.csrfToken},body:JSON.stringify({reason:'Fictional check'})});
  expect(await noMfa.json()).toMatchObject({error:{code:'fresh_mfa_required'}});
  expect((await fetch(`${base}/api/v1/member/me`,{headers:{Cookie:staff.cookie!.replace('agap_session=','agap_member_session=')}})).status).toBe(401);
  expect((await fetch(`${base}/api/v1/staff`,{headers:{Cookie:member.cookie!.replace('agap_member_session=','agap_session=')}})).status).toBe(401);
});
it('refuses presentation cookies immediately when the switch is disabled',async()=>{
  const staff=await open(),member=await open(true);
  current.LOCAL_PRESENTATION_MODE=false;
  for(const result of [await open(false,staff.cookie),await open(true,member.cookie)]){expect(result.response.status).toBe(401);expect(result.cookie).toBeUndefined();expect(result.response.headers.get('X-AGAP-Presentation')).toBeNull();}
});
it('renews expired presentation sessions without giving them MFA',async()=>{
  const staff=await open(),member=await open(true);
  await owner.query("UPDATE identity.sessions SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE user_id=$1",[fixture.staffId]);
  await owner.query("UPDATE identity.member_sessions SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE link_id=$1",[fixture.linkId]);
  for(const result of [await open(false,staff.cookie),await open(true,member.cookie)]){expect(result.response.status).toBe(200);expect(result.cookie).toBeTruthy();}
});
it('does not provision missing identities or reactivate revoked staff/member access',async()=>{
  const staff=await open(),member=await open(true);
  await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[fixture.staffId]);
  await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1',[fixture.linkId]);
  for(const result of [await open(false,staff.cookie),await open(true,member.cookie)]){expect(result.response.status).toBe(503);expect(result.cookie).toBeUndefined();expect(result.body).toMatchObject({error:{code:'presentation_unavailable'}});}
  expect((await owner.query('SELECT active FROM identity.staff_users WHERE id=$1',[fixture.staffId])).rows[0].active).toBe(false);
  expect((await owner.query('SELECT active FROM identity.member_links WHERE id=$1',[fixture.linkId])).rows[0].active).toBe(false);
});
it('rejects foreign session-read origins without creating any presentation sessions',async()=>{
  const response=await fetch(`${base}/api/v1/session`,{headers:{Origin:'https://example.invalid'}});
  expect(response.status).toBe(403);expect(response.headers.getSetCookie()).toEqual([]);
  expect((await owner.query('SELECT count(*) FROM identity.sessions WHERE user_id=$1',[fixture.staffId])).rows[0].count).toBe('0');
});
it('keeps missing fictional fixtures unavailable instead of provisioning them',async()=>{
  await owner.query('DELETE FROM identity.staff_users WHERE id=$1',[fixture.staffId]);
  await owner.query('DELETE FROM identity.member_link_events WHERE link_id=$1',[fixture.linkId]);
  await owner.query('DELETE FROM identity.member_links WHERE id=$1',[fixture.linkId]);
  for(const result of [await open(),await open(true)]){expect(result.response.status).toBe(503);expect(result.cookie).toBeUndefined();}
});
});
