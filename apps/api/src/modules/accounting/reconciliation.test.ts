import { describe, expect, it } from 'vitest';
import { PrincipalReconciliationInputSchema, reconcilePrincipalMovements, type PrincipalReconciliationInput } from './reconciliation.js';

type AvailableInput = Omit<PrincipalReconciliationInput, 'servicing' | 'ledger'> & {
  servicing: Extract<PrincipalReconciliationInput['servicing'], { state: 'available' }>;
  ledger: Extract<PrincipalReconciliationInput['ledger'], { state: 'available' }>;
};
const id = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const day = '2026-11-01', time = '2026-11-01T12:00:00Z';

/** Independent fictional principal-only expectations; no production calculation or demo fixture copying. */
function fixture(): AvailableInput {
  return {
    scope: { organizationId: id(1), fromDate: day, throughDate: day, cutoffAt: time, snapshotId: 'fictional-snapshot-1' },
    servicing: {
      state: 'available', snapshotId: 'fictional-snapshot-1', complete: true,
      events: [{ organizationId: id(1), id: id(2), loanId: id(3), currency: 'PHP', kind: 'repayment',
        effectiveDate: day, recordedAt: time, amountCentavos: 200_000, state: 'confirmed',
        postingRuleVersionId: id(4), receiptId: id(5), journalId: id(6) }],
      allocations: [{ organizationId: id(1), id: id(7), sourceEventId: id(2), loanId: id(3), currency: 'PHP',
        effectiveDate: day, recordedAt: time, direction: 'decrease', principalCentavos: 200_000,
        interestCentavos: 0, feesCentavos: 0, unappliedCentavos: 0 }],
      receipts: [{ organizationId: id(1), id: id(5), sourceEventId: id(2), loanId: id(3), currency: 'PHP',
        effectiveDate: day, recordedAt: time, amountCentavos: 200_000 }],
    },
    ledger: { state: 'available', snapshotId: 'fictional-snapshot-1', complete: true,
      journals: [{ organizationId: id(1), journalId: id(6), sourceEventId: id(2), currency: 'PHP',
        postingKind: 'repayment', postingRuleVersionId: id(4), effectiveDate: day, postedAt: time, reversalOfJournalId: null,
        lines: [{ accountId: id(8), side: 'debit', amountCentavos: 200_000 }, { accountId: id(9), side: 'credit', amountCentavos: 200_000 }] }] },
    mappings: [{ organizationId: id(1), currency: 'PHP', postingRuleVersionId: id(4), kind: 'repayment',
      effectiveFrom: '2026-01-01', effectiveThrough: '2026-12-31', cashAccountId: id(8), principalAccountId: id(9) }],
  };
}
const codes = (data: PrincipalReconciliationInput) => reconcilePrincipalMovements(data).events.flatMap(row => row.findings.map(finding => finding.code));
function addSecondPayment(data: AvailableInput) {
  data.servicing.events.push({ ...data.servicing.events[0], id: id(20), loanId: id(21), receiptId: id(22), journalId: id(23) });
  data.servicing.allocations.push({ ...data.servicing.allocations[0], id: id(24), sourceEventId: id(20), loanId: id(21) });
  data.servicing.receipts.push({ ...data.servicing.receipts[0], id: id(22), sourceEventId: id(20), loanId: id(21) });
  data.ledger.journals.push({ ...structuredClone(data.ledger.journals[0]), journalId: id(23), sourceEventId: id(20) });
}

