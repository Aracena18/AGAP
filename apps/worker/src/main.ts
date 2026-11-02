import { setTimeout } from 'node:timers/promises';
import { createPool } from '../../api/src/platform/database.js';
import { EvidenceWorker } from '../../api/src/modules/evidence/processing-worker.js';
import { ClamScanner,NativeTextExtractor } from '../../api/src/modules/evidence/document-processing.js';
import { documentStore,requireRelease } from '../../api/src/modules/evidence/configure.js';
import { QwenAdapter } from '../../api/src/modules/ai/qwen-adapter.js';
import { DatabaseWorker,type WorkHandler } from '../../api/src/platform/worker.js';
if(!process.env.WORKER_DATABASE_URL||!process.env.WORKER_ORGANIZATION_ID)throw new Error('Worker requires dedicated credentials and one explicit organization.');
const pool=createPool(process.env.WORKER_DATABASE_URL);
// Module owners register reviewed consumers here through Robert. Empty is
// deliberate: pending events must never be silently acknowledged.
const handlers=new Map<string,WorkHandler>();
const worker=new DatabaseWorker(pool,process.env.WORKER_ORGANIZATION_ID,handlers);
const privilege=await pool.query<{rolsuper:boolean;rolbypassrls:boolean;safe:boolean}>("SELECT rolsuper,rolbypassrls,pg_has_role(current_user,'agap_worker','MEMBER') AS safe FROM pg_roles WHERE rolname=current_user");
if(privilege.rows[0].rolsuper||privilege.rows[0].rolbypassrls||!privilege.rows[0].safe){await pool.end();throw new Error('Worker requires the constrained agap_worker role.');}
const production=process.env.NODE_ENV==='production';
let evidence:EvidenceWorker|null=null;
if(process.env.EVIDENCE_WORKFLOW_ENABLED==='true'){
 const real=process.env.EVIDENCE_RECORD_MODE==='real';if(real){if(!production)throw new Error('Real records require production.');await requireRelease(process.env);}
 if(!process.env.CLAMAV_HOST)throw new Error('An explicit private ClamAV service is required.');
 const port=Number(process.env.CLAMAV_PORT??3310);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid scanner port.');
 evidence=new EvidenceWorker(pool,process.env.WORKER_ORGANIZATION_ID,await documentStore(process.env,production),new ClamScanner(process.env.CLAMAV_HOST,port),new NativeTextExtractor(),await QwenAdapter.configured(process.env,production,real));
}
console.log(JSON.stringify({component:'worker',state:evidence||handlers.size?'ready':'awaiting_module_handlers'}));
const abort=new AbortController();process.once('SIGTERM',()=>abort.abort());process.once('SIGINT',()=>abort.abort());
try{while(!abort.signal.aborted){try{await evidence?.tick();await worker.tick('jobs');await worker.tick('outbox');}catch{process.stderr.write('{"component":"worker","code":"queue_unavailable"}\n');}await setTimeout(1000,undefined,{signal:abort.signal}).catch(()=>undefined);}}finally{await pool.end();}
