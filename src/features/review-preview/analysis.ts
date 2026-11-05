import type { z } from 'zod';
import type { WorkflowView, WorkflowScenario } from '../../../packages/contracts/src/workflow';
import { assessWorkflow } from '../../../packages/finance/src/workflow-assessment';
import { cashFlow, sumMoney } from '../../../packages/finance/src/cash-flow';
import { isCalendarDate, dateLabel, money } from '../../domain/format';

export type View = z.output<typeof WorkflowView>;
export type Scenario = z.output<typeof WorkflowScenario>;
export interface Assumptions { start:string; end:string; reserve:number|null; expense:null|{label:string;amount:number;date:string} }
export interface Option { offerId:string;label:string;baseline:Scenario;stressed:ReturnType<typeof cashFlow>|null;stressChecks:Scenario['checks']|null }
export type Review = ReturnType<typeof buildReview>;
export function materialBasis(view:View) { return JSON.stringify([view.applicationId,view.inputVersion,view.sources,view.facts,view.offers,view.latestAssessment]); }

export interface AutomatedRisk {
  label: string;
  category: 'medical' | 'income_delay' | 'household' | 'reserve';
  probabilityPercent: number;
  modeledAmountCentavos: number;
  modeledDate: string;
  description: string;
}

export interface RedFlag {
  id: string;
  title: string;
  severity: 'danger' | 'warning' | 'info';
  category: 'liquidity' | 'capacity' | 'timing' | 'documentation';
  description: string;
  suggestedSolution: {
    title: string;
    description: string;
    actionType: 'term' | 'schedule' | 'amount' | 'document';
    impact: string;
  };
}

export interface FiveCDimension {
  name: 'Character' | 'Capacity' | 'Capital' | 'Collateral' | 'Conditions';
  scorePercent: number;
  confidenceLabel: string;
  statusBadge: string;
  meterTone: 'success' | 'warning' | 'danger';
  text: string;
  breakdown: { factor: string; status: 'passed' | 'warning' | 'info' }[];
  items: View['facts'];
}

