import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { CalendarDay, Id } from '../../../../../packages/contracts/src/schemas.js';
import { INVENTORY_PAGE_SIZE,InventoryCursorSchema,ServicingInventoryPageSchema,type InventoryCursor,type InventoryScope } from '../../../../../packages/contracts/src/reporting.js';
import { requireRoles } from '../identity/identity.service.js';
import { insist,inspectMoney } from './money-rules.js';
import { inspectCommand } from './command-rules.js';
import type { MoneyPorts } from './money.service.js';
import {z} from 'zod';

/** Source-owned bounded reader; the coordinator retains the same transaction across all stages. */
export class ServicingReportingReader {
 constructor(private readonly ports:MoneyPorts,private readonly pageSize=INVENTORY_PAGE_SIZE,private readonly reportPolicy?:{policy(tx:TransactionContext,loanId:string,componentVersion:string):Promise<import('./money-context.js').PrincipalPolicy>}){z.number().int().min(1).max(INVENTORY_PAGE_SIZE).parse(pageSize);}
 async inventoryPage(tx:TransactionContext,scope:InventoryScope,value:InventoryCursor|null){
  requireRoles(tx.actor,['auditor']);Id.parse(scope.organizationId);CalendarDay.parse(scope.fromDate);CalendarDay.parse(scope.throughDate);
  insist(tx.actor.organizationId===scope.organizationId,'actor_scope','Reporting scope belongs to another organization.');
  insist(scope.fromDate<=scope.throughDate&&Number.isFinite(Date.parse(scope.cutoffAt)),'invalid_scope','Reporting dates/cutoff are invalid.');
  insist(['repeatable read','serializable'].includes(String((await tx.query('SHOW transaction_isolation')).rows[0].transaction_isolation)),'snapshot_unavailable','A coordinator-established repeatable snapshot is required.');
  insist((await tx.query('SELECT servicing.full_report_scope() AS allowed')).rows[0].allowed,'report_scope_unavailable','All reporting branches must be authorized.');
  const size=this.pageSize,cursor=InventoryCursorSchema.parse(value??{stage:'posted',after:null}),args=[scope.organizationId,scope.fromDate,scope.throughDate,scope.cutoffAt,cursor.after,size+1];
  const empty={state:'available' as const,snapshotId:scope.snapshotId,events:[],allocations:[],receipts:[]};
  if(cursor.stage==='posted'){
   const result=await tx.query(`SELECT p.*,to_char(p.effective_date,'YYYY-MM-DD') AS day FROM servicing.staff_postings p
    WHERE organization_id=$1 AND effective_date BETWEEN $2::date AND $3::date AND recorded_at<=$4::timestamptz
    AND ($5::uuid IS NULL OR event_id>$5) ORDER BY event_id LIMIT $6`,args),rows=result.rows.slice(0,size);
   const events=rows.map(p=>({organizationId:scope.organizationId,currency:'PHP' as const,id:p.event_id,loanId:p.loan_id,kind:p.kind,effectiveDate:p.day,recordedAt:(p.recorded_at as Date).toISOString(),amountCentavos:Number(p.amount_centavos),state:'confirmed' as const,postingRuleVersionId:p.posting_rule_id,receiptId:p.receipt_id,journalId:p.journal_id}));
   const allocations=rows.map((p,i)=>({organizationId:scope.organizationId,currency:'PHP' as const,id:p.allocation_id,sourceEventId:p.event_id,loanId:p.loan_id,effectiveDate:events[i].effectiveDate,recordedAt:events[i].recordedAt,direction:p.kind==='disbursement'?'increase' as const:'decrease' as const,principalCentavos:Number(p.amount_centavos),interestCentavos:0,feesCentavos:0,unappliedCentavos:0}));
   const receipts=events.filter(e=>e.receiptId!==null).map(e=>({organizationId:e.organizationId,currency:e.currency,id:e.receiptId,sourceEventId:e.id,loanId:e.loanId,effectiveDate:e.effectiveDate,recordedAt:e.recordedAt,amountCentavos:e.amountCentavos}));
   return ServicingInventoryPageSchema.parse({...empty,events,allocations,receipts,nextCursor:result.rows.length>size?{stage:'posted',after:rows.at(-1)!.event_id}:{stage:'pending',after:null}});
  }
  if(cursor.stage==='pending'){
   const result=await tx.query(`SELECT * FROM (SELECT DISTINCT ON (command_id) command_id,body FROM servicing.staff_money_revisions
    WHERE organization_id=$1 AND recorded_at<=$4::timestamptz AND ($5::uuid IS NULL OR command_id>$5) ORDER BY command_id,version DESC) r
    WHERE body->>'state'<>'confirmed' AND (body#>>'{payload,effectiveDate}')::date BETWEEN $2::date AND $3::date ORDER BY command_id LIMIT $6`,args),rows=result.rows.slice(0,size);
   const events=rows.map(row=>{const c=inspectMoney(row.body);return{organizationId:c.organizationId,currency:'PHP' as const,id:c.eventId,loanId:c.loanId,kind:c.kind,effectiveDate:c.payload.effectiveDate,recordedAt:c.createdAt,amountCentavos:c.payload.amountCentavos,state:c.observations.some(o=>o.input.state==='confirmed')?'confirmed_unposted':c.state,postingRuleVersionId:c.kind==='disbursement'?c.policy.releaseRuleId:c.policy.repaymentRuleId,receiptId:null,journalId:null};});
   return ServicingInventoryPageSchema.parse({...empty,events,nextCursor:result.rows.length>size?{stage:'pending',after:rows.at(-1)!.command_id}:{stage:'legacy',after:null}});
  }
  const result=await tx.query(`SELECT * FROM (SELECT DISTINCT ON (command_id) command_id,body,recorded_at FROM servicing.command_revisions
   WHERE organization_id=$1 AND (recorded_at<=$4::timestamptz OR recorded_at IS NULL) AND ($5::uuid IS NULL OR command_id>$5) ORDER BY command_id,version DESC) r
   WHERE (body#>>'{payload,effectiveDate}')::date BETWEEN $2::date AND $3::date
   AND NOT EXISTS(SELECT 1 FROM servicing.staff_postings p WHERE p.organization_id=$1 AND p.event_id=(r.body->>'businessEventId')::uuid AND p.effective_date BETWEEN $2::date AND $3::date AND p.recorded_at<=$4::timestamptz)
   AND NOT EXISTS(SELECT 1 FROM (SELECT DISTINCT ON(command_id) body FROM servicing.staff_money_revisions WHERE organization_id=$1 AND recorded_at<=$4::timestamptz ORDER BY command_id,version DESC) m WHERE m.body->>'eventId'=r.body->>'businessEventId' AND m.body->>'state'<>'confirmed' AND (m.body#>>'{payload,effectiveDate}')::date BETWEEN $2::date AND $3::date)
   ORDER BY command_id LIMIT $6`,args),rows=result.rows.slice(0,size),events=[];
  for(const row of rows){if(row.recorded_at===null)return{state:'unavailable' as const,reason:'Historical command recording times are unavailable for this cutoff.'};const c=inspectCommand(row.body),policy=this.reportPolicy?await this.reportPolicy.policy(tx,c.loanId,c.componentRuleVersionId):await this.ports.policy(tx,c.loanId);events.push({organizationId:c.organizationId,currency:'PHP' as const,id:c.businessEventId,loanId:c.loanId,kind:'disbursement',effectiveDate:c.payload.effectiveDate,recordedAt:(row.recorded_at as Date).toISOString(),amountCentavos:c.amountCentavos,state:c.observations.some(o=>o.input.state==='confirmed')?'confirmed_unposted':c.state,postingRuleVersionId:policy.releaseRuleId,receiptId:null,journalId:null});}
  return ServicingInventoryPageSchema.parse({...empty,events,nextCursor:result.rows.length>size?{stage:'legacy',after:rows.at(-1)!.command_id}:null});
 }
}
