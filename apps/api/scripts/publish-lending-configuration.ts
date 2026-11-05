import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPool } from '../src/platform/database.js';
import { lendingLockSql } from '../src/platform/lending-transaction.js';
import { LendingConfigurationSchema } from '../src/modules/decisions/lending-configuration.js';

const [file,expectedSha256]=process.argv.slice(2);
if(!file||!expectedSha256||!process.env.MIGRATION_DATABASE_URL)throw new Error('Provide a reviewed fictional configuration file, its SHA256 and operator-only MIGRATION_DATABASE_URL.');
if(process.env.NODE_ENV==='production'||process.env.EVIDENCE_RECORD_MODE==='real')throw new Error('This configuration format permits fictional development only.');
const bytes=await readFile(file);
if(createHash('sha256').update(bytes).digest('hex')!==expectedSha256)throw new Error('Configuration checksum mismatch.');
const data=LendingConfigurationSchema.parse(JSON.parse(bytes.toString('utf8'))),pool=createPool(process.env.MIGRATION_DATABASE_URL),client=await pool.connect();
try {
  await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');await client.query("SET LOCAL lock_timeout='5s'");await client.query(lendingLockSql,[data.organizationId]);
  await client.query("SELECT set_config('agap.organization_id',$1,true),set_config('agap.branch_ids',$2,true),set_config('agap.member_id','',true)",[data.organizationId,JSON.stringify([data.branchId])]);
  if(data.authority.status!=='configured'||data.financialAuthority.status!=='configured')throw new Error('Explicit authority required.');
  const users=(await client.query('SELECT id,roles,branch_ids,active FROM identity.staff_users WHERE organization_id=$1 AND id=ANY($2::uuid[]) FOR SHARE',
    [data.organizationId,[...new Set([...data.authority.grants,...data.financialAuthority.grants].map(g=>g.userId))]])).rows;
  for(const grant of data.authority.grants)
    if(!users.some(u=>u.id===grant.userId&&u.active&&(u.branch_ids as string[]).includes(data.branchId)&&(u.roles as string[]).includes('reviewer')))throw new Error('Each lending grant requires an actual active reviewer in this branch.');
  for(const grant of data.financialAuthority.grants)
    if(!users.some(u=>u.id===grant.userId&&u.active&&(u.branch_ids as string[]).includes(data.branchId)
      &&(!grant.actions.includes('prepare')||(u.roles as string[]).includes('cashier'))
      &&(!grant.actions.includes('authorize')||(u.roles as string[]).includes('financial_authorizer'))
      &&(u.roles as string[]).some(r=>r==='cashier'||r==='financial_authorizer')))throw new Error('Each financial grant requires its actual scoped financial role.');
  const accounts=(await client.query('SELECT id,active,currency FROM accounting.accounts WHERE organization_id=$1 AND id=ANY($2::uuid[]) FOR SHARE',
    [data.organizationId,[data.principalPolicy.cashAccountId,data.principalPolicy.principalAccountId]])).rows;
  if(accounts.length!==2||accounts.some(a=>!a.active||a.currency!=='PHP'))throw new Error('Configure both active PHP ledger accounts before publishing.');
  await client.query('INSERT INTO decisions.lending_configurations(id,organization_id,branch_id,product_version_id,body) VALUES($1,$2,$3,$4,$5)',
    [data.id,data.organizationId,data.branchId,data.productVersionId,JSON.stringify(data)]);
  await client.query('COMMIT');
  console.log(JSON.stringify({configurationId:data.id,status:'fictional',sha256:expectedSha256,realExecutionEnabled:false}));
} catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();await pool.end();}
