import type { INestApplication } from '@nestjs/common';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { createApp } from '../src/app.js';
import { config,owner,prepareDatabase,resetFixtures,closePools } from './database.js';
import { startIdentityFixture } from './oidc-provider.js';
import { memberFixture } from './member-fixtures.js';
let provider:Awaited<ReturnType<typeof startIdentityFixture>>,app:INestApplication,base:string,member:Awaited<ReturnType<typeof memberFixture>>;
beforeAll(async()=>{await prepareDatabase();provider=await startIdentityFixture();const current={...config,OIDC_ISSUER:provider.issuer};app=await createApp(current);await app.listen(0,'127.0.0.1');base=await app.getUrl();current.PUBLIC_ORIGIN=base;});
beforeEach(async()=>{
  const fixture=await resetFixtures();member=await memberFixture(fixture.officer.actor,provider.issuer);await owner.query('DELETE FROM identity.member_sessions');
  provider.behavior.subject=member.subject;provider.behavior.badNonce=false;provider.behavior.badSignature=false;provider.behavior.badIssuer=false;provider.behavior.missingSubject=false;provider.behavior.missingAuthTime=false;provider.behavior.oldAuthTime=false;
});
afterAll(async()=>{await app?.close();await provider?.close();await closePools();});
async function begin(){const login=await fetch(`${base}/api/v1/member/auth/login`,{redirect:'manual'});expect(login.status).toBe(302);const cookie=login.headers.getSetCookie().find(value=>value.startsWith('agap_member_login='))!.split(';')[0];const authorize=await fetch(login.headers.get('location')!,{redirect:'manual'});return {cookie,callback:new URL(authorize.headers.get('location')!)};}
describe('signed member OIDC login',()=>{
  it('creates a separate opaque member session and ignores identity-provider staff-role claims',async()=>{
    const flow=await begin(),result=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});expect(result.status).toBe(302);expect(result.headers.get('location')).toBe(`${base}/#/member`);
    const cookie=result.headers.getSetCookie().find(value=>value.startsWith('agap_member_session='))!;expect(cookie).toContain('HttpOnly');expect(cookie).toContain('SameSite=Lax');expect(cookie).toContain('Path=/api/v1/member');
    const session=await fetch(`${base}/api/v1/member/session`,{headers:{Cookie:cookie.split(';')[0]}});expect(session.status).toBe(200);expect(await session.json()).toMatchObject({principal:{kind:'member',memberId:member.record.id}});
    expect((await fetch(`${base}/api/v1/session`,{headers:{Cookie:cookie.split(';')[0]}})).status).toBe(401);
    const row=(await owner.query('SELECT token_hash FROM identity.member_sessions')).rows[0];expect(row.token_hash).not.toBe(cookie.split(';')[0].split('=')[1]);
    const replay=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});expect(replay.headers.get('location')).toBe(`${base}/#/member?signin=retry`);expect((await owner.query('SELECT count(*) FROM identity.member_sessions')).rows[0].count).toBe('1');
  });
  it('does not consume member state through the staff callback or grant staff access',async()=>{
    const flow=await begin(),staffCallback=new URL(flow.callback);staffCallback.pathname='/api/v1/auth/callback';
    const wrong=await fetch(staffCallback,{headers:{Cookie:flow.cookie.replace('agap_member_login=','agap_login=')},redirect:'manual'});expect(wrong.status).toBe(401);
    const correct=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});expect(correct.headers.get('location')).toBe(`${base}/#/member`);expect((await owner.query('SELECT count(*) FROM identity.member_sessions')).rows[0].count).toBe('1');
  });
  it.each(['badNonce','badSignature','badIssuer','missingSubject','missingAuthTime','oldAuthTime'] as const)('rejects %s without issuing a member session',async option=>{
    provider.behavior[option]=true;const flow=await begin(),result=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});expect(result.headers.get('location')).toBe(`${base}/#/member?signin=retry`);expect((await owner.query('SELECT count(*) FROM identity.member_sessions')).rows[0].count).toBe('0');
  });
  it('returns an actionable sign-in page for an unlinked or revoked identity',async()=>{
    provider.behavior.subject='fictional-unlinked-subject';const flow=await begin();const result=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});expect(result.headers.get('location')).toBe(`${base}/#/member?signin=access`);expect((await owner.query('SELECT count(*) FROM identity.member_sessions')).rows[0].count).toBe('0');
  });
});
