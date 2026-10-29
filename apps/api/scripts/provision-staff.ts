import { randomUUID } from 'node:crypto';
import { readFile,stat } from 'node:fs/promises';
import { z } from 'zod';
import { Id,Role,Text } from '../../../packages/contracts/src/schemas.js';
import { createPool } from '../src/platform/database.js';
import { loadConfig } from '../src/platform/config.js';
async function main(){
const config=loadConfig(),file=process.argv[2];
if(!file||!process.env.MIGRATION_DATABASE_URL)throw new Error('Provide a private reviewed JSON input file and operator-only MIGRATION_DATABASE_URL.');
if(((await stat(file)).mode&0o077)!==0)throw new Error('Staff provisioning input must have mode 0600.');
const unique=<T,>(items:T[])=>new Set(items).size===items.length;
const input=z.strictObject({organizationId:Id,issuer:z.url(),subject:Text,displayName:Text,branchIds:z.array(Id).min(1).refine(unique),roles:z.array(Role).min(1).refine(unique),operatorReference:Text,reason:Text}).parse(JSON.parse(await readFile(file,'utf8')));
if(input.issuer!==config.OIDC_ISSUER)throw new Error('Identity issuer must match the configured trusted issuer.');
const pool=createPool(process.env.MIGRATION_DATABASE_URL),client=await pool.connect();
try{
  await client.query('BEGIN');
  const branches=await client.query('SELECT id FROM platform.branches WHERE organization_id=$1 AND id=ANY($2::uuid[]) FOR SHARE',[input.organizationId,input.branchIds]);
  if(branches.rowCount!==input.branchIds.length)throw new Error('Every branch must belong to the selected organization.');
  const id=randomUUID();
  await client.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,input.organizationId,input.issuer,input.subject,input.displayName,input.branchIds,input.roles]);
  await client.query('INSERT INTO identity.staff_provisionings(id,organization_id,staff_id,operator_reference,reason,snapshot) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),input.organizationId,id,input.operatorReference,input.reason,JSON.stringify(input)]);
  await client.query('COMMIT');console.log(JSON.stringify({state:'staff_provisioned',staffId:id}));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}

}
void main().catch(()=>{console.error('Staff provisioning failed. Check the private reviewed input, branch scope, trusted identity and operator credentials. No existing access was changed.');process.exitCode=1;});
