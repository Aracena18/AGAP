import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { canonical } from '../../platform/commands.js';
import { notFound } from '../../platform/errors.js';
import { fingerprint } from './command-rules.js';
import { inspectMoney } from './money-rules.js';
import { PostedResultSchema, type MoneyCommand, type PostedResult } from './money-context.js';

export class MoneyRepository {
  async lockLoan(tx: TransactionContext, loan: string) {
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('servicing:loan:'||$1||':'||$2,0))", [tx.actor.organizationId, loan]);
  }
  async find(tx: TransactionContext, id: string) {
    const r = (await tx.query('SELECT body,body_hash FROM servicing.staff_money_revisions WHERE organization_id=$1 AND command_id=$2 ORDER BY version DESC LIMIT 1', [tx.actor.organizationId, id])).rows[0];
    if (!r) return null;
    const c = inspectMoney(r.body);
    if (fingerprint(c) !== r.body_hash) throw new Error('Money revision integrity failed');
    return c;
  }
  async get(tx: TransactionContext, id: string) { const c = await this.find(tx, id); if (!c) throw notFound(); return c; }
  async create(tx: TransactionContext, c: MoneyCommand) {
    await tx.query('INSERT INTO servicing.money_commands(id,organization_id,branch_id,loan_id,application_id,kind,event_id,provider_key,schedule_index,header_text) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [c.id, c.organizationId, c.branchId, c.loanId, c.applicationId, c.kind, c.eventId, c.providerKey, c.scheduleIndex, canonical(c)]);
    await this.append(tx, c);
  }
  async append(tx: TransactionContext, input: MoneyCommand) {
    const c = inspectMoney(input);
    await tx.query('INSERT INTO servicing.money_revisions(organization_id,branch_id,command_id,version,actor_id,body_text,body_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [c.organizationId, c.branchId, c.id, c.version, tx.actor.userId, canonical(c), fingerprint(c)]);
  }
  async result(tx: TransactionContext, commandId: string) {
    const row = (await tx.query('SELECT r.body FROM servicing.staff_postings p JOIN servicing.staff_money_revisions r ON r.organization_id=p.organization_id AND r.command_id=p.command_id AND r.version=p.command_version WHERE p.organization_id=$1 AND p.command_id=$2', [tx.actor.organizationId, commandId])).rows[0];
    return row ? PostedResultSchema.parse(inspectMoney(row.body).posting) : null;
  }
  async events(tx: TransactionContext, loanId: string) {
    const rows = await tx.query('SELECT r.body FROM servicing.staff_postings p JOIN servicing.staff_money_revisions r ON r.organization_id=p.organization_id AND r.command_id=p.command_id AND r.version=p.command_version WHERE p.organization_id=$1 AND p.loan_id=$2 ORDER BY p.recorded_at,p.event_id', [tx.actor.organizationId, loanId]);
    return rows.rows.map(r => PostedResultSchema.parse(inspectMoney(r.body).posting));
  }
  async commands(tx: TransactionContext, loanId: string) {
    const rows = await tx.query('SELECT DISTINCT ON (command_id) body FROM servicing.staff_money_revisions WHERE organization_id=$1 AND body->>\'loanId\'=$2 ORDER BY command_id,version DESC', [tx.actor.organizationId, loanId]);
    return rows.rows.map(r => inspectMoney(r.body));
  }
  async insertPosted(tx: TransactionContext, c: MoneyCommand, p: PostedResult) {
    await tx.query(`INSERT INTO servicing.postings(event_id,organization_id,branch_id,loan_id,command_id,command_version,kind,
      amount_centavos,effective_date,recorded_at,journal_id,posting_rule_id,allocation_id,receipt_id,schedule_index,principal_after)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [p.eventId, c.organizationId, c.branchId, c.loanId, c.id, c.version, c.kind, p.amountCentavos, p.effectiveDate, p.postedAt,
      p.journalId, p.postingRuleVersionId, p.eventId, p.receiptId, c.scheduleIndex, p.principalAfterCentavos]);
  }
  async claimMovement(tx: TransactionContext, c: MoneyCommand, producer: string, movementId: string) {
    await tx.query('INSERT INTO servicing.money_movements VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [c.organizationId, c.branchId, producer, movementId, c.id]);
    return (await tx.query('SELECT servicing.money_movement_conflict($1,$2,$3) AS conflict', [producer, movementId, c.id])).rows[0].conflict as boolean;
  }
}
