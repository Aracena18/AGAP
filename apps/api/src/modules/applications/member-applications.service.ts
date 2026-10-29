import { randomUUID } from 'node:crypto';
import { ApplicationUpdateSchema,MemberApplicationCreateSchema,MemberApplicationSchema,MemberSubmitSchema,MemberProfileSchema,Id } from '../../../../../packages/contracts/src/schemas.js';
import type { MemberActorContext,MemberTransactionContext,MemberUnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { memberCommand,memberEvent } from '../../platform/member-commands.js';
import { ApiError,notFound } from '../../platform/errors.js';
import { pageInput } from '../../platform/http-inputs.js';
const view=(r:Record<string,unknown>)=>MemberApplicationSchema.parse({id:r.id,purpose:r.purpose,requestedPrincipalCentavos:Number(r.requested_principal_centavos),requestedTermMonths:r.requested_term_months,currency:r.currency,status:r.status,version:Number(r.version),createdAt:(r.created_at as Date).toISOString(),updatedAt:(r.updated_at as Date).toISOString()});
export class MemberApplicationsService {
  constructor(private readonly uow:MemberUnitOfWork,private readonly noticeVersion:string){}
  async own(tx:MemberTransactionContext,id:string){
    Id.parse(id);
    const row=(await tx.query('SELECT * FROM applications.applications WHERE organization_id=$1 AND member_id=$2 AND id=$3',[tx.actor.organizationId,tx.actor.memberId,id])).rows[0];
    if(!row)throw notFound();return view(row);
  }
  async profile(actor:MemberActorContext){
    return this.uow.run(actor,async tx=>{
      const row=(await tx.query('SELECT id,full_name,external_reference,phone FROM members.members WHERE organization_id=$1 AND id=$2',[actor.organizationId,actor.memberId])).rows[0];
      if(!row)throw notFound();return MemberProfileSchema.parse({id:row.id,fullName:row.full_name,externalReference:row.external_reference,phone:row.phone});
    });
  }
  list(actor:MemberActorContext,input:unknown){
    const {cursor,limit}=pageInput.parse(input);
    return this.uow.run(actor,async tx=>{
      const rows=(await tx.query('SELECT * FROM applications.applications WHERE organization_id=$1 AND member_id=$2 AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT $4',[actor.organizationId,actor.memberId,cursor??null,limit+1])).rows;
      return {items:rows.slice(0,limit).map(view),nextCursor:rows.length>limit?String(rows[limit-1].id):null};
    });
  }
  get(actor:MemberActorContext,id:string){return this.uow.run(actor,tx=>this.own(tx,id));}
  create(actor:MemberActorContext,input:unknown,key:unknown){
    const data=MemberApplicationCreateSchema.parse(input);this.notice(data.noticeVersion);
    return this.uow.run(actor,tx=>memberCommand(tx,'application.create',key,data,async()=>{
      const member=(await tx.query('SELECT branch_id FROM members.members WHERE organization_id=$1 AND id=$2',[actor.organizationId,actor.memberId])).rows[0];
      if(!member)throw notFound();
      const row=(await tx.query('INSERT INTO applications.applications(id,organization_id,branch_id,member_id,purpose,requested_principal_centavos,requested_term_months,currency,assigned_officer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NULL) RETURNING *',[randomUUID(),actor.organizationId,member.branch_id,actor.memberId,data.purpose,data.requestedPrincipalCentavos,data.requestedTermMonths,data.currency])).rows[0];
      const result=view(row);await this.revision(tx,result);return result;
    }));
  }
  update(actor:MemberActorContext,id:string,input:unknown,version:number,key:unknown){
    const data=ApplicationUpdateSchema.parse(input);
    return this.uow.run(actor,async tx=>{
      await this.own(tx,id);
      return memberCommand(tx,`application.update:${id}`,key,{data,version},async()=>{
        const row=(await tx.query("UPDATE applications.applications SET purpose=$5,requested_principal_centavos=$6,requested_term_months=$7,currency=$8,version=version+1,assessment_input_version=assessment_input_version+1,updated_at=now() WHERE organization_id=$1 AND member_id=$2 AND id=$3 AND version=$4 AND status='draft' RETURNING *",[actor.organizationId,actor.memberId,id,version,data.purpose,data.requestedPrincipalCentavos,data.requestedTermMonths,data.currency])).rows[0];
        if(!row)await this.changed(tx,id,version);
        const result=view(row);await this.revision(tx,result);return result;
      });
    });
  }
  submit(actor:MemberActorContext,id:string,input:unknown,version:number,key:unknown){
    const data=MemberSubmitSchema.parse(input);this.notice(data.noticeVersion);
    return this.uow.run(actor,async tx=>{
      await this.own(tx,id);
      return memberCommand(tx,`application.submit:${id}`,key,{data,version},async()=>{
        const row=(await tx.query("UPDATE applications.applications SET status='submitted',version=version+1,updated_at=now() WHERE organization_id=$1 AND member_id=$2 AND id=$3 AND version=$4 AND status='draft' RETURNING *",[actor.organizationId,actor.memberId,id,version])).rows[0];
        if(!row)await this.changed(tx,id,version);
        const result=view(row);await this.revision(tx,result);return result;
      });
    });
  }
  private notice(version:string){if(version!==this.noticeVersion)throw new ApiError(409,'notice_changed','Read the current notice before submitting.');}
  private async changed(tx:MemberTransactionContext,id:string,version:number){
    const current=await this.own(tx,id);
    if(current.version!==version)throw new ApiError(412,'stale_version','This application changed. Reload it before saving.');
    throw new ApiError(409,'application_submitted','This application has already been submitted. Contact the cooperative to request a correction.');
  }
  private async revision(tx:MemberTransactionContext,result:ReturnType<typeof view>){
    await tx.query('INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_member_id) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),tx.actor.organizationId,result.id,result.version,JSON.stringify(result),tx.actor.memberId]);
    await memberEvent(tx,`member.application.${result.status}`,result.id,result.version);
  }
}
