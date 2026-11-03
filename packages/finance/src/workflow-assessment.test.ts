import { expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { WorkflowFact,WorkflowPolicy } from '../../contracts/src/workflow.js';
import { assessWorkflow } from './workflow-assessment.js';
const days=['2026-01-15','2026-02-15','2026-03-15'];
const fact=(category:string,amount:number,cashDates=days,extra={})=>WorkflowFact.parse({id:randomUUID(),revision:1,sourceId:randomUUID(),sourceVersion:1,recordedAt:'2026-01-01T00:00:00Z',input:{factId:null,label:category,value:{availability:'recorded',amountCentavos:amount},category,sourceId:null,sourceVersion:null,statement:'Fictional dated statement',effectiveDate:'2026-01-01',coverageStart:'2026-01-01',coverageEnd:'2026-03-31',cashDates,period:'monthly',basis:category==='income'?'net':'not_applicable',deduction:'no',reason:'Explicit fictional dates confirmed for full horizon',...extra}});
const policy=()=>WorkflowPolicy.parse({id:randomUUID(),label:'Fictional policy',status:'fictional',approvalReference:null,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',loanProceedsTreatment:'reserved_for_purpose',remainingRuleBasis:'each_reviewed_calendar_month_segment',minimumRemainingCentavos:0,minimumBalanceCentavos:0,offers:[{id:randomUUID(),productVersionId:randomUUID(),label:'Fictional six-month offer',principalCentavos:100000,netReceivedCentavos:100000,feesPaidSeparatelyCentavos:5000,termMonths:6,available:true,payments:['01','02','03','04','05','06'].map(m=>({date:`2026-${m}-25`,amountCentavos:20000})),separateFees:[{date:'2026-01-01',amountCentavos:5000}]}]});
const facts=()=>[fact('opening',10000,['2026-01-01']),fact('income',300000),fact('expense',100000),fact('expense',200000,['2026-03-20']),fact('obligation',10000,days,{deduction:'yes'})];
it('requires one cash date for an included one-time fact, even when the amount is zero', () => {
  const p = policy(), inputs = facts();
  inputs[3] = fact('expense', 0, ['2026-03-20', '2026-03-21'], { period: 'one_time', label: 'School expense' });
  const assess = () => assessWorkflow(inputs, p, [p.offers[0].id], '2026-01-01', '2026-03-31');
  expect(assess()).toEqual({ issues: ['School expense: record only one cash date for a one-time amount.'], scenarios: [] });
  inputs[3].input.cashDates.pop();
  expect(assess()).toMatchObject({ issues: [], scenarios: [{ horizonNetCentavos: 535000 }] });
});

it('withholds scenarios for an unavailable offer even if it has a valid explicit schedule', () => {
  const p = policy();
  p.offers[0].available = false;
  expect(assessWorkflow(facts(), p, [p.offers[0].id], '2026-01-01', '2026-03-31')).toEqual({
    issues: ['One or more selected offers are unavailable under the configured policy.'], scenarios: [],
  });
});
it('uses independent multi-month arithmetic, dated irregular expenses, fee timing and complete contractual cost',()=>{const p=policy(),r=assessWorkflow(facts(),p,[p.offers[0].id],'2026-01-01','2026-03-31');expect(r.issues).toEqual([]);expect(r.scenarios[0]).toMatchObject({horizonNetCentavos:335000,lowestBalanceCentavos:5000,closingBalanceCentavos:345000,totalRepaymentCentavos:120000,financingCostCentavos:25000,months:[{month:'2026-01',remainingCentavos:175000},{month:'2026-02',remainingCentavos:180000},{month:'2026-03',remainingCentavos:-20000}]});expect(r.scenarios[0].checks.find(c=>c.id==='remaining:2026-03')?.passed).toBe(false);});
it.each(['basis','period','deduction'])('refuses unknown %s rather than treating it as zero',field=>{const p=policy(),f=facts();Object.assign(f[1].input,{[field]:'unknown'});expect(assessWorkflow(f,p,[p.offers[0].id],'2026-01-01','2026-03-31').scenarios).toEqual([]);});
it('requires coverage, dates and net income without extrapolation',()=>{const p=policy(),f=facts();f[1].input.coverageEnd='2026-01-31';f[1].input.basis='gross';const r=assessWorkflow(f,p,[p.offers[0].id],'2026-01-01','2026-03-31');expect(r.issues.join()).toContain('coverage');expect(r.issues.join()).toContain('net income');});
it('distinguishes confirmed zero, unavailable and omitted obligations',()=>{const p=policy(),f=facts();f[4].input.value={availability:'recorded',amountCentavos:0};expect(assessWorkflow(f,p,[p.offers[0].id],'2026-01-01','2026-03-31').issues).toEqual([]);f[4].input.value={availability:'unavailable',reason:'No evidence'};expect(assessWorkflow(f,p,[p.offers[0].id],'2026-01-01','2026-03-31').issues.join()).toContain('No evidence');expect(assessWorkflow(f.slice(0,4),p,[p.offers[0].id],'2026-01-01','2026-03-31').issues.join()).toContain('obligation');});
it('fails closed for fee mismatch, excessive horizon and safe integer overflow',()=>{const p=policy();p.offers[0].separateFees=[];expect(assessWorkflow(facts(),p,[p.offers[0].id],'2026-01-01','2026-03-31').issues.join()).toContain('dated');const q=policy(),f=facts();f[1].input.value={availability:'recorded',amountCentavos:Number.MAX_SAFE_INTEGER};expect(assessWorkflow(f,q,[q.offers[0].id],'2026-01-01','2026-03-31').issues.join()).toContain('integer range');});
it('requires explicit human not-applicable correction rather than deleting or zeroing an erroneous fact',()=>{const p=policy(),f=facts(),duplicate=fact('opening',10000,['2026-01-01']);f.push(duplicate);expect(assessWorkflow(f,p,[p.offers[0].id],'2026-01-01','2026-03-31').issues.join()).toContain('exactly one');duplicate.input.relevance='not_applicable';expect(assessWorkflow(f,p,[p.offers[0].id],'2026-01-01','2026-03-31').issues).toEqual([]);expect(f).toHaveLength(6);expect(duplicate.input.value).toEqual({availability:'recorded',amountCentavos:10000});});
