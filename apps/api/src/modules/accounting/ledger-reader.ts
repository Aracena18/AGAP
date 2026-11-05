import type { z } from 'zod';
import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { PrincipalReconciliationInputSchema } from '../../../../../packages/contracts/src/schemas.js';
import { INVENTORY_PAGE_SIZE,INVENTORY_RECORD_LIMIT } from '../../../../../packages/contracts/src/reporting.js';
import { ApiError } from '../../platform/errors.js';
import { requireRoles } from '../identity/identity.service.js';

export type ReconciliationInput = z.output<typeof PrincipalReconciliationInputSchema>;
export type ReportingScope = ReconciliationInput['scope'];
export const INVENTORY_LIMIT = 1000;
export async function requireReconciliationScope(tx: TransactionContext) {
  requireRoles(tx.actor, ['auditor']);
  if (!(await tx.query<{ allowed: boolean }>('SELECT accounting.can_reconcile() AS allowed')).rows[0]?.allowed)
    throw new ApiError(403, 'reconciliation_forbidden', 'An active auditor with access to every organization branch is required.');
}
export async function requireReportingSnapshot(tx: TransactionContext) {
  if (!['repeatable read','serializable'].includes(String((await tx.query('SHOW transaction_isolation')).rows[0]?.transaction_isolation)))
    throw new ApiError(409, 'snapshot_unavailable', 'Reconciliation requires a coordinator-established repeatable snapshot.');
}
const unavailable = (reason: string) => ({ state: 'unavailable' as const, reason });
function centavos(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('Invalid database money.');
  const exact = BigInt(value);
  if (exact < 1n || exact > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Unsafe database money.');
  return Number(exact);
}
/** Enumerates actual GL tables independently of servicing event IDs. */
export class LedgerReader {
  async inventory(tx: TransactionContext, scope: ReportingScope): Promise<ReconciliationInput['ledger']> {
    await requireReconciliationScope(tx); await requireReportingSnapshot(tx);
    if (scope.organizationId !== tx.actor.organizationId) throw new ApiError(403, 'reconciliation_forbidden', 'The report organization is outside your access.');
    const journals:Extract<ReconciliationInput['ledger'],{state:'available'}>['journals']=[];
    let after:string|null=null;
    for(;;){
    const headers:{rows:Record<string,unknown>[]} = await tx.query(`SELECT id,organization_id,source_event_id,posting_kind,posting_rule_version_id,
      to_char(effective_date,'YYYY-MM-DD') AS effective_day,currency,reversal_of_journal_id,posted_at
      FROM accounting.journals WHERE organization_id=$1 AND effective_date BETWEEN $2::date AND $3::date
      AND posted_at<=$4::timestamptz AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`, [scope.organizationId,scope.fromDate,scope.throughDate,scope.cutoffAt,after,INVENTORY_PAGE_SIZE+1]);
    const batch:Record<string,unknown>[]=headers.rows.slice(0,INVENTORY_PAGE_SIZE);
    if (journals.length+batch.length > INVENTORY_RECORD_LIMIT) return unavailable('Ledger inventory exceeds the 5000-journal budget. Choose a smaller date range.');
    const ids:string[] = batch.map(row => String(row.id));
    const lines = ids.length ? await tx.query(`SELECT journal_id,account_id,side,amount_centavos::text AS amount FROM accounting.journal_lines
      WHERE organization_id=$1 AND journal_id=ANY($2::uuid[]) ORDER BY journal_id,line_number`, [scope.organizationId,ids]) : { rows: [] };
    try {
      const page = batch.map(row => ({ journalId:String(row.id),organizationId:String(row.organization_id),sourceEventId:String(row.source_event_id),
        postingKind:String(row.posting_kind),postingRuleVersionId:String(row.posting_rule_version_id),effectiveDate:String(row.effective_day),currency:row.currency,
        reversalOfJournalId:row.reversal_of_journal_id,postedAt:(row.posted_at as Date).toISOString(),
        lines:lines.rows.filter(line=>line.journal_id===row.id).map(line=>({accountId:line.account_id,side:line.side,amountCentavos:centavos(line.amount)})) }));
      const checked=PrincipalReconciliationInputSchema.shape.ledger.parse({state:'available',snapshotId:scope.snapshotId,complete:true,journals:page});
      if(checked.state==='available')journals.push(...checked.journals);
    } catch { return unavailable('Ledger evidence could not be validated. No balanced result is inferred.'); }
    if(headers.rows.length<=INVENTORY_PAGE_SIZE)break;
    after=ids.at(-1)!;
    }
    return{state:'available',snapshotId:scope.snapshotId,complete:true,journals};
  }
  async mappings(tx: TransactionContext, scope: ReportingScope) {
    await requireReconciliationScope(tx); await requireReportingSnapshot(tx);
    if (scope.organizationId !== tx.actor.organizationId) throw new ApiError(403, 'reconciliation_forbidden', 'The report organization is outside your access.');
    const rows = await tx.query(`SELECT *,to_char(effective_from,'YYYY-MM-DD') AS starts,to_char(effective_through,'YYYY-MM-DD') AS ends
      FROM accounting.reconciliation_mappings WHERE organization_id=$1 AND effective_from<=$3::date AND effective_through>=$2::date ORDER BY id LIMIT $4`,
    [scope.organizationId,scope.fromDate,scope.throughDate,INVENTORY_LIMIT+1]);
    if (rows.rows.length > INVENTORY_LIMIT) throw new ApiError(422,'mapping_limit','Too many reporting mappings for this date range.');
    return { versionIds:rows.rows.map(row=>String(row.id)), values:PrincipalReconciliationInputSchema.shape.mappings.parse(rows.rows.map(row=>({
      organizationId:row.organization_id,currency:row.currency,postingRuleVersionId:row.posting_rule_version_id,kind:row.kind,
      effectiveFrom:row.starts,effectiveThrough:row.ends,cashAccountId:row.cash_account_id,principalAccountId:row.principal_account_id,
    }))) };
  }
}
