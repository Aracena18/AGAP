import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { DocumentStorePort } from '../../../../../packages/contracts/src/ports.js';
import { WorkflowDraft } from '../../../../../packages/contracts/src/workflow.js';
import type { ExtractionAdapter } from '../ai/qwen-adapter.js';
import type { Scanner, TextExtractor } from './document-processing.js';
import { MATERIAL_LOCK_SQL, materialLockKey } from '../../platform/material-guard.js';
export class EvidenceWorker {
  constructor(private readonly pool:Pool,private readonly org:string,private readonly store:DocumentStorePort,private readonly scanner:Scanner,private readonly extractor:TextExtractor,private readonly ai:ExtractionAdapter|null){}
  private async tx<T>(work:(client:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SELECT set_config('agap.organization_id',$1,true),set_config('statement_timeout','10000',true)",[this.org]);await c.query("SELECT set_config('agap.branch_ids',evidence.worker_branches()::text,true)");await c.query(MATERIAL_LOCK_SQL,[materialLockKey(this.org)]);const r=await work(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
  async tick(){
    const token=randomUUID();
    const job=await this.tx(async c=>{
      const row=(await c.query("SELECT * FROM platform.jobs WHERE organization_id=$1 AND kind='evidence.process' AND completed_at IS NULL AND failed_at IS NULL AND available_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED",[this.org])).rows[0];
      if(!row)return null;
      if(Number(row.attempts)>=5){await c.query("UPDATE platform.jobs SET failed_at=now(),last_error_code='recovery_limit_reached',lease_until=NULL WHERE id=$1",[row.id]);await c.query("UPDATE evidence.processing SET stage='failed',message='Processing retries were exhausted. Use manual entry or contact staff.' WHERE source_id=$1",[(row.payload as {sourceId:string}).sourceId]);return null;}
      await c.query("UPDATE platform.jobs SET lease_token=$2,lease_until=now()+interval '10 minutes',attempts=attempts+1 WHERE id=$1",[row.id,token]);
      return row;
    });
    if(!job)return false;
    const sourceId=(job.payload as {sourceId:string}).sourceId;
    const fenced=async<T>(work:(c:PoolClient)=>Promise<T>)=>this.tx(async c=>{
      const current=await c.query('SELECT id FROM platform.jobs WHERE id=$1 AND organization_id=$2 AND lease_token=$3 AND lease_until>now() AND completed_at IS NULL AND failed_at IS NULL FOR UPDATE',[job.id,this.org,token]);
      if(!current.rowCount)throw new Error('Worker lease lost.');return work(c);
    });
    const heartbeat=setInterval(()=>{void fenced(c=>c.query("UPDATE platform.jobs SET lease_until=now()+interval '10 minutes' WHERE id=$1",[job.id])).catch(()=>undefined);},30000);heartbeat.unref();
    let cleared=false;
    try{
      const source=await fenced(async c=>(await c.query('SELECT * FROM evidence.sources WHERE id=$1 AND organization_id=$2 AND NOT EXISTS(SELECT 1 FROM evidence.retirements r WHERE r.source_id=evidence.sources.id)',[sourceId,this.org])).rows[0]);
      if(!source)throw new Error('Source unavailable.');
      await fenced(c=>c.query("UPDATE evidence.processing SET stage='scanning',message=NULL WHERE source_id=$1",[sourceId]));
      const chunks:Buffer[]=[];let size=0;const hash=createHash('sha256');
      for await(const chunk of await this.store.read(String(source.object_key))){size+=chunk.byteLength;if(size>10485760||size>Number(source.size))throw new Error('Stored file exceeds budget.');chunks.push(Buffer.from(chunk));hash.update(chunk);}
      if(size!==Number(source.size)||hash.digest('hex')!==source.sha256)throw new Error('Stored file integrity mismatch.');
      const bytes=Buffer.concat(chunks),scan=await this.scanner.scan(bytes);
      if(scan==='blocked'){
        await fenced(async c=>{await c.query("UPDATE evidence.processing SET state='blocked',stage='failed',message='File blocked by content inspection. Please provide an approved alternative.' WHERE source_id=$1",[sourceId]);await c.query("UPDATE platform.jobs SET failed_at=now(),last_error_code='file_blocked',lease_until=NULL WHERE id=$1",[job.id]);});return true;
      }
      await fenced(c=>c.query("UPDATE evidence.processing SET stage='extracting',message=NULL WHERE source_id=$1",[sourceId]));
      const pages=await this.extractor.extract(bytes,String(source.media_type));
      if(!pages.length||pages.length>20||pages.some((p,i)=>p.page!==i+1||p.text.length>100000))throw new Error('Incomplete extracted pages.');
      cleared=true;
      const textBytes=Buffer.from(JSON.stringify(pages)),textHash=createHash('sha256').update(textBytes).digest('hex');
      const textVersion=await fenced(async c=>{await c.query('INSERT INTO evidence.text_versions(id,organization_id,application_id,source_id,source_version,sha256,object_key,size,page_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(organization_id,source_id,sha256) DO NOTHING',[randomUUID(),this.org,source.application_id,sourceId,source.version,textHash,randomUUID(),textBytes.length,pages.length]);return(await c.query('SELECT * FROM evidence.text_versions WHERE source_id=$1 AND sha256=$2',[sourceId,textHash])).rows[0];});
      let stored=false;try{const hash=createHash('sha256');let size=0;for await(const chunk of await this.store.read(String(textVersion.object_key))){size+=chunk.byteLength;if(size>textBytes.length)throw new Error('Derived text integrity failure.');hash.update(chunk);}stored=size===textBytes.length&&hash.digest('hex')===textHash;}catch{/* An interrupted object is retried at its reserved immutable key. */}
      if(!stored){async function* content(){yield textBytes;}await this.store.putQuarantined(content(),textBytes.length,String(textVersion.object_key));}
      await fenced(c=>c.query("UPDATE evidence.processing SET state='cleared',stage=$2,pages=$3,text_sha256=$4,message=$5,text_version_id=$6 WHERE source_id=$1",[sourceId,this.ai?'ai':'manual',JSON.stringify(pages),textHash,this.ai?null:'AI is unavailable. You can enter and confirm information manually.',textVersion.id]));
      if(this.ai){
        const findings=await this.ai.extract(pages,AbortSignal.timeout(300000));
        await fenced(async c=>{
          for(const finding of findings){
            const page=pages.find(p=>p.page===finding.page);
            if(!page?.text.includes(finding.excerpt))throw new Error('Unsupported source citation.');
            const draft=WorkflowDraft.parse({id:randomUUID(),textVersionId:textVersion.id,origin:this.ai!.origin,source:{sourceId,sourceVersion:Number(source.version),page:finding.page,excerpt:finding.excerpt},suggestion:{...finding.fact,factId:null,sourceId,sourceVersion:Number(source.version),statement:null},provenance:this.ai!.provenance,state:'suggested'});
            await c.query('INSERT INTO evidence.drafts(id,organization_id,application_id,source_id,body,text_sha256) VALUES($1,$2,$3,$4,$5,$6)',[draft.id,this.org,source.application_id,sourceId,JSON.stringify(draft),textHash]);
          }
          await c.query("UPDATE evidence.processing SET stage='available',message=NULL WHERE source_id=$1",[sourceId]);
          await c.query('UPDATE platform.jobs SET completed_at=now(),lease_until=NULL,last_error_code=NULL WHERE id=$1',[job.id]);
        });
      }
      if(!this.ai)await fenced(c=>c.query('UPDATE platform.jobs SET completed_at=now(),lease_until=NULL,last_error_code=NULL WHERE id=$1',[job.id]));
    }catch{
      await fenced(async c=>{
        await c.query("UPDATE evidence.processing SET state=$2,stage='failed',message=$3 WHERE source_id=$1",[sourceId,cleared?'cleared':'quarantined',cleared?'Automatic extraction could not complete. Review the original and enter information manually.':'File checks are unavailable. The file remains quarantined; contact staff.']);
        await c.query("UPDATE platform.jobs SET lease_until=NULL,lease_token=NULL,last_error_code='evidence_processing_failed',available_at=now()+interval '30 seconds',failed_at=CASE WHEN attempts>=5 THEN now() ELSE NULL END WHERE id=$1",[job.id]);
      }).catch(()=>undefined);
    }finally{clearInterval(heartbeat);}
    return true;
  }
}
