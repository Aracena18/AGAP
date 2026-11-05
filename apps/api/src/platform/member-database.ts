import type { Pool } from 'pg';
import type { MemberActorContext,MemberTransactionContext,MemberUnitOfWork } from '../../../../packages/contracts/src/ports.js';
import { ApiError } from './errors.js';
import { lendingLockSql,lendingTransactionGuard } from './lending-transaction.js';

/** A member is never converted into a staff actor or assigned staff branches. */
export class PostgresMemberUnitOfWork implements MemberUnitOfWork {
  constructor(private readonly pool:Pool,private readonly options:{lendingGuard?:boolean;materialGuard?:boolean}={}){}
  async run<T>(actor:MemberActorContext,work:(tx:MemberTransactionContext)=>Promise<T>):Promise<T>{
    if(actor.kind!=='member')throw new ApiError(401,'member_access_required','Sign in to your member account.');
    const client=await this.pool.connect();let discard=false;
    try{
      await client.query(this.options.lendingGuard||this.options.materialGuard?'BEGIN ISOLATION LEVEL READ COMMITTED':'BEGIN');
      await client.query("SELECT set_config('agap.organization_id',$1,true),set_config('agap.member_id',$2,true),set_config('agap.member_link_id',$3,true),set_config('agap.branch_ids','[]',true),set_config('agap.user_id','',true)",[actor.organizationId,actor.memberId,actor.linkId]);
      await client.query("SET LOCAL statement_timeout='10s'");await client.query("SET LOCAL lock_timeout='5s'");
      if(this.options.lendingGuard||this.options.materialGuard)await client.query(lendingLockSql,[actor.organizationId]);
      const current=await client.query<{authorized:boolean}>('SELECT identity.assert_member($1,$2,$3,$4) AS authorized',[actor.sessionId,actor.linkId,actor.organizationId,actor.memberId]);
      if(!current.rows[0].authorized)throw new ApiError(401,'access_changed','Your member access changed. Sign in again or contact the cooperative.');
      const tx:MemberTransactionContext={actor,query:async(sql,values)=>client.query(sql,values?[...values]:undefined)};
      if(this.options.lendingGuard)Object.assign(tx,{[lendingTransactionGuard]:true});
      const result=await work(tx);await client.query('COMMIT');return result;
    }catch(error){try{await client.query('ROLLBACK');}catch{discard=true;}throw error;}finally{client.release(discard);}
  }
}
