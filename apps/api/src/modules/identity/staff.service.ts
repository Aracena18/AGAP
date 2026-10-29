import { Id,StaffRevokeSchema,StaffSchema } from '../../../../../packages/contracts/src/schemas.js';
import type { ActorContext,UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { requireRoles,requireFreshMfa } from './identity.service.js';
import { ApiError,notFound } from '../../platform/errors.js';
import { command,recordEvent } from '../../platform/commands.js';
import { randomUUID } from 'node:crypto';
import { pageInput } from '../../platform/http-inputs.js';
const view=(row:Record<string,unknown>)=>StaffSchema.parse({id:row.id,displayName:row.display_name,branchIds:row.branch_ids,roles:row.roles,active:row.active,version:Number(row.version)});
export class StaffService {
  constructor(private readonly uow:UnitOfWork){}
  async list(actor:ActorContext,query:unknown){
    requireRoles(actor,['administrator']);
    const {cursor,limit}=pageInput.parse(query);
    return this.uow.run(actor,async tx=>{
      const rows=(await tx.query('SELECT id,display_name,branch_ids,roles,active,version FROM identity.staff_users WHERE organization_id=$1 AND branch_ids <@ $2::uuid[] AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT $4',[actor.organizationId,[...actor.branchIds],cursor??null,limit+1])).rows;
      return {items:rows.slice(0,limit).map(view),nextCursor:rows.length>limit?String(rows[limit-1].id):null};
    });
  }
  async revoke(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){
    requireRoles(actor,['administrator']);requireFreshMfa(actor);Id.parse(id);
    if(id===actor.userId)throw new ApiError(403,'self_revocation_forbidden','Use sign-out for your own session. Another administrator must manage your staff access.');
    const data=StaffRevokeSchema.parse(input);
    return this.uow.run(actor,async tx=>{
      const allowed=await tx.query('SELECT id FROM identity.staff_users WHERE organization_id=$1 AND id=$2 AND branch_ids <@ $3::uuid[]',[actor.organizationId,id,[...actor.branchIds]]);
      if(!allowed.rowCount)throw notFound();
      return command(tx,`staff.revoke:${id}`,key,{data,version},async()=>{
        const result=await tx.query('UPDATE identity.staff_users SET active=false,version=version+1 WHERE organization_id=$1 AND id=$2 AND version=$3 AND branch_ids <@ $4::uuid[] RETURNING id,display_name,branch_ids,roles,active,version',[actor.organizationId,id,version,[...actor.branchIds]]);
        if(!result.rows[0])throw new ApiError(412,'stale_version','This staff account changed. Reload before revoking access.');
        await tx.query('DELETE FROM identity.sessions WHERE user_id=$1',[id]);
        const staff=view(result.rows[0]);
        await tx.query('INSERT INTO identity.staff_revocations(id,organization_id,staff_id,staff_version,revoked_by,reason) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),actor.organizationId,id,staff.version,actor.userId,data.reason]);
        await recordEvent(tx,'staff.revoked',id,staff.version);
        return staff;
      });
    });
  }
}