describe('ACC-01 principal movement reconciliation', () => {
  it('matches an independently specified PHP 2,000 principal repayment across all records', () => {
    const report = reconcilePrincipalMovements(fixture());
    expect(report.status).toBe('matched');
    expect(report.events).toEqual([{ sourceEventId: id(2), loanId: id(3), amountCentavos: 200_000, status: 'matched',
      receiptIds: [id(5)], allocationIds: [id(7)], journalIds: [id(6)], findings: [] }]);
  });
  it('matches a principal disbursement with the opposite allocation/account direction and no repayment receipt', () => {
    const data = fixture();
    Object.assign(data.servicing.events[0], { kind: 'disbursement', amountCentavos: 1_000_000, receiptId: null });
    Object.assign(data.servicing.allocations[0], { direction: 'increase', principalCentavos: 1_000_000 });
    data.servicing.receipts = []; data.mappings[0].kind = 'disbursement';
    data.ledger.journals[0].postingKind = 'disbursement';
    data.ledger.journals[0].lines = [{ accountId: id(9), side: 'debit', amountCentavos: 1_000_000 }, { accountId: id(8), side: 'credit', amountCentavos: 1_000_000 }];
    expect(reconcilePrincipalMovements(data).status).toBe('matched');
  });
  it.each(['events', 'allocations', 'receipts'] as const)('detects missing %s', collection => {
    const data = fixture(); data.servicing[collection] = [];
    expect(codes(data)).toContain({ events: 'missing_event', allocations: 'missing_allocation', receipts: 'missing_receipt' }[collection]);
    expect(reconcilePrincipalMovements(data).status).toBe('discrepancy');
  });
  it('detects a missing journal even when the event claims a journal ID', () => {
    const data = fixture(); data.ledger.journals = [];
    expect(codes(data)).toContain('missing_journal');
  });
  it.each(['allocation', 'receipt', 'journal'] as const)('detects an orphan %s without an event', type => {
    const data = fixture(); data.servicing.events = [];
    if (type !== 'allocation') data.servicing.allocations = [];
    if (type !== 'receipt') data.servicing.receipts = [];
    if (type !== 'journal') data.ledger.journals = [];
    expect(codes(data)).toEqual(['missing_event']);
  });
  it.each(['events', 'allocations', 'receipts'] as const)('detects duplicated %s instead of discarding them', collection => {
    const data = fixture();
    // Mutate each correctly typed collection independently.
    if (collection === 'events') data.servicing.events.push(structuredClone(data.servicing.events[0]));
    if (collection === 'allocations') data.servicing.allocations.push(structuredClone(data.servicing.allocations[0]));
    if (collection === 'receipts') data.servicing.receipts.push(structuredClone(data.servicing.receipts[0]));
    expect(codes(data)).toContain({ events: 'duplicate_event', allocations: 'multiple_allocations', receipts: 'multiple_receipts' }[collection]);
  });
  it('detects duplicate journal rows from a broken reader', () => {
    const data = fixture(); data.ledger.journals.push(structuredClone(data.ledger.journals[0]));
    expect(codes(data)).toContain('multiple_journals');
  });
  it.each(['receipt', 'journal', 'allocation'] as const)('detects a %s ID reused across separate events', type => {
    const data = fixture(); addSecondPayment(data);
    if (type === 'receipt') data.servicing.receipts[1].id = data.servicing.receipts[0].id;
    if (type === 'journal') data.ledger.journals[1].journalId = data.ledger.journals[0].journalId;
    if (type === 'allocation') data.servicing.allocations[1].id = data.servicing.allocations[0].id;
    expect(codes(data)).toContain(`${type}_id_reused`);
  });
  it.each(['receiptId', 'journalId'] as const)('checks the actual %s reference, not just the amount', field => {
    const data = fixture(); data.servicing.events[0][field] = id(99);
    expect(codes(data)).toContain(field === 'receiptId' ? 'receipt_reference_mismatch' : 'journal_reference_mismatch');
  });
  it.each(['allocation', 'receipt'] as const)('checks the %s loan identity', type => {
    const data = fixture();
    (type === 'allocation' ? data.servicing.allocations[0] : data.servicing.receipts[0]).loanId = id(99);
    expect(codes(data)).toContain('loan_reference_mismatch');
  });
  it('shows exact expected and recorded receipt amounts', () => {
    const data = fixture(); data.servicing.receipts[0].amountCentavos = 190_000;
    expect(reconcilePrincipalMovements(data).events[0].findings).toContainEqual({
      code: 'receipt_amount_mismatch', level: 'discrepancy', expectedCentavos: 200_000, actualCentavos: 190_000,
    });
  });
  it('does not allow offsetting errors to disappear in an aggregate total', () => {
    const data = fixture(); addSecondPayment(data);
    data.servicing.receipts[0].amountCentavos = 190_000; data.servicing.receipts[1].amountCentavos = 210_000;
    const report = reconcilePrincipalMovements(data);
    expect(report.events.every(row => row.status === 'discrepancy')).toBe(true);
    expect(codes(data).filter(code => code === 'receipt_amount_mismatch')).toHaveLength(2);
  });
  it('checks loan principal movement and direction independently of receipt/journal agreement', () => {
    const data = fixture(); data.servicing.allocations[0].principalCentavos = 190_000; data.servicing.allocations[0].direction = 'increase';
    expect(codes(data)).toEqual(expect.arrayContaining(['principal_amount_mismatch', 'allocation_direction_mismatch']));
  });
  it.each(['interestCentavos', 'feesCentavos', 'unappliedCentavos'] as const)('leaves nonprincipal %s unavailable for this slice', field => {
    const data = fixture(); data.servicing.allocations[0][field] = 1;
    expect(codes(data)).toContain('nonprincipal_allocation');
    expect(reconcilePrincipalMovements(data).status).toBe('unavailable');
  });
  it('checks balanced entries against independent account mappings', () => {
    const data = fixture(); data.ledger.journals[0].lines[0].accountId = id(99);
    expect(codes(data)).toContain('journal_lines_mismatch');
  });
  it('detects reversed debit/credit sides even when the journal balances', () => {
    const data = fixture(); data.ledger.journals[0].lines.reverse().forEach(line => { line.side = line.side === 'debit' ? 'credit' : 'debit'; });
    expect(codes(data)).toContain('journal_lines_mismatch');
  });
  it('accepts equivalent line ordering/splitting without relying on array order', () => {
    const data = fixture(); data.ledger.journals[0].lines = [
      { accountId: id(9), side: 'credit', amountCentavos: 200_000 },
      { accountId: id(8), side: 'debit', amountCentavos: 150_000 }, { accountId: id(8), side: 'debit', amountCentavos: 50_000 },
    ];
    expect(reconcilePrincipalMovements(data).status).toBe('matched');
  });
  it('detects unbalanced journal amounts', () => {
    const data = fixture(); data.ledger.journals[0].lines[0].amountCentavos = 199_999;
    expect(codes(data)).toContain('unbalanced_journal');
  });
  it('uses exact totals when individual safe centavo values overflow in aggregate', () => {
    const data = fixture(); data.ledger.journals[0].lines = [
      { accountId: id(8), side: 'debit', amountCentavos: Number.MAX_SAFE_INTEGER },
      { accountId: id(8), side: 'debit', amountCentavos: 2 },
      { accountId: id(9), side: 'credit', amountCentavos: Number.MAX_SAFE_INTEGER },
      { accountId: id(9), side: 'credit', amountCentavos: 1 },
    ];
    expect(codes(data)).toEqual(expect.arrayContaining(['journal_total_overflow', 'unbalanced_journal']));
  });
  it('does not invent an accounting mapping', () => {
    const data = fixture(); data.mappings = [];
    expect(reconcilePrincipalMovements(data).status).toBe('unavailable');
    expect(codes(data)).toContain('posting_mapping_unavailable');
  });
  it('requires the dated mapping and the actual journal rule version', () => {
    const data = fixture(); data.mappings[0].effectiveThrough = '2026-10-31';
    data.ledger.journals[0].postingRuleVersionId = id(99);
    expect(codes(data)).toEqual(expect.arrayContaining(['posting_mapping_unavailable', 'posting_rule_mismatch']));
  });
  it('keeps reversal/other posting kinds explicitly unsupported', () => {
    const data = fixture(); data.ledger.journals[0].postingKind = 'reversal'; data.ledger.journals[0].reversalOfJournalId = id(99);
    expect(reconcilePrincipalMovements(data).status).toBe('unavailable');
    expect(codes(data)).toContain('unsupported_journal_kind');
  });
  it('does not mislabel an unsupported standalone journal as a missing loan payment', () => {
    const data = fixture(); data.servicing.events = []; data.servicing.allocations = []; data.servicing.receipts = [];
    data.ledger.journals[0].postingKind = 'share_capital';
    expect(reconcilePrincipalMovements(data).status).toBe('unavailable');
    expect(codes(data)).toEqual(['unsupported_journal_kind']);
  });
  it.each(['prepared', 'authorized', 'submitted', 'unknown', 'confirmed_unposted', 'failed'] as const)('handles %s without assuming a completed payment', state => {
    const data = fixture(); data.servicing.events[0].state = state;
    data.servicing.events[0].receiptId = null; data.servicing.events[0].journalId = null;
    data.servicing.allocations = []; data.servicing.receipts = []; data.ledger.journals = [];
    const report = reconcilePrincipalMovements(data);
    expect(report.status).toBe(state === 'failed' ? 'matched' : state === 'confirmed_unposted' ? 'discrepancy' : 'pending');
    if (state === 'confirmed_unposted') expect(codes(data)).toContain('confirmed_unposted');
  });
  it('flags posted effects attached to a failed or unresolved command', () => {
    const data = fixture(); data.servicing.events[0].state = 'failed';
    expect(codes(data)).toContain('unexpected_posted_evidence');
  });
  it('retains a confirmed-but-unposted exception without treating its receipt as a loan/GL posting', () => {
    const data = fixture(); data.servicing.events[0].state = 'confirmed_unposted'; data.servicing.events[0].journalId = null;
    data.servicing.allocations = []; data.ledger.journals = [];
    expect(codes(data)).toEqual(['confirmed_unposted']);
  });
  it.each(['servicing', 'ledger'] as const)('does not turn unavailable %s evidence into zero records', source => {
    const data: PrincipalReconciliationInput = fixture(); data[source] = { state: 'unavailable', reason: 'Source is not connected.' };
    expect(reconcilePrincipalMovements(data)).toMatchObject({ status: 'unavailable', events: [], sourceIssues: [`${source}: Source is not connected.`] });
  });
  it.each(['servicing', 'ledger'] as const)('does not reconcile a partial %s inventory', source => {
    const data = fixture(); data[source].complete = false;
    expect(reconcilePrincipalMovements(data)).toMatchObject({ status: 'unavailable', events: [], sourceIssues: [`${source}: incomplete inventory`] });
  });
  it('requires both source inventories to share the requested snapshot', () => {
    const data = fixture(); data.ledger.snapshotId = 'a-different-snapshot';
    expect(reconcilePrincipalMovements(data)).toMatchObject({ status: 'unavailable', events: [], sourceIssues: ['ledger: snapshot mismatch'] });
  });
  it('distinguishes a complete empty scope from a matched payment', () => {
    const data = fixture(); data.servicing.events = []; data.servicing.allocations = []; data.servicing.receipts = []; data.ledger.journals = [];
    expect(reconcilePrincipalMovements(data).status).toBe('empty');
  });
  it('is deterministic, sorts events, and leaves its inputs unchanged', () => {
    const data = fixture(); addSecondPayment(data); const saved = structuredClone(data);
    const first = reconcilePrincipalMovements(data);
    expect(data).toEqual(saved);
    data.servicing.events.reverse(); data.servicing.receipts.reverse(); data.servicing.allocations.reverse(); data.ledger.journals.reverse();
    expect(reconcilePrincipalMovements(data)).toEqual(first);
  });
  it('keeps discrepancy output stable when evidence arrives in a different order', () => {
    const data = fixture(); data.servicing.receipts[0].amountCentavos = 190_000;
    data.servicing.receipts.push({ ...data.servicing.receipts[0], id: id(30), amountCentavos: 180_000 });
    const first = reconcilePrincipalMovements(data); data.servicing.receipts.reverse();
    expect(reconcilePrincipalMovements(data)).toEqual(first);
  });
  it('preserves the largest supported exact centavo amount', () => {
    const data = fixture(); data.servicing.events[0].amountCentavos = Number.MAX_SAFE_INTEGER;
    data.servicing.receipts[0].amountCentavos = Number.MAX_SAFE_INTEGER;
    data.servicing.allocations[0].principalCentavos = Number.MAX_SAFE_INTEGER;
    data.ledger.journals[0].lines.forEach(line => { line.amountCentavos = Number.MAX_SAFE_INTEGER; });
    expect(reconcilePrincipalMovements(data).status).toBe('matched');
  });
});

