import type { z } from 'zod';
import type { PreparedReviewPacket } from '../../contracts/src/prepared-review.js';
import type { WorkflowView,WorkflowScenario } from '../../contracts/src/workflow.js';
import { cashFlow,sumMoney } from './cash-flow.js';
import type { CashMovement } from '../../../src/domain/types.js';
type View=z.output<typeof WorkflowView>;type Packet=z.output<typeof PreparedReviewPacket>;
/** The expense is a separate assumption, never a saved member fact. Keep configured minima. */
export function comparePrepared(view:View,packet:Packet){
 if(packet.applicationId!==view.applicationId||packet.start>packet.end||packet.expense&&(packet.expense.amountCentavos<=0||packet.expense.date<packet.start||packet.expense.date>packet.end))throw new Error('Invalid prepared scenario binding.');
 const assessment=view.latestAssessment;
 if(!assessment||assessment.status!=='complete'||assessment.stale||assessment.periodStart!==packet.start||assessment.periodEnd!==packet.end)throw new Error('A current complete assessment is required.');
 const opening=view.facts.find(f=>f.input.relevance==='included'&&f.input.category==='opening')?.input.value;
 if(opening?.availability!=='recorded')throw new Error('Opening cash is unavailable.');
 return assessment.scenarios.map(baseline=>{
  const offer=view.offers.find(o=>o.id===baseline.offerId&&o.available);if(!offer)throw new Error('An assessed offer is unavailable.');
  const movements=new Map<string,CashMovement[]>();let previous=opening.amountCentavos;
  for(const day of baseline.daily){const amount=sumMoney([day.balanceCentavos,-previous]);if(amount)movements.set(day.date,[{amount,label:'Recorded dated movements'}]);previous=day.balanceCentavos;}
  if(packet.expense)movements.set(packet.expense.date,[...(movements.get(packet.expense.date)??[]),{amount:-packet.expense.amountCentavos,label:packet.expense.label}]);
  const flow=cashFlow(opening.amountCentavos,packet.start,packet.end,movements);
  const checks=baseline.checks.map(check=>{const actual=check.id==='cash-timing'?flow.lowest:check.id.startsWith('remaining:')?flow.months.find(m=>m.month===check.id.slice(10))?.remainingCentavos:undefined;if(actual===undefined)throw new Error('A configured check is unavailable.');return {...check,actualCentavos:actual,passed:actual>=check.minimumCentavos};});
  const whatIf:z.output<typeof WorkflowScenario>={...baseline,lowestBalanceCentavos:flow.lowest,closingBalanceCentavos:flow.closing,horizonNetCentavos:flow.remaining,months:flow.months,daily:flow.daily.map(d=>({date:d.date,balanceCentavos:d.balance})),shortageDates:flow.daily.filter(d=>d.balance<0).map(d=>d.date),checks};
  return {offer,baseline,whatIf,passes:baseline.checks.every(c=>c.passed)&&checks.every(c=>c.passed)&&flow.lowest>=packet.reserveCentavos};
 });
}
