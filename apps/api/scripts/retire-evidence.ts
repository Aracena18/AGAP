import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { Id,Text,Instant } from '../../../packages/contracts/src/schemas.js';
import { createPool } from '../src/platform/database.js';
import { documentStore } from '../src/modules/evidence/configure.js';
const [path,digest,mode='plan']=process.argv.slice(2);
if(!path||!digest||!['plan','execute'].includes(mode)||!process.env.MIGRATION_DATABASE_URL)throw new Error('Usage: evidence:retire manifest.json sha256 [plan|execute] with separate operator credentials.');
const bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==digest)throw new Error('Deletion manifest checksum mismatch.');
const input=z.strictObject({organizationId:Id,policyReference:Text,approvalReference:Text,operatorReference:Text,workerQuiescenceReference:Text,deleteNotBefore:Instant,sourceIds:z.array(Id).min(1).max(1000)}).parse(JSON.parse(bytes.toString()));
if(new Date(input.deleteNotBefore).getTime()>Date.now())throw new Error('Approved retention time has not elapsed.');
const pool=createPool(process.env.MIGRATION_DATABASE_URL),store=await documentStore(process.env,process.env.NODE_ENV==='production');
try{
 for(const id of [...new Set(input.sourceIds)]){
  const c=await pool.connect();let keys:string[]=[];
  try{await c.query('BEGIN');
   const source=(await c.query('SELECT * FROM evidence.sources WHERE id=$1 AND organization_id=$2 FOR UPDATE',[id,input.organizationId])).rows[0];
   if(!source||source.kind!=='document')throw new Error('Manifest contains an unavailable document.');
   if((await c.query('SELECT id FROM evidence.retention_holds WHERE source_id=$1 AND organization_id=$2 AND active FOR UPDATE',[id,input.organizationId])).rowCount)throw new Error('An active retention hold prevents removal.');
   keys=[String(source.object_key),...(await c.query('SELECT object_key FROM evidence.text_versions WHERE source_id=$1 AND organization_id=$2',[id,input.organizationId])).rows.map(r=>String(r.object_key))];
   if(mode==='execute'){
    if((await c.query('SELECT id FROM platform.jobs WHERE id=$1 AND lease_until>now() AND completed_at IS NULL AND failed_at IS NULL FOR UPDATE',[id])).rowCount)throw new Error('Quiesce workers and wait for in-flight processing before deletion.');
    await c.query('INSERT INTO evidence.retirements(source_id,organization_id,application_id,policy_reference,approval_reference,operator_reference,manifest_sha256) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(source_id) DO NOTHING',[id,input.organizationId,source.application_id,input.policyReference,input.approvalReference,input.operatorReference,digest]);
    const record=(await c.query('SELECT manifest_sha256 FROM evidence.retirements WHERE source_id=$1 FOR UPDATE',[id])).rows[0];if(record.manifest_sha256!==digest)throw new Error('A different retention decision is already recorded.');
    await c.query("UPDATE evidence.processing SET pages='[]',stage='manual',state='blocked',message='Unavailable under a recorded retention decision.' WHERE source_id=$1",[id]);
    await c.query("UPDATE platform.jobs SET failed_at=COALESCE(failed_at,now()),last_error_code='evidence_retired',lease_token=NULL,lease_until=NULL WHERE id=$1",[id]);
   }
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  if(mode==='execute'){
   // The committed retirement denies reads before external deletion. Safe to retry after interruption.
   for(const key of keys)try{await store.remove(key);}catch(e){if(!(e&&typeof e==='object'&&'code' in e&&e.code==='ENOENT'))throw e;}
   await pool.query('UPDATE evidence.retirements SET completed_at=COALESCE(completed_at,now()) WHERE source_id=$1 AND manifest_sha256=$2',[id,digest]);
  }
  console.log(JSON.stringify({sourceId:id,mode,objects:keys.length}));
 }
}finally{await pool.end();}
