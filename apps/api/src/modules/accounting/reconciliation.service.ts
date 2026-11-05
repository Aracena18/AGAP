import { createHash, randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import type { ActorContext, TransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { Id, PrincipalReconciliationInputSchema, ReconciliationCreateSchema, ReconciliationPageSchema, ReconciliationRunSchema } from '../../../../../packages/contracts/src/schemas.js';
import { canonical, command } from '../../platform/commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { LedgerReader, INVENTORY_LIMIT, requireReconciliationScope, requireReportingSnapshot, type ReportingScope, type ReconciliationInput } from './ledger-reader.js';
import { reconcilePrincipalMovements } from './reconciliation.js';
import { servicingInventory } from './inventory.js';
import type { PagedServicingInventoryPort } from '../../../../../packages/contracts/src/reporting.js';

export interface ServicingInventoryPort {
  inventory(tx: TransactionContext, scope: ReportingScope): Promise<z.input<typeof PrincipalReconciliationInputSchema>['servicing']>;
  inventoryPage?:PagedServicingInventoryPort['inventoryPage'];
}
export const RECONCILIATION_CHECKER_VERSION = 'principal-reconciliation-v1' as const;
async function operation<T>(work:()=>Promise<T>) {
  try { return await work(); }
  catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof ZodError) throw new ApiError(422,'invalid_reconciliation','Check the report fields and evidence.',error.issues.map(issue=>({path:issue.path.join('.'),message:issue.message})));
    const code = error && typeof error==='object' && 'code' in error ? String(error.code) : '';
    if(code==='42501')throw new ApiError(403,'reconciliation_forbidden','The report is outside your current access.');
    if(code==='23514')throw new ApiError(422,'invalid_reconciliation','The report evidence violates a recording constraint.');
    const failure = new ApiError(503,'reconciliation_unavailable','The report result could not be confirmed. Retry the same submission.');
    Object.defineProperty(failure,'cause',{value:error}); throw failure;
  }
}
/** Uses the supplied platform coordinator; no nested connections or financial writes. */
export class ReconciliationService {
  constructor(private readonly uow: UnitOfWork, private readonly servicing: ServicingInventoryPort, private readonly ledger = new LedgerReader()) {}
  create(actor: ActorContext, value: unknown, key: unknown) {
    return operation(async()=>{
      const request=ReconciliationCreateSchema.parse(value);
      return this.uow.run(actor,async tx=>{
        await requireReconciliationScope(tx); await requireReportingSnapshot(tx);
        return command(tx,'accounting.reconciliation.create',key,request,async()=>{
          // Keep PostgreSQL microseconds: rounding a cutoff through JS Date can split related evidence at a millisecond boundary.
          const metadata=(await tx.query<{cutoff:string;snapshot:string}>(`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cutoff,pg_current_snapshot()::text AS snapshot`)).rows[0];
          const scope={organizationId:actor.organizationId,...request,cutoffAt:metadata.cutoff,snapshotId:randomUUID()};
          let servicing:ReconciliationInput['servicing'];
          try { servicing=PrincipalReconciliationInputSchema.shape.servicing.parse(this.servicing.inventoryPage?await servicingInventory(tx,scope,{inventoryPage:this.servicing.inventoryPage.bind(this.servicing)}):await this.servicing.inventory(tx,scope)); }
          catch(error){
            // A specifically unavailable producer is not an authorization or database failure.
            if(error instanceof ApiError && error.status===501 && error.code==='module_not_available')
              servicing={state:'unavailable',reason:'The servicing inventory producer is not configured.'};
            else throw error;
          }
          if(!this.servicing.inventoryPage && servicing.state==='available' && [servicing.events,servicing.allocations,servicing.receipts].some(items=>items.length>INVENTORY_LIMIT))
            servicing={state:'unavailable',reason:'Servicing inventory exceeds 1000 records per collection. Choose a smaller date range.'};
          const ledger=await this.ledger.inventory(tx,scope), mappings=await this.ledger.mappings(tx,scope);
          const input=PrincipalReconciliationInputSchema.parse({scope,servicing,ledger,mappings:mappings.values});
          const report=reconcilePrincipalMovements(input);
          const evidenceSha256=createHash('sha256').update(canonical({checkerVersion:RECONCILIATION_CHECKER_VERSION,databaseSnapshot:metadata.snapshot,mappingVersionIds:mappings.versionIds,input})).digest('hex');
          const run=ReconciliationRunSchema.parse({id:randomUUID(),organizationId:actor.organizationId,createdBy:actor.userId,
            createdAt:scope.cutoffAt,checkerVersion:RECONCILIATION_CHECKER_VERSION,evidenceSha256,mappingVersionIds:mappings.versionIds,report});
          const saved=await tx.query<{body:unknown}>('SELECT accounting.save_reconciliation($1::jsonb,$2) AS body',[JSON.stringify(run),actor.correlationId]);
          return ReconciliationRunSchema.parse(saved.rows[0]?.body);
        });
      });
    });
  }
  get(actor:ActorContext,id:unknown){
    return operation(async()=>{
      const reportId=Id.parse(id);
      return this.uow.run(actor,async tx=>{
        await requireReconciliationScope(tx);
        const row=(await tx.query<{body:unknown}>('SELECT body FROM accounting.reconciliation_runs WHERE organization_id=$1 AND id=$2',[actor.organizationId,reportId])).rows[0];
        if(!row)throw notFound();return ReconciliationRunSchema.parse(row.body);
      });
    });
  }
  list(actor:ActorContext,value:unknown){
    return operation(async()=>{
      const query=z.strictObject({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(20).default(20)}).parse(value);
      return this.uow.run(actor,async tx=>{
        await requireReconciliationScope(tx);
        const result=await tx.query(`SELECT id,created_by,created_at,to_char(from_date,'YYYY-MM-DD') AS starts,to_char(through_date,'YYYY-MM-DD') AS ends,status
          FROM accounting.reconciliation_runs WHERE organization_id=$1 AND ($2::uuid IS NULL OR (created_at,id)<
            (SELECT created_at,id FROM accounting.reconciliation_runs WHERE organization_id=$1 AND id=$2::uuid)) ORDER BY created_at DESC,id DESC LIMIT $3`,[actor.organizationId,query.cursor??null,query.limit+1]);
        const rows=result.rows.slice(0,query.limit);
        return ReconciliationPageSchema.parse({items:rows.map(row=>({id:row.id,createdBy:row.created_by,createdAt:(row.created_at as Date).toISOString(),fromDate:row.starts,throughDate:row.ends,status:row.status})),nextCursor:result.rows.length>query.limit?rows[query.limit-1].id:null});
      });
    });
  }
}
