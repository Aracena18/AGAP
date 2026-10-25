import { describe, expect, it } from 'vitest';
import { createDemoCases } from '../demo/cases';
import type { CaseRecord } from './types';
import { assessCase } from './assessment';

function correctedAna(): CaseRecord {
  const record = createDemoCases()[0];
  Object.assign(record.facts.find(fact => fact.id === 'income')!, {
    value: 2_400_000, sourceId: 'payslip', effectiveDate: '2026-10-20', status: 'document-supported',
  });
  return record;
}

function complete(record: CaseRecord) {
  const result = assessCase(record);
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error(JSON.stringify(result.issues));
  return result;
}

describe('assessCase', () => {
  it('withholds results for Ana’s unresolved income and Cora’s missing income', () => {
    for (const record of [createDemoCases()[0], createDemoCases()[2]]) {
      const result = assessCase(record);
      expect(result.status).toBe('incomplete');
      expect(result).not.toHaveProperty('scenarios');
      if (result.status === 'incomplete') expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ factId: 'income' }),
      ]));
    }
  });

  it('matches the independently checked Ana monthly, dated, and full-term figures', () => {
    const record = correctedAna();
    const before = structuredClone(record);
    const result = complete(record);
    expect(result.caseVersion).toBe(record.version);
    expect(result.scenarios).toHaveLength(2);
    expect(result.scenarios[0]).toMatchObject({
      offerId: 'requested', monthlyRemaining: 200_000, lowestBalance: -200_000,
      closingBalance: 1_100_000, totalRepayment: 3_600_000, financingCost: 600_000,
      shortageDates: ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'],
      policyChecks: [
        expect.objectContaining({ policyId: 'monthly-capacity', passed: true }),
        expect.objectContaining({ policyId: 'cash-timing', passed: false }),
      ],
    });
    expect(result.scenarios[1]).toMatchObject({
      offerId: 'payday-aligned', monthlyRemaining: 200_000, lowestBalance: 100_000,
      closingBalance: 1_100_000, totalRepayment: 3_600_000, financingCost: 600_000, shortageDates: [],
    });
    expect(result.scenarios[0].dailyBalances).toHaveLength(30);
    expect(record).toEqual(before);
  });

  it('retains Ben’s overall monthly shortfall when the repayment date changes', () => {
    expect(complete(createDemoCases()[1]).scenarios.map(scenario => scenario.monthlyRemaining))
      .toEqual([-400_000, -400_000]);
  });

  it('counts a payroll-deducted obligation only once and traces included movements to their sources', () => {
    const record = correctedAna();
    record.facts.find(fact => fact.id === 'existing-debt')!.alreadyDeducted = true;
    const scenario = complete(record).scenarios[0];
    expect(scenario.monthlyRemaining).toBe(400_000);
    expect(scenario.lowestBalance).toBe(0);
    expect(scenario.closingBalance).toBe(1_300_000);
    expect(scenario.dailyBalances.flatMap(day => day.movements).some(move => move.factId === 'existing-debt')).toBe(false);
    expect(scenario.dailyBalances.find(day => day.date === '2026-11-15')?.movements).toEqual([
      expect.objectContaining({ factId: 'income', sourceId: 'payslip', amount: 2_400_000 }),
    ]);
  });

  it('groups same-day events before testing end-of-day shortages', () => {
    const record = correctedAna();
    record.offers[0].payments[0].date = '2026-11-15';
    const scenario = complete(record).scenarios[0];
    expect(scenario.lowestBalance).toBe(100_000);
    expect(scenario.shortageDates).toEqual([]);
    expect(scenario.dailyBalances.find(day => day.date === '2026-11-15')).toMatchObject({
      balance: 2_200_000, movements: expect.arrayContaining([
        expect.objectContaining({ amount: 2_400_000 }), expect.objectContaining({ amount: -300_000 }),
      ]),
    });
  });

  it('includes opening cash in the minimum, but excludes it and loan proceeds from monthly remaining', () => {
    const record = correctedAna();
    record.facts.find(fact => fact.id === 'opening')!.value = 0;
    record.facts.find(fact => fact.id === 'income')!.cashDate = record.periodStart;
    const scenario = complete(record).scenarios[0];
    expect(scenario.monthlyRemaining).toBe(200_000);
    expect(scenario.lowestBalance).toBe(0);
    expect(scenario.closingBalance).toBe(200_000);
  });

  it('charges a separate fee once at the first payment and includes withheld fees through net received', () => {
    const record = correctedAna();
    record.offers[0].feesPaidSeparately = 50_000;
    record.offers[0].netReceived = 2_900_000;
    const scenario = complete(record).scenarios[0];
    expect(scenario.totalRepayment).toBe(3_600_000);
    expect(scenario.financingCost).toBe(750_000);
    expect(scenario.monthlyRemaining).toBe(150_000);
    expect(scenario.lowestBalance).toBe(-250_000);
    expect(scenario.closingBalance).toBe(1_050_000);
  });

  it('does not charge a separate fee in a cycle after the first payment', () => {
    const record = correctedAna();
    record.offers[0].payments[0].date = '2026-10-10';
    record.offers[0].feesPaidSeparately = 50_000;
    const scenario = complete(record).scenarios[0];
    expect(scenario.monthlyRemaining).toBe(500_000);
    expect(scenario.closingBalance).toBe(1_400_000);
    expect(scenario.financingCost).toBe(650_000);
  });

  it('omits unavailable offers, without validating or inventing an alternative', () => {
    const record = correctedAna();
    record.offers[1].available = false;
    record.offers[1].payments = [];
    expect(complete(record).scenarios.map(scenario => scenario.offerId)).toEqual(['requested']);
    record.offers[0].available = false;
    expect(assessCase(record).status).toBe('incomplete');
  });

  it.each([
    ['missing source', (record: CaseRecord) => { record.sources = record.sources.filter(source => source.id !== 'payslip'); }],
    ['missing source reference', (record: CaseRecord) => { record.facts[1].sourceId = null; }],
    ['duplicate source', (record: CaseRecord) => { record.sources.push({ ...record.sources[0] }); }],
    ['invalid source date', (record: CaseRecord) => { record.sources[0].date = '2026-02-30'; }],
    ['fractional centavos', (record: CaseRecord) => { record.facts[1].value = 123.5; }],
    ['negative expense', (record: CaseRecord) => { record.facts[2].value = -1; }],
    ['nonfinite money', (record: CaseRecord) => { record.facts[1].value = Infinity; }],
    ['unsafe money', (record: CaseRecord) => { record.facts[1].value = Number.MAX_SAFE_INTEGER + 1; }],
    ['invalid cash date', (record: CaseRecord) => { record.facts[1].cashDate = '2026-11-31'; }],
    ['out-of-cycle fact', (record: CaseRecord) => { record.facts[1].cashDate = '2026-12-15'; }],
    ['invalid effective date', (record: CaseRecord) => { record.facts[1].effectiveDate = 'yesterday'; }],
    ['invalid period', (record: CaseRecord) => { record.periodStart = '2026-11-31'; }],
    ['reversed period', (record: CaseRecord) => { record.periodEnd = '2026-10-31'; }],
    ['missing opening', (record: CaseRecord) => { record.facts = record.facts.filter(fact => fact.category !== 'opening'); }],
    ['missing income category', (record: CaseRecord) => { record.facts = record.facts.filter(fact => fact.category !== 'income'); }],
    ['missing expense category', (record: CaseRecord) => { record.facts = record.facts.filter(fact => fact.category !== 'expense'); }],
    ['missing obligation category', (record: CaseRecord) => { record.facts = record.facts.filter(fact => fact.category !== 'obligation'); }],
    ['duplicate opening', (record: CaseRecord) => { record.facts.push({ ...record.facts[0], id: 'other-opening' }); }],
    ['duplicate fact', (record: CaseRecord) => { record.facts.push({ ...record.facts[1] }); }],
    ['wrong opening date', (record: CaseRecord) => { record.facts[0].cashDate = '2026-11-02'; }],
    ['deducted expense', (record: CaseRecord) => { record.facts[2].alreadyDeducted = true; }],
    ['empty payment schedule', (record: CaseRecord) => { record.offers[0].payments = []; }],
    ['invalid payment date', (record: CaseRecord) => { record.offers[0].payments[0].date = '2026-11-31'; }],
    ['fractional payment', (record: CaseRecord) => { record.offers[0].payments[0].amount = 0.1; }],
    ['invalid separate fee', (record: CaseRecord) => { record.offers[0].feesPaidSeparately = -1; }],
    ['invalid principal', (record: CaseRecord) => { record.offers[0].principal = NaN; }],
    ['invalid net proceeds', (record: CaseRecord) => { record.offers[0].netReceived = -1; }],
    ['invalid term', (record: CaseRecord) => { record.offers[0].termMonths = 1.5; }],
    ['duplicate offer', (record: CaseRecord) => { record.offers.push({ ...record.offers[0] }); }],
    ['unordered payments', (record: CaseRecord) => { record.offers[0].payments.reverse(); }],
    ['duplicate payment date', (record: CaseRecord) => { record.offers[0].payments[1].date = record.offers[0].payments[0].date; }],
    ['sum overflow', (record: CaseRecord) => { record.offers[0].payments.forEach(payment => { payment.amount = Number.MAX_SAFE_INTEGER; }); }],
    ['balance overflow', (record: CaseRecord) => { record.facts[1].value = Number.MAX_SAFE_INTEGER; }],
  ])('withholds all calculated figures for %s', (_name, change) => {
    const record = correctedAna();
    change(record);
    const result = assessCase(record);
    expect(result.status).toBe('incomplete');
    expect(result).not.toHaveProperty('scenarios');
  });
});
