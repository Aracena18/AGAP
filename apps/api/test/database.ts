import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, PostgresUnitOfWork } from '../src/platform/database.js';
import { migrate } from '../src/platform/migrate.js';
import { tokenHash } from '../src/modules/identity/identity.service.js';
import { loadConfig } from '../src/platform/config.js';
import type { ActorContext } from '../../../packages/contracts/src/ports.js';

export const ownerUrl = process.env.AGAP_TEST_DATABASE_URL ?? 'postgresql://agap_owner:development-owner@127.0.0.1:55433/agap_test';
const testDatabase=new URL(ownerUrl);
if (testDatabase.pathname !== '/agap_test'||!['127.0.0.1','localhost'].includes(testDatabase.hostname)||testDatabase.username!=='agap_owner'||testDatabase.password!=='development-owner') throw new Error('Destructive fixtures require the localhost fictional agap_test database and public development-only credentials.');
const runtime = new URL(ownerUrl); runtime.username='agap_runtime';runtime.password='development-runtime';
const identity = new URL(ownerUrl); identity.username='agap_identity';identity.password='development-identity';
export const owner = createPool(ownerUrl);
export const runtimePool = createPool(runtime.href);
export const identityPool = createPool(identity.href);
export const uow = new PostgresUnitOfWork(runtimePool);
export const config = loadConfig({NODE_ENV:'test',DATABASE_URL:runtime.href,IDENTITY_DATABASE_URL:identity.href,PUBLIC_ORIGIN:'http://127.0.0.1:5174',SESSION_SECRET:'fictional-test-secret-with-more-than-32-characters',OIDC_CLIENT_SECRET:'fictional-development-client'});
export async function prepareDatabase() { await migrate(owner); }
export async function resetFixtures() {
  await owner.query('TRUNCATE platform.organizations CASCADE');
  await owner.query('TRUNCATE identity.oauth_states');
  const org=randomUUID(),otherOrg=randomUUID(),branch=randomUUID(),otherBranch=randomUUID(),secondBranch=randomUUID();
  await owner.query('INSERT INTO platform.organizations VALUES($1,$2),($3,$4)',[org,'Fictional cooperative',otherOrg,'Other fictional cooperative']);
  await owner.query('INSERT INTO platform.branches VALUES($1,$2,$3),($4,$5,$6),($7,$2,$8)',[branch,org,'Main',otherBranch,otherOrg,'Other',secondBranch,'Second']);
  async function staff(organizationId: string,branchId: string,roles: string[],displayName:string) {
    const userId=randomUUID(),sessionId=randomUUID(),token=randomBytes(32).toString('base64url');
    await owner.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$4,$5,$6,$7)',[userId,organizationId,config.OIDC_ISSUER,userId,displayName,[branchId],roles]);
    await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,now(),$4,now()+interval '30 minutes')",[sessionId,tokenHash(token),userId,['mfa']]);
    const actor:ActorContext={userId,organizationId,branchIds:[branchId],roles:roles as ActorContext['roles'],sessionId,authenticatedAt:new Date(),authenticationMethods:['mfa'],correlationId:randomUUID()};
    return {actor,token};
  }
  return {org,otherOrg,branch,otherBranch,secondBranch,officer:await staff(org,branch,['officer'],'Fictional Officer'),auditor:await staff(org,branch,['auditor'],'Fictional Auditor'),other:await staff(otherOrg,otherBranch,['officer'],'Other Officer'),administrator:await staff(org,branch,['administrator'],'Fictional Administrator'),revocationTarget:await staff(org,branch,['verifier'],'Fictional Verifier')};
}
export async function closePools(){await Promise.all([owner.end(),runtimePool.end(),identityPool.end()]);}
