import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { WorkflowPolicy } from '../../../packages/contracts/src/workflow.js';
import { Id } from '../../../packages/contracts/src/schemas.js';
import { createPool } from '../src/platform/database.js';
import { MATERIAL_LOCK_SQL, materialLockKey } from '../src/platform/material-guard.js';
const [path,digest,organizationId]=process.argv.slice(2);
if(!path||!digest||!organizationId||!process.env.MIGRATION_DATABASE_URL)throw new Error('Usage: policy:publish file expected-sha256 organization-id, with operator MIGRATION_DATABASE_URL.');
Id.parse(organizationId);const bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==digest)throw new Error('Policy checksum mismatch.');
const policy=WorkflowPolicy.parse(JSON.parse(bytes.toString()));
if(policy.status==='approved'&&!policy.approvalReference)throw new Error('An actual institutional approval reference is required.');
if(policy.status==='fictional'&&process.env.NODE_ENV==='production')throw new Error('Fictional rules cannot configure production.');
if(policy.effectiveFrom>policy.effectiveThrough)throw new Error('Invalid policy validity dates.');
for(const o of policy.offers){if(new Set(o.payments.map(p=>p.date)).size!==o.payments.length||o.payments.some((p,i)=>i>0&&p.date<=o.payments[i-1].date))throw new Error('Schedules require distinct ordered dates.');if(o.separateFees.reduce((n,f)=>n+BigInt(f.amountCentavos),0n)!==BigInt(o.feesPaidSeparatelyCentavos))throw new Error('Explicit fee dates/amounts must match the declared separate total.');}
const pool=createPool(process.env.MIGRATION_DATABASE_URL);try{const client=await pool.connect();try{await client.query('BEGIN');await client.query(MATERIAL_LOCK_SQL,[materialLockKey(organizationId)]);await client.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[policy.id,organizationId,JSON.stringify(policy)]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}console.log(JSON.stringify({policyId:policy.id,sha256:digest,status:policy.status}));}finally{await pool.end();}
