import { randomUUID } from 'node:crypto';
import { ApplicationCreateSchema,ApplicationUpdateSchema,ApplicationSchema,AssignmentCreateSchema,Id } from '../../../../../packages/contracts/src/schemas.js';
import type { ActorContext,UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { MembersService } from '../members/members.service.js';
import { pageInput } from '../../platform/http-inputs.js';
import { requireRoles,requireFreshMfa } from '../identity/identity.service.js';
import { command,recordEvent } from '../../platform/commands.js';
import { ApiError,notFound } from '../../platform/errors.js';

function applicationView(row: Record<string,unknown>) {
  return ApplicationSchema.parse({ id: row.id, organizationId: row.organization_id, branchId: row.branch_id, memberId: row.member_id, memberName:row.member_name, purpose: row.purpose, requestedPrincipalCentavos: Number(row.requested_principal_centavos), requestedTermMonths: row.requested_term_months, currency: row.currency,status: row.status,version: Number(row.version),assessmentInputVersion: Number(row.assessment_input_version),assignedOfficerId: row.assigned_officer_id,createdAt: (row.created_at as Date).toISOString(),updatedAt: (row.updated_at as Date).toISOString() });
}
const readers = ['officer','verifier','reviewer','cashier','financial_authorizer','accountant','auditor','administrator'];
export class ApplicationsService {
  constructor(private readonly uow: UnitOfWork,private readonly members: MembersService) {}
  async list(actor: ActorContext,query: unknown) {
    requireRoles(actor,readers);
    const {cursor,limit} = pageInput.parse(query);
    return this.uow.run(actor,async tx => {
      const result = await tx.query('SELECT a.*,m.full_name AS member_name FROM applications.applications a JOIN members.members m ON m.id=a.member_id AND m.organization_id=a.organization_id WHERE a.organization_id=$1 AND ($2::uuid IS NULL OR a.id>$2) ORDER BY a.id LIMIT $3',[actor.organizationId,cursor ?? null,limit+1]);
      return {items: result.rows.slice(0,limit).map(applicationView),nextCursor: result.rows.length>limit ? String(result.rows[limit-1].id) : null};
    });
  }
  async get(actor: ActorContext,id: string) {
    requireRoles(actor,readers);
    Id.parse(id);
    return this.uow.run(actor,async tx => {
      const result = await tx.query('SELECT a.*,m.full_name AS member_name FROM applications.applications a JOIN members.members m ON m.id=a.member_id AND m.organization_id=a.organization_id WHERE a.organization_id=$1 AND a.id=$2',[actor.organizationId,id]);
      if (!result.rows[0]) throw notFound();
      return applicationView(result.rows[0]);
    });
  }
  async create(actor: ActorContext,input: unknown,key: unknown) {
    requireRoles(actor,['officer']);
    const data = ApplicationCreateSchema.parse(input);
    return this.uow.run(actor,async tx => {
      const member = await this.members.load(tx,data.memberId);
      return command(tx,'applications.create',key,data,async () => {
        const id = randomUUID();
        const result = await tx.query('INSERT INTO applications.applications(id,organization_id,branch_id,member_id,purpose,requested_principal_centavos,requested_term_months,currency,assigned_officer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[id,actor.organizationId,member.branchId,data.memberId,data.purpose,data.requestedPrincipalCentavos,data.requestedTermMonths,data.currency,actor.userId]);
        const application = applicationView({...result.rows[0],member_name:member.fullName});
        await tx.query('INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),actor.organizationId,id,application.version,JSON.stringify(application),actor.userId]);
        await recordEvent(tx,'application.created',id,application.version);
        return application;
      });
    });
  }
  async update(actor: ActorContext,id: string,input: unknown,version: number,key: unknown) {
    requireRoles(actor,['officer']);
    Id.parse(id);
    const data = ApplicationUpdateSchema.parse(input);
    return this.uow.run(actor,async tx => {
      const accessible = await tx.query('SELECT id FROM applications.applications WHERE organization_id=$1 AND id=$2',[actor.organizationId,id]);
      if (!accessible.rowCount) throw notFound();
      return command(tx,`applications.update:${id}`,key,{data,version},async () => {
        const result = await tx.query("UPDATE applications.applications SET purpose=$4,requested_principal_centavos=$5,requested_term_months=$6,currency=$7,version=version+1,assessment_input_version=assessment_input_version+1,updated_at=now() WHERE organization_id=$1 AND id=$2 AND version=$3 AND assigned_officer_id=$8 AND status IN ('draft','evidence_review','clarification') RETURNING *",[actor.organizationId,id,version,data.purpose,data.requestedPrincipalCentavos,data.requestedTermMonths,data.currency,actor.userId]);
        if (!result.rows[0]) {
          const current = await tx.query('SELECT version,assigned_officer_id,status FROM applications.applications WHERE organization_id=$1 AND id=$2',[actor.organizationId,id]);
          if (Number(current.rows[0]?.version)!==version) throw new ApiError(412,'stale_version','This application changed. Reload it before saving.');
          if (current.rows[0].assigned_officer_id!==actor.userId) throw new ApiError(403,'assignment_required','Only the assigned officer may change this request.');
          throw new ApiError(409,'review_in_progress','This request has progressed beyond intake. Use the relevant review or amendment workflow.');
        }
        const member=await this.members.load(tx,String(result.rows[0].member_id));
        const application = applicationView({...result.rows[0],member_name:member.fullName});
        await tx.query('INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),actor.organizationId,id,application.version,JSON.stringify(application),actor.userId]);
        await recordEvent(tx,'application.updated',id,application.version);
        return application;
      });
    });
  }
  async assign(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){
    requireRoles(actor,['administrator']);requireFreshMfa(actor);Id.parse(id);
    const data=AssignmentCreateSchema.parse(input);
    return this.uow.run(actor,async tx=>{
      const allowed=await tx.query('SELECT id FROM applications.applications WHERE organization_id=$1 AND id=$2',[actor.organizationId,id]);
      if(!allowed.rowCount)throw notFound();
      return command(tx,`applications.assign:${id}`,key,{data,version},async()=>{
        const current=(await tx.query('SELECT branch_id,version,status,assigned_officer_id FROM applications.applications WHERE organization_id=$1 AND id=$2 FOR UPDATE',[actor.organizationId,id])).rows[0];
        if(Number(current.version)!==version)throw new ApiError(412,'stale_version','This application changed. Reload before changing its assignment.');
        if(!['draft','submitted','evidence_review','clarification'].includes(String(current.status)))throw new ApiError(409,'review_in_progress','Assignment is locked after intake review has progressed.');
        const target=await tx.query<{allowed:boolean}>('SELECT identity.assignable_officer($1,$2,$3) AS allowed',[actor.organizationId,data.officerId,current.branch_id]);
        if(!target.rows[0].allowed)throw new ApiError(422,'officer_unavailable','Choose an active officer assigned to this application branch.');
        if(current.assigned_officer_id===data.officerId)throw new ApiError(409,'already_assigned','This officer already holds the assignment.');
        const updated=(await tx.query('UPDATE applications.applications SET assigned_officer_id=$3,version=version+1,updated_at=now() WHERE organization_id=$1 AND id=$2 RETURNING *',[actor.organizationId,id,data.officerId])).rows[0];
        const member=await this.members.load(tx,String(updated.member_id));
        const application=applicationView({...updated,member_name:member.fullName});
        await tx.query('INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),actor.organizationId,id,application.version,JSON.stringify(application),actor.userId]);
        await tx.query('INSERT INTO applications.assignment_changes(id,organization_id,application_id,application_version,officer_id,recorded_by,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),actor.organizationId,id,application.version,data.officerId,actor.userId,data.reason]);
        await recordEvent(tx,'application.assigned',id,application.version);return application;
      });
    });
  }
}
