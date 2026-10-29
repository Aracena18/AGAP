import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { config,owner,prepareDatabase,resetFixtures,closePools } from './database.js';
import { startIdentityFixture } from './oidc-provider.js';

let provider:Awaited<ReturnType<typeof startIdentityFixture>>,app:INestApplication,base:string,fixture:Awaited<ReturnType<typeof resetFixtures>>;
beforeAll(async()=>{await prepareDatabase();provider=await startIdentityFixture();const identityConfig={...config,OIDC_ISSUER:provider.issuer};app=await createApp(identityConfig);await app.listen(0,'127.0.0.1');base=await app.getUrl();identityConfig.PUBLIC_ORIGIN=base;});
beforeEach(async()=>{fixture=await resetFixtures();provider.behavior.subject=fixture.officer.actor.userId;provider.behavior.badNonce=false;provider.behavior.badSignature=false;provider.behavior.badIssuer=false;provider.behavior.missingSubject=false;provider.behavior.missingAuthTime=false;provider.behavior.oldAuthTime=false;await owner.query('UPDATE identity.staff_users SET issuer=$1 WHERE id=$2',[provider.issuer,fixture.officer.actor.userId]);await owner.query('DELETE FROM identity.sessions');});
afterAll(async()=>{await app?.close();await provider?.close();await closePools();});
async function begin(){
  const login=await fetch(`${base}/api/v1/auth/login`,{redirect:'manual'});expect(login.status).toBe(302);
  const cookie=login.headers.getSetCookie().find(value=>value.startsWith('agap_login='))!.split(';')[0];
  const authorize=await fetch(login.headers.get('Location')!,{redirect:'manual'});expect(authorize.status).toBe(302);
  return {cookie,callback:new URL(authorize.headers.get('Location')!)};
}
describe('OIDC code flow with signed ID tokens and real server sessions',()=>{
  it('binds state/nonce/PKCE, rotates into a cookie session and ignores provider role/org claims',async()=>{
    const flow=await begin();const callback=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});
    expect(callback.status).toBe(302);expect(callback.headers.get('Location')).toBe(`${base}/#/staff`);
    const cookie=callback.headers.getSetCookie().find(value=>value.startsWith('agap_session='))!;
    expect(cookie).toContain('HttpOnly');expect(cookie).toContain('SameSite=Lax');
    const session=await fetch(`${base}/api/v1/session`,{headers:{Cookie:cookie.split(';')[0]}});expect(session.status).toBe(200);
    expect(await session.json()).toMatchObject({user:{id:fixture.officer.actor.userId,organizationId:fixture.org,roles:['officer']}});
    const db=(await owner.query('SELECT token_hash FROM identity.sessions')).rows[0];
    expect(db.token_hash).not.toBe(cookie.split(';')[0].split('=')[1]);
    const replay=await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'});expect(replay.status).toBe(401);
  });
  it('rejects an authorization callback not bound to this browser',async()=>{
    const flow=await begin();expect((await fetch(flow.callback,{redirect:'manual'})).status).toBe(401);
  });
  it('rejects altered state and expires the one-use sign-in',async()=>{
    const flow=await begin();flow.callback.searchParams.set('state','attacker-state');
    expect((await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'})).status).toBe(401);
    expect((await owner.query('SELECT count(*) FROM identity.sessions')).rows[0].count).toBe('0');
  });
  it.each(['badNonce','badSignature','badIssuer','missingSubject','missingAuthTime','oldAuthTime'] as const)('rejects %s without issuing a staff session',async option=>{
    provider.behavior[option]=true;const flow=await begin();
    expect((await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'})).status).toBe(401);
    expect((await owner.query('SELECT count(*) FROM identity.sessions')).rows[0].count).toBe('0');
  });
  it('does not provision unknown identities or assign roles from ID-token claims',async()=>{
    provider.behavior.subject='unknown-subject';const flow=await begin();
    expect((await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'})).status).toBe(403);
    expect((await owner.query('SELECT count(*) FROM identity.sessions')).rows[0].count).toBe('0');
  });
  it('rejects expired server-side state even when the callback code looks valid',async()=>{
    const flow=await begin();await owner.query("UPDATE identity.oauth_states SET expires_at=now()-interval '1 minute'");
    expect((await fetch(flow.callback,{headers:{Cookie:flow.cookie},redirect:'manual'})).status).toBe(401);
  });
});
