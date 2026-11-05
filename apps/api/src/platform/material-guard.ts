import type { TransactionContext, MemberTransactionContext } from '../../../../packages/contracts/src/ports.js';

/** Coarse serialization for the small fictional pilot, not a production throughput policy.
 * Acquire after identity guards, before accounting periods, application rows or commands.
 * Workers and operator writers use the identical key in their short transactions.
 */
export const MATERIAL_LOCK_SQL = 'SELECT pg_advisory_xact_lock(hashtextextended($1,0))';
export const materialLockKey = (organizationId: string) => `agap.pilot.material:${organizationId}`;
export async function lockPilotMaterial(tx: TransactionContext | MemberTransactionContext) {
  await tx.query(MATERIAL_LOCK_SQL, [materialLockKey(tx.actor.organizationId)]);
}
