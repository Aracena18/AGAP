import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { AccountingService, type PostingRequest } from './accounting.service.js';

const request = (): PostingRequest => ({ sourceEventId: randomUUID(), postingKind: 'disbursement',
  postingRuleVersionId: randomUUID(), effectiveDate: '2026-10-29', currency: 'PHP', reversalOfJournalId: null,
  lines: [{ accountId: randomUUID(), side: 'debit', amountCentavos: 1_000_000 },
    { accountId: randomUUID(), side: 'credit', amountCentavos: 1_000_000 }] });

describe('GL-01 boundary validation', () => {
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity])('rejects invalid line amount %s before database work', async amount => {
    const query = vi.fn();
    const data = request(); data.lines[0].amountCentavos = amount;
    await expect(new AccountingService().post({ query } as unknown as TransactionContext, data)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects unequal totals before database work', async () => {
    const query = vi.fn(); const data = request(); data.lines[1].amountCentavos = 999_999;
    await expect(new AccountingService().post({ query } as unknown as TransactionContext, data)).rejects.toMatchObject({ code: 'unbalanced_posting' });
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects balanced totals outside the safe integer range without lossy summation', async () => {
    const query = vi.fn(); const data = request();
    data.lines = ['debit', 'credit'].flatMap(side => [Number.MAX_SAFE_INTEGER, 1].map(amountCentavos => ({ accountId: randomUUID(), side: side as 'debit' | 'credit', amountCentavos })));
    await expect(new AccountingService().post({ query } as unknown as TransactionContext, data)).rejects.toMatchObject({ code: 'unbalanced_posting' });
    expect(query).not.toHaveBeenCalled();
  });
  it.each(['2026-02-30', '2026-13-01', '2026-10-29T00:00:00Z'])('rejects invalid calendar date %s', async effectiveDate => {
    const data = { ...request(), effectiveDate }; const query = vi.fn();
    await expect(new AccountingService().post({ query } as unknown as TransactionContext, data)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });
});
