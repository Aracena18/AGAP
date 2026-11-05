import { z } from 'zod';
import type { ActorContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { Id, LendingApplicationPageSchema } from '../../../../../packages/contracts/src/schemas.js';
import { notFound } from '../../platform/errors.js';
import { requireLendingTransaction } from '../../platform/lending-transaction.js';
import { requireRoles } from '../identity/identity.service.js';
import { servicingOperation } from './servicing.service.js';
const Query=z.strictObject({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(100).default(25)});
export class LendingReads {
  constructor(private readonly uow:UnitOfWork){}
  list(actor:ActorContext,input:unknown={}){
    return servicingOperation(async()=>{
      requireRoles(actor,['cashier','financial_authorizer','auditor']);const q=Query.parse(input);
      return this.uow.run(actor,async tx=>{
        requireLendingTransaction(tx);
        const cursor=q.cursor?(await tx.query('SELECT id,recorded_at FROM servicing.staff_lending_applications WHERE organization_id=$1 AND id=$2',[actor.organizationId,q.cursor])).rows[0]:null;
        if(q.cursor&&!cursor)throw notFound();
        const rows=(await tx.query(`SELECT * FROM servicing.staff_lending_applications WHERE organization_id=$1
          AND ($2::timestamptz IS NULL OR (recorded_at,id)<($2::timestamptz,$3::uuid)) ORDER BY recorded_at DESC,id DESC LIMIT $4`,[actor.organizationId,cursor?.recorded_at??null,cursor?.id??null,q.limit+1])).rows;
        const items=rows.slice(0,q.limit).map(r=>({id:r.id,memberLabel:r.member_label,purpose:r.purpose,principalCentavos:Number(r.principal_centavos),acceptanceRecorded:r.acceptance_recorded,loanId:r.loan_id,recordedAt:(r.recorded_at as Date).toISOString()}));
        return LendingApplicationPageSchema.parse({items,nextCursor:rows.length>q.limit?items.at(-1)!.id:null});
      });
    });
  }
}
