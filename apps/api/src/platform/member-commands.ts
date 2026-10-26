import { createHash,randomUUID } from 'node:crypto';
import type { MemberTransactionContext } from '../../../../packages/contracts/src/ports.js';
import { canonical } from './commands.js';
import { ApiError } from './errors.js';
export function memberKey(value:unknown):string{
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(value))throw new ApiError(400,'idempotency_key_required','Supply a stable Idempotency-Key for this submission.');
  return value;
}
export async function memberCommand<T>(tx:MemberTransactionContext,operation:string,key:unknown,input:unknown,execute:()=>Promise<T>):Promise<T>{
  const scope=`${operation}:${memberKey(key)}`,hash=createHash('sha256').update(canonical(input)).digest('hex');
  const inserted=await tx.query('INSERT INTO portal.commands(organization_id,member_id,link_id,scope,request_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING scope',[tx.actor.organizationId,tx.actor.memberId,tx.actor.linkId,scope,hash]);
  if(!inserted.rowCount){
    const previous=(await tx.query<{request_hash:string;response:T}>('SELECT request_hash,response FROM portal.commands WHERE link_id=$1 AND scope=$2',[tx.actor.linkId,scope])).rows[0];
    if(previous?.request_hash!==hash)throw new ApiError(409,'idempotency_conflict','This submission key was used with different information.');
    return previous.response;
  }
  const result=await execute();
  await tx.query('UPDATE portal.commands SET response=$3 WHERE link_id=$1 AND scope=$2',[tx.actor.linkId,scope,JSON.stringify(result)]);
  return result;
}
export async function memberEvent(tx:MemberTransactionContext,type:string,id:string,version:number){
  await tx.query('INSERT INTO portal.events(id,organization_id,member_id,link_id,event_type,aggregate_id,aggregate_version,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),tx.actor.organizationId,tx.actor.memberId,tx.actor.linkId,type,id,version,tx.actor.correlationId]);
}
