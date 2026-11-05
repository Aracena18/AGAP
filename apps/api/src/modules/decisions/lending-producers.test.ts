import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { WorkflowPolicy } from '../../../../../packages/contracts/src/workflow.js';
import { owner, runtimePool, identityPool, config, prepareDatabase, resetFixtures, closePools } from '../../../test/database.js';
import { memberFixture } from '../../../test/member-fixtures.js';
import { createPool, PostgresUnitOfWork } from '../../platform/database.js';
import { PostgresMemberUnitOfWork } from '../../platform/member-database.js';
import { lendingLockSql } from '../../platform/lending-transaction.js';
import { MembersService } from '../members/members.service.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { WorkflowService } from '../evidence/workflow.service.js';
import { WorkflowDecisionProducer } from '../evidence/decision-basis.producer.js';
import { LendingDecisionProducers } from './lending-producers.js';
import { LendingConfigurationSchema } from './lending-configuration.js';
import { DecisionsService } from './decisions.service.js';
import { LendingMoneyProducers } from '../servicing/lending-money.producers.js';
import { ServicingService } from '../servicing/servicing.service.js';
import { MoneyService } from '../servicing/money.service.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { FictionalManualDriver } from '../servicing/testing/manual-simulation.js';
import { DecisionStaffReads } from './staff-read.service.js';
import { workflowDigest } from './workflow-digest.js';
import { StaffService } from '../identity/staff.service.js';

