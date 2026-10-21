import { setTimeout } from 'node:timers/promises';
import { createPool } from '../../api/src/platform/database.js';
import { DatabaseWorker,type WorkHandler } from '../../api/src/platform/worker.js';
if(!process.env.WORKER_DATABASE_URL||!process.env.WORKER_ORGANIZATION_ID)throw new Error('Worker requires dedicated credentials and one explicit organization.');
const pool=createPool(process.env.WORKER_DATABASE_URL);
// Module owners register reviewed consumers here through Robert. Empty is
// deliberate: pending events must never be silently acknowledged.
const handlers=new Map<string,WorkHandler>();
const worker=new DatabaseWorker(pool,process.env.WORKER_ORGANIZATION_ID,handlers);
const privilege=await pool.query<{rolsuper:boolean;rolbypassrls:boolean;safe:boolean}>("SELECT rolsuper,rolbypassrls,pg_has_role(current_user,'agap_worker','MEMBER') AS safe FROM pg_roles WHERE rolname=current_user");
if(privilege.rows[0].rolsuper||privilege.rows[0].rolbypassrls||!privilege.rows[0].safe){await pool.end();throw new Error('Worker requires the constrained agap_worker role.');}
console.log(JSON.stringify({component:'worker',state:handlers.size?'ready':'awaiting_module_handlers'}));
const abort=new AbortController();process.once('SIGTERM',()=>abort.abort());process.once('SIGINT',()=>abort.abort());
try{while(!abort.signal.aborted){try{await worker.tick('jobs');await worker.tick('outbox');}catch{process.stderr.write('{"component":"worker","code":"queue_unavailable"}\n');}await setTimeout(1000,undefined,{signal:abort.signal}).catch(()=>undefined);}}finally{await pool.end();}
