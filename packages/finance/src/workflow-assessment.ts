import type { z } from 'zod';
import { WorkflowFact, WorkflowPolicy,WorkflowScenario } from '../../contracts/src/workflow.js';
import { cashFlow, sumMoney } from './cash-flow.js';
import type { CashMovement } from '../../../src/domain/types.js';

type Fact = z.output<typeof WorkflowFact>;
type Policy = z.output<typeof WorkflowPolicy>;
/** Pure, server-loaded inputs only. This is not an offer generator or a policy approval. */
export function assessWorkflow(facts: Fact[], policy: Policy | null, offerIds: string[], start: string, end: string):{issues:string[];scenarios:z.output<typeof WorkflowScenario>[]} {
  facts=facts.filter(f=>f.input.relevance==='included');
  const issues: string[] = [];
  if (!policy) issues.push('An applicable configured loan policy and explicit offers are required.');
  if (!offerIds.length || new Set(offerIds).size !== offerIds.length) issues.push('Choose distinct available offers.');
  for (const category of ['opening','income','expense','obligation']) {
    const matching = facts.filter(f => f.input.category === category);
    if (!matching.length || category === 'opening' && matching.length !== 1) issues.push(`Record ${category === 'opening' ? 'exactly one opening balance' : category + ' information, including a confirmed zero if applicable'}.`);
  }
  for (const fact of facts) {
    const f = fact.input;
    if (f.value.availability !== 'recorded') issues.push(`${f.label}: ${f.value.reason}`);
    if (!f.cashDates.length || new Set(f.cashDates).size !== f.cashDates.length || f.cashDates.some((d, i) => i > 0 && d <= f.cashDates[i-1])) issues.push(`${f.label}: confirm distinct cash dates in calendar order.`);
    if(f.category!=='opening'&&(!f.coverageStart||!f.coverageEnd||f.coverageStart>start||f.coverageEnd<end))issues.push(`${f.label}: confirm coverage of the complete review horizon, including future dates or recurrence assumptions.`);
    if (f.period === 'unknown' || f.basis === 'unknown' || f.deduction === 'unknown') issues.push(`${f.label}: clarify amount period, basis and payroll inclusion.`);
    if(f.category!=='opening'&&!f.cashDates.some(d=>d>=start&&d<=end))issues.push(`${f.label}: record dates within the review horizon, including explicit zero if applicable.`);
    if (f.category === 'income' && f.basis !== 'net') issues.push(`${f.label}: record supported net income; gross income cannot be treated as spendable cash.`);
    if (f.category !== 'obligation' && f.deduction === 'yes') issues.push(`${f.label}: payroll inclusion applies only to an existing obligation.`);
    if (f.category === 'opening' && (f.cashDates.length !== 1 || f.cashDates[0] !== start)) issues.push('Opening spendable cash must describe the first review date.');
  }
  if (policy && (start < policy.effectiveFrom || start > policy.effectiveThrough)) issues.push('The policy is not effective at the review start.');
  const offers = policy?.offers.filter(o => offerIds.includes(o.id) && o.available) ?? [];
  if (offers.length !== offerIds.length) issues.push('One or more selected offers are unavailable under the configured policy.');
  if (issues.length) return { issues: [...new Set(issues)], scenarios: [] };
  try {
    const scenarios = offers.map(offer => {
      const movements = new Map<string, CashMovement[]>();
      const add = (date: string, amount: number, label: string) => movements.set(date, [...(movements.get(date) ?? []), { amount, label }]);
      for (const { input: f } of facts) {
        if (f.category === 'opening' || f.deduction === 'yes' || f.value.availability !== 'recorded') continue;
        for (const date of f.cashDates) add(date, f.category === 'income' ? f.value.amountCentavos : -f.value.amountCentavos, f.label);
      }
      if (sumMoney(offer.separateFees.map(f => f.amountCentavos)) !== offer.feesPaidSeparatelyCentavos) throw new RangeError('Separate fees require matching explicit dated amounts.');
      if (offer.payments.some((p, i) => i > 0 && p.date <= offer.payments[i-1].date)) throw new RangeError('The contractual schedule must have distinct ordered dates.');
      for (const p of offer.payments) add(p.date, -p.amountCentavos, 'Contractual repayment');
      for (const fee of offer.separateFees) add(fee.date, -fee.amountCentavos, 'Separate fee');
      const opening = facts.find(f => f.input.category === 'opening')!.input.value;
      if (opening.availability !== 'recorded') throw new RangeError('Opening cash is unavailable.');
      const flow = cashFlow(opening.amountCentavos, start, end, movements);
      const repayment = sumMoney(offer.payments.map(p => p.amountCentavos));
      return { offerId: offer.id, label: offer.label, horizonNetCentavos: flow.remaining,
        lowestBalanceCentavos: flow.lowest, closingBalanceCentavos: flow.closing,
        totalRepaymentCentavos: repayment, financingCostCentavos: sumMoney([repayment, offer.feesPaidSeparatelyCentavos, -offer.netReceivedCentavos]),
        months: flow.months, daily: flow.daily.map(d => ({ date: d.date, balanceCentavos: d.balance })),
        shortageDates: flow.daily.filter(d => d.balance < 0).map(d => d.date),
        checks: [{ id: 'cash-timing', passed: flow.lowest >= policy!.minimumBalanceCentavos, actualCentavos:flow.lowest,minimumCentavos:policy!.minimumBalanceCentavos,detail: 'Minimum dated balance.' },
          ...flow.months.map(m => ({ id: `remaining:${m.month}`, passed: m.remainingCentavos >= policy!.minimumRemainingCentavos, actualCentavos:m.remainingCentavos,minimumCentavos:policy!.minimumRemainingCentavos,detail: `Remaining money within the modeled dates in ${m.month}.` }))],
      };
    });
    return { issues: [], scenarios };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { issues: [error.message], scenarios: [] };
  }
}