const uow=new PostgresUnitOfWork(runtimePool,{lendingGuard:true}),muow=new PostgresMemberUnitOfWork(runtimePool,{lendingGuard:true});
const workflow=new WorkflowService(uow,muow,false,true),ports=new LendingDecisionProducers(new WorkflowDecisionProducer(workflow),true);
const decisions=new DecisionsService(uow,ports),moneyPorts=new LendingMoneyProducers(ports,true);
let f:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>,reviewer:ActorContext,cashier:ActorContext,authorizer:ActorContext;
let app:string,policy:ReturnType<typeof WorkflowPolicy.parse>,configuration:ReturnType<typeof LendingConfigurationSchema.parse>;
const key=()=>randomUUID();
async function version(){return Number((await owner.query('SELECT version FROM applications.applications WHERE id=$1',[app])).rows[0].version);}
async function staff(role:'cashier'|'financial_authorizer'):Promise<ActorContext>{
  const userId=key(),sessionId=key();
  await owner.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$1::uuid::text,$4,$5,$6)',
    [userId,f.org,'fictional-connected-lending',`Fictional ${role}`,[f.branch],[role]]);
  await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,now(),ARRAY['mfa'],now()+interval '30 minutes')",[sessionId,key(),userId]);
  return {...f.officer.actor,userId,sessionId,roles:[role],authenticatedAt:new Date()};
}
async function publishConfig(body=configuration){
  const client=await owner.connect();
  try {await client.query('BEGIN');await client.query(lendingLockSql,[f.org]);
    await client.query('INSERT INTO decisions.lending_configurations(id,organization_id,branch_id,product_version_id,body) VALUES($1,$2,$3,$4,$5)',[body.id,f.org,f.branch,body.productVersionId,JSON.stringify(body)]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function declarations(){
  for(const actor of [f.officer.actor,reviewer])await uow.run(actor,async tx=>{
    await tx.query(`INSERT INTO decisions.conflict_declarations(id,organization_id,application_id,branch_id,user_id,input_version,status,reference)
      SELECT $1,$2,id,branch_id,$3,assessment_input_version,'clear','Explicit fictional self-declaration for producer testing.' FROM applications.applications WHERE id=$4`,[key(),f.org,actor.userId,app]);
  });
}
async function approved(accept=true){
  await declarations();
  const assessment=(await workflow.view(f.officer.actor,app)).latestAssessment!;
  const r=await decisions.recommend(f.officer.actor,app,{assessmentId:assessment.id,offerVersionId:policy.offers[0].id,inputVersion:assessment.inputVersion,reason:'Reviewed the authoritative fictional dated assessment.'},await version(),key());
  const data={outcome:'approve' as const,assessmentId:assessment.id,recommendationId:r.id,offerVersionId:policy.offers[0].id,rationale:'Separate fictional reviewer inspected the complete dated basis.',departureReason:'',exceptions:[],reviewDate:'2026-12-31'};
  const proof=await decisions.preview(reviewer,app,data,await version(),key());
  const d=await decisions.record(reviewer,app,{...data,explanationReviewed:true},await version(),key(),proof.id);
  const current=await muow.run(member.actor,tx=>decisions.memberDecision(tx,app));
  if(current.state!=='available'||!current.data?.documentVersionId)throw new Error('Expected exact own-member approved terms.');
  const input={decisionId:d.id,documentVersionId:current.data.documentVersionId,acknowledgment:true as const},acceptKey=key(),v=await version();
  const accepted=accept?await muow.run(member.actor,tx=>decisions.memberAccept(tx,app,input,v,acceptKey)):null;
  return {d,proof,input,acceptKey,v,accepted};
}
beforeAll(prepareDatabase);afterAll(closePools);
beforeEach(async()=>{
  f=await resetFixtures();member=await memberFixture(f.officer.actor);
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['reviewer'] WHERE id=$1",[f.revocationTarget.actor.userId]);
  reviewer={...f.revocationTarget.actor,roles:['reviewer']};cashier=await staff('cashier');authorizer=await staff('financial_authorizer');
  const created=await new ApplicationsService(uow,new MembersService(uow,'fictional-notice')).create(f.officer.actor,{memberId:member.record.id,purpose:'Fictional connected equipment request',requestedPrincipalCentavos:100000,requestedTermMonths:2,currency:'PHP'},key());app=created.id;
  policy=WorkflowPolicy.parse({id:key(),label:'Fictional connected first product',status:'fictional',approvalReference:null,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',
    loanProceedsTreatment:'reserved_for_purpose',remainingRuleBasis:'each_reviewed_calendar_month_segment',minimumRemainingCentavos:0,minimumBalanceCentavos:0,
    offers:[{id:key(),productVersionId:key(),label:'Fictional principal-only two-month schedule',principalCentavos:100000,netReceivedCentavos:100000,feesPaidSeparatelyCentavos:0,termMonths:2,available:true,
      payments:[{date:'2026-11-25',amountCentavos:50000},{date:'2026-12-25',amountCentavos:50000}],separateFees:[]}]});
  await owner.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[policy.id,f.org,JSON.stringify(policy)]);
  for(const [category,amount,cashDates,period] of [['opening',200000,['2026-11-01'],'one_time'],['income',300000,['2026-11-15','2026-11-30','2026-12-15','2026-12-30'],'semi_monthly'],['expense',120000,['2026-11-20'],'one_time'],['obligation',0,['2026-11-01'],'one_time']] as const)
    await workflow.saveFact(f.officer.actor,app,{factId:null,label:category,category,value:{availability:'recorded',amountCentavos:amount},sourceId:null,sourceVersion:null,statement:`Fictional ${category} statement with explicit confirmed cash dates.`,
      effectiveDate:'2026-11-01',coverageStart:'2026-11-01',coverageEnd:'2026-12-31',cashDates:[...cashDates],period,basis:category==='income'?'net':'not_applicable',deduction:'no',reason:'Fictional manual confirmation; not independent issuer verification.'},await version(),key());
  const view=await workflow.view(f.officer.actor,app);
  await workflow.assess(f.officer.actor,app,{inputVersion:view.inputVersion,offerVersionIds:[policy.offers[0].id],periodStart:'2026-11-01',periodEnd:'2026-12-31'},view.version,key());
  const id=key();configuration=LendingConfigurationSchema.parse({format:'connected-principal-configuration/v1',id,organizationId:f.org,branchId:f.branch,productVersionId:policy.offers[0].productVersionId,
    status:'fictional',policyReference:'FICTIONAL integration testing only; no institutional approval',operatorReference:'Codex automated fictional test setup',sourceReview:'confirmed_statements_permitted',
    authority:{status:'configured',versionId:id,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',requiredApprovers:1,approvalValidity:{kind:'until',date:'2026-12-31'},grants:[{userId:reviewer.userId,outcomes:['approve','decline','return'],approvalLimitCentavos:100000,exceptionPolicyIds:[]}]},
    financialAuthority:{status:'configured',versionId:id,organizationId:f.org,branchId:f.branch,productVersionId:policy.offers[0].productVersionId,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',mfaMaxAgeSeconds:900,
      grants:[{userId:cashier.userId,actions:['prepare','submit','observe','reconcile'],methods:['cash'],maximumCentavos:100000},{userId:authorizer.userId,actions:['authorize','submit','observe','reconcile'],methods:['cash'],maximumCentavos:100000}]},
    principalPolicy:{format:'principal-only-v1',versionId:id,organizationId:f.org,productVersionId:policy.offers[0].productVersionId,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',interestCentavos:0,feesCentavos:0,graceDays:0,allocation:'scheduled-exact',
      cashAccountId:key(),principalAccountId:key(),releaseRuleId:key(),repaymentRuleId:key()},execution:{status:'configured',mode:'simulation',componentRuleVersionId:id}});
  await publishConfig();
});
describe('CL1 real owner producers under PostgreSQL runtime authorization',()=>{
  it('reads the immutable full workflow input and actual confirmation identities without legacy flattening',async()=>{
    const c=await uow.run(f.officer.actor,tx=>ports.loadStaffBasis(tx,app));
    expect(c.workflowBasis!.assessment.scenarios[0]).toMatchObject({horizonNetCentavos:980000,closingBalanceCentavos:1180000,months:[{month:'2026-11',remainingCentavos:430000},{month:'2026-12',remainingCentavos:550000}]});
    expect(c.workflowBasis!.sources.every(s=>s.date==='2026-11-01')).toBe(true);
    expect(c.workflowBasis!.facts.find(f=>f.input.category==='income')!.input.cashDates).toHaveLength(4);
    expect(c.workflowBasis!.confirmations.every(c=>c.staffId===f.officer.actor.userId&&c.memberId===null)).toBe(true);
    const raw=(await owner.query('SELECT input_snapshot FROM credit.assessments WHERE application_id=$1',[app])).rows[0].input_snapshot;
    expect(c.workflowBasis!.inputSnapshotSha256).toBe(workflowDigest(raw));
  });
  it('overrides a repeatable-read connection default before acquiring a lending fence',async()=>{
    const pool=createPool(config.DATABASE_URL,{max:1});
    try {
      const client=await pool.connect();try{await client.query("SET default_transaction_isolation='repeatable read'");}finally{client.release();}
      const inherited=await pool.query('SHOW default_transaction_isolation');expect(inherited.rows[0].default_transaction_isolation).toBe('repeatable read');
      const staffMode=await new PostgresUnitOfWork(pool,{lendingGuard:true}).run(f.officer.actor,tx=>tx.query('SHOW transaction_isolation'));
      const memberMode=await new PostgresMemberUnitOfWork(pool,{lendingGuard:true}).run(member.actor,tx=>tx.query('SHOW transaction_isolation'));
      expect(staffMode.rows[0].transaction_isolation).toBe('read committed');expect(memberMode.rows[0].transaction_isolation).toBe('read committed');
    }finally{await pool.end();}
  });
  it('requires an actual conflict declaration and a guarded coordinator',async()=>{
    const a=(await workflow.view(f.officer.actor,app)).latestAssessment!;
    await expect(decisions.recommend(f.officer.actor,app,{assessmentId:a.id,offerVersionId:policy.offers[0].id,inputVersion:a.inputVersion,reason:'Fictional test.'},await version(),key())).rejects.toMatchObject({code:'conflict_clearance_required'});
    await expect(new PostgresUnitOfWork(runtimePool).run(f.officer.actor,tx=>ports.loadStaffBasis(tx,app))).rejects.toMatchObject({code:'lending_transaction_unavailable'});
  });
  it('retains calendar source dates under an explicit Manila process timezone',async()=>{
    const previous=process.env.TZ;process.env.TZ='Asia/Manila';
    try {
      const view=await workflow.view(f.officer.actor,app),basis=await uow.run(f.officer.actor,tx=>ports.loadStaffBasis(tx,app));
      expect(view.sources.every(s=>s.date==='2026-11-01')).toBe(true);
      expect(basis.workflowBasis!.sources.every(s=>s.date==='2026-11-01')).toBe(true);
      expect(basis.workflowBasis!.assessment.stale).toBe(false);
    }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
  });
  it('denies conflict clearance attributed to another actor',async()=>{
    await expect(uow.run(f.officer.actor,tx=>tx.query(`INSERT INTO decisions.conflict_declarations(id,organization_id,application_id,branch_id,user_id,input_version,status,reference)
      SELECT $1,$2,id,branch_id,$3,assessment_input_version,'clear','Unauthorized attributed declaration' FROM applications.applications WHERE id=$4`,[key(),f.org,reviewer.userId,app]))).rejects.toMatchObject({code:'42501'});
  });
  it('persists v2 through separate preview/approval, own-member exact acceptance and real pending origination',async()=>{
    const result=await approved();
    const stored=(await owner.query('SELECT snapshot_format,snapshot_text,snapshot_hash FROM decisions.records WHERE id=$1',[result.d.id])).rows[0];
    expect(stored.snapshot_format).toBe('decision-snapshot/v2');expect(workflowDigest(JSON.parse(String(stored.snapshot_text)))) .toBe(stored.snapshot_hash);
    const loan=await new ServicingService(uow,moneyPorts).originate(cashier,app,{method:'cash'},key());
    expect(loan).toMatchObject({state:'pending_release',decisionSnapshotHash:stored.snapshot_hash,assessmentInputVersion:5});
    const financial=await uow.run(cashier,tx=>moneyPorts.financial(tx,app));expect(financial.authority.status).toBe('configured');
    const brief=await new DecisionStaffReads(uow,ports).brief(reviewer,app,result.d.id);
    expect(brief.sources).toHaveLength(4);expect(brief.sources.every(s=>s.verification==='not_checked')).toBe(true);
  });
  it('does not originate before linked-member acceptance',async()=>{
    await approved(false);
    await expect(new ServicingService(uow,moneyPorts).originate(cashier,app,{method:'cash'},key())).rejects.toMatchObject({code:'renewed_review_required'});
    expect((await owner.query('SELECT count(*) FROM servicing.originations')).rows[0].count).toBe('0');
  });
  it('uses the actual component policy and atomic ledger with the authoritative accepted release basis',async()=>{
    await approved();const p=configuration.principalPolicy;
    await owner.query("INSERT INTO accounting.accounts(id,organization_id,code,label,currency) VALUES($1,$2,'cash','Fictional cash','PHP'),($3,$2,'receivable','Fictional receivable','PHP')",[p.cashAccountId,f.org,p.principalAccountId]);
    await owner.query("INSERT INTO accounting.posting_rules VALUES($1,$2,'disbursement','PHP','2026-01-01','2026-12-31'),($3,$2,'repayment','PHP','2026-01-01','2026-12-31')",[p.releaseRuleId,f.org,p.repaymentRuleId]);
    await owner.query("INSERT INTO accounting.rule_accounts VALUES($1,$2,$3,'debit'),($1,$2,$4,'credit'),($1,$5,$4,'debit'),($1,$5,$3,'credit')",[f.org,p.releaseRuleId,p.principalAccountId,p.cashAccountId,p.repaymentRuleId]);
    await owner.query("INSERT INTO accounting.periods VALUES($1,$2,'2026-11-01','2026-12-31','open')",[key(),f.org]);
    const service=new ServicingService(uow,moneyPorts),money=new MoneyService(uow,moneyPorts,new AccountingService());
    const loan=await service.originate(cashier,app,{method:'cash'},key());
    const c=await service.prepare(cashier,loan.id,{loanId:loan.id,amountCentavos:100000,currency:'PHP',effectiveDate:'2026-11-05',method:'cash',instrumentReference:'FICTIONAL-CL1-RELEASE',reason:'Fictional producer integration; no actual cash movement.'},key());
    await service.authorize(authorizer,c.id,1,key());const submitted=await service.submitIntent(cashier,c.id,2,key());
    const evidence=new FictionalManualDriver().submit(submitted,{observationId:key(),movementId:key(),at:new Date().toISOString(),outcome:'confirmed'});
    const observed=await service.observe(cashier,c.id,evidence,3,key());
    const posted=await money.finalize(authorizer,c.id,observed.command.version,key());
    expect(posted).toMatchObject({kind:'disbursement',amountCentavos:100000,principalAfterCentavos:100000});
    expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('1');
    const next={...policy,id:key()};await owner.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[next.id,f.org,JSON.stringify(next)]);
    // Repayment authority/component lookup remains independent of household affordability.
    expect((await uow.run(cashier,tx=>moneyPorts.financial(tx,app))).authority.status).toBe('configured');
    expect(await uow.run(cashier,tx=>moneyPorts.policy(tx,loan.id))).toEqual(p);
  });
  it('keeps a committed acceptance replay available after policy replacement but blocks new work',async()=>{
    const r=await approved();
    // Publish a valid new immutable version; an identical replay still precedes currentness checks.
    const next={...policy,id:key()};await owner.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[next.id,f.org,JSON.stringify(next)]);
    expect(await muow.run(member.actor,tx=>decisions.memberAccept(tx,app,r.input,r.v,r.acceptKey))).toEqual(r.accepted);
    expect(await muow.run(member.actor,tx=>decisions.memberDecision(tx,app))).toMatchObject({state:'unavailable'});
    await expect(new ServicingService(uow,moneyPorts).originate(cashier,app,{method:'cash'},key())).rejects.toMatchObject({code:'renewed_review_required'});
  });
  it('holds release after actual reviewer revocation while preserving the immutable decision and receipt',async()=>{
    const r=await approved(),before=(await owner.query('SELECT snapshot_text,snapshot_hash FROM decisions.records WHERE id=$1',[r.d.id])).rows[0];
    await new StaffService(new PostgresUnitOfWork(identityPool,{lendingGuard:true})).revoke(f.administrator.actor,reviewer.userId,{reason:'Fictional revocation/currentness regression.'},1,key());
    expect(await muow.run(member.actor,tx=>decisions.memberDecision(tx,app))).toMatchObject({state:'unavailable'});
    await expect(new ServicingService(uow,moneyPorts).originate(cashier,app,{method:'cash'},key())).rejects.toMatchObject({code:'renewed_review_required'});
    expect((await owner.query('SELECT snapshot_text,snapshot_hash FROM decisions.records WHERE id=$1',[r.d.id])).rows[0]).toEqual(before);
    expect(await muow.run(member.actor,tx=>decisions.memberAccept(tx,app,r.input,r.v,r.acceptKey))).toEqual(r.accepted);
  });
  it('keeps staff snapshots/inputs/configuration and other-member records private',async()=>{
    await approved();const other=await memberFixture(f.officer.actor);
    await expect(muow.run(other.actor,tx=>decisions.memberDecision(tx,app))).rejects.toMatchObject({status:404});
    await muow.run(member.actor,async tx=>{
      expect((await tx.query('SELECT credit.staff_decision_input($1) AS data',[app])).rows[0].data).toBeNull();
      expect((await tx.query('SELECT * FROM decisions.lending_configurations')).rowCount).toBe(0);
      expect((await tx.query('SELECT * FROM decisions.conflict_declarations')).rowCount).toBe(0);
    });
  });
  it('withholds current checked offers after a recorded source retirement even without a material-input counter change',async()=>{
    const reads=new DecisionStaffReads(uow,ports),before=await reads.workspace(reviewer,app);
    expect(before.assessment?.state).toBe('complete');expect(before.offers[0].checked).not.toBeNull();
    const source=(await workflow.view(f.officer.actor,app)).sources[0],client=await owner.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');await client.query(lendingLockSql,[f.org]);
      await client.query('INSERT INTO evidence.retirements(source_id,organization_id,application_id,policy_reference,approval_reference,operator_reference,manifest_sha256) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [source.id,f.org,app,'Fictional source-retirement regression','Fictional test only; no institutional approval','Automated test operator','a'.repeat(64)]);
      await client.query('COMMIT');
    }finally{await client.query('ROLLBACK');client.release();}
    const after=await reads.workspace(reviewer,app);
    expect(after.application.assessmentInputVersion).toBe(before.application.assessmentInputVersion);
    expect(after.assessment?.state).toBe('stale');expect(after.offers[0].checked).toBeNull();expect(after.offers[0].recommend).toBe(false);
  });
  it('serializes a conflicting material edit before loading the review basis',async()=>{
    const client=await owner.connect();let completed=false;
    try {
      await client.query('BEGIN');await client.query(lendingLockSql,[f.org]);
      const pending=uow.run(f.officer.actor,tx=>ports.loadStaffBasis(tx,app)).then(c=>{completed=true;return c;});
      // Confirm an actual PostgreSQL advisory-lock waiter, not a timer assumption.
      let waiting=false;
      for(let n=0;n<100;n++){waiting=Number((await owner.query("SELECT count(*) FROM pg_stat_activity WHERE wait_event='advisory' AND query LIKE '%agap:connected-lending:%'")).rows[0].count)>0;if(waiting)break;await delay(10);}
      expect(waiting).toBe(true);expect(completed).toBe(false);
      const next={...policy,id:key()};await client.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[next.id,f.org,JSON.stringify(next)]);
      await client.query('COMMIT');
      expect((await pending).workflowBasis!.assessment.stale).toBe(true);
    }finally{await client.query('ROLLBACK');client.release();}
  });
  it('runs the new owner boundaries under FORCE RLS with a non-superuser migration/definer owner',async()=>{
    const role='agap_connected_lending_test_owner';
    await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agap_connected_lending_test_owner') THEN CREATE ROLE agap_connected_lending_test_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
      GRANT USAGE ON SCHEMA platform,identity,members,applications,portal,decisions,evidence,credit,servicing,accounting TO agap_connected_lending_test_owner;
      GRANT CREATE ON SCHEMA decisions,evidence,credit TO agap_connected_lending_test_owner;
      GRANT ALL ON ALL TABLES IN SCHEMA platform,identity,members,applications,portal,decisions,evidence,credit,servicing,accounting TO agap_connected_lending_test_owner;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA platform,identity,members,applications,portal,decisions,evidence,credit,servicing,accounting TO agap_connected_lending_test_owner;`);
    const tables=(await owner.query("SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('decisions','evidence','credit') AND c.relkind IN ('r','v')")).rows;
    const functions=(await owner.query("SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS args,pg_get_userbyid(p.proowner) AS owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('decisions','evidence','credit')")).rows;
    const transfer=async(target?:string)=>{
      for(const t of tables)await owner.query(`ALTER ${t.relkind==='v'?'VIEW':'TABLE'} ${t.nspname}.${t.relname} OWNER TO ${target??t.owner}`);
      for(const fn of functions)await owner.query(`ALTER FUNCTION ${fn.nspname}.${fn.proname}(${fn.args}) OWNER TO ${target??fn.owner}`);
    };
    try {
      await transfer(role);await approved();
      expect((await new ServicingService(uow,moneyPorts).originate(cashier,app,{method:'cash'},key())).state).toBe('pending_release');
      await muow.run(member.actor,async tx=>{
        expect((await tx.query('SELECT credit.staff_decision_input($1) AS data',[app])).rows[0].data).toBeNull();
        expect((await tx.query('SELECT * FROM decisions.lending_configurations')).rowCount).toBe(0);
      });
    }finally{await transfer();}
  });
});
