import type { CaseRecord, DemoActor, EvidenceStatus, FactCorrectionInput } from './types';
import { isCalendarDate } from './format';

export interface EvidenceIssue { factId: string; message: string }

const nonnegativeMoney = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

/** Validate only the referenced source; unrelated attachments do not affect evidence readiness. */
function sourceIssue(record: CaseRecord, sourceId: string | null, status: EvidenceStatus): string | undefined {
  const sources = record.sources.filter(source => source.id === sourceId);
  if (!sourceId?.trim() || sources.length !== 1) {
    return 'Choose one available, unambiguous supporting source from this application.';
  }
  const source = sources[0];
  if (!isCalendarDate(source.date) || !source.title.trim() || !source.excerpt.trim()
    || !['document', 'statement', 'worksheet'].includes(source.kind)) {
    return 'The supporting source needs a valid date, kind and readable details.';
  }
  if (status === 'document-supported' && source.kind === 'statement') {
    return 'Document-supported evidence requires a document or worksheet source.';
  }
  if (status === 'member-reported' && source.kind !== 'statement') {
    return 'Member-reported evidence requires a member statement source.';
  }
}

/** Evidence-input checks only: offer validation and financial calculations remain in assessment. */
export function validateEvidence(record: CaseRecord): EvidenceIssue[] {
  const issues: EvidenceIssue[] = [];
  const issue = (factId: string, message: string) => issues.push({ factId, message });
  if (!isCalendarDate(record.periodStart) || !isCalendarDate(record.periodEnd) || record.periodStart > record.periodEnd) {
    issue('period', 'Record a valid modeled start and end date, in calendar order.');
  }
  for (const category of ['opening', 'income', 'expense', 'obligation'] as const) {
    const facts = record.facts.filter(fact => fact.category === category);
    if (facts.length === 0 || (category === 'opening' && facts.length !== 1)) {
      issue(category, category === 'opening'
        ? 'Record exactly one opening spendable cash balance.'
        : `Record ${category} information explicitly, including a supported zero when applicable.`);
    }
  }
  const factIds = new Set<string>();
  for (const fact of record.facts) {
    if (!fact.id.trim() || factIds.has(fact.id)) issue(fact.id || 'facts', 'Each cash-flow fact needs a unique reference.');
    factIds.add(fact.id);
    if (!['opening', 'income', 'expense', 'obligation'].includes(fact.category)) {
      issue(fact.id, `${fact.label}: record a valid cash-flow category.`);
    }
    if (!['document-supported', 'member-reported'].includes(fact.status) || fact.value === null) {
      issue(fact.id, `${fact.label} needs a confirmed value and supporting source.`);
    } else if (!nonnegativeMoney(fact.value)) {
      issue(fact.id, `${fact.label}: record a nonnegative amount in whole centavos within the supported range.`);
    }
    if (!isCalendarDate(fact.effectiveDate)) issue(fact.id, `${fact.label}: record a valid effective date.`);
    if (!isCalendarDate(fact.cashDate) || fact.cashDate < record.periodStart || fact.cashDate > record.periodEnd) {
      issue(fact.id, `${fact.label}: record a valid cash date inside the modeled period.`);
    }
    if (fact.category === 'opening' && fact.cashDate !== record.periodStart) {
      issue(fact.id, 'Opening cash must describe the start of the modeled period.');
    }
    if (typeof fact.alreadyDeducted !== 'boolean' || (fact.alreadyDeducted && fact.category !== 'obligation')) {
      issue(fact.id, `${fact.label}: clarify whether this is an obligation already deducted from take-home pay.`);
    }
    const problem = sourceIssue(record, fact.sourceId, fact.status);
    if (problem) issue(fact.id, `${fact.label}: ${problem}`);
  }
  return issues;
}

export type CorrectionErrors = Partial<Record<keyof FactCorrectionInput | 'form', string>>;

export class EvidenceCorrectionError extends Error {
  readonly errors: CorrectionErrors;

  constructor(errors: CorrectionErrors) {
    super(Object.values(errors).join(' '));
    this.name = 'EvidenceCorrectionError';
    this.errors = errors;
  }
}

export function applyCorrection(record: CaseRecord, input: FactCorrectionInput, actor: DemoActor, at: string): CaseRecord {
  if (actor.role !== 'officer') throw new EvidenceCorrectionError({ form: 'Only a demo officer can correct evidence.' });
  const errors: CorrectionErrors = {};
  const facts = record.facts.filter(item => item.id === input.factId);
  const fact = facts.length === 1 ? facts[0] : undefined;

  if (!input.factId.trim() || !facts.length) errors.form = 'Choose an existing evidence fact.';
  else if (facts.length !== 1) errors.form = 'This fact reference is ambiguous. The correction was not saved; resolve the duplicate fact references first.';
  if (!input.reason.trim()) errors.reason = 'Enter a reason for this correction.';
  if (!isCalendarDate(input.effectiveDate)) errors.effectiveDate = 'Enter a valid effective date.';
  if (!['document-supported', 'member-reported', 'missing'].includes(input.status)) {
    errors.status = 'Choose an evidence status for the corrected fact.';
  }
  if (input.status === 'missing') {
    if (input.value !== null) errors.value = 'Missing evidence must have no amount; zero is a recorded value.';
    if (input.sourceId !== null) errors.sourceId = 'Missing evidence must have no source.';
  } else {
    if (input.value === null || !Number.isSafeInteger(input.value) || input.value < 0) {
      errors.value = 'Enter a nonnegative amount in whole centavos within the supported range.';
    }
    const problem = sourceIssue(record, input.sourceId, input.status);
    if (problem) errors.sourceId = problem;
  }
  if (Object.keys(errors).length || !fact) throw new EvidenceCorrectionError(errors);

  const next = structuredClone(record);
  const after = {
    ...structuredClone(fact), value: input.value, status: input.status,
    sourceId: input.sourceId, effectiveDate: input.effectiveDate,
  };
  next.version += 1;
  next.facts = next.facts.map(item => item.id === input.factId ? after : item);
  next.corrections.push({
    id: `${record.id}-correction-v${next.version}`, factId: input.factId,
    before: structuredClone(fact), after: structuredClone(after),
    reason: input.reason.trim(), actor: { ...actor }, at,
  });
  return next;
}

/** Parse decimal PHP without floating-point rounding or silently truncated cents. */
export function parsePesoInput(input: string): number {
  const text = input.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new EvidenceCorrectionError({ value: 'Enter an amount in PHP with at most two decimal places, without commas.' });
  }
  const [whole, fraction = ''] = text.split('.');
  const centavos = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new EvidenceCorrectionError({ value: 'This amount is above the supported range.' });
  }
  return Number(centavos);
}
