import { z } from 'zod';
import {
  CalendarDay, Currency, FinancialCommandSchema, Id, Instant, MoneyAmount,
  PositiveMoneyAmount, PostingRequestSchema, Text,
} from '../../../../../packages/contracts/src/schemas.js';

// Accounting-local proposal for review with Robert/Benedict, not a published API.
const Kind = z.enum(['disbursement', 'repayment']);
const ScopeSchema = z.strictObject({
  organizationId: Id, fromDate: CalendarDay, throughDate: CalendarDay,
  cutoffAt: Instant, snapshotId: Text,
}).refine(scope => scope.fromDate <= scope.throughDate, 'The date range is reversed.');
const RecordScope = { organizationId: Id, currency: Currency };
const EventSchema = z.strictObject({
  ...RecordScope, id: Id, loanId: Id, kind: Kind, effectiveDate: CalendarDay,
  recordedAt: Instant, amountCentavos: PositiveMoneyAmount,
  state: FinancialCommandSchema.shape.state, postingRuleVersionId: Id,
  receiptId: Id.nullable(), journalId: Id.nullable(),
});
const AllocationSchema = z.strictObject({
  ...RecordScope, id: Id, sourceEventId: Id, loanId: Id,
  effectiveDate: CalendarDay, recordedAt: Instant, direction: z.enum(['increase', 'decrease']),
  principalCentavos: MoneyAmount, interestCentavos: MoneyAmount,
  feesCentavos: MoneyAmount, unappliedCentavos: MoneyAmount,
});
const ReceiptSchema = z.strictObject({
  ...RecordScope, id: Id, sourceEventId: Id, loanId: Id,
  effectiveDate: CalendarDay, recordedAt: Instant, amountCentavos: PositiveMoneyAmount,
});
const JournalSchema = PostingRequestSchema.extend({ organizationId: Id, journalId: Id, postedAt: Instant });
const MappingSchema = z.strictObject({
  ...RecordScope, postingRuleVersionId: Id, kind: Kind,
  effectiveFrom: CalendarDay, effectiveThrough: CalendarDay,
  cashAccountId: Id, principalAccountId: Id,
}).refine(mapping => mapping.effectiveFrom <= mapping.effectiveThrough
  && mapping.cashAccountId !== mapping.principalAccountId, 'Invalid principal posting mapping.');
const Unavailable = z.strictObject({ state: z.literal('unavailable'), reason: Text });
const SourceMetadata = { state: z.literal('available'), snapshotId: Text, complete: z.boolean() };

/** Complete inventories, including records without a matching record in the other source. */
export const PrincipalReconciliationInputSchema = z.strictObject({
  scope: ScopeSchema,
  servicing: z.discriminatedUnion('state', [Unavailable, z.strictObject({
    ...SourceMetadata, events: z.array(EventSchema), allocations: z.array(AllocationSchema), receipts: z.array(ReceiptSchema),
  })]),
  ledger: z.discriminatedUnion('state', [Unavailable, z.strictObject({ ...SourceMetadata, journals: z.array(JournalSchema) })]),
  mappings: z.array(MappingSchema),
}).superRefine((input, context) => {
  const reject = (path: (string | number)[], message: string) => context.addIssue({ code: 'custom', path, message });
  const check = (record: { organizationId: string; effectiveDate: string }, time: string, path: (string | number)[]) => {
    if (record.organizationId !== input.scope.organizationId) reject(path, 'Evidence belongs to another organization.');
    if (record.effectiveDate < input.scope.fromDate || record.effectiveDate > input.scope.throughDate)
      reject(path, 'Evidence is outside the requested effective-date range.');
    if (Date.parse(time) > Date.parse(input.scope.cutoffAt)) reject(path, 'Evidence was recorded after the cutoff.');
  };
  if (input.servicing.state === 'available') {
    for (const collection of ['events', 'allocations', 'receipts'] as const)
      input.servicing[collection].forEach((record, index) => check(record, record.recordedAt, ['servicing', collection, index]));
  }
  if (input.ledger.state === 'available')
    input.ledger.journals.forEach((record, index) => check(record, record.postedAt, ['ledger', 'journals', index]));
  const mappingIds = new Set<string>();
  input.mappings.forEach((mapping, index) => {
    if (mapping.organizationId !== input.scope.organizationId) reject(['mappings', index], 'Mapping belongs to another organization.');
    if (mappingIds.has(mapping.postingRuleVersionId)) reject(['mappings', index], 'Mapping version is ambiguous.');
    mappingIds.add(mapping.postingRuleVersionId);
  });
});

