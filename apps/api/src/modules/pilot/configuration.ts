import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { z } from 'zod';
import { Id, Text } from '../../../../../packages/contracts/src/common.js';
import { AuthoritySchema } from '../decisions/context.js';
import { FinancialAuthoritySchema } from '../servicing/context.js';
import { PrincipalPolicySchema } from '../servicing/money-context.js';
import { canonical } from '../../platform/commands.js';
export const PilotConfiguration=z.strictObject({format:z.literal('fictional-principal-pilot-v1'),id:Id,organizationId:Id,branchId:Id,
 label:Text,sourcePolicy:z.strictObject({allowStatements:z.boolean(),independentVerificationRequired:z.boolean()}),
 decisionAuthority:AuthoritySchema,financialAuthority:FinancialAuthoritySchema,principalPolicy:PrincipalPolicySchema,
}).superRefine((c,ctx)=>{if(c.decisionAuthority.status!=='configured'||c.financialAuthority.status!=='configured')ctx.addIssue({code:'custom',message:'Explicit fictional decision and financial authority is required.'});if(c.principalPolicy.organizationId!==c.organizationId||c.financialAuthority.status==='configured'&&(c.financialAuthority.organizationId!==c.organizationId||c.financialAuthority.branchId!==c.branchId||c.financialAuthority.productVersionId!==c.principalPolicy.productVersionId))ctx.addIssue({code:'custom',message:'Configuration bindings differ.'});if(c.decisionAuthority.status==='configured'&&c.decisionAuthority.requiredApprovers!==1)ctx.addIssue({code:'custom',message:'This pilot supports one separate reviewer only.'});});
export type PilotConfigurationValue=z.output<typeof PilotConfiguration>;
/** Explicit operator publication; never invoked by application startup. */
export async function publishPilotConfiguration(pool:Pool,input:unknown){const c=PilotConfiguration.parse(input),client=await pool.connect();try{await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`agap.pilot.material:${c.organizationId}`]);await client.query("SELECT set_config('agap.organization_id',$1,true),set_config('agap.branch_ids',$2,true),set_config('agap.member_id','',true)",[c.organizationId,JSON.stringify([c.branchId])]);const body=canonical(c);await client.query('INSERT INTO decisions.pilot_configurations(id,organization_id,branch_id,body,sha256) VALUES($1,$2,$3,$4,$5)',[c.id,c.organizationId,c.branchId,body,createHash('sha256').update(body).digest('hex')]);await client.query('COMMIT');return c.id;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
export async function readPilotConfigurationFile(path:string,expectedSha:string){const bytes=await readFile(path);if(!/^[a-f0-9]{64}$/.test(expectedSha)||createHash('sha256').update(bytes).digest('hex')!==expectedSha)throw new Error('Fictional pilot configuration checksum differs.');return PilotConfiguration.parse(JSON.parse(bytes.toString()));}
