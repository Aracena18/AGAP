import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import * as oidc from 'openid-client';
import { z } from 'zod';
import { Role } from '../../../../../packages/contracts/src/schemas.js';
import type { ActorContext,MemberActorContext } from '../../../../../packages/contracts/src/ports.js';
import type { Config } from '../../platform/config.js';
import { ApiError } from '../../platform/errors.js';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const opaque = () => randomBytes(32).toString('base64url');
export function cookieValue(header: string | undefined, name: string, presentation=false): string | undefined {
  const matches = (header ?? '').split(';').map(item => item.trim()).filter(item => item.startsWith(`${name}=`));
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value)||presentation&&/^presentation\.[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
export function requireRoles(actor: ActorContext, allowed: readonly string[]) {
  if (!actor.roles.some(role => allowed.includes(role))) throw new ApiError(403,'forbidden','Your current role does not permit this action.');
}
export function requireFreshMfa(actor: ActorContext) {
  const age=Date.now()-actor.authenticatedAt.getTime();
  if (!actor.authenticationMethods.includes('mfa') || age< -60_000 || age > 15 * 60_000) throw new ApiError(403,'fresh_mfa_required','Sign in with multi-factor authentication again before authorizing this action.');
}
/** Browser recovery metadata comes only from the saved, allowlisted login state. */
export class LoginRecoveryError extends ApiError {
  constructor(status:number,code:string,message:string,readonly returnTo='/staff',readonly requireMfa=false){super(status,code,message);}
}
export class IdentityService {
  private discoveries=new Map<string,Promise<oidc.Configuration>>();
  constructor(private readonly pool: Pool, private readonly config: Config) {}
  private configuration(audience:'staff'|'member') {
    const preview=audience==='staff'&&this.config.LOCAL_PREVIEW_PASSWORD_ONLY;
    const id=preview?'agap-local-preview':this.config.OIDC_CLIENT_ID;
    let discovery=this.discoveries.get(id);
    if(!discovery){
      discovery=oidc.discovery(new URL(this.config.OIDC_ISSUER),id,preview?'fictional-preview-development-client':this.config.OIDC_CLIENT_SECRET,undefined,{
        timeout:5,execute:this.config.NODE_ENV==='production'?[oidc.enableNonRepudiationChecks]:[oidc.allowInsecureRequests,oidc.enableNonRepudiationChecks],
      }).catch(error=>{this.discoveries.delete(id);throw error;});
      this.discoveries.set(id,discovery);
    }
    return discovery;
  }
  async beginLogin(audience:'staff'|'member'='staff',input:unknown={}): Promise<{ cookie: string; url: string }> {
    const options=z.strictObject({assurance:z.literal('mfa').optional(),returnTo:z.string().max(240).optional()}).parse(input);
    const returnTo=audience==='member'?'/member':options.returnTo??'/staff';
    if(audience==='staff'&&!/^\/(?:staff(?:\/(?:members|applications(?:\/[0-9a-f-]{36}\/(?:evidence|review|lifecycle))?|review-queue|review-notices|money|support-requests|reconciliations|access))?|applications(?:\/[A-Za-z0-9_-]{1,80}\/(?:evidence|comparison|decision))?)(?:#source-[A-Za-z0-9_-]{1,80})?$/.test(returnTo))throw new ApiError(422,'invalid_return_path','Choose a staff or review page.');
    const requiredAcr=audience==='staff'?(this.config.LOCAL_PREVIEW_PASSWORD_ONLY&&options.assurance!=='mfa'?'1':'2'):null;
    let client:oidc.Configuration;
    try{client=await this.configuration(audience);}catch{throw new ApiError(503,'identity_unavailable','Sign-in is temporarily unavailable. Try again shortly.');}
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const cookie = opaque();
    const url = oidc.buildAuthorizationUrl(client, {
      redirect_uri: `${this.config.PUBLIC_ORIGIN}/api/v1/${audience==='member'?'member/':''}auth/callback`, scope: 'openid', state, nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', max_age: '0',
      ...(requiredAcr?{acr_values:requiredAcr,claims:JSON.stringify({id_token:{acr:{essential:true,values:[requiredAcr]}}})}:{}),
    });
    await this.pool.query('DELETE FROM identity.oauth_states WHERE expires_at<now()');
    await this.pool.query("INSERT INTO identity.oauth_states(token_hash,state,verifier,nonce,expires_at,audience,requested_acr,return_path) VALUES($1,$2,$3,$4,now()+interval '10 minutes',$5,$6,$7)", [tokenHash(cookie),state,verifier,nonce,audience,requiredAcr,returnTo]);
    return { cookie, url: url.href };
  }
  async finishLogin(cookie: string | undefined, callback: URL, previousSession?: string,audience:'staff'|'member'='staff'): Promise<{token:string;returnTo:string}> {
    if (!cookie) throw new LoginRecoveryError(401,'invalid_login','Start a new sign-in from this browser.');
    const saved = await this.pool.query<{ state: string; verifier: string; nonce: string; requested_acr:string|null;return_path:string }>('DELETE FROM identity.oauth_states WHERE token_hash=$1 AND audience=$2 AND expires_at>now() RETURNING state,verifier,nonce,requested_acr,return_path', [tokenHash(cookie),audience]);
    if (!saved.rows[0]) throw new LoginRecoveryError(401,'invalid_login','The sign-in has expired or was already used. Start again.');
    const failure=(status:number,code:string,message:string)=>new LoginRecoveryError(status,code,message,saved.rows[0].return_path,audience==='staff'&&saved.rows[0].requested_acr==='2');
    let claims: ReturnType<Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>['claims']>;
    try {
      // Request fresh authentication, but allow factor enrollment to finish
      // within the ten-minute, browser-bound login window.
      const response = await oidc.authorizationCodeGrant(await this.configuration(audience), callback, { expectedState: saved.rows[0].state, expectedNonce: saved.rows[0].nonce, pkceCodeVerifier: saved.rows[0].verifier, maxAge: 600 });
      claims = response.claims();
    } catch(error) {
      const reason=error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z_]{1,80}$/.test(error.code)?error.code:'verification_failed';
      process.stderr.write(`${JSON.stringify({level:'warning',code:'identity_response_rejected',reason})}\n`);
      throw failure(401,'invalid_login','The identity response could not be verified. Start a new sign-in.');
    }
    if (!claims || typeof claims.sub !== 'string' || typeof claims.auth_time !== 'number' || !Number.isSafeInteger(claims.auth_time) || claims.auth_time*1000>Date.now()+60_000) throw failure(401,'invalid_login','The identity response is missing required authentication information.');
    if(saved.rows[0].requested_acr==='2'&&claims.acr!=='2'||saved.rows[0].requested_acr==='1'&&!['1','2'].includes(String(claims.acr)))throw failure(401,'assurance_required','Complete the requested sign-in verification.');
    const methods = claims.acr === '2' ? ['mfa'] : ['single_factor'];
    const session = opaque();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if(audience==='member'){
        const link=await client.query<{id:string|null}>('SELECT identity.member_link_for_login($1,$2) AS id',[this.config.OIDC_ISSUER,claims.sub]);
        if(!link.rows[0]?.id)throw failure(403,'member_access_required','This account has no active verified member linkage. Contact the cooperative for enrollment or recovery.');
        if(previousSession)await client.query('DELETE FROM identity.member_sessions WHERE token_hash=$1',[tokenHash(previousSession)]);
        await client.query('INSERT INTO identity.member_sessions(id,token_hash,link_id,authenticated_at,expires_at) VALUES($1,$2,$3,$4,$5)',[randomUUID(),tokenHash(session),link.rows[0].id,new Date(claims.auth_time*1000),new Date(Date.now()+this.config.SESSION_TTL_SECONDS*1000)]);
      }else{
        const staff = await client.query<{ id: string }>('SELECT id FROM identity.staff_users WHERE issuer=$1 AND subject=$2 AND active=true FOR SHARE', [this.config.OIDC_ISSUER,claims.sub]);
        if (!staff.rows[0]) throw failure(403,'staff_access_required','This identity has no active cooperative staff account.');
        if (previousSession) await client.query('DELETE FROM identity.sessions WHERE token_hash=$1', [tokenHash(previousSession)]);
        await client.query('INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(),tokenHash(session),staff.rows[0].id,new Date(claims.auth_time * 1000),methods,new Date(Date.now()+this.config.SESSION_TTL_SECONDS*1000)]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    return {token:session,returnTo:saved.rows[0].return_path};
  }
  async authenticate(token: string | undefined, correlationId: string) {
    if (!token||token.startsWith('presentation.')&&!this.config.LOCAL_PRESENTATION_MODE) throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');
    const result = await this.pool.query<{
      id: string; user_id: string; organization_id: string; branch_ids: string[]; roles: string[]; display_name: string; authenticated_at: Date; methods: string[]; expires_at: Date;
    }>('SELECT s.id,s.user_id,u.organization_id,u.branch_ids,u.roles,u.display_name,s.authenticated_at,s.methods,s.expires_at FROM identity.sessions s JOIN identity.staff_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true', [tokenHash(token)]);
    const row = result.rows[0];
    if (!row) throw new ApiError(401,'authentication_required','Your session expired or access changed. Sign in again.');
    const actor: ActorContext = Object.freeze({ userId: row.user_id, organizationId: row.organization_id, branchIds: Object.freeze([...row.branch_ids]), roles: Object.freeze(Role.array().parse(row.roles)), sessionId: row.id, authenticatedAt: row.authenticated_at, authenticationMethods: Object.freeze([...row.methods]), correlationId });
    const branches=await this.pool.query<{id:string;name:string}>('SELECT id,name FROM platform.branches WHERE organization_id=$1 AND id=ANY($2::uuid[]) ORDER BY name',[row.organization_id,row.branch_ids]);
    return { actor, branches:branches.rows, displayName: row.display_name, expiresAt: row.expires_at.toISOString(), csrfToken: this.csrfToken(token) };
  }
  csrfToken(token: string) { return createHmac('sha256',this.config.SESSION_SECRET).update(`csrf:${token}`).digest('base64url'); }
  async authenticateMember(token:string|undefined,correlationId:string){
    if(!token||token.startsWith('presentation.')&&!this.config.LOCAL_PRESENTATION_MODE)throw new ApiError(401,'member_authentication_required','Sign in to your member account.');
    const result=await this.pool.query<{id:string;link_id:string;organization_id:string;member_id:string;expires_at:Date}>('SELECT s.id,s.link_id,l.organization_id,l.member_id,s.expires_at FROM identity.member_sessions s JOIN identity.member_links l ON l.id=s.link_id WHERE s.token_hash=$1 AND s.expires_at>now() AND l.active',[tokenHash(token)]);
    const row=result.rows[0];
    if(!row)throw new ApiError(401,'member_authentication_required','Your session expired or member access changed. Sign in again.');
    const actor:MemberActorContext=Object.freeze({kind:'member',linkId:row.link_id,memberId:row.member_id,organizationId:row.organization_id,sessionId:row.id,correlationId});
    return {actor,expiresAt:row.expires_at.toISOString(),csrfToken:this.csrfToken(token)};
  }
  verifyCsrf(token: string, submitted: unknown, origin: unknown) {
    if (origin !== this.config.PUBLIC_ORIGIN || typeof submitted !== 'string') throw new ApiError(403,'csrf_failed','Reload the workspace and retry this action.');
    const expected = Buffer.from(this.csrfToken(token));
    const actual = Buffer.from(submitted);
    if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw new ApiError(403,'csrf_failed','Reload the workspace and retry this action.');
  }
  async logout(token: string) { await this.pool.query('DELETE FROM identity.sessions WHERE token_hash=$1',[tokenHash(token)]); }
  async logoutMember(token:string){await this.pool.query('DELETE FROM identity.member_sessions WHERE token_hash=$1',[tokenHash(token)]);}
}
