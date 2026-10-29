import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createPool } from '../src/platform/database.js';
import { changeMemberLink } from '../src/modules/identity/member-provisioning.js';
import { loadConfig } from '../src/platform/config.js';
const config=loadConfig();
if(config.NODE_ENV!=='development'||!['localhost','127.0.0.1'].includes(new URL(config.DATABASE_URL).hostname)||new URL(config.DATABASE_URL).pathname!=='/agap')throw new Error('Fictional seed requires the localhost development database named agap.');
if(!process.env.MIGRATION_DATABASE_URL)throw new Error('MIGRATION_DATABASE_URL is required for an operator-only seed.');
const pool=createPool(process.env.MIGRATION_DATABASE_URL),client=await pool.connect();
try{
  const realm=JSON.parse(await readFile('infra/keycloak/agap-realm.json','utf8')) as {users:{id:string;username:string;firstName:string}[]};
  await client.query('BEGIN');
  await client.query("DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='agap_worker_local') THEN CREATE ROLE agap_worker_local LOGIN PASSWORD 'development-worker' NOSUPERUSER NOBYPASSRLS; END IF; END $$; GRANT agap_worker TO agap_worker_local");
  const org='20000000-0000-4000-8000-000000000001',branch='20000000-0000-4000-8000-000000000002';
  await client.query('INSERT INTO platform.organizations(id,name) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[org,'Fictional AGAP Training Cooperative']);
  await client.query('INSERT INTO platform.branches(id,organization_id,name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[branch,org,'Training branch']);
  for(const user of realm.users.filter(user=>user.username!=='member'))await client.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(issuer,subject) DO NOTHING',[randomUUID(),org,config.OIDC_ISSUER,user.id,user.firstName,[branch],[user.username]]);
  const memberId='20000000-0000-4000-8000-000000000003';
  await client.query('INSERT INTO members.members(id,organization_id,branch_id,external_reference,full_name,phone,notice_version) VALUES($1,$2,$3,$4,$5,NULL,$6) ON CONFLICT DO NOTHING',[memberId,org,branch,'FICTIONAL-PORTAL-001','Fictional Portal Member',config.PRIVACY_NOTICE_VERSION]);
  await client.query('COMMIT');
  const memberUser=realm.users.find(user=>user.username==='member');
  if(memberUser&&!(await pool.query('SELECT 1 FROM identity.member_links WHERE issuer=$1 AND subject=$2',[config.OIDC_ISSUER,memberUser.id])).rowCount)await changeMemberLink(pool,config.OIDC_ISSUER,{action:'provision',organizationId:org,branchId:branch,memberId,issuer:config.OIDC_ISSUER,subject:memberUser.id,verificationReference:'FICTIONAL-MEMBERSHIP-001',operatorReference:'FICTIONAL-LOCAL-SEED',reason:'Explicit fictional development account only'});
  console.log('Fictional local organization, staff and member fixtures are seeded. Existing access was not changed.');
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
