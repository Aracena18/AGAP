// Browser rendering fixtures only. These page-scoped responses are explicitly
// simulated; they do not implement a lending or document service.
import { createDemoCases } from '../src/demo/cases';
import { assessCase } from '../packages/finance/src/assessment';
import { schemas } from '../packages/contracts/src/schemas';

export const fixtureId=(suffix:number)=>`30000000-0000-4000-8000-${String(suffix).padStart(12,'0')}`;
export function simulatedOption(){
  const record=createDemoCases()[1],result=assessCase(record),offer=record.offers[0];
  if(result.status!=='complete')throw new Error('The canonical fictional case must be complete.');
  const checked=result.scenarios[0],id=fixtureId(1);
  return schemas.MemberOption.parse({
    offer:{id,productVersionId:fixtureId(2),label:'Simulated requested schedule',principalCentavos:offer.principal,netReceivedCentavos:offer.netReceived,feesPaidSeparatelyCentavos:offer.feesPaidSeparately,termMonths:offer.termMonths,payments:offer.payments.map(p=>({date:p.date,amountCentavos:p.amount})),available:offer.available},
    checked:{offerVersionId:id,monthlyRemainingCentavos:checked.monthlyRemaining,lowestBalanceCentavos:checked.lowestBalance,closingBalanceCentavos:checked.closingBalance,totalRepaymentCentavos:checked.totalRepayment,financingCostCentavos:checked.financingCost,shortageDates:checked.shortageDates,policyChecks:checked.policyChecks.map(({policyId,passed,detail})=>({policyId,passed,detail,overridable:true}))},
    horizonStart:record.periodStart,horizonEnd:record.periodEnd,assumptions:['Simulated display fixture using the canonical one-cycle case; this is not a live lending result.'],
  });
}
