import { randomUUID } from 'node:crypto';
import { afterAll,beforeAll,beforeEach,expect,it } from 'vitest';
import { WorkflowPolicy } from '../../../packages/contracts/src/workflow.js';
import { WorkflowService } from '../src/modules/evidence/workflow.service.js';
import { ApplicationsService } from '../src/modules/applications/applications.service.js';
import { MembersService } from '../src/modules/members/members.service.js';
import { PostgresMemberUnitOfWork } from '../src/platform/member-database.js';
import { memberFixture } from './member-fixtures.js';
import { owner,runtimePool,uow,prepareDatabase,resetFixtures,closePools,config } from './database.js';

let f:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>,application:{id:string};
const workflow=new WorkflowService(uow,new PostgresMemberUnitOfWork(runtimePool),false,true);
const approvedWorkflow=new WorkflowService(uow,new PostgresMemberUnitOfWork(runtimePool));
beforeAll(prepareDatabase);afterAll(closePools);
beforeEach(async()=>{
  f=await resetFixtures();member=await memberFixture(f.officer.actor);
  application=await new ApplicationsService(uow,new MembersService(uow,config.PRIVACY_NOTICE_VERSION)).create(f.officer.actor,{memberId:member.record.id,purpose:'Fictional policy transition check',requestedPrincipalCentavos:10000,requestedTermMonths:1,currency:'PHP'},randomUUID());
});
function policy(from='2026-01-01',through='2026-12-31'){
  return WorkflowPolicy.parse({id:randomUUID(),label:'Fictional selection regression',status:'fictional',approvalReference:null,effectiveFrom:from,effectiveThrough:through,loanProceedsTreatment:'reserved_for_purpose',remainingRuleBasis:'each_reviewed_calendar_month_segment',minimumRemainingCentavos:0,minimumBalanceCentavos:0,
    offers:[{id:randomUUID(),productVersionId:randomUUID(),label:'Fictional exact offer',principalCentavos:10000,netReceivedCentavos:10000,feesPaidSeparatelyCentavos:0,termMonths:1,available:true,payments:[{date:'2026-11-25',amountCentavos:10000}],separateFees:[]}]});
}
async function publish(p:ReturnType<typeof policy>,at='2026-10-01T00:00:00Z',org=f.org){
  await owner.query('INSERT INTO credit.policies(id,organization_id,body,published_at) VALUES($1,$2,$3,$4)',[p.id,org,JSON.stringify(p),at]);
}
const selected=(start:string,service=workflow)=>uow.run(f.officer.actor,tx=>service.policy(tx,start));
async function facts(){
  let version=1;
  for(const [category,amount] of [['opening',10000],['income',30000],['expense',10000],['obligation',0]] as const){
    await workflow.saveFact(member.actor,application.id,{factId:null,label:`Fictional ${category}`,category,value:{availability:'recorded',amountCentavos:amount},sourceId:null,sourceVersion:null,statement:'Fictional explicit November cash date and complete coverage.',effectiveDate:'2026-11-01',coverageStart:'2026-11-01',coverageEnd:'2026-11-30',cashDates:[category==='opening'?'2026-11-01':'2026-11-15'],period:'one_time',basis:category==='income'?'net':'not_applicable',deduction:'no',reason:'Fictional confirmation'},version++,randomUUID());
  }
}

it('filters future/expired publications before replacement ordering and honors inclusive boundaries',async()=>{
  const current=policy();await publish(current);
  await publish(policy('2027-01-01','2027-12-31'),'2026-10-03T00:00:00Z');
  await publish(policy('2025-01-01','2025-12-31'),'2026-10-04T00:00:00Z');
  expect((await selected('2026-01-01'))?.id).toBe(current.id);
  expect((await selected('2026-12-31'))?.id).toBe(current.id);
  expect(await selected('2028-01-01')).toBeNull();
  await expect(selected('2026-02-30')).rejects.toThrow();
});
it('uses publication replacement only among eligible versions and refuses equal-time ambiguity',async()=>{
  const first=policy(),replacement=policy();await publish(first);await publish(replacement,'2026-10-02T00:00:00Z');
  expect((await selected('2026-11-01'))?.id).toBe(replacement.id);
  await publish(policy(),'2026-10-02T00:00:00Z');
  expect(await selected('2026-11-01')).toBeNull();
});
it('enforces approved status and organization scope in both SQL and the service',async()=>{
  const fictional=policy(),approved=policy();approved.status='approved';approved.approvalReference='Fictional test reference, not institutional approval';
  await publish(approved);await publish(fictional,'2026-10-02T00:00:00Z');await publish(policy(),'2026-10-03T00:00:00Z',f.otherOrg);
  expect((await selected('2026-11-01',approvedWorkflow))?.id).toBe(approved.id);
  expect((await selected('2026-11-01'))?.id).toBe(fictional.id);
  const foreign=await uow.run(f.officer.actor,tx=>tx.query('SELECT credit.policy_for_review($1,$2::date,true) AS body',[f.otherOrg,'2026-11-01']));
  expect(foreign.rows[0].body).toBeNull();
});
it('keeps displays, assessments and history on the same review-start policy while preserving saved bytes',async()=>{
  const current=policy();await publish(current);await facts();
  const view=await workflow.view(member.actor,application.id);
  expect(view.offers[0].id).toBe(current.offers[0].id);
  const saved=await workflow.assess(f.officer.actor,application.id,{inputVersion:view.inputVersion,offerVersionIds:[current.offers[0].id],periodStart:'2026-11-01',periodEnd:'2026-11-30'},view.version,randomUUID());
  expect(saved.status).toBe('complete');
  const original=(await owner.query('SELECT body,input_snapshot FROM credit.assessments WHERE id=$1',[saved.id])).rows[0];
  await publish(policy('2027-01-01','2027-12-31'),'2026-10-03T00:00:00Z');
  expect((await workflow.view(member.actor,application.id)).latestAssessment).toMatchObject({id:saved.id,policyVersionId:current.id,stale:false});
  expect((await workflow.history(f.officer.actor,application.id)).assessments[0].stale).toBe(false);
  const replacement=policy();await publish(replacement,'2026-10-04T00:00:00Z');
  expect((await workflow.view(member.actor,application.id)).latestAssessment?.stale).toBe(true);
  expect((await workflow.history(f.officer.actor,application.id)).assessments[0].stale).toBe(true);
  expect((await owner.query('SELECT body,input_snapshot FROM credit.assessments WHERE id=$1',[saved.id])).rows[0]).toEqual(original);
});
it('assesses an explicit new horizon with its own applicable policy and saves that exact identity',async()=>{
  const current=policy(),next=policy('2027-01-01','2027-12-31');await publish(current);await publish(next,'2026-10-03T00:00:00Z');
  const view=await workflow.view(member.actor,application.id);
  const saved=await workflow.assess(f.officer.actor,application.id,{inputVersion:view.inputVersion,offerVersionIds:[next.offers[0].id],periodStart:'2027-01-01',periodEnd:'2027-01-31'},view.version,randomUUID());
  // Missing facts still prevent a financial result; policy identity is explicit.
  expect(saved).toMatchObject({status:'incomplete',policyVersionId:next.id,periodStart:'2027-01-01'});
  expect((await workflow.view(member.actor,application.id)).offers[0].id).toBe(next.offers[0].id);
});
