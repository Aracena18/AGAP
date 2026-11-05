import type { ActorContext, MemberDomainPorts, MemberTransactionContext, TransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { CalendarDay, Id, MemberLoansViewSchema } from '../../../../../packages/contracts/src/schemas.js';
import { requireRoles } from '../identity/identity.service.js';
import { servicingOperation } from './servicing.service.js';
import { ServicingRepository } from './servicing.repository.js';
import { MoneyRepository } from './money.repository.js';
import { LoanWorkspaceSchema } from './money-context.js';
import { inspectMoney, insist } from './money-rules.js';
import { permission } from './command-rules.js';
import { businessDay } from './command-rules.js';
import { unavailableMoneyPorts, type MoneyPorts } from './money.service.js';
import type { PrincipalReconciliationInput } from '../accounting/reconciliation.js';
import { inspectCommand } from './command-rules.js';

/** Safe presentation proposal; no staff snapshots or provider evidence escape. */
export class LoanReads {
  constructor(private readonly uow: UnitOfWork, private readonly ports: MoneyPorts = unavailableMoneyPorts,
    private readonly origins = new ServicingRepository(), private readonly money = new MoneyRepository(), private readonly now = () => new Date(),private readonly reportPolicy?:{policy(tx:TransactionContext,loanId:string,componentVersion:string):Promise<import('./money-context.js').PrincipalPolicy>}) {}
  async memberLoans(tx: MemberTransactionContext) {
    const day = businessDay(this.now().toISOString());
    const row = await tx.query('SELECT servicing.member_loans($1::date) AS data', [day]);
    return MemberLoansViewSchema.parse({ state: 'available', data: row.rows[0].data });
  }
  workspace(actor: ActorContext, loanId: string, asOf: string) {
    return servicingOperation(async () => {
      requireRoles(actor, ['cashier', 'financial_authorizer', 'auditor']); const id = Id.parse(loanId), day = CalendarDay.parse(asOf);
      insist(day <= businessDay(this.now().toISOString()), 'future_position', 'A future date is not a posted loan position.');
      return this.uow.run(actor, async tx => {
        const loan = await this.origins.origin(tx, id); await this.ports.authorize(tx, loan.applicationId);
        await this.origins.lockApplication(tx, loan.applicationId); await this.money.lockLoan(tx, id);
        const events = await this.money.events(tx, id), current = await this.money.commands(tx, id);
        const legacy = (await tx.query('SELECT body FROM servicing.command_revisions WHERE organization_id=$1 AND body->>\'loanId\'=$2 ORDER BY version DESC LIMIT 1', [actor.organizationId, id])).rows[0];
        const commands = current.map(c => ({ id: c.id, kind: c.kind, version: c.version, state: c.state, amountCentavos: c.payload.amountCentavos, effectiveDate: c.payload.effectiveDate, legacy: false }));
        if (legacy && !current.some(c => c.id === (legacy.body as { id: string }).id)) {
          const c = await this.origins.command(tx, (legacy.body as { id: string }).id);
          commands.push({ id: c.id, kind: 'disbursement', version: c.version, state: c.state, amountCentavos: c.amountCentavos, effectiveDate: c.payload.effectiveDate, legacy: true });
        }
        const dated = events.filter(e => e.effectiveDate <= day), release = dated.find(e => e.kind === 'disbursement');
        const repaid = dated.filter(e => e.kind === 'repayment').reduce((n, e) => n + BigInt(e.amountCentavos), 0n);
        const principal = release ? BigInt(release.amountCentavos) - repaid : null;
        const due = loan.offer.payments.filter(p => p.date <= day).reduce((n, p) => n + BigInt(p.amountCentavos), 0n) - repaid;
        const pending = commands.filter(c => !['confirmed', 'failed'].includes(c.state)).length;
        const paidCount = dated.filter(e => e.kind === 'repayment').length;
        let canPrepareRelease=false,releasePreparationMessage='Only an authorized cashier can prepare the current accepted release.';
        if(!release&&commands.length===0&&actor.roles.includes('cashier')){
          try{
            const op=await this.ports.operation(tx,loan.applicationId);
            const methods=op.authority.status==='configured'?op.authority.grants.filter(g=>g.userId===actor.userId&&g.actions.includes('prepare')).flatMap(g=>g.methods):[];
            canPrepareRelease=methods.some(method=>{try{permission(actor,{authority:op.authority},loan,'prepare',this.now().toISOString(),loan.offer.principalCentavos,method);return true;}catch{return false;}});
            releasePreparationMessage=canPrepareRelease?'Prepare only the exact accepted principal; this does not release funds.':'Current scoped preparation authority is unavailable.';
          }catch(error){releasePreparationMessage=error instanceof Error?error.message:'Release preparation is unavailable.';}
        }
        return LoanWorkspaceSchema.parse({ loanId: id, organizationId: loan.organizationId, branchId: loan.branchId, origination:{applicationId:loan.applicationId,principalCentavos:loan.offer.principalCentavos,currency:'PHP',payments:loan.offer.payments},canPrepareRelease,releasePreparationMessage,memberLabel: `Member identifier: ${loan.memberId}`, commands,
          message: release ? 'Balances reflect posted events. Pending movements do not reduce debt.' : 'No posted release exists for this date. A pending loan is not active.',
          nextPayment: release && loan.offer.payments[paidCount] ? loan.offer.payments[paidCount] : null,
          position: release && principal !== null ? { loanId: id, applicationId: loan.applicationId, memberLabel: `Member identifier: ${loan.memberId}`, state: principal === 0n ? 'settled' : 'active',
            asOfDate: day, principalCentavos: Number(principal), interestDueCentavos: 0, feesDueCentavos: 0, overdueCentavos: Number(due > 0n ? due : 0n),
            postedThrough: dated.reduce((a, e) => Date.parse(a) > Date.parse(e.postedAt) ? a : e.postedAt, release.postedAt),
            pendingMovementCount: pending, schedule: loan.offer.payments, receipts: dated.filter(e => e.receiptId !== null), commands } : null });
      });
    });
  }
  /** Caller must establish authorized complete scope and real snapshot BEFORE reads. */
  async inventory(tx: TransactionContext, scope: { organizationId: string; fromDate: string; throughDate: string; cutoffAt: string; snapshotId: string }) {
    requireRoles(tx.actor, ['auditor']);
    insist(tx.actor.organizationId === scope.organizationId, 'actor_scope', 'Reporting scope belongs to another organization.');
    const isolation = (await tx.query('SHOW transaction_isolation')).rows[0].transaction_isolation;
    insist(['repeatable read', 'serializable'].includes(String(isolation)), 'snapshot_unavailable', 'A coordinator-established repeatable snapshot is required.');
    CalendarDay.parse(scope.fromDate); CalendarDay.parse(scope.throughDate);
    insist(scope.fromDate <= scope.throughDate && Number.isFinite(Date.parse(scope.cutoffAt)), 'invalid_scope', 'Reporting dates/cutoff are invalid.');
    // An organization-wide report cannot be inferred from a single branch grant.
    insist((await tx.query('SELECT servicing.full_report_scope() AS allowed')).rows[0].allowed, 'report_scope_unavailable', 'All reporting branches must be authorized.');
    const rows = await tx.query(`SELECT p.*,to_char(p.effective_date,'YYYY-MM-DD') AS effective_day,c.header FROM servicing.staff_postings p JOIN servicing.staff_money_commands c ON c.organization_id=p.organization_id AND c.id=p.command_id
      WHERE p.organization_id=$1 AND p.effective_date BETWEEN $2::date AND $3::date AND p.recorded_at<=$4::timestamptz ORDER BY p.event_id`, [scope.organizationId, scope.fromDate, scope.throughDate, scope.cutoffAt]);
    type Inventory = Extract<PrincipalReconciliationInput['servicing'], { state: 'available' }>;
    const events: Inventory['events'] = rows.rows.map(p => ({ organizationId: scope.organizationId, currency: 'PHP' as const, id: String(p.event_id), loanId: String(p.loan_id), kind: p.kind as 'disbursement' | 'repayment',
      effectiveDate: String(p.effective_day), recordedAt: (p.recorded_at as Date).toISOString(), amountCentavos: Number(p.amount_centavos),
      state: 'confirmed' as const, postingRuleVersionId: String(p.posting_rule_id), receiptId: p.receipt_id as string | null, journalId: String(p.journal_id) }));
    const allocations = rows.rows.map((p, i) => ({ organizationId: scope.organizationId, currency: 'PHP' as const, id: String(p.allocation_id), sourceEventId: String(p.event_id), loanId: String(p.loan_id),
      effectiveDate: events[i].effectiveDate, recordedAt: events[i].recordedAt, direction: p.kind === 'disbursement' ? 'increase' as const : 'decrease' as const,
      principalCentavos: Number(p.amount_centavos), interestCentavos: 0, feesCentavos: 0, unappliedCentavos: 0 }));
    const receipts = events.filter(e => e.receiptId).map(e => ({ organizationId: e.organizationId, currency: e.currency, id: e.receiptId!, sourceEventId: e.id,
      loanId: e.loanId, effectiveDate: e.effectiveDate, recordedAt: e.recordedAt, amountCentavos: e.amountCentavos }));
    // Pending commands must also be included; never start the inventory from GL IDs.
    const pending = await tx.query('SELECT DISTINCT ON (command_id) body,recorded_at FROM servicing.staff_money_revisions WHERE organization_id=$1 AND recorded_at<=$2::timestamptz ORDER BY command_id,version DESC', [scope.organizationId, scope.cutoffAt]);
    for (const row of pending.rows) {
      const c = inspectMoney(row.body);
      if (c.state === 'confirmed' || c.payload.effectiveDate < scope.fromDate || c.payload.effectiveDate > scope.throughDate) continue;
      events.push({ organizationId: c.organizationId, currency: 'PHP', id: c.eventId, loanId: c.loanId, kind: c.kind, effectiveDate: c.payload.effectiveDate, recordedAt: c.createdAt,
        amountCentavos: c.payload.amountCentavos, state: c.observations.some(o => o.input.state === 'confirmed') ? 'confirmed_unposted' : c.state,
        postingRuleVersionId: c.kind === 'disbursement' ? c.policy.releaseRuleId : c.policy.repaymentRuleId, receiptId: null, journalId: null });
    }
    const legacy = await tx.query('SELECT DISTINCT ON (command_id) body,recorded_at FROM servicing.command_revisions WHERE organization_id=$1 AND (recorded_at<=$2::timestamptz OR recorded_at IS NULL) ORDER BY command_id,version DESC', [scope.organizationId, scope.cutoffAt]);
    for (const row of legacy.rows) {
      const c = inspectCommand(row.body);
      if (events.some(e => e.id === c.businessEventId) || c.payload.effectiveDate < scope.fromDate || c.payload.effectiveDate > scope.throughDate) continue;
      if (row.recorded_at === null) return { state: 'unavailable' as const, reason: 'Historical command recording times are unavailable for this cutoff.' };
      // Resolve the explicit reviewed mapping even for unposted legacy events.
      const policy = this.reportPolicy?await this.reportPolicy.policy(tx,c.loanId,c.componentRuleVersionId):await this.ports.policy(tx, c.loanId);
      events.push({ organizationId: c.organizationId, currency: 'PHP', id: c.businessEventId, loanId: c.loanId, kind: 'disbursement', effectiveDate: c.payload.effectiveDate,
        recordedAt: (row.recorded_at as Date).toISOString(), amountCentavos: c.amountCentavos, state: c.observations.some(o => o.input.state === 'confirmed') ? 'confirmed_unposted' : c.state,
        postingRuleVersionId: policy.releaseRuleId, receiptId: null, journalId: null });
    }
    return { state: 'available' as const, snapshotId: scope.snapshotId, complete: true, events, allocations, receipts };
  }
}
export function loanMemberPorts(reads: LoanReads): Pick<MemberDomainPorts, 'loans'> { return { loans: tx => reads.memberLoans(tx) }; }
