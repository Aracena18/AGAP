import { describe,it,expect } from 'vitest';
import { buildReview,canConsider,compareAttention,materialBasis,type View,type Assumptions } from './analysis';

function fixture():View{
 const rows=[['opening',100000,'2026-01-01'],['income',200000,'2026-01-15'],['expense',50000,'2026-01-20'],['obligation',25000,'2026-01-15']] as const;
 const facts=rows.map(([category,amount,date],i)=>({id:`fact-${i}`,revision:1,sourceId:`source-${i}`,sourceVersion:1,recordedAt:'2026-01-01T00:00:00Z',input:{factId:null,relevance:'included' as const,label:category,category,value:{availability:'recorded' as const,amountCentavos:amount},sourceId:null,sourceVersion:null,statement:`Confirmed ${category}`,effectiveDate:'2026-01-01',coverageStart:'2026-01-01',coverageEnd:'2026-01-31',cashDates:[date],period:category==='opening'?'one_time' as const:'monthly' as const,basis:category==='income'?'net' as const:'not_applicable' as const,deduction:category==='obligation'?'yes' as const:'no' as const,reason:'Confirmed source amounts, dates and complete January coverage.'}}));
 return {applicationId:'application',version:5,inputVersion:5,facts,sources:facts.map(f=>({id:f.sourceId,version:1,textVersionId:null,kind:'statement',label:f.input.label,date:'2026-01-01',state:'cleared',processing:'manual',message:null,verification:'not_checked',pages:[{page:1,text:f.input.statement!}]})),drafts:[],offers:[{id:'offer',productVersionId:'product',label:'Recorded offer',principalCentavos:100000,netReceivedCentavos:100000,feesPaidSeparatelyCentavos:0,termMonths:1,available:true,payments:[{date:'2026-01-10',amountCentavos:55000},{date:'2026-01-25',amountCentavos:55000}]}],latestAssessment:null,aiAvailable:false};
}
const assumptions:Assumptions={start:'2026-01-01',end:'2026-01-31',reserve:null,expense:null};
describe('entered-application demonstration analysis',()=>{
 it('uses exact independent cash timing and costs without double-deducting payroll',()=>{
  const view=fixture(),before=JSON.stringify(view),r=buildReview(view,assumptions);
  expect(r.issues).toEqual([]);expect(r.recommended?.baseline).toMatchObject({lowestBalanceCentavos:45000,closingBalanceCentavos:140000,horizonNetCentavos:40000,totalRepaymentCentavos:110000,financingCostCentavos:10000});
  expect(r.priority).toBe('routine');expect(r.authoritative).toBe(false);expect(JSON.stringify(view)).toBe(before);
 });
 it('adds a hypothetical expense exactly once, without changing confirmed facts',()=>{
  const view=fixture(),before=JSON.stringify(view),r=buildReview(view,{...assumptions,reserve:50000,expense:{label:'Repair scenario',amount:60000,date:'2026-01-12'}});
  expect(r.recommended?.stressed).toMatchObject({lowest:-15000,closing:80000,remaining:-20000});expect(r.reserveGap).toBe(65000);expect(r.priority).toBe('urgent');expect(JSON.stringify(view)).toBe(before);
 });
 it('compares only permitted offers and does not invent a lower amount or new terms',()=>{
  const view=fixture();view.offers.push({...view.offers[0],id:'later',label:'Permitted later date',payments:[{date:'2026-01-16',amountCentavos:55000},{date:'2026-01-25',amountCentavos:55000}]});
  view.offers.push({...view.offers[0],id:'unavailable',available:false,payments:[]});
  const r=buildReview(view,{...assumptions,reserve:50000,expense:{label:'Repair',amount:60000,date:'2026-01-12'}});
  expect(r.options).toHaveLength(2);expect(r.recommended?.offerId).toBe('later');expect(r.lowest).toBe(40000);expect(r.priority).toBe('urgent');expect(r.shortfall).toBe(true);expect(r.recommended?.baseline.financingCostCentavos).toBe(10000);
 });
 it('keeps missing values different from a recorded zero and refuses unknown fee dates',()=>{
  const view=fixture();view.facts[2].input.value={availability:'recorded',amountCentavos:0};expect(buildReview(view,assumptions).issues).toEqual([]);
  const missing=structuredClone(view) as View;missing.facts[2].input.value={availability:'unavailable',reason:'Expense not known'};
  expect(buildReview(missing,assumptions)).toMatchObject({priority:'clarification',recommended:null});
  view.offers[0].feesPaidSeparatelyCentavos=1000;expect(buildReview(view,assumptions).options).toEqual([]);
 });
 it('does not model uncleared sources or invalid/out-of-horizon hypothetical events',()=>{
  const view=fixture();view.sources[0].state='quarantined';expect(buildReview(view,assumptions).recommended).toBeNull();
  for(const expense of [{label:'',amount:100,date:'2026-01-05'},{label:'Repair',amount:0,date:'2026-01-05'},{label:'Repair',amount:100,date:'2026-02-01'}])expect(buildReview(fixture(),{...assumptions,expense}).options).toEqual([]);
 });
 it('retains an overall shortfall despite positive opening cash and rejects obsolete saved results',()=>{
  const view=fixture();view.facts[0].input.value={availability:'recorded',amountCentavos:900000};view.facts[1].input.value={availability:'recorded',amountCentavos:100000};
  const r=buildReview(view,assumptions);expect(r.lowest).toBeGreaterThan(0);expect(r.shortfall).toBe(true);expect(r.priority).toBe('urgent');
  const complete=buildReview(fixture(),assumptions).options.map(o=>o.baseline);view.latestAssessment={id:'old',applicationId:view.applicationId,inputVersion:1,policyVersionId:null,engineVersion:'v4',createdAt:'2026-01-01T00:00:00Z',periodStart:assumptions.start,periodEnd:assumptions.end,status:'complete',issues:[],scenarios:complete,stale:true};
  expect(buildReview(view,assumptions).authoritative).toBe(false);expect(buildReview(view,assumptions).shortfall).toBe(true);
 });
 it('ranks attention groups with FIFO ties, and binds shared assumptions to material changes',()=>{
  const view=fixture(),original=materialBasis(view),routine=buildReview(view,assumptions);view.facts[1].input.value={availability:'unavailable',reason:'Clarification required'};
  const clarification=buildReview(view,assumptions);expect(materialBasis(view)).not.toBe(original);
  const a={review:routine,id:'a',createdAt:'2026-01-01'},b={review:clarification,id:'b',createdAt:'2026-01-02'};expect([a,b].sort(compareAttention)[0]).toBe(b);
  expect(compareAttention(a,{...a,id:'z'})).toBeLessThan(0);
 });
 it('retains failed configured thresholds even when every displayed balance is positive',()=>{
  const view=fixture(),scenarios=buildReview(view,assumptions).options.map(o=>structuredClone(o.baseline));
  scenarios[0].checks[0]={id:'cash-timing',passed:false,actualCentavos:45000,minimumCentavos:50000,detail:'Approved minimum balance.'};
  view.latestAssessment={id:'saved',applicationId:view.applicationId,inputVersion:view.inputVersion,policyVersionId:'policy',engineVersion:'dated-cash-flow-v4',createdAt:'2026-01-01T00:00:00Z',periodStart:assumptions.start,periodEnd:assumptions.end,status:'complete',issues:[],scenarios,stale:false};
  const result=buildReview(view,assumptions);expect(result.authoritative).toBe(true);expect(result.lowest).toBe(45000);expect(result.priority).toBe('urgent');expect(result.reason).toContain('Configured financial checks');
 });
 it('returns clarification rather than overflowing a hypothetical calculation',()=>{
  const view=fixture();view.facts[1].input.value={availability:'recorded',amountCentavos:0};
  const result=buildReview(view,{...assumptions,expense:{label:'Explicit large stress assumption',amount:Number.MAX_SAFE_INTEGER,date:'2026-01-25'}});
  expect(result.priority).toBe('clarification');expect(result.recommended).toBeNull();expect(result.issues.join()).toContain('supported calculation range');
 });
 it('retains positive configured minima in stress ranking and follow-up eligibility',()=>{
  const view=fixture(),baseline=structuredClone(buildReview(view,assumptions).options[0].baseline);
  baseline.lowestBalanceCentavos=100000;baseline.daily=baseline.daily.map(d=>({...d,balanceCentavos:d.date<'2026-01-15'?100000:200000}));baseline.months=[{month:'2026-01',remainingCentavos:100000}];
  baseline.checks=[{id:'cash-timing',passed:true,actualCentavos:100000,minimumCentavos:50000,detail:'Configured cash minimum'},{id:'remaining:2026-01',passed:true,actualCentavos:100000,minimumCentavos:50000,detail:'Configured monthly minimum'}];
  view.facts[0].input.value={availability:'recorded',amountCentavos:100000};
  view.latestAssessment={id:'saved',applicationId:view.applicationId,inputVersion:view.inputVersion,policyVersionId:'policy',engineVersion:'dated-cash-flow-v4',createdAt:'2026-01-01T00:00:00Z',periodStart:assumptions.start,periodEnd:assumptions.end,status:'complete',issues:[],scenarios:[baseline],stale:false};
  const a={...assumptions,expense:{label:'Repair',amount:60000,date:'2026-01-12'}},r=buildReview(view,a);
  expect(r.recommended?.stressChecks).toMatchObject([{id:'cash-timing',minimumCentavos:50000,actualCentavos:40000,passed:false},{id:'remaining:2026-01',minimumCentavos:50000,passed:false}]);
  expect(r.priority).toBe('urgent');expect(canConsider(r.recommended,a)).toBe(false);
 });
 it('models no emergency, probability, score or new offer without supplied inputs',()=>{
  const view=fixture(),before=JSON.stringify(view),r=buildReview(view,assumptions);
  expect(r.options.every(o=>o.stressed===null&&o.stressChecks===null)).toBe(true);
  expect(r).not.toHaveProperty('autoRisk');expect(r).not.toHaveProperty('fiveC');expect(r).not.toHaveProperty('overallScore');
  expect(r.options.map(o=>o.offerId)).toEqual(['offer']);expect(JSON.stringify(view)).toBe(before);
 });
 it('keeps missing financial evidence unavailable without a favorable fallback',()=>{
  const view=fixture();view.facts=[];
  const r=buildReview(view,assumptions);
  expect(r).toMatchObject({recommended:null,lowest:null,priority:'clarification',options:[]});
  expect(r).not.toHaveProperty('autoRisk');expect(r).not.toHaveProperty('overallScore');
 });
});
