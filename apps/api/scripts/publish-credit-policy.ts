import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { WorkflowPolicy } from '../../../packages/contracts/src/workflow.js';
import { Id } from '../../../packages/contracts/src/schemas.js';
import { lendingLockSql } from '../src/platform/lending-transaction.js';
import { createPool } from '../src/platform/database.js';
const [path,digest,organizationId]=process.argv.slice(2);
if(!path||!digest||!organizationId||!process.env.MIGRATION_DATABASE_URL)throw new Error('Usage: policy:publish file expected-sha256 organization-id, with operator MIGRATION_DATABASE_URL.');
Id.parse(organizationId);const bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==digest)throw new Error('Policy checksum mismatch.');
const policy=WorkflowPolicy.parse(JSON.parse(bytes.toString()));
if(policy.status==='approved'&&!policy.approvalReference)throw new Error('An actual institutional approval reference is required.');
if(policy.status==='fictional'&&process.env.NODE_ENV==='production')throw new Error('Fictional rules cannot configure production.');
if(policy.effectiveFrom>policy.effectiveThrough)throw new Error('Invalid policy validity dates.');
for(const o of policy.offers){if(new Set(o.payments.map(p=>p.date)).size!==o.payments.length||o.payments.some((p,i)=>i>0&&p.date<=o.payments[i-1].date))throw new Error('Schedules require distinct ordered dates.');if(o.separateFees.reduce((n,f)=>n+BigInt(f.amountCentavos),0n)!==BigInt(o.feesPaidSeparatelyCentavos))throw new Error('Explicit fee dates/amounts must match the declared separate total.');}
const pool=createPool(process.env.MIGRATION_DATABASE_URL),client=await pool.connect();try{await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');await client.query("SET LOCAL lock_timeout='5s'");await client.query(lendingLockSql,[organizationId]);await client.query("SELECT set_config('agap.organization_id',$1,true),set_config('agap.member_id','',true)",[organizationId]);await client.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[policy.id,organizationId,JSON.stringify(policy)]);await client.query('COMMIT');console.log(JSON.stringify({policyId:policy.id,sha256:digest,status:policy.status}));}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
