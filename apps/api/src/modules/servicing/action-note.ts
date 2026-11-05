import { randomUUID } from 'node:crypto';
import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { Text } from '../../../../../packages/contracts/src/schemas.js';
/** Absent metadata preserves historical idempotency requests and command hashes. */
export const actionReasonRequest=(reason:string|undefined)=>reason===undefined?{}:{reason:Text.parse(reason)};
export async function recordActionNote(tx:TransactionContext,c:{id:string;branchId:string;version:number},stream:'release-v1'|'money-v2',action:'authorize'|'submit'|'observe'|'finalize'|'status_check',reason:string|undefined){
  if(reason===undefined)return;
  await tx.query(`INSERT INTO servicing.action_notes(id,organization_id,branch_id,command_id,command_stream,command_version,action,reason,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),tx.actor.organizationId,c.branchId,c.id,stream,c.version,action,Text.parse(reason),tx.actor.userId]);
}
