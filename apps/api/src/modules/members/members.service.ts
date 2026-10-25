import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Id, MemberCreateSchema, MemberUpdateSchema, MemberSchema } from '../../../../../packages/contracts/src/schemas.js';
import type { ActorContext, TransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { requireRoles } from '../identity/identity.service.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { command, recordEvent } from '../../platform/commands.js';
import { pageInput } from '../../platform/http-inputs.js';

type Row = Record<string, unknown>;
export function memberView(row: Row) {
  return MemberSchema.parse({ id: row.id, organizationId: row.organization_id, branchId: row.branch_id, externalReference: row.external_reference, fullName: row.full_name, phone: row.phone, version: Number(row.version), noticeVersion: row.notice_version, noticeAcknowledgedAt: (row.notice_acknowledged_at as Date).toISOString(), createdAt: (row.created_at as Date).toISOString(), updatedAt: (row.updated_at as Date).toISOString() });
}
export class MembersService {
  constructor(private readonly uow: UnitOfWork, private readonly noticeVersion: string) {}
  async list(actor: ActorContext, query: unknown) {
    requireRoles(actor,['officer','verifier','reviewer','cashier','financial_authorizer','accountant','auditor','administrator']);
    const { cursor,limit } = pageInput.parse(query);
    return this.uow.run(actor,async tx => {
      const result = await tx.query('SELECT * FROM members.members WHERE organization_id=$1 AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT $3',[actor.organizationId,cursor ?? null,limit+1]);
      return { items: result.rows.slice(0,limit).map(memberView), nextCursor: result.rows.length>limit ? String(result.rows[limit-1].id) : null };
    });
  }
  async load(tx: TransactionContext,id: string) {
    const result = await tx.query('SELECT * FROM members.members WHERE organization_id=$1 AND id=$2',[tx.actor.organizationId,Id.parse(id)]);
    if (!result.rows[0]) throw notFound();
    return memberView(result.rows[0]);
  }
  async get(actor: ActorContext,id: string) {
    requireRoles(actor,['officer','verifier','reviewer','cashier','financial_authorizer','accountant','auditor','administrator']);
    return this.uow.run(actor,tx => this.load(tx,id));
  }
  async create(actor: ActorContext,input: unknown,key: unknown) {
    requireRoles(actor,['officer']);
    const data = MemberCreateSchema.parse(input);
    if (!actor.branchIds.includes(data.branchId)) throw new ApiError(403,'branch_forbidden','You cannot create a member in that branch.');
    if (data.noticeVersion !== this.noticeVersion) throw new ApiError(409,'notice_changed','Read the current member notice before submitting.');
    return this.uow.run(actor,tx => command(tx,'members.create',key,data,async () => {
      const id = randomUUID();
      const result = await tx.query('INSERT INTO members.members(id,organization_id,branch_id,external_reference,full_name,phone,notice_version) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,actor.organizationId,data.branchId,data.externalReference,data.fullName,data.phone,data.noticeVersion]);
      const member = memberView(result.rows[0]);
      await this.revision(tx,member);
      await recordEvent(tx,'member.created',id,member.version);
      return member;
    }));
  }
  async update(actor: ActorContext,id: string,input: unknown,version: number,key: unknown) {
    requireRoles(actor,['officer']);
    const data = MemberUpdateSchema.parse(input);
    return this.uow.run(actor,async tx => {
      await this.load(tx,id); // Re-check current access before returning any cached response.
      return command(tx,`members.update:${id}`,key,{data,version},async () => {
        const result = await tx.query('UPDATE members.members SET full_name=$4,phone=$5,version=version+1,updated_at=now() WHERE organization_id=$1 AND id=$2 AND version=$3 RETURNING *',[actor.organizationId,id,version,data.fullName,data.phone]);
        if (!result.rows[0]) throw new ApiError(412,'stale_version','This member changed. Reload before saving your correction.');
        const member = memberView(result.rows[0]);
        await this.revision(tx,member);
        await recordEvent(tx,'member.updated',id,member.version);
        return member;
      });
    });
  }
  private async revision(tx: TransactionContext,member: z.output<typeof MemberSchema>) {
    await tx.query('INSERT INTO members.member_revisions(id,organization_id,member_id,version,snapshot,recorded_by) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),tx.actor.organizationId,member.id,member.version,JSON.stringify(member),tx.actor.userId]);
  }
}
