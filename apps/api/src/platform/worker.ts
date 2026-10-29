import type { Pool,PoolClient } from 'pg';
import { Id } from '../../../../packages/contracts/src/schemas.js';
export interface WorkItem {id:string;organization_id:string;kind:string;payload:unknown;attempts:number}
/** Handlers commit database-only effects on this client. External delivery needs
 * its own durable command and idempotency; never initiate a transfer here.
 */
export type WorkHandler=(item:WorkItem,transaction:Pick<PoolClient,'query'>)=>Promise<void>;
export class DatabaseWorker {
  constructor(private readonly pool:Pool,private readonly organizationId:string,private readonly handlers:ReadonlyMap<string,WorkHandler>){Id.parse(organizationId);}
  async tick(queue:'outbox'|'jobs'):Promise<boolean>{
    if(this.handlers.size===0)return false;
    const kind=queue==='outbox'?'event_type':'kind',completed=queue==='outbox'?'delivered_at':'completed_at';
    const client=await this.pool.connect();let item:WorkItem|undefined;
    try{
      await client.query('BEGIN');
      await client.query("SELECT set_config('agap.organization_id',$1,true),set_config('statement_timeout','10000',true),set_config('lock_timeout','2000',true)",[this.organizationId]);
      const selected=await client.query<WorkItem>(`SELECT id,organization_id,${kind} AS kind,payload,attempts FROM platform.${queue} WHERE ${completed} IS NULL AND failed_at IS NULL AND available_at<=now() AND ${kind}=ANY($1::text[]) ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`,[[...this.handlers.keys()]]);
      item=selected.rows[0];
      if(!item){await client.query('COMMIT');return false;}
      await client.query('SAVEPOINT handler');
      try{
        await this.handlers.get(item.kind)!(item,client);
        await client.query(`UPDATE platform.${queue} SET ${completed}=now(),attempts=attempts+1,last_error_code=NULL WHERE id=$1`,[item.id]);
      }catch{
        // Keep the row lock while rolling back partial handler effects.
        await client.query('ROLLBACK TO SAVEPOINT handler');
        await client.query(`UPDATE platform.${queue} SET attempts=attempts+1,last_error_code='handler_failed',available_at=now()+interval '30 seconds',failed_at=CASE WHEN attempts+1>=5 THEN now() ELSE NULL END WHERE id=$1`,[item.id]);
      }
      await client.query('COMMIT');return true;
    }catch(error){await client.query('ROLLBACK').catch(()=>undefined);throw error;}finally{client.release();}
  }
}
