import type { CaseRecord, DemoActor, FactCorrectionInput } from './types';
import { isCalendarDate } from './format';

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
  const fact = record.facts.find(item => item.id === input.factId);
  const source = record.sources.find(item => item.id === input.sourceId);

  if (!fact) errors.factId = 'Choose an existing evidence fact.';
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
    if (!source) errors.sourceId = 'Choose a source from this application.';
    else if (input.status === 'document-supported' && source.kind === 'statement') {
      errors.sourceId = 'Document-supported evidence requires a document or worksheet source.';
    } else if (input.status === 'member-reported' && source.kind !== 'statement') {
      errors.sourceId = 'Member-reported evidence requires a member statement source.';
    }
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
