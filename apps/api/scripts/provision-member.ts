import { readFile,stat } from 'node:fs/promises';
import { createPool } from '../src/platform/database.js';
import { loadConfig } from '../src/platform/config.js';
import { changeMemberLink } from '../src/modules/identity/member-provisioning.js';
async function main(){
  const config=loadConfig(),file=process.argv[2];
  if(!file||!process.env.MIGRATION_DATABASE_URL)throw new Error('Private reviewed input and operator credentials required.');
  if(((await stat(file)).mode&0o077)!==0)throw new Error('Private input must have mode 0600.');
  const data:unknown=JSON.parse(await readFile(file,'utf8')),pool=createPool(process.env.MIGRATION_DATABASE_URL);
  try{console.log(JSON.stringify(await changeMemberLink(pool,config.OIDC_ISSUER,data)));}finally{await pool.end();}
}
void main().catch(()=>{console.error('Member linkage change failed. Check the private verified input, trusted issuer, current version and operator credentials.');process.exitCode=1;});
