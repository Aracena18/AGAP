import type { MemberTransactionContext, TransactionContext } from '../../../../packages/contracts/src/ports.js';
import { ApiError } from './errors.js';

/** Internal marker, never supplied by HTTP. The coordinator acquires this first. */
export const lendingTransactionGuard = Symbol('lending-transaction-guard');
export const lendingLockSql = "SELECT pg_advisory_xact_lock(hashtextextended('agap:connected-lending:' || $1::text,0))";
export function requireLendingTransaction(tx: TransactionContext | MemberTransactionContext) {
  if (!(lendingTransactionGuard in tx) || tx[lendingTransactionGuard] !== true)
    throw new ApiError(503, 'lending_transaction_unavailable', 'The connected lending transaction guard is unavailable. No lending action was recorded.');
}
