import type { z } from 'zod';
import type { WorkflowView, WorkflowScenario } from '../../../packages/contracts/src/workflow';
import { assessWorkflow } from '../../../packages/finance/src/workflow-assessment';
import { cashFlow, sumMoney } from '../../../packages/finance/src/cash-flow';
import { isCalendarDate } from '../../domain/format';

export type View = z.output<typeof WorkflowView>;
export type Scenario = z.output<typeof WorkflowScenario>;
export interface Assumptions { start:string; end:string; reserve:number|null; expense:null|{label:string;amount:number;date:string} }
export interface Option { offerId:string;label:string;baseline:Scenario;stressed:ReturnType<typeof cashFlow>|null }
export type Review = ReturnType<typeof buildReview>;
export function materialBasis(view:View) { return JSON.stringify([view.applicationId,view.inputVersion,view.sources,view.facts,view.offers,view.latestAssessment]); }

/** Explicit fictional preview only. It creates no policy, assessment or decision record. */
export function buildReview(view:View, assumptions:Assumptions) {
  const issues:string[]=[];
  if (!isCalendarDate(assumptions.start)||!isCalendarDate(assumptions.end)||assumptions.start>assumptions.end) issues.push('Choose a valid review period.');
  if(assumptions.reserve!==null&&(!Number.isSafeInteger(assumptions.reserve)||assumptions.reserve<0))issues.push('Enter a nonnegative reserve in centavos.');
  if(assumptions.expense&&(!Number.isSafeInteger(assumptions.expense.amount)||assumptions.expense.amount<=0||!isCalendarDate(assumptions.expense.date)||assumptions.expense.date<assumptions.start||assumptions.expense.date>assumptions.end||!assumptions.expense.label.trim()))issues.push('Give the hypothetical expense a name, positive amount and date within the review.');
  const pendingDocuments=view.sources.filter(s=>s.kind==='document'&&s.state!=='cleared');
  const unreviewed=view.drafts.filter(d=>d.state==='suggested');
  const relevant=view.facts.filter(f=>f.input.relevance==='included');
  if(relevant.some(f=>!view.sources.some(s=>s.id===f.sourceId&&s.version===f.sourceVersion&&s.state==='cleared')))issues.push('A financial fact needs a current cleared source or recorded statement.');
  const saved=view.latestAssessment;
  let scenarios:Scenario[]=[];
  const authoritative=Boolean(saved&&!saved.stale&&saved.inputVersion===view.inputVersion&&saved.periodStart===assumptions.start&&saved.periodEnd===assumptions.end);
  if(!issues.length&&authoritative){
    if(saved!.status==='complete')scenarios=saved!.scenarios;
    else issues.push(...saved!.issues);
  }else if(!issues.length){
    // Missing fee dates cannot be invented from the public offer projection.
    const offers=view.offers.filter(o=>o.available&&o.feesPaidSeparatelyCentavos===0);
    if(!offers.length)issues.push('No available offer with complete dated fee information. Ask an officer to save an assessment.');
    else {
      const policy={id:'00000000-0000-4000-8000-000000000001',label:'Illustrative preview checks — not cooperative policy',status:'fictional' as const,approvalReference:null,effectiveFrom:assumptions.start,effectiveThrough:assumptions.end,loanProceedsTreatment:'reserved_for_purpose' as const,remainingRuleBasis:'each_reviewed_calendar_month_segment' as const,minimumRemainingCentavos:0,minimumBalanceCentavos:0,offers:offers.map(o=>({...o,separateFees:[]}))};
      const result=assessWorkflow(view.facts,policy,offers.map(o=>o.id),assumptions.start,assumptions.end);
      scenarios=result.scenarios;issues.push(...result.issues);
    }
  }
  const opening=relevant.find(f=>f.input.category==='opening')?.input.value;
  const options:Option[]=issues.length?[]:scenarios.map(baseline=>{
    let stressed:ReturnType<typeof cashFlow>|null=null;
    if(assumptions.expense&&opening?.availability==='recorded'){
      try {
      let previous=opening.amountCentavos;
      const movements=new Map(baseline.daily.map(day=>{const amount=sumMoney([day.balanceCentavos,-previous]);previous=day.balanceCentavos;return [day.date,[{amount,label:'Recorded scenario movements'}]];}));
      const day=assumptions.expense.date;
      movements.set(day,[...(movements.get(day)??[]),{amount:-assumptions.expense.amount,label:assumptions.expense.label}]);
      stressed=cashFlow(opening.amountCentavos,assumptions.start,assumptions.end,movements);
      } catch { issues.push('The hypothetical scenario exceeds the supported calculation range.'); }
    }
    return {offerId:baseline.offerId,label:baseline.label,baseline,stressed};
  });
  if(issues.length)options.length=0;
  const passes=(o:Option)=>o.baseline.checks.every(c=>c.passed);
  options.sort((a,b)=>Number(passes(b))-Number(passes(a))|| (b.stressed?.lowest??b.baseline.lowestBalanceCentavos)-(a.stressed?.lowest??a.baseline.lowestBalanceCentavos)||a.baseline.financingCostCentavos-b.baseline.financingCostCentavos||a.offerId.localeCompare(b.offerId));
  const recommended=options.find(passes)??options[0]??null;
  const lowest=recommended?(recommended.stressed?.lowest??recommended.baseline.lowestBalanceCentavos):null;
  const shortfall=recommended?recommended.baseline.months.some(m=>m.remainingCentavos<0)||Boolean(recommended.stressed?.months.some(m=>m.remainingCentavos<0)):false;
  const policyFailure=Boolean(recommended?.baseline.checks.some(c=>!c.passed));
  let reserveGap:number|null=null;
  try{reserveGap=lowest!==null&&assumptions.reserve!==null?Math.max(0,sumMoney([assumptions.reserve,-lowest])):null;}catch{issues.push('The reserve gap exceeds the supported integer range.');}
  const priority:'clarification'|'urgent'|'review'|'routine'=issues.length||!recommended?'clarification':shortfall||policyFailure||lowest!==null&&lowest<0?'urgent':reserveGap!==null&&reserveGap>0||pendingDocuments.length||unreviewed.length?'review':'routine';
  const reason=priority==='clarification'?'Required information is incomplete.':shortfall?'Recorded income and the supplied scenario do not cover a reviewed month.':policyFailure?'Configured financial checks need officer attention.':lowest!==null&&lowest<0?'A dated cash shortage needs attention.':reserveGap!==null&&reserveGap>0?'The selected scenario falls below the entered reserve.':pendingDocuments.length?'Supporting documents still await file checks.':unreviewed.length?'Source suggestions still need human checking.':'No shortfall was found within the supplied scenario; officer verification remains required.';
  return {issues:[...new Set(issues)],options,recommended,lowest,shortfall,reserveGap,priority,reason,pendingDocuments,unreviewed,authoritative,relevant};
}

export const priorityLabel={urgent:'Priority review',clarification:'Needs clarification',review:'Officer attention',routine:'Routine officer review'};
export function compareAttention(a:{review:Review;createdAt:string;id:string},b:{review:Review;createdAt:string;id:string}) {
  const rank={urgent:0,clarification:1,review:2,routine:3};
  return rank[a.review.priority]-rank[b.review.priority]||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);
}
export function defaultAssumptions(view:View):Assumptions {
  const included=view.facts.filter(f=>f.input.relevance==='included');
  const starts=included.flatMap(f=>f.input.coverageStart?[f.input.coverageStart]:[]).sort();
  const ends=included.flatMap(f=>f.input.coverageEnd?[f.input.coverageEnd]:[]).sort();
  return {start:view.latestAssessment?.periodStart??starts.at(-1)??'',end:view.latestAssessment?.periodEnd??ends[0]??'',reserve:null,expense:null};
}