describe('ACC-01 evidence validation', () => {
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid event amount %s', amount => {
    const data = fixture(); data.servicing.events[0].amountCentavos = amount;
    expect(() => reconcilePrincipalMovements(data)).toThrow();
  });
  it('requires explicit allocation components instead of filling missing values with zero', () => {
    const data = fixture(); const { interestCentavos: omitted, ...allocation } = data.servicing.allocations[0];
    expect(omitted).toBe(0);
    expect(PrincipalReconciliationInputSchema.safeParse({ ...data, servicing: { ...data.servicing, allocations: [allocation] } }).success).toBe(false);
  });
  it.each(['event', 'allocation', 'receipt', 'journal', 'mapping'] as const)('rejects another organization in %s evidence', type => {
    const data = fixture();
    const record = { event: data.servicing.events[0], allocation: data.servicing.allocations[0], receipt: data.servicing.receipts[0], journal: data.ledger.journals[0], mapping: data.mappings[0] }[type];
    record.organizationId = id(99);
    expect(() => reconcilePrincipalMovements(data)).toThrow(/another organization/);
  });
  it.each(['event', 'allocation', 'receipt', 'journal'] as const)('rejects %s evidence recorded after the cutoff', type => {
    const data = fixture(); const later = '2026-11-01T12:00:01Z';
    if (type === 'journal') data.ledger.journals[0].postedAt = later;
    else ({ event: data.servicing.events[0], allocation: data.servicing.allocations[0], receipt: data.servicing.receipts[0] }[type]).recordedAt = later;
    expect(() => reconcilePrincipalMovements(data)).toThrow(/after the cutoff/);
  });
  it('compares timestamp instants correctly across offsets', () => {
    const data = fixture(); data.ledger.journals[0].postedAt = '2026-11-01T20:00:00+08:00';
    expect(reconcilePrincipalMovements(data).status).toBe('matched');
  });
  it('rejects out-of-range evidence rather than silently filtering away an orphan', () => {
    const data = fixture(); data.ledger.journals[0].effectiveDate = '2026-10-31';
    expect(() => reconcilePrincipalMovements(data)).toThrow(/outside the requested/);
  });
  it('compares effective dates within the same requested range', () => {
    const data = fixture(); data.scope.fromDate = '2026-10-31'; data.servicing.receipts[0].effectiveDate = '2026-10-31';
    expect(codes(data)).toContain('effective_date_mismatch');
  });
  it('rejects ambiguous mapping versions and invalid account identities', () => {
    const data = fixture(); data.mappings.push(structuredClone(data.mappings[0]));
    expect(() => reconcilePrincipalMovements(data)).toThrow(/ambiguous/);
    data.mappings.pop(); data.mappings[0].cashAccountId = data.mappings[0].principalAccountId;
    expect(() => reconcilePrincipalMovements(data)).toThrow(/Invalid principal posting mapping/);
  });
  it('rejects invalid dates, reversed ranges, unsupported currency, and unexpected fields', () => {
    const data = fixture();
    for (const scope of [{ ...data.scope, fromDate: '2026-02-30' }, { ...data.scope, fromDate: '2026-11-02' }])
      expect(PrincipalReconciliationInputSchema.safeParse({ ...data, scope }).success).toBe(false);
    expect(PrincipalReconciliationInputSchema.safeParse({ ...data, ledger: { ...data.ledger, journals: [{ ...data.ledger.journals[0], currency: 'USD' }] } }).success).toBe(false);
    expect(PrincipalReconciliationInputSchema.safeParse({ ...data, actor: { roles: ['accountant'] } }).success).toBe(false);
  });
});
