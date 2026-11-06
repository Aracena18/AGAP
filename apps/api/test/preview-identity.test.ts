import { memberFixture } from './member-fixtures.js';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { createApp } from '../src/app.js';
import { config,owner,prepareDatabase,resetFixtures,closePools } from './database.js';
import { startIdentityFixture } from './oidc-provider.js';

let provider:Awaited<ReturnType<typeof startIdentityFixture>>,app:INestApplication,base:string,fixture:Awaited<ReturnType<typeof resetFixtures>>;
beforeAll(async()=>{await prepareDatabase();provider=await startIdentityFixture();const current={...config,NODE_ENV:'development' as const,LOCAL_PREVIEW_PASSWORD_ONLY:true,OIDC_ISSUER:provider.issuer};app=await createApp(current);await app.listen(0,'127.0.0.1');base=await app.getUrl();current.PUBLIC_ORIGIN=base;});
beforeEach(async()=>{fixture=await resetFixtures();provider.behavior.subject=fixture.administrator.actor.userId;provider.behavior.acr=undefined;await owner.query('UPDATE identity.staff_users SET issuer=$1 WHERE id=$2',[provider.issuer,fixture.administrator.actor.userId]);await owner.query('DELETE FROM identity.sessions');});
afterAll(async()=>{await app?.close();await provider?.close();await closePools();});
async function begin(query='returnTo=%2Fapplications'){
  const login=await fetch(`${base}/api/v1/auth/login?${query}`,{redirect:'manual'});expect(login.status).toBe(302);
  const authorization=new URL(login.headers.get('location')!),cookie=login.headers.getSetCookie().find(value=>value.startsWith('agap_login='))!.split(';')[0];
  const authorized=await fetch(authorization,{redirect:'manual'});return {authorization,cookie,callback:new URL(authorized.headers.get('location')!)};
}
async function complete(flow:Awaited<ReturnType<typeof begin>>,previous=''){
  const response=await fetch(flow.callback,{headers:{Cookie:`${flow.cookie}${previous?`; ${previous}`:''}`},redirect:'manual'});
  return {response,cookie:response.headers.getSetCookie().find(value=>value.startsWith('agap_session='))?.split(';')[0]};
}
async function revoke(cookie:string){
  const session=await (await fetch(`${base}/api/v1/session`,{headers:{Cookie:cookie}})).json();
  return fetch(`${base}/api/v1/staff/${fixture.revocationTarget.actor.userId}/revocations`,{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':session.csrfToken,'If-Match':'"1"','Idempotency-Key':randomUUID()},body:JSON.stringify({reason:'Fictional preview assurance test'})});
}
describe('guarded password-only staff preview and explicit MFA step-up',()=>{
  it('binds the preview client, saved return route and signed single-factor session without granting MFA',async()=>{
    const flow=await begin('returnTo=%2Fapplications%2FAG-001%2Fevidence%23source-payslip');
    expect(flow.authorization.searchParams.get('client_id')).toBe('agap-local-preview');expect(flow.authorization.searchParams.get('acr_values')).toBe('1');
    expect((await owner.query('SELECT requested_acr,return_path FROM identity.oauth_states')).rows[0]).toEqual({requested_acr:'1',return_path:'/applications/AG-001/evidence#source-payslip'});
    const result=await complete(flow);expect(result.response.status).toBe(302);expect(result.response.headers.get('location')).toBe(`${base}/#/applications/AG-001/evidence#source-payslip`);
    expect((await owner.query('SELECT methods FROM identity.sessions')).rows[0].methods).toEqual(['single_factor']);
    const denied=await revoke(result.cookie!);expect(denied.status).toBe(403);expect(await denied.json()).toMatchObject({error:{code:'fresh_mfa_required'}});
    expect((await owner.query('SELECT active FROM identity.staff_users WHERE id=$1',[fixture.revocationTarget.actor.userId])).rows[0].active).toBe(true);
  });
  it('requires an actual signed MFA response, rotates the session and authorizes only an explicit subsequent action',async()=>{
    const first=await complete(await begin()),flow=await begin('assurance=mfa&returnTo=%2Fstaff%2Faccess');
    expect(flow.authorization.searchParams.get('acr_values')).toBe('2');
    const result=await complete(flow,first.cookie!);expect(result.response.headers.get('location')).toBe(`${base}/#/staff/access`);
    expect((await fetch(`${base}/api/v1/session`,{headers:{Cookie:first.cookie!}})).status).toBe(401);
    expect((await owner.query('SELECT methods FROM identity.sessions')).rows).toEqual([{methods:['mfa']}]);
    expect((await owner.query('SELECT active FROM identity.staff_users WHERE id=$1',[fixture.revocationTarget.actor.userId])).rows[0].active).toBe(true);
    expect((await revoke(result.cookie!)).status).toBe(201);
  });
  it.each(['1',null] as const)('rejects a downgraded or missing assurance (%s) for MFA state',async acr=>{
    provider.behavior.acr=acr;const result=await complete(await begin('assurance=mfa&returnTo=%2Fstaff'));
    expect(result.response.status).toBe(302);expect(result.response.headers.get('location')).toBe(`${base}/#/staff?signin=verification&assurance=mfa`);expect(result.cookie).toBeUndefined();expect((await owner.query('SELECT count(*) FROM identity.sessions')).rows[0].count).toBe('0');
  });
  it.each(['https://example.invalid','//example.invalid','/member','/staff/../member','/api/v1/session','/staff?next=evil','/staff%5caccess'])('rejects an unsafe or unrelated return route: %s',async path=>{
    const response=await fetch(`${base}/api/v1/auth/login?${new URLSearchParams({returnTo:path})}`,{redirect:'manual'});expect(response.status).toBe(422);
    expect((await owner.query('SELECT count(*) FROM identity.oauth_states')).rows[0].count).toBe('0');
  });
  it('ignores callback navigation/assurance tampering and uses the guarded client for member sign-in',async()=>{
    const flow=await begin();flow.callback.searchParams.set('returnTo','https://example.invalid');flow.callback.searchParams.set('assurance','mfa');
    const result=await complete(flow);expect(result.response.headers.get('location')).toBe(`${base}/#/applications`);expect((await owner.query('SELECT methods FROM identity.sessions')).rows[0].methods).toEqual(['single_factor']);
    const member=await fetch(`${base}/api/v1/member/auth/login`,{redirect:'manual'});expect(new URL(member.headers.get('location')!).searchParams.get('client_id')).toBe('agap-local-preview');
  });
});

it('issues an own-member single-factor session without granting staff access or accepting a missing assurance',async()=>{
 await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,repeat('b',64),$2,now(),ARRAY['mfa'],now()+interval '5 minutes')",[fixture.officer.actor.sessionId,fixture.officer.actor.userId]);
 const member=await memberFixture(fixture.officer.actor,provider.issuer);await owner.query('DELETE FROM identity.sessions');provider.behavior.subject=member.subject;
 async function memberLogin(){const login=await fetch(`${base}/api/v1/member/auth/login`,{redirect:'manual'});expect(login.status).toBe(302);const authorize=new URL(login.headers.get('location')!);expect(authorize.searchParams.get('client_id')).toBe('agap-local-preview');expect(authorize.searchParams.get('acr_values')).toBe('1');const cookie=login.headers.getSetCookie().find(value=>value.startsWith('agap_member_login='))!.split(';')[0];const response=await fetch(authorize,{redirect:'manual'});return {callback:new URL(response.headers.get('location')!),cookie};}
 const flow=await memberLogin(),response=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});expect(response.headers.get('location')).toBe(`${base}/#/member`);const cookie=response.headers.getSetCookie().find(value=>value.startsWith('agap_member_session='))!.split(';')[0];
 const own=await fetch(`${base}/api/v1/member/session`,{headers:{Cookie:cookie}});expect(await own.json()).toMatchObject({principal:{kind:'member',memberId:member.record.id}});expect((await fetch(`${base}/api/v1/session`,{headers:{Cookie:cookie}})).status).toBe(401);
 provider.behavior.acr=null;const missing=await memberLogin(),rejected=await fetch(missing.callback,{headers:{Cookie:missing.cookie},redirect:'manual'});expect(rejected.headers.getSetCookie().some(value=>value.startsWith('agap_member_session='))).toBe(false);
});
