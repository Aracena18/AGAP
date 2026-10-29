import { isCalendarDate, money } from '../../../src/domain/format.js';
import type { AssessmentResult, CaseRecord, CashMovement, LoanOffer, ScenarioResult } from '../../../src/domain/types.js';

const calculationVersion = 'cash-flow-v1';
type Issue = { factId: string; message: string };

const nonnegativeMoney = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

function checkedSum(values: number[]): number {
  const result = Number(values.reduce((sum, value) => sum + BigInt(value), 0n));
  if (!Number.isSafeInteger(result)) throw new RangeError('Money exceeds the supported integer range.');
  return result;
}

function validateInputs(record: CaseRecord, offers: LoanOffer[]): Issue[] {
  const issues: Issue[] = [];
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
    if (!fact.id || factIds.has(fact.id)) issue(fact.id || 'facts', 'Each cash-flow fact needs a unique reference.');
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
    const sources = record.sources.filter(source => source.id === fact.sourceId);
    const source = sources[0];
    if (!fact.sourceId || sources.length !== 1) {
      issue(fact.id, `${fact.label}: link one available, unambiguous supporting source.`);
    } else if (!isCalendarDate(source.date) || !source.title.trim() || !source.excerpt.trim()
      || !['document', 'statement', 'worksheet'].includes(source.kind)) {
      issue(fact.id, `${fact.label}: the supporting source needs a valid date and readable details.`);
    }
  }
  if (offers.length === 0) issue('offers', 'No explicitly available offer has been recorded.');
  const offerIds = new Set<string>();
  for (const offer of offers) {
    const reference = `offer:${offer.id}`;
    if (!offer.id || offerIds.has(offer.id)) issue(reference, 'Each available offer needs a unique reference.');
    offerIds.add(offer.id);
    if (![offer.principal, offer.netReceived, offer.feesPaidSeparately].every(nonnegativeMoney)) {
      issue(reference, `${offer.label}: principal, net received and separate fees must be valid nonnegative centavo amounts.`);
    }
    if (!Number.isSafeInteger(offer.termMonths) || offer.termMonths < 1) {
      issue(reference, `${offer.label}: record a positive whole-month term.`);
    }
    if (!offer.payments.length) issue(reference, `${offer.label}: the full explicit payment schedule is required.`);
    for (const [index, payment] of offer.payments.entries()) {
      if (!isCalendarDate(payment.date) || !nonnegativeMoney(payment.amount)
        || (index > 0 && payment.date <= offer.payments[index - 1].date)) {
        issue(reference, `${offer.label}: payments need valid centavo amounts and distinct dates in calendar order.`);
        break;
      }
    }
  }
  return issues;
}

function calendarDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function calculateScenario(record: CaseRecord, offer: LoanOffer): ScenarioResult {
  const opening = record.facts.find(fact => fact.category === 'opening')!.value!;
  const movements = new Map<string, CashMovement[]>();
  const add = (date: string, movement: CashMovement) => {
    movements.set(date, [...(movements.get(date) ?? []), movement]);
  };
  for (const fact of record.facts) {
    if (fact.category === 'opening' || fact.alreadyDeducted) continue;
    add(fact.cashDate, {
      label: fact.label, amount: fact.category === 'income' ? fact.value! : -fact.value!,
      factId: fact.id, sourceId: fact.sourceId!,
    });
  }
  for (const payment of offer.payments) {
    add(payment.date, { label: `${offer.label} repayment`, amount: -payment.amount });
  }
  if (offer.feesPaidSeparately > 0) {
    add(offer.payments[0].date, { label: `${offer.label} separate fee`, amount: -offer.feesPaidSeparately });
  }
  let balance = opening;
  let monthlyRemaining = 0;
  let lowestBalance = opening;
  const dailyBalances = calendarDates(record.periodStart, record.periodEnd).map(date => {
    const today = movements.get(date) ?? [];
    const net = checkedSum(today.map(movement => movement.amount));
    monthlyRemaining = checkedSum([monthlyRemaining, net]);
    balance = checkedSum([balance, net]);
    lowestBalance = Math.min(lowestBalance, balance);
    return { date, balance, movements: today };
  });
  const totalRepayment = checkedSum(offer.payments.map(payment => payment.amount));
  return {
    offerId: offer.id, monthlyRemaining, lowestBalance, closingBalance: balance, dailyBalances,
    shortageDates: dailyBalances.filter(day => day.balance < 0).map(day => day.date),
    totalRepayment, financingCost: checkedSum([totalRepayment, offer.feesPaidSeparately, -offer.netReceived]),
    policyChecks: [
      {
        policyId: 'monthly-capacity', label: 'Monthly capacity', passed: monthlyRemaining >= 0,
        detail: `Fictional policy: monthly remaining must be at least ₱0. Modeled remaining: ${money(monthlyRemaining)}.`,
      },
      {
        policyId: 'cash-timing', label: 'Cash timing', passed: lowestBalance >= 0,
        detail: `Fictional policy: opening cash and each end-of-day balance must be at least ₱0. Lowest balance: ${money(lowestBalance)}.`,
      },
    ],
  };
}

export function assessCase(record: CaseRecord): AssessmentResult {
  const offers = record.offers.filter(offer => offer.available === true);
  const issues = validateInputs(record, offers);
  if (issues.length) return { status: 'incomplete', caseVersion: record.version, calculationVersion, issues };
  try {
    return {
      status: 'complete', caseVersion: record.version, calculationVersion,
      scenarios: offers.map(offer => calculateScenario(record, offer)),
      warnings: ['Loan proceeds are reserved for the purchase and excluded from spendable cash. End-of-day balances do not model intraday timing or unreported events.'],
    };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return {
      status: 'incomplete', caseVersion: record.version, calculationVersion,
      issues: [{ factId: 'amounts', message: 'The combined amounts exceed the supported integer-centavo range. Review the recorded figures.' }],
    };
  }
}
