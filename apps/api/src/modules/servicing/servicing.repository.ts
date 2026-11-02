import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { canonical } from '../../platform/commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { PendingOriginationSchema, type Command, type DeepReadonly, type PendingOrigination } from './context.js';
import { fingerprint, inspectCommand } from './command-rules.js';

export class ServicingRepository {
  async lockApplication(tx: TransactionContext, applicationId: string) {
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('servicing:application:'||$1||':'||$2,0))", [tx.actor.organizationId, applicationId]);
  }
  async originForApplication(tx: TransactionContext, applicationId: string) {
    const result = await tx.query('SELECT body,body_hash FROM servicing.originations WHERE organization_id=$1 AND application_id=$2', [tx.actor.organizationId, applicationId]);
    if (!result.rows[0]) return null;
    const body = PendingOriginationSchema.parse(result.rows[0].body);
    if (fingerprint(body) !== result.rows[0].body_hash) throw new ApiError(503, 'servicing_integrity', 'The saved origination cannot be verified.');
    return body;
  }
  async origin(tx: TransactionContext, id: string) {
    const result = await tx.query('SELECT application_id FROM servicing.originations WHERE organization_id=$1 AND id=$2', [tx.actor.organizationId, id]);
    if (!result.rows[0]) throw notFound();
    return (await this.originForApplication(tx, result.rows[0].application_id as string))!;
  }
  async insertOrigin(tx: TransactionContext, input: DeepReadonly<PendingOrigination>) {
    const b = PendingOriginationSchema.parse(input);
    await tx.query('INSERT INTO servicing.originations(id,organization_id,branch_id,member_id,application_id,prepared_by,body_text,body_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [b.id, b.organizationId, b.branchId, b.memberId, b.applicationId, tx.actor.userId, canonical(b), fingerprint(b)]);
  }
  async claim(tx: TransactionContext, input: DeepReadonly<Command>) {
    const b = inspectCommand(input);
    await tx.query('INSERT INTO servicing.release_claims(command_id,organization_id,branch_id,origination_id,business_event_id,provider_key) VALUES($1,$2,$3,$4,$5,$6)',
      [b.id, b.organizationId, b.branchId, b.loanId, b.businessEventId, b.providerKey]);
  }
  async hasClaim(tx: TransactionContext, loanId: string) {
    return (await tx.query('SELECT command_id FROM servicing.release_claims WHERE organization_id=$1 AND origination_id=$2', [tx.actor.organizationId, loanId])).rowCount !== 0;
  }
  async command(tx: TransactionContext, id: string) {
    const row = (await tx.query('SELECT body,body_hash FROM servicing.command_revisions WHERE organization_id=$1 AND command_id=$2 ORDER BY version DESC LIMIT 1', [tx.actor.organizationId, id])).rows[0];
    if (!row) throw notFound();
    const b = inspectCommand(row.body);
    if (fingerprint(b) !== row.body_hash) throw new ApiError(503, 'servicing_integrity', 'The saved command cannot be verified.');
    return b;
  }
  async append(tx: TransactionContext, input: DeepReadonly<Command>) {
    const b = inspectCommand(input);
    await tx.query('INSERT INTO servicing.command_revisions(organization_id,branch_id,command_id,version,state,actor_id,body_text,body_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [b.organizationId, b.branchId, b.id, b.version, b.state, tx.actor.userId, canonical(b), fingerprint(b)]);
  }
  async movementConflict(tx: TransactionContext, b: DeepReadonly<Command>, producer: string, movement: string) {
    await tx.query('INSERT INTO servicing.movement_claims(organization_id,branch_id,producer,movement_id,command_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [b.organizationId, b.branchId, producer, movement, b.id]);
    // A conflicting claim in another branch must not disappear behind RLS.
    const result = await tx.query('SELECT servicing.movement_conflict($1,$2,$3) AS conflict', [producer, movement, b.id]);
    return result.rows[0].conflict as boolean;
  }
  async insertObservation(tx: TransactionContext, b: DeepReadonly<Command>) {
    const o = b.observations.at(-1)!;
    await tx.query('INSERT INTO servicing.observations(id,organization_id,branch_id,command_id,command_version,body_text,body_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [o.input.id, b.organizationId, b.branchId, b.id, b.version, canonical(o), fingerprint(o)]);
  }
}