export type PrincipalReconciliationInput = z.input<typeof PrincipalReconciliationInputSchema>;
type Level = 'discrepancy' | 'pending' | 'unavailable';
export interface ReconciliationFinding {
  code: string;
  level: Level;
  expectedCentavos: number | null;
  actualCentavos: number | null;
}
export interface ReconciledEvent {
  sourceEventId: string;
  loanId: string | null;
  amountCentavos: number | null;
  status: 'matched' | Level;
  receiptIds: string[];
  allocationIds: string[];
  journalIds: string[];
  findings: ReconciliationFinding[];
}
export interface PrincipalReconciliationReport {
  scope: z.output<typeof ScopeSchema>;
  status: 'matched' | 'empty' | Level;
  sourceIssues: string[];
  events: ReconciledEvent[];
}

function group<T>(records: T[], key: (record: T) => string): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const record of records) {
    const id = key(record);
    const values = result.get(id) ?? [];
    values.push(record); result.set(id, values);
  }
  return result;
}
function status(findings: ReconciliationFinding[]): ReconciledEvent['status'] {
  for (const level of ['unavailable', 'discrepancy', 'pending'] as const)
    if (findings.some(finding => finding.level === level)) return level;
  return 'matched';
}

/** Pure comparison only. The caller must establish authorization and a consistent snapshot. */
export function reconcilePrincipalMovements(value: PrincipalReconciliationInput): PrincipalReconciliationReport {
  const { scope, servicing, ledger, mappings } = PrincipalReconciliationInputSchema.parse(value);
  const sourceIssues: string[] = [];
  for (const [name, source] of [['servicing', servicing], ['ledger', ledger]] as const) {
    if (source.state === 'unavailable') sourceIssues.push(`${name}: ${source.reason}`);
    else {
      if (!source.complete) sourceIssues.push(`${name}: incomplete inventory`);
      if (source.snapshotId !== scope.snapshotId) sourceIssues.push(`${name}: snapshot mismatch`);
    }
  }
  if (servicing.state === 'unavailable' || ledger.state === 'unavailable' || sourceIssues.length)
    return { scope, status: 'unavailable', sourceIssues, events: [] };

  const events = group(servicing.events, record => record.id);
  const allocations = group(servicing.allocations, record => record.sourceEventId);
  const receipts = group(servicing.receipts, record => record.sourceEventId);
  const journals = group(ledger.journals, record => record.sourceEventId);
  const allocationIds = group(servicing.allocations, record => record.id);
  const receiptIds = group(servicing.receipts, record => record.id);
  const journalIds = group(ledger.journals, record => record.journalId);
  const ids = [...new Set([...events.keys(), ...allocations.keys(), ...receipts.keys(), ...journals.keys()])].sort();
  const results = ids.map(sourceEventId => {
    const matches = events.get(sourceEventId) ?? [];
    const event = matches.length === 1 ? matches[0] : undefined;
    const eventAllocations = allocations.get(sourceEventId) ?? [];
    const eventReceipts = receipts.get(sourceEventId) ?? [];
    const eventJournals = journals.get(sourceEventId) ?? [];
    const findings: ReconciliationFinding[] = [];
    const add = (code: string, level: Level = 'discrepancy', expectedCentavos: number | null = null, actualCentavos: number | null = null) => {
      findings.push({ code, level, expectedCentavos, actualCentavos });
    };
    const row = (): ReconciledEvent => ({ sourceEventId, loanId: event?.loanId ?? null, amountCentavos: event?.amountCentavos ?? null,
      status: status(findings), receiptIds: eventReceipts.map(record => record.id).sort(), allocationIds: eventAllocations.map(record => record.id).sort(),
      journalIds: eventJournals.map(record => record.journalId).sort(),
      findings: findings.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))) });
    if (!event) { add(matches.length ? 'duplicate_event' : 'missing_event'); return row(); }
    // IDs must be unique across the inventory, including different source events.
    if (eventAllocations.some(record => allocationIds.get(record.id)!.length > 1)) add('allocation_id_reused');
    if (eventReceipts.some(record => receiptIds.get(record.id)!.length > 1)) add('receipt_id_reused');
    if (eventJournals.some(record => journalIds.get(record.journalId)!.length > 1)) add('journal_id_reused');
    if (event.state !== 'confirmed') {
      if (event.state === 'confirmed_unposted') add('confirmed_unposted');
      else if (event.state !== 'failed') add(event.state === 'unknown' ? 'movement_unknown' : 'movement_pending', 'pending');
      // A confirmed-but-unposted external movement can already have receipt evidence.
      if (eventAllocations.length || eventJournals.length || event.journalId
        || (event.state !== 'confirmed_unposted' && (eventReceipts.length || event.receiptId)))
        add('unexpected_posted_evidence');
      return row();
    }
    const payment = event;
    if (eventAllocations.length !== 1) add(eventAllocations.length ? 'multiple_allocations' : 'missing_allocation');
    if (payment.kind === 'repayment') {
      if (eventReceipts.length !== 1) add(eventReceipts.length ? 'multiple_receipts' : 'missing_receipt');
      if (!payment.receiptId || eventReceipts.length !== 1 || eventReceipts[0].id !== payment.receiptId) add('receipt_reference_mismatch');
    } else if (eventReceipts.length || payment.receiptId) add('unexpected_repayment_receipt');
    if (eventJournals.length !== 1) add(eventJournals.length ? 'multiple_journals' : 'missing_journal');
    if (!payment.journalId || eventJournals.length !== 1 || eventJournals[0].journalId !== payment.journalId) add('journal_reference_mismatch');

    for (const record of [...eventAllocations, ...eventReceipts]) {
      if (record.loanId !== payment.loanId) add('loan_reference_mismatch');
      if (record.effectiveDate !== payment.effectiveDate) add('effective_date_mismatch');
    }
    for (const receipt of eventReceipts)
      if (receipt.amountCentavos !== payment.amountCentavos) add('receipt_amount_mismatch', 'discrepancy', payment.amountCentavos, receipt.amountCentavos);
    for (const allocation of eventAllocations) {
      if (allocation.direction !== (payment.kind === 'disbursement' ? 'increase' : 'decrease')) add('allocation_direction_mismatch');
      if (allocation.interestCentavos || allocation.feesCentavos || allocation.unappliedCentavos) add('nonprincipal_allocation', 'unavailable');
      if (allocation.principalCentavos !== payment.amountCentavos)
        add('principal_amount_mismatch', 'discrepancy', payment.amountCentavos, allocation.principalCentavos);
    }
    const mapping = mappings.find(record => record.postingRuleVersionId === payment.postingRuleVersionId
      && record.kind === payment.kind && record.effectiveFrom <= payment.effectiveDate && record.effectiveThrough >= payment.effectiveDate);
    if (!mapping) add('posting_mapping_unavailable', 'unavailable');
    for (const journal of eventJournals) {
      if (journal.effectiveDate !== payment.effectiveDate) add('effective_date_mismatch');
      if (journal.postingKind !== payment.kind || journal.reversalOfJournalId !== null) add('unsupported_journal_kind', 'unavailable');
      if (journal.postingRuleVersionId !== payment.postingRuleVersionId) add('posting_rule_mismatch');
      const sum = (side: 'debit' | 'credit') => journal.lines.filter(line => line.side === side)
        .reduce((total, line) => total + BigInt(line.amountCentavos), 0n);
      const debits = sum('debit'), credits = sum('credit');
      if (debits > BigInt(Number.MAX_SAFE_INTEGER) || credits > BigInt(Number.MAX_SAFE_INTEGER)) add('journal_total_overflow');
      if (debits !== credits) add('unbalanced_journal');
      if (mapping) {
        const expected = new Map([
          [`${mapping.cashAccountId}:${payment.kind === 'repayment' ? 'debit' : 'credit'}`, BigInt(payment.amountCentavos)],
          [`${mapping.principalAccountId}:${payment.kind === 'repayment' ? 'credit' : 'debit'}`, BigInt(payment.amountCentavos)],
        ]);
        const actual = new Map<string, bigint>();
        for (const line of journal.lines) {
          const key = `${line.accountId}:${line.side}`;
          actual.set(key, (actual.get(key) ?? 0n) + BigInt(line.amountCentavos));
        }
        if (actual.size !== expected.size || [...expected].some(([key, amount]) => actual.get(key) !== amount)) add('journal_lines_mismatch');
      }
    }
    return row();
  });
  return { scope, status: results.length ? status(results.flatMap(row => row.findings)) : 'empty', sourceIssues, events: results };
}
