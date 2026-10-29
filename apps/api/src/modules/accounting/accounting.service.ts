import type { z } from 'zod';
import { CalendarDay, JournalReceiptSchema, PostingRequestSchema } from '../../../../../packages/contracts/src/schemas.js';
import type { PostingPort, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { ApiError } from '../../platform/errors.js';

export type PostingRequest = z.input<typeof PostingRequestSchema>;

/** Extra orchestration helper: call before taking servicing loan/command locks. */
export async function lockPostingPeriod(tx: TransactionContext, date: string): Promise<void> {
  const day = CalendarDay.parse(date);
  try { await tx.query('SELECT accounting.lock_period($1::date)', [day]); }
  catch (error) { throw accountingError(error); }
}

function accountingError(error: unknown): unknown {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const failures: Record<string, [number, string, string]> = {
    AG403: [403, 'posting_forbidden', 'Your current role cannot post accounting entries.'],
    AG409: [409, 'period_not_open', 'The posting date needs an open accounting period.'],
    AG412: [409, 'financial_event_conflict', 'This financial event or reversal was already recorded differently.'],
    AG422: [422, 'invalid_posting', 'The posting does not match its accounts, rules or reversal basis.'],
    '23503': [422, 'invalid_posting_reference', 'A required accounting reference is unavailable.'],
    '23505': [409, 'financial_event_conflict', 'The financial event or reversal is already recorded.'],
    '23514': [422, 'invalid_posting', 'The posting violates an accounting integrity rule.'],
  };
  const failure = failures[code];
  return failure ? new ApiError(...failure) : error;
}

export class AccountingService implements PostingPort {
  /** Returns a provisional receipt; only the caller's unit of work commits. */
  async post(tx: TransactionContext, input: PostingRequest) {
    const request = PostingRequestSchema.parse(input);
    const total = (side: 'debit' | 'credit') => request.lines.filter(line => line.side === side)
      .reduce((sum, line) => sum + BigInt(line.amountCentavos), 0n);
    const debits = total('debit');
    if (debits !== total('credit') || debits < 1n || debits > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new ApiError(422, 'unbalanced_posting', 'Record balanced nonzero entries within the supported centavo range.');
    }
    try {
      const result = await tx.query<{ receipt: unknown }>('SELECT accounting.post_journal($1::jsonb,$2) AS receipt',
        [JSON.stringify(request), tx.actor.correlationId]);
      return JournalReceiptSchema.parse(result.rows[0]?.receipt);
    } catch (error) { throw accountingError(error); }
  }
}
