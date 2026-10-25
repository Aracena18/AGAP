import { describe, expect, it } from 'vitest';
import { createDemoCases } from '../demo/cases';
import type { CaseRecord, DemoActor, FactCorrectionInput } from './types';
import { applyCorrection, parsePesoInput } from './evidence';

const officer: DemoActor = { name: 'Mara Santos', role: 'officer' };
const at = '2026-10-20T10:30:00.000Z';
const correction: FactCorrectionInput = {
  factId: 'income', value: 2_400_000, sourceId: 'payslip',
  effectiveDate: '2026-10-20', status: 'document-supported',
  reason: 'Current payslip and staff confirmation establish take-home pay.',
};

function caseWithDecision(): CaseRecord {
  const record = createDemoCases()[0];
  record.decisions.push({
    id: 'earlier-decision', caseId: record.id, caseVersion: 1,
    memberName: record.member.name, recordedAt: at, reviewer: { name: 'Luis Reyes', role: 'reviewer' },
    input: { outcome: 'return', offerId: null, rationale: 'Clarify income first.', departureReason: '', exceptions: [], reviewDate: '2026-11-01', explanationReviewed: true },
    periodStart: record.periodStart, periodEnd: record.periodEnd,
    facts: structuredClone(record.facts), sources: structuredClone(record.sources),
    offers: structuredClone(record.offers), recommendation: null,
    assessment: { status: 'incomplete', caseVersion: 1, calculationVersion: 'test', issues: [{ factId: 'income', message: 'Conflicting income' }] },
  });
  return record;
}

describe('applyCorrection', () => {
  it('resolves the chosen income while retaining its former source and reason in history', () => {
    const record = createDemoCases()[0];
    const result = applyCorrection(record, correction, officer, at);
    expect(result.version).toBe(2);
    expect(result.facts.find(fact => fact.id === 'income')).toMatchObject({
      value: 2_400_000, sourceId: 'payslip', status: 'document-supported', effectiveDate: '2026-10-20',
    });
    expect(result.corrections[0]).toMatchObject({
      before: { value: 2_800_000, sourceId: 'old-worksheet', status: 'conflicting' },
      after: { value: 2_400_000, sourceId: 'payslip', status: 'document-supported' },
      reason: correction.reason, actor: officer, at,
    });
  });

  it('keeps the original record, previous correction, and decision evidence unchanged after later edits', () => {
    const original = caseWithDecision();
    const before = structuredClone(original);
    const first = applyCorrection(original, correction, officer, at);
    const second = applyCorrection(first, { ...correction, value: 2_500_050, reason: 'Corrected transcription.' }, officer, at);
    expect(original).toEqual(before);
    expect(second.version).toBe(3);
    expect(second.corrections).toHaveLength(2);
    expect(second.corrections[0].after.value).toBe(2_400_000);
    expect(second.corrections[1].before.value).toBe(2_400_000);
    expect(second.corrections[1].after.value).toBe(2_500_050);
    expect(second.decisions).toEqual(before.decisions);
    expect(second.decisions[0].caseVersion).toBe(1);
    second.facts[1].value = 0;
    second.corrections[1].before.value = 0;
    expect(first.facts[1].value).toBe(2_400_000);
    expect(second.decisions[0].facts[1].value).toBe(2_800_000);
    expect(second.corrections[0].after.value).toBe(2_400_000);
  });

  it('allows Cora to clarify unavailable income with the existing member statement', () => {
    const result = applyCorrection(createDemoCases()[2], {
      ...correction, value: 2_100_075, sourceId: 'statement', status: 'member-reported',
      reason: 'Member clarified monthly income during the discussion.',
    }, officer, at);
    expect(result.facts[1]).toMatchObject({ value: 2_100_075, status: 'member-reported', sourceId: 'statement' });
    expect(result.corrections[0].before).toMatchObject({ value: null, sourceId: null, status: 'missing' });
  });

  it('preserves unavailable evidence as null instead of zero', () => {
    const result = applyCorrection(createDemoCases()[0], {
      ...correction, value: null, sourceId: null, status: 'missing', reason: 'The current value is unavailable.',
    }, officer, at);
    expect(result.facts[1]).toMatchObject({ value: null, sourceId: null, status: 'missing' });
  });

  it('accepts an explicitly reported zero and preserves cash timing and deduction flags', () => {
    const record = createDemoCases()[0];
    record.facts[3].alreadyDeducted = true;
    const result = applyCorrection(record, { ...correction, factId: 'existing-debt', value: 0, sourceId: 'loan-ledger' }, officer, at);
    expect(result.facts[3]).toMatchObject({ value: 0, cashDate: '2026-11-07', alreadyDeducted: true });
  });

  it.each([
    [{ value: -1 }, /amount/i],
    [{ value: 1.1 }, /amount/i],
    [{ value: Number.NaN }, /amount/i],
    [{ value: Number.POSITIVE_INFINITY }, /amount/i],
    [{ value: Number.MAX_SAFE_INTEGER + 1 }, /amount/i],
    [{ value: null }, /amount/i],
    [{ reason: '   ' }, /reason/i],
    [{ factId: 'unknown' }, /fact/i],
    [{ sourceId: 'unknown' }, /source/i],
    [{ sourceId: null }, /source/i],
    [{ sourceId: 'statement' }, /document/i],
    [{ status: 'member-reported', sourceId: 'payslip' }, /statement/i],
    [{ effectiveDate: '2026-02-30' }, /date/i],
    [{ effectiveDate: '2026-2-3' }, /date/i],
    [{ status: 'missing', value: 0, sourceId: null }, /missing/i],
    [{ status: 'missing', value: null, sourceId: 'payslip' }, /source/i],
    [{ status: 'conflicting' }, /status/i],
  ])('rejects invalid correction %j', (patch, message) => {
    expect(() => applyCorrection(createDemoCases()[0], { ...correction, ...patch } as FactCorrectionInput, officer, at)).toThrow(message);
  });

  it('requires the officer role even when called outside the interface', () => {
    expect(() => applyCorrection(createDemoCases()[0], correction, { name: 'Luis Reyes', role: 'reviewer' }, at)).toThrow(/officer/i);
  });
});

describe('parsePesoInput', () => {
  it.each([
    ['24000', 2_400_000],
    ['24000.50', 2_400_050],
    ['0.29', 29],
    ['0001.1', 110],
    ['0', 0],
    [' 12.34 ', 1234],
    ['90071992547409.91', Number.MAX_SAFE_INTEGER],
  ])('converts %s PHP exactly to %i centavos', (input, expected) => {
    expect(parsePesoInput(input)).toBe(expected);
  });

  it.each(['', ' ', '-1', '1.001', '1e4', '24,000', 'Infinity', 'NaN', '90071992547409.92'])('rejects invalid PHP input %s', input => {
    expect(() => parsePesoInput(input)).toThrow(/amount/i);
  });
});
