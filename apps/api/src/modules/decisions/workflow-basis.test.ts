import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { WorkflowAssessment, WorkflowFact, WorkflowPolicy } from '../../../../../packages/contracts/src/workflow.js';
import { canonical } from '../../platform/commands.js';
import { assessWorkflow } from '../../../../../packages/finance/src/workflow-assessment.js';
import { DecisionSnapshotSchema, ReviewContextSchema } from './context.js';
import { fictionalBasis } from './backend.test-fixture.js';
import { workflowDigest } from './workflow-digest.js';
import { datedScenario, WorkflowDecisionBasisSchema } from './workflow-basis.js';
import { prepareDecision, prepareRecommendation, reviewBasisHash, reviewChangeEffect, reviewSourceIds } from './rules.js';
import { decisionDocument, termsChecksum } from './decision-documents.js';

/** New fictional two-month oracle, independent of the frozen demo registry. */
function fixture(beyondHorizon=false) {
  const officer=randomUUID(),reviewer=randomUUID(),org=randomUUID(),branch=randomUUID(),member=randomUUID(),app=randomUUID();
  const at='2026-11-05T00:00:00Z';
  const application={id:app,organizationId:org,branchId:branch,memberId:member,memberName:'Fictional dated review member',purpose:'Fictional equipment',
    requestedPrincipalCentavos:100000,requestedTermMonths:beyondHorizon?3:2,currency:'PHP' as const,status:'assessment_ready' as const,version:1,assessmentInputVersion:1,
    assignedOfficerId:officer,createdAt:at,updatedAt:at};
  const old=fictionalBasis(application,reviewer);
  const policy=WorkflowPolicy.parse({id:randomUUID(),label:'Fictional two-month oracle',status:'fictional',approvalReference:null,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',
    loanProceedsTreatment:'reserved_for_purpose',remainingRuleBasis:'each_reviewed_calendar_month_segment',minimumRemainingCentavos:0,minimumBalanceCentavos:0,
    offers:[{id:randomUUID(),productVersionId:randomUUID(),label:'Fictional dated terms',principalCentavos:100000,netReceivedCentavos:100000,feesPaidSeparatelyCentavos:3000,
      termMonths:beyondHorizon?3:2,available:true,payments:[{date:'2026-11-25',amountCentavos:50000},{date:'2026-12-25',amountCentavos:50000},...(beyondHorizon?[{date:'2027-01-25',amountCentavos:50000}]:[])],separateFees:[{date:'2026-12-01',amountCentavos:3000}]}]});
  const fact=(category:string,amount:number,cashDates:string[],period:string) => {
    const sourceId=randomUUID();
    return WorkflowFact.parse({id:randomUUID(),revision:1,sourceId,sourceVersion:1,recordedAt:at,input:{factId:null,label:category,category,value:{availability:'recorded',amountCentavos:amount},
      sourceId,sourceVersion:1,statement:null,effectiveDate:'2026-11-01',coverageStart:'2026-11-01',coverageEnd:'2026-12-31',cashDates,period,
      basis:category==='income'?'net':'not_applicable',deduction:'no',reason:'Fictional confirmed dates and explicit complete horizon coverage.'}});
  };
  const facts=[fact('opening',200000,['2026-11-01'],'one_time'),fact('income',300000,['2026-11-15','2026-11-30','2026-12-15','2026-12-30'],'semi_monthly'),
    fact('expense',120000,['2026-11-20'],'one_time'),fact('obligation',0,['2026-11-01'],'one_time')];
  const calculated=assessWorkflow(facts,policy,[policy.offers[0].id],'2026-11-01','2026-12-31');
  const assessment=WorkflowAssessment.parse({id:randomUUID(),applicationId:app,inputVersion:1,policyVersionId:policy.id,engineVersion:'dated-cash-flow-v4',createdAt:at,
    periodStart:'2026-11-01',periodEnd:'2026-12-31',status:'complete',...calculated,stale:false});
  const sources=facts.map(f=>({sourceId:f.sourceId,sourceVersion:1,kind:'statement' as const,date:'2026-11-01',originalSha256:null,
    statementSha256:termsChecksum(`Fictional ${f.input.label} evidence`),textVersionId:null,textSha256:null,state:'cleared' as const,verification:'not_checked' as const}));
  const basis=WorkflowDecisionBasisSchema.parse({format:'workflow-decision-basis/v1',inputSnapshotSha256:workflowDigest({facts,policy}),assessment,facts,policy,sources,
    confirmations:facts.map(f=>({factId:f.id,revision:f.revision,staffId:officer,memberId:null,recordedAt:at}))});
  const c=ReviewContextSchema.parse({...old,periodStart:assessment.periodStart,periodEnd:assessment.periodEnd,currentAssessmentPolicyVersionId:policy.id,
    assessment:{id:assessment.id,applicationId:app,inputVersion:1,engineVersion:assessment.engineVersion,policyVersionId:policy.id,createdAt:at,status:'complete',warnings:[],scenarios:assessment.scenarios.map(datedScenario)},
    facts:[],sources:[],workflowBasis:basis,offers:policy.offers.map(({separateFees,...o})=>{void separateFees;return o;})});
  const actor=(userId:string,roles:('officer'|'reviewer')[])=>({userId,organizationId:org,branchIds:[branch],roles,sessionId:randomUUID(),authenticatedAt:new Date(at),authenticationMethods:['mfa'],correlationId:randomUUID()});
  return {c,at,officer:actor(officer,['officer']),reviewer:actor(reviewer,['reviewer'])};
}
function approved() {
  const f=fixture(),c=f.c;
  c.recommendation={...prepareRecommendation(f.officer,c,{id:randomUUID(),at:f.at,expectedVersion:c.application.version,
    request:{assessmentId:c.assessment!.id,offerVersionId:c.offers[0].id,inputVersion:1,reason:'Fictional checked dated offer.'}})};
  c.application.status='recommended';c.application.version++;
  const request={outcome:'approve' as const,assessmentId:c.assessment!.id,recommendationId:c.recommendation.id,offerVersionId:c.offers[0].id,
    rationale:'Reviewed fictional financial evidence.',departureReason:'',exceptions:[],reviewDate:'2026-12-31',explanationReviewed:true as const};
  const doc=decisionDocument(c,request);
  const decision=prepareDecision(f.reviewer,c,{id:randomUUID(),at:f.at,expectedVersion:c.application.version,request,
    document:{id:randomUUID(),sha256:termsChecksum(doc.terms!)},explanation:{origin:'template',text:doc.explanation,basisHash:reviewBasisHash(c),sourceIds:reviewSourceIds(c),reviewedBy:f.reviewer.userId}});
  return {...f,decision,doc};
}
describe('lossless workflow decision compatibility',()=>{
  it('preserves the independent two-month oracle, every cash occurrence, fee date and explicit zero',()=>{
    const {c,decision,doc}=approved(),s=c.workflowBasis!.assessment.scenarios[0];
    expect(s).toMatchObject({horizonNetCentavos:977000,closingBalanceCentavos:1177000,lowestBalanceCentavos:200000,totalRepaymentCentavos:100000,financingCostCentavos:3000,
      months:[{month:'2026-11',remainingCentavos:430000},{month:'2026-12',remainingCentavos:547000}]});
    const decoded=DecisionSnapshotSchema.parse(JSON.parse(JSON.stringify(decision.snapshot)));
    expect(decoded.format).toBe('decision-snapshot/v2');expect(decoded.basis.workflowBasis).toEqual(c.workflowBasis);
    expect(decoded.basis.workflowBasis!.facts[1].input.cashDates).toHaveLength(4);
    expect(decoded.basis.workflowBasis!.facts[3].input.value).toEqual({availability:'recorded',amountCentavos:0});
    expect(doc.explanation).toContain('full-horizon remaining');expect(doc.explanation).not.toContain('monthly remaining');
    expect(doc.terms).toContain('Separate fee 2026-12-01');
  });
  it('preserves full contractual costs and payments beyond the checked cash-flow horizon',()=>{
    const {c}=fixture(true),b=c.workflowBasis!,s=b.assessment.scenarios[0];
    expect(s).toMatchObject({totalRepaymentCentavos:150000,financingCostCentavos:53000,horizonNetCentavos:977000,closingBalanceCentavos:1177000});
    expect(b.policy.offers[0].payments.at(-1)).toEqual({date:'2027-01-25',amountCentavos:50000});
    expect(s.daily.at(-1)?.date).toBe('2026-12-31');expect(s.months).toHaveLength(2);
    expect(reviewBasisHash(c)).toHaveLength(64);
  });
  it.each(['cash date','fee date','actual threshold','confirmation','source checksum','coverage'])('commits a changed %s to material currentness',kind=>{
    const {c,decision}=approved(),next=structuredClone(c),b=next.workflowBasis!;
    if(kind==='cash date')b.facts[1].input.cashDates[0]='2026-11-16';
    if(kind==='fee date')b.policy.offers[0].separateFees[0].date='2026-12-02';
    if(kind==='actual threshold')b.policy.minimumRemainingCentavos=1;
    if(kind==='confirmation')b.confirmations[0].staffId=randomUUID();
    if(kind==='source checksum')b.sources[0].statementSha256='a'.repeat(64);
    if(kind==='coverage')b.facts[1].input.coverageEnd='2026-12-30';
    expect(reviewChangeEffect(decision,next,'unreleased')).toMatchObject({changed:true,holdUnreleasedLoan:true});
  });
  it('rejects a fabricated monthly value, omitted basis, unsafe overrides and inconsistent scenario aliases',()=>{
    const {c}=fixture();if(c.assessment?.status!=='complete')throw new Error();
    const scenario=c.assessment.scenarios[0];
    expect(()=>ReviewContextSchema.parse({...c,assessment:{...c.assessment,scenarios:[{...scenario,monthlyRemainingCentavos:488500}]}})).toThrow();
    expect(()=>reviewBasisHash({...c,workflowBasis:undefined})).toThrow();
    const bad=structuredClone(c);if(bad.assessment?.status!=='complete')throw new Error();bad.assessment.scenarios[0].policyChecks[0].overridable=true;
    expect(()=>reviewBasisHash(bad)).toThrow();
    bad.assessment.scenarios[0].policyChecks[0].overridable=false;bad.assessment.scenarios[0].closingBalanceCentavos++;
    expect(()=>reviewBasisHash(bad)).toThrow();
  });
  it('blocks unverified sources when independent support is configured, without labeling manual evidence verified',()=>{
    const {c,officer,at}=fixture();c.integration={format:'connected-review/v1',configurationId:randomUUID(),sourceReview:'independent_support_required'};
    const recommend=()=>prepareRecommendation(officer,c,{id:randomUUID(),at,expectedVersion:1,request:{assessmentId:c.assessment!.id,offerVersionId:c.offers[0].id,inputVersion:1,reason:'Fictional test.'}});
    expect(recommend).toThrow('verification standard');
    c.integration.sourceReview='confirmed_statements_permitted';expect(recommend).not.toThrow();
  });
  it('retains historical v1 bytes and hash without adding a format or new evidence fields',()=>{
    const {c,reviewer}=fixture(),old=fictionalBasis(c.application,reviewer.userId);
    const json=canonical(old);expect(canonical(ReviewContextSchema.parse(JSON.parse(json)))).toBe(json);
    expect(reviewBasisHash(ReviewContextSchema.parse(JSON.parse(json)))).toBe(reviewBasisHash(old));
    expect(ReviewContextSchema.parse(old)).not.toHaveProperty('workflowBasis');expect(reviewBasisHash(old)).toHaveLength(64);
  });
  it('rejects manufactured statement/file provenance and missing confirmation identities',()=>{
    const {c}=fixture(),b=structuredClone(c.workflowBasis!);
    b.sources[0].originalSha256='c'.repeat(64);expect(WorkflowDecisionBasisSchema.safeParse(b).success).toBe(false);
    b.sources[0].originalSha256=null;b.confirmations[0].staffId=null;expect(WorkflowDecisionBasisSchema.safeParse(b).success).toBe(false);
  });
});

// The merged pilot and connected formats are alternatives, never two sources of truth.
it('rejects mixing the pilot assessment with a connected immutable workflow basis',()=>{
  const {c}=fixture();
  expect(()=>reviewBasisHash({...c,datedAssessment:c.workflowBasis!.assessment})).toThrow('one complete dated evidence representation');
});
