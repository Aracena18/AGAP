import { businessDay } from '../src/modules/servicing/command-rules.js';
import { randomBytes, randomUUID } from 'node:crypto';
import type { ActorContext } from '../../../packages/contracts/src/ports.js';
import { WorkflowPolicy } from '../../../packages/contracts/src/workflow.js';
import { PostgresUnitOfWork } from '../src/platform/database.js';
import { PostgresMemberUnitOfWork } from '../src/platform/member-database.js';
import { MembersService } from '../src/modules/members/members.service.js';
import { ApplicationsService } from '../src/modules/applications/applications.service.js';
import { WorkflowService } from '../src/modules/evidence/workflow.service.js';
import { LendingConfigurationSchema } from '../src/modules/decisions/lending-configuration.js';
import { tokenHash } from '../src/modules/identity/identity.service.js';
import { lendingLockSql } from '../src/platform/lending-transaction.js';
import { owner, runtimePool, config } from './database.js';
import { memberFixture } from './member-fixtures.js';

/** Separate fictional organization: never replaces historical product/offer fixtures. */
export async function connectedLendingFixture(options:{sameDayFirstPayment?:boolean}={}){
  const firstPayment=options.sameDayFirstPayment?businessDay(new Date().toISOString()):'2026-11-25';
  if(firstPayment<'2026-11-01'||firstPayment>'2026-12-25')throw new Error('This fictional fixture needs a new explicitly reviewed horizon before use outside November–December 2026.');
  const org=randomUUID(),branch=randomUUID();
  await owner.query('INSERT INTO platform.organizations VALUES($1,$2)',[org,'Fictional connected-lending tests']);
  await owner.query('INSERT INTO platform.branches VALUES($1,$2,$3)',[branch,org,'Fictional connected branch']);
  async function staff(role:ActorContext['roles'][number]){
    const userId=randomUUID(),sessionId=randomUUID(),token=randomBytes(32).toString('base64url');
    await owner.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$1::uuid::text,$4,$5,$6)',[userId,org,config.OIDC_ISSUER,`Fictional connected ${role}`,[branch],[role]]);
    await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,now(),ARRAY['mfa'],now()+interval '30 minutes')",[sessionId,tokenHash(token),userId]);
    const actor:ActorContext={userId,organizationId:org,branchIds:[branch],roles:[role],sessionId,authenticatedAt:new Date(),authenticationMethods:['mfa'],correlationId:randomUUID()};return {actor,token};
  }
  const officer=await staff('officer'),reviewer=await staff('reviewer'),administrator=await staff('administrator'),cashier=await staff('cashier'),authorizer=await staff('financial_authorizer'),auditor=await staff('auditor');
  const member=await memberFixture(officer.actor),uow=new PostgresUnitOfWork(runtimePool,{lendingGuard:true}),muow=new PostgresMemberUnitOfWork(runtimePool,{lendingGuard:true});
  const app=await new ApplicationsService(uow,new MembersService(uow,config.PRIVACY_NOTICE_VERSION)).create(officer.actor,{memberId:member.record.id,purpose:'Fictional connected lending journey',requestedPrincipalCentavos:100000,requestedTermMonths:2,currency:'PHP'},randomUUID());
  const policy=WorkflowPolicy.parse({id:randomUUID(),label:'Fictional connected principal-only product',status:'fictional',approvalReference:null,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',loanProceedsTreatment:'reserved_for_purpose',remainingRuleBasis:'each_reviewed_calendar_month_segment',minimumRemainingCentavos:0,minimumBalanceCentavos:0,
    offers:[{id:randomUUID(),productVersionId:randomUUID(),label:'Fictional principal-only two-month offer',principalCentavos:100000,netReceivedCentavos:100000,feesPaidSeparatelyCentavos:0,termMonths:2,available:true,payments:[{date:firstPayment,amountCentavos:50000},{date:'2026-12-25',amountCentavos:50000}],separateFees:[]}]});
  await owner.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[policy.id,org,JSON.stringify(policy)]);
  const workflow=new WorkflowService(uow,muow,false,true);
  let version=app.version;
  for(const [category,amount,cashDates,period] of [['opening',200000,['2026-11-01'],'one_time'],['income',300000,['2026-11-15','2026-11-30','2026-12-15','2026-12-30'],'semi_monthly'],['expense',120000,['2026-11-20'],'one_time'],['obligation',0,['2026-11-01'],'one_time']] as const){
    const saved=await workflow.saveFact(officer.actor,app.id,{factId:null,label:`Fictional ${category}`,category,value:{availability:'recorded',amountCentavos:amount},sourceId:null,sourceVersion:null,statement:`Fictional ${category} statement with explicit confirmed cash dates.`,effectiveDate:'2026-11-01',coverageStart:'2026-11-01',coverageEnd:'2026-12-31',cashDates:[...cashDates],period,basis:category==='income'?'net':'not_applicable',deduction:'no',reason:'Fictional test confirmation, not independent issuer verification.'},version,randomUUID());version=saved.version;
  }
  const view=await workflow.view(officer.actor,app.id);
  await workflow.assess(officer.actor,app.id,{inputVersion:view.inputVersion,offerVersionIds:[policy.offers[0].id],periodStart:'2026-11-01',periodEnd:'2026-12-31'},view.version,randomUUID());
  const id=randomUUID(),configuration=LendingConfigurationSchema.parse({format:'connected-principal-configuration/v1',id,organizationId:org,branchId:branch,productVersionId:policy.offers[0].productVersionId,status:'fictional',policyReference:'FICTIONAL integration fixture; no institutional approval',operatorReference:'Codex automated fictional fixture',sourceReview:'confirmed_statements_permitted',
    authority:{status:'configured',versionId:id,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',requiredApprovers:1,approvalValidity:{kind:'until',date:'2026-12-31'},grants:[{userId:reviewer.actor.userId,outcomes:['approve','decline','return'],approvalLimitCentavos:100000,exceptionPolicyIds:[]}]},
    financialAuthority:{status:'configured',versionId:id,organizationId:org,branchId:branch,productVersionId:policy.offers[0].productVersionId,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',mfaMaxAgeSeconds:900,grants:[{userId:cashier.actor.userId,actions:['prepare','submit','observe','reconcile'],methods:['cash'],maximumCentavos:100000},{userId:authorizer.actor.userId,actions:['authorize','submit','observe','reconcile'],methods:['cash'],maximumCentavos:100000}]},
    principalPolicy:{format:'principal-only-v1',versionId:id,organizationId:org,productVersionId:policy.offers[0].productVersionId,effectiveFrom:'2026-01-01',effectiveThrough:'2026-12-31',interestCentavos:0,feesCentavos:0,graceDays:0,allocation:'scheduled-exact',cashAccountId:randomUUID(),principalAccountId:randomUUID(),releaseRuleId:randomUUID(),repaymentRuleId:randomUUID()},execution:{status:'configured',mode:'simulation',componentRuleVersionId:id}});
  const client=await owner.connect();try{await client.query('BEGIN');await client.query(lendingLockSql,[org]);await client.query('INSERT INTO decisions.lending_configurations(id,organization_id,branch_id,product_version_id,body) VALUES($1,$2,$3,$4,$5)',[id,org,branch,configuration.productVersionId,JSON.stringify(configuration)]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  return {org,branch,officer,reviewer,administrator,cashier,authorizer,auditor,member,appId:app.id,offerId:policy.offers[0].id,policy,configuration};
}

/** Independently declared fictional GL mapping for the principal-only integration. */
export async function connectedLedgerFixture(f:Awaited<ReturnType<typeof connectedLendingFixture>>){
  const p=f.configuration.principalPolicy;
  await owner.query("INSERT INTO accounting.accounts(id,organization_id,code,label,currency) VALUES($1,$2,'cash','Fictional cash','PHP'),($3,$2,'principal','Fictional principal','PHP')",[p.cashAccountId,f.org,p.principalAccountId]);
  await owner.query("INSERT INTO accounting.posting_rules VALUES($1,$2,'disbursement','PHP','2026-01-01','2026-12-31'),($3,$2,'repayment','PHP','2026-01-01','2026-12-31')",[p.releaseRuleId,f.org,p.repaymentRuleId]);
  await owner.query("INSERT INTO accounting.rule_accounts VALUES($1,$2,$3,'debit'),($1,$2,$4,'credit'),($1,$5,$4,'debit'),($1,$5,$3,'credit')",[f.org,p.releaseRuleId,p.principalAccountId,p.cashAccountId,p.repaymentRuleId]);
  await owner.query("INSERT INTO accounting.periods VALUES($1,$2,'2026-11-01','2026-12-31','open')",[randomUUID(),f.org]);
  for(const [kind,rule] of [['disbursement',p.releaseRuleId],['repayment',p.repaymentRuleId]])await owner.query(`INSERT INTO accounting.reconciliation_mappings
    (id,organization_id,posting_rule_version_id,kind,currency,effective_from,effective_through,cash_account_id,principal_account_id,review_reference)
    VALUES($1,$2,$3,$4,'PHP','2026-01-01','2026-12-31',$5,$6,'Explicit fictional integration mapping; no institutional review claimed')`,[randomUUID(),f.org,rule,kind,p.cashAccountId,p.principalAccountId]);

}