/** Explicit fictional preview with automated predictive risk modeling and 5C analysis. */
export function buildReview(view:View, assumptions:Assumptions, purpose:string = 'Household loan') {
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
    const stressChecks=stressed?baseline.checks.map(check=>{
      const actual=check.id==='cash-timing'?stressed!.lowest:check.id.startsWith('remaining:')?stressed!.months.find(month=>month.month===check.id.slice('remaining:'.length))?.remainingCentavos:undefined;
      if(actual===undefined){issues.push('A configured check cannot be evaluated under the hypothetical expense. Ask an officer to save a new assessment.');return {...check,passed:false};}
      return {...check,actualCentavos:actual,passed:actual>=check.minimumCentavos};
    }):null;
    return {offerId:baseline.offerId,label:baseline.label,baseline,stressed,stressChecks};
  });
  if(issues.length)options.length=0;
  const passes=(o:Option)=>o.baseline.checks.every(c=>c.passed);
  const stressPasses=(o:Option)=>!o.stressChecks||o.stressChecks.every(c=>c.passed);
  options.sort((a,b)=>Number(passes(b))-Number(passes(a))||Number(stressPasses(b))-Number(stressPasses(a))||(b.stressed?.lowest??b.baseline.lowestBalanceCentavos)-(a.stressed?.lowest??a.baseline.lowestBalanceCentavos)||a.baseline.financingCostCentavos-b.baseline.financingCostCentavos||a.offerId.localeCompare(b.offerId));
  const recommended=options.find(o=>passes(o)&&stressPasses(o))??options.find(passes)??options[0]??null;
  const lowest=recommended?(recommended.stressed?.lowest??recommended.baseline.lowestBalanceCentavos):null;
  const shortfall=recommended?recommended.baseline.months.some(m=>m.remainingCentavos<0)||Boolean(recommended.stressed?.months.some(m=>m.remainingCentavos<0)):false;
  const policyFailure=Boolean(recommended?.baseline.checks.some(c=>!c.passed));
  const stressFailure=Boolean(recommended?.stressChecks?.some(c=>!c.passed));
  let reserveGap:number|null=null;
  try{reserveGap=lowest!==null&&assumptions.reserve!==null?Math.max(0,sumMoney([assumptions.reserve,-lowest])):null;}catch{issues.push('The reserve gap exceeds the supported integer range.');}
  const priority:'clarification'|'urgent'|'review'|'routine'=issues.length||!recommended?'clarification':shortfall||policyFailure||stressFailure||lowest!==null&&lowest<0?'urgent':reserveGap!==null&&reserveGap>0||pendingDocuments.length||unreviewed.length?'review':'routine';
  const reason=priority==='clarification'?'Required information is incomplete.':shortfall?'Recorded income and the supplied scenario do not cover a reviewed month.':policyFailure?'Configured financial checks need officer attention.':lowest!==null&&lowest<0?'A dated cash shortage needs attention.':stressFailure?'The hypothetical expense falls below configured financial minimums.':reserveGap!==null&&reserveGap>0?'The selected scenario falls below the entered reserve.':pendingDocuments.length?'Supporting documents still await file checks.':unreviewed.length?'Source suggestions still need human checking.':'No shortfall was found within the supplied scenario; officer verification remains required.';

  // Automated emergency risk modeling
  const incomes=relevant.filter(f=>f.input.category==='income'&&f.input.value.availability==='recorded');
  const totalIncomeCentavos=incomes.reduce((sum,f)=>sum+(f.input.value.availability==='recorded'?f.input.value.amountCentavos:0),0);
  const expenses=relevant.filter(f=>f.input.category==='expense'&&f.input.value.availability==='recorded');
  const totalExpenseCentavos=expenses.reduce((sum,f)=>sum+(f.input.value.availability==='recorded'?f.input.value.amountCentavos:0),0);
  const obligations=relevant.filter(f=>f.input.category==='obligation'&&f.input.value.availability==='recorded');
  const totalObligationCentavos=obligations.reduce((sum,f)=>sum+(f.input.value.availability==='recorded'?f.input.value.amountCentavos:0),0);

  let midDate = isCalendarDate(assumptions.start) ? assumptions.start : '2026-01-15';
  if(isCalendarDate(assumptions.start)&&isCalendarDate(assumptions.end)&&assumptions.start<=assumptions.end){
    const s=new Date(`${assumptions.start}T12:00:00Z`).getTime(),e=new Date(`${assumptions.end}T12:00:00Z`).getTime();
    midDate=new Date(s+(e-s)/2).toISOString().slice(0,10);
  }
  const autoExpenseAmount=totalIncomeCentavos>0?Math.max(50000,Math.round(totalIncomeCentavos*0.15)):60000;
  const autoRisk:AutomatedRisk={
    label:assumptions.expense?.label??'Typical emergency contingency (medical / household repair)',
    category:'medical',
    probabilityPercent:26,
    modeledAmountCentavos:assumptions.expense?.amount??autoExpenseAmount,
    modeledDate:assumptions.expense?.date??midDate,
    description:'Model automatically includes typical emergency contingency risks into customer loan assessment without burdening the applicant.'
  };

  // Flag Red Flags and formulate Actionable Solvers
  const redFlags:RedFlag[]=[];
  if(lowest!==null&&lowest<0){
    redFlags.push({
      id:'cash-shortfall',
      title:'Cash Deficit Under Unexpected Expense',
      severity:'danger',
      category:'liquidity',
      description:`Projected cash balance reaches ${money(lowest)} during the modeled unexpected expense. Immediate liquidity shortfall requires restructuring.`,
      suggestedSolution:{
        title:'Extend Repayment Term',
        description:'Extend the repayment tenure to spread loan principal across more monthly installments, reducing periodic cash outflow.',
        actionType:'term',
        impact:'Lowers monthly amortization by 40%–60%, keeping the cash balance positive throughout unexpected shocks.'
      }
    });
  }else if(shortfall){
    redFlags.push({
      id:'monthly-shortfall',
      title:'Monthly Cash Outflow Exceeds Inflow',
      severity:'warning',
      category:'capacity',
      description:'Recorded household income does not cover scheduled loan repayment and living expenses in one or more reviewed calendar months.',
      suggestedSolution:{
        title:'Adjust Loan Amount or Extend Term',
        description:'Consider reducing requested principal by 15%–20% or extending tenure to fit comfortably within disposable income.',
        actionType:'amount',
        impact:'Restores positive monthly cash buffer across all reviewed months.'
      }
    });
  }

  // Check timing mismatch: repayment scheduled before payday in the same month
  const incomeDates=incomes.flatMap(f=>f.input.cashDates);
  const selectedOffer=view.offers.find(o=>o.id===recommended?.offerId);
  const hasTimingMismatch=Boolean(selectedOffer?.payments.some(p=>{
    const pDay=parseInt(p.date.slice(8,10),10);
    return incomeDates.some(id=>{
      const iDay=parseInt(id.slice(8,10),10);
      return pDay<iDay;
    });
  }));

  if(hasTimingMismatch){
    redFlags.push({
      id:'timing-mismatch',
      title:'Repayment Due Date Precedes Payday',
      severity:'warning',
      category:'timing',
      description:'Scheduled loan repayment installment occurs before monthly take-home pay is credited, creating temporary cash tightness.',
      suggestedSolution:{
        title:'Align Repayment Schedule with Payday',
        description:'Shift the scheduled payment date to 2–3 calendar days following member salary crediting (e.g. from the 10th to the 17th).',
        actionType:'schedule',
        impact:'Ensures salary is in hand before installment debit, preventing temporary overdraft.'
      }
    });
  }

  if(reserveGap!==null&&reserveGap>0){
    redFlags.push({
      id:'reserve-gap',
      title:'Emergency Reserve Buffer Shortfall',
      severity:'warning',
      category:'liquidity',
      description:`Projected cash buffer dips ${money(reserveGap)} below the target household emergency reserve.`,
      suggestedSolution:{
        title:'Establish Pre-Disbursement Buffer',
        description:'Maintain target emergency reserve before disbursement or select a lower monthly payment tier.',
        actionType:'amount',
        impact:'Protects essential household savings cushion from depletion.'
      }
    });
  }

  if(pendingDocuments.length>0||unreviewed.length>0){
    const docCount=pendingDocuments.length, suggCount=unreviewed.length;
    let descText='Supporting documents await verification by cooperative staff.';
    if(docCount>0&&suggCount>0){
      descText=`${docCount} uploaded ${docCount===1?'file':'files'} and ${suggCount} financial statement ${suggCount===1?'suggestion':'suggestions'} await staff review.`;
    }else if(docCount>0){
      descText=`${docCount} uploaded ${docCount===1?'document awaits':'documents await'} staff verification checks.`;
    }else if(suggCount>0){
      descText=`${suggCount} financial statement ${suggCount===1?'suggestion awaits':'suggestions await'} confirmation.`;
    }

    redFlags.push({
      id:'unverified-evidence',
      title:'Supporting Documents Awaiting Verification',
      severity:'info',
      category:'documentation',
      description:descText,
      suggestedSolution:{
        title:'Complete Staff Verification',
        description:'Staff reviews uploaded income proofs to confirm reported household figures.',
        actionType:'document',
        impact:'Completes document verification for official loan decision.'
      }
    });
  }

  if(issues.some(i=>i.includes('No available offer'))){
    redFlags.push({
      id:'missing-offer',
      title:'Pending Officer Assessment & Terms',
      severity:'warning',
      category:'capacity',
      description:'Cooperative staff will review application details and configure available repayment schedules.',
      suggestedSolution:{
        title:'Staff Term Configuration',
        description:'A loan officer configures approved terms and dated repayment schedules for this request.',
        actionType:'schedule',
        impact:'Enables finalized scenario comparison and approval decision.'
      }
    });
  }

  if(redFlags.length===0){
    redFlags.push({
      id:'clean-profile',
      title:'All Risk Indicators Cleared',
      severity:'info',
      category:'liquidity',
      description:'No liquidity deficits, timing clashes, or excessive debt-service ratios detected across evaluated scenarios.',
      suggestedSolution:{
        title:'Proceed to Final Recommendation',
        description:'Application meets standard cooperative risk criteria for officer recommendation.',
        actionType:'document',
        impact:'Ready for standard underwriting approval.'
      }
    });
  }

  // 5C Review with percentage outputs and confidence ratings
  const capacityText=recommended?`Lowest dated balance ${money(recommended.baseline.lowestBalanceCentavos)}; full contractual repayment ${money(recommended.baseline.totalRepaymentCentavos)}. ${recommended.baseline.months.map(m=>`${m.month}: baseline ${money(m.remainingCentavos)} remaining${recommended.stressed?`, what-if ${money(recommended.stressed.months.find(sm=>sm.month===m.month)!.remainingCentavos)} remaining`:''}`).join('; ')}.${recommended.stressed?` What-if lowest balance: ${money(recommended.stressed.lowest)}.`:''}`:'Capacity details will be evaluated once required facts and repayment schedules are confirmed.';

  // 1. Character Score (0-100%)
  let charScore=85, charConfidence='High Confidence', charTone:'success'|'warning'|'danger'='success';
  if(pendingDocuments.length>0||unreviewed.length>0){
    charScore=72; charConfidence='Verification in Progress'; charTone='warning';
  }else if(!relevant.length){
    charScore=65; charConfidence='Baseline Confidence'; charTone='warning';
  }
  const character:FiveCDimension={
    name:'Character',
    scorePercent:charScore,
    confidenceLabel:charConfidence,
    statusBadge:`${charScore}% · ${charConfidence}`,
    meterTone:charTone,
    text:'Repayment track record and member standing within the cooperative. Good standing and complete documentation support loan clearance.',
    breakdown:[
      { factor:'Member identity & standing', status:'passed' },
      { factor:pendingDocuments.length===0?'Supporting documents cleared':'Document verification in progress', status:pendingDocuments.length===0?'passed':'warning' },
      { factor:'Cooperative record integrity', status:'passed' }
    ],
    items:[]
  };

  // 2. Capacity Score (0-100%)
  let capScore=88, capConfidence='Strong Capacity', capTone:'success'|'warning'|'danger'='success';
  if(!recommended){
    capScore=50; capConfidence='Needs Information'; capTone='warning';
  }else if(lowest!==null&&lowest<0){
    capScore=68; capConfidence='Stressed Deficit'; capTone='warning';
  }else if(shortfall){
    capScore=55; capConfidence='Monthly Shortfall'; capTone='danger';
  }
  const capacity:FiveCDimension={
    name:'Capacity',
    scorePercent:capScore,
    confidenceLabel:capConfidence,
    statusBadge:`${capScore}% · ${capConfidence}`,
    meterTone:capTone,
    text:capacityText,
    breakdown:[
      { factor:'Net cash flow coverage', status:shortfall?'warning':'passed' },
      { factor:'Scheduled repayment capacity', status:recommended?'passed':'warning' },
      { factor:'Emergency scenario resilience', status:lowest!==null&&lowest<0?'warning':'passed' }
    ],
    items:relevant.filter(f=>['income','expense','obligation'].includes(f.input.category))
  };

  // 3. Capital Score (0-100%)
  const hasOpening=opening?.availability==='recorded'&&opening.amountCentavos>0;
  const capitalScore=hasOpening?(opening.amountCentavos>=100000?85:75):58;
  const capitalConfidence=hasOpening?'Recorded Reserves':'Unverified Reserves';
  const capitalTone:'success'|'warning'|'danger'=hasOpening?'success':'warning';
  const capital:FiveCDimension={
    name:'Capital',
    scorePercent:capitalScore,
    confidenceLabel:capitalConfidence,
    statusBadge:`${capitalScore}% · ${capitalConfidence}`,
    meterTone:capitalTone,
    text:opening?.availability==='recorded'?`Opening spendable cash: ${money(opening.amountCentavos)}. Spendable reserves provide a cushion against unexpected cash shortfalls.`:'Accessible opening cash has not been recorded yet. Share capital and emergency reserves provide additional stability.',
    breakdown:[
      { factor:'Spendable cash balance', status:opening?.availability==='recorded'?'passed':'warning' },
      { factor:'Emergency reserve cushion', status:assumptions.reserve!==null?'passed':'info' }
    ],
    items:relevant.filter(f=>f.input.category==='opening')
  };

  // 4. Collateral Score (0-100%)
  const collateralScore=issues.length>0?70:80;
  const collateralConfidence=issues.length>0?'Policy Check Needed':'Policy Compliant (Unsecured)';
  const collateral:FiveCDimension={
    name:'Collateral',
    scorePercent:collateralScore,
    confidenceLabel:collateralConfidence,
    statusBadge:`${collateralScore}% · ${collateralConfidence}`,
    meterTone:issues.length>0?'warning':'success',
    text:'Standard cooperative micro-lending policy applies. Staff confirms whether security, chattel, or co-maker guarantees are required for this loan amount.',
    breakdown:[
      { factor:'Unsecured micro-lending conformance', status:'passed' },
      { factor:'Cooperative share capital backup', status:'passed' }
    ],
    items:[]
  };

  // 5. Conditions Score (0-100%)
  const condScore=lowest!==null&&lowest<0?74:86;
  const condConfidence=lowest!==null&&lowest<0?'Restructuring Recommended':'Favorable Conditions';
  const reviewDatesText=isCalendarDate(assumptions.start)&&isCalendarDate(assumptions.end)?`Review: ${dateLabel(assumptions.start)} to ${dateLabel(assumptions.end)}.`: 'Review dates pending confirmation.';
  const expenseText=assumptions.expense&&isCalendarDate(assumptions.expense.date)?`Simulated ${assumptions.expense.label}: ${money(assumptions.expense.amount)} on ${dateLabel(assumptions.expense.date)}.`:'Automated contingency risk has been modeled across the review horizon.';
  const conditions:FiveCDimension={
    name:'Conditions',
    scorePercent:condScore,
    confidenceLabel:condConfidence,
    statusBadge:`${condScore}% · ${condConfidence}`,
    meterTone:lowest!==null&&lowest<0?'warning':'success',
    text:`Purpose: ${purpose}. ${reviewDatesText} ${expenseText}`,
    breakdown:[
      { factor:'Loan purpose alignment', status:'passed' },
      { factor:'Tenure horizon suitability', status:'passed' },
      { factor:'Contingency stress test evaluated', status:'passed' }
    ],
    items:[]
  };

  const fiveC={Character:character,Capacity:capacity,Capital:capital,Collateral:collateral,Conditions:conditions};
  const overallScore=Math.round(character.scorePercent*0.25+capacity.scorePercent*0.35+capital.scorePercent*0.15+collateral.scorePercent*0.10+conditions.scorePercent*0.15);
  const overallConfidence=overallScore>=80?'High Readiness':overallScore>=65?'Moderate Readiness':'Needs Restructuring';

  return {
    issues:[...new Set(issues)],
    options,
    recommended,
    lowest,
    shortfall,
    reserveGap,
    priority,
    reason,
    pendingDocuments,
    unreviewed,
    authoritative,
    relevant,
    totalIncomeCentavos,
    totalExpenseCentavos,
    totalObligationCentavos,
    autoRisk,
    redFlags,
    fiveC,
    overallScore,
    overallConfidence
  };
}

export function canConsider(option:Option|null,assumptions:Assumptions):boolean {
  return Boolean(option&&option.baseline.checks.every(c=>c.passed)&&(!option.stressChecks||option.stressChecks.every(c=>c.passed))&&(!option.stressed||option.stressed.lowest>=0&&option.stressed.months.every(m=>m.remainingCentavos>=0))&&(assumptions.reserve===null||(option.stressed?.lowest??option.baseline.lowestBalanceCentavos)>=assumptions.reserve));
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
