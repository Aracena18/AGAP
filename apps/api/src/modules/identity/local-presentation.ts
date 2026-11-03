import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { assertLocalPresentation, type Config } from '../../platform/config.js';
import { fictionalScope } from '../../platform/fictional-scope.js';
import { ApiError } from '../../platform/errors.js';
import { tokenHash } from './identity.service.js';

/** Creates only existing fictional identities; it never grants roles or linkage. */
export async function createPresentationSession(pool:Pool, config:Config, audience:'staff'|'member'){
  assertLocalPresentation(config);
  if(!config.LOCAL_PRESENTATION_MODE)throw new ApiError(401,'authentication_required','Sign in to your workspace.');
  const realm=JSON.parse(await readFile('infra/keycloak/agap-realm.json','utf8')) as {displayName:string;users:{id:string;username:string}[]};
  const users=realm.users.filter(user=>user.username===(audience==='staff'?'administrator':'member'));
  if(realm.displayName!=='AGAP fictional training'||users.length!==1)throw new ApiError(503,'presentation_unavailable','The fictional presentation account is unavailable.');
  const token=`presentation.${randomBytes(32).toString('base64url')}`;
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const expiresAt=new Date(Date.now()+config.SESSION_TTL_SECONDS*1000);
    if(audience==='staff'){
      const staff=await client.query<{id:string}>("SELECT id FROM identity.staff_users WHERE issuer=$1 AND subject=$2 AND organization_id=$3 AND branch_ids=$4::uuid[] AND roles=ARRAY['administrator']::text[] AND active FOR SHARE",[config.OIDC_ISSUER,users[0].id,fictionalScope.organizationId,[fictionalScope.branchId]]);
      if(staff.rows.length!==1)throw new ApiError(503,'presentation_unavailable','The fictional staff presentation account is unavailable.');
      await client.query('INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,now(),$4,$5)',[randomUUID(),tokenHash(token),staff.rows[0].id,['local_presentation'],expiresAt]);
    }else{
      const locked=await client.query<{id:string|null}>('SELECT identity.member_link_for_login($1,$2) AS id',[config.OIDC_ISSUER,users[0].id]);
      const links=await client.query<{id:string}>('SELECT id FROM identity.member_links WHERE issuer=$1 AND subject=$2 AND organization_id=$3 AND member_id=$4 AND id=$5 AND active',[config.OIDC_ISSUER,users[0].id,fictionalScope.organizationId,fictionalScope.memberId,locked.rows[0]?.id]);
      if(links.rows.length!==1)throw new ApiError(503,'presentation_unavailable','The fictional member presentation account is unavailable.');
      await client.query('INSERT INTO identity.member_sessions(id,token_hash,link_id,authenticated_at,expires_at) VALUES($1,$2,$3,now(),$4)',[randomUUID(),tokenHash(token),links.rows[0].id,expiresAt]);
    }
    await client.query('COMMIT');
    return token;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
