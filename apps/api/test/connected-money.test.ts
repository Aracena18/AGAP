import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import type {INestApplication} from '@nestjs/common';
import {AgapClient} from '../../../packages/api-client/src/index.js';
import {createApp} from '../src/app.js';
import {IdentityService} from '../src/modules/identity/identity.service.js';
import {ConnectedMoneyService} from '../src/modules/servicing/connected-money.service.js';
import {LendingMoneyProducers} from '../src/modules/servicing/lending-money.producers.js';
import {LendingDecisionProducers} from '../src/modules/decisions/lending-producers.js';
import {WorkflowDecisionProducer} from '../src/modules/evidence/decision-basis.producer.js';
import {WorkflowService} from '../src/modules/evidence/workflow.service.js';
import {AccountingService} from '../src/modules/accounting/accounting.service.js';
import {PostgresUnitOfWork} from '../src/platform/database.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {prepareDatabase,resetFixtures,closePools,owner,runtimePool,identityPool,config} from './database.js';
import {connectedMoneyFixture} from './connected-money-fixture.js';

let app:INestApplication,base:string,directory:string,oldDirectory:string|undefined,f:Awaited<ReturnType<typeof connectedMoneyFixture>>;
const reason={reason:'Fictional operator inspected the exact saved command.'};
const identity=()=>new IdentityService(identityPool,config);
type Person='officer'|'reviewer'|'cashier'|'authorizer'|'auditor'|'administrator'|'member';
function client(person:Person){const token=f[person].token;return new AgapClient(`${base}/api/v1`,(url,init)=>{const headers=new Headers(init?.headers);headers.set('Cookie',`${person==='member'?'agap_member_session':'agap_session'}=${token}`);headers.set('Origin',config.PUBLIC_ORIGIN);return fetch(url,{...init,headers});});}
function options(person:Person,version?:number,key=randomUUID()){return {csrfToken:identity().csrfToken(f[person].token),idempotencyKey:key,...(version===undefined?{}:{version})};}
async function start(enabled=true){app=await createApp({...config,EVIDENCE_WORKFLOW_ENABLED:true,CONNECTED_LENDING_ENABLED:enabled});await app.listen(0,'127.0.0.1');base=await app.getUrl();}
beforeAll(async()=>{await prepareDatabase();oldDirectory=process.env.DOCUMENT_DIRECTORY;directory=await mkdtemp(join(tmpdir(),'agap-connected-money-'));process.env.DOCUMENT_DIRECTORY=directory;await start();});
beforeEach(async()=>{await resetFixtures();f=await connectedMoneyFixture();});
afterAll(async()=>{await app?.close();await closePools();if(oldDirectory===undefined)delete process.env.DOCUMENT_DIRECTORY;else process.env.DOCUMENT_DIRECTORY=oldDirectory;if(directory)await rm(directory,{recursive:true,force:true});});
async function normalIntake(){
 const draft=await client('member').createMemberApplication({purpose:'Fictional complete connected money intake',requestedPrincipalCentavos:100000,requestedTermMonths:2,currency:'PHP',noticeVersion:config.PRIVACY_NOTICE_VERSION,noticeAcknowledged:true},options('member'));
 const submitted=await client('member').submitMemberApplication(draft.id,{noticeVersion:config.PRIVACY_NOTICE_VERSION,acknowledgment:true},options('member',draft.version));
 const assigned=await client('administrator').assignApplication(draft.id,{officerId:f.officer.actor.userId,reason:'Fictional normal intake assignment.'},options('administrator',submitted.version));
 let version=assigned.version;
 for(const [category,amount,cashDates,period] of [['opening',200000,['2026-11-01'],'one_time'],['income',300000,['2026-11-15','2026-11-30','2026-12-15','2026-12-30'],'semi_monthly'],['expense',120000,['2026-11-20'],'one_time'],['obligation',0,['2026-11-01'],'one_time']] as const){
  const saved=await client('officer').saveStaffFact(draft.id,{factId:null,label:`Fictional ${category}`,category,value:{availability:'recorded',amountCentavos:amount},sourceId:null,sourceVersion:null,statement:`Fictional ${category} statement with explicit confirmed cash dates.`,effectiveDate:'2026-11-01',coverageStart:'2026-11-01',coverageEnd:'2026-12-31',cashDates:[...cashDates],period,basis:category==='income'?'net':'not_applicable',deduction:'no',reason:'Automated fictional statement confirmation.'},options('officer',version));version=saved.version;
 }
 const view=await client('officer').getStaffWorkflow(draft.id);await client('officer').createAssessment(draft.id,{inputVersion:view.inputVersion,offerVersionIds:[f.offerId],periodStart:'2026-11-01',periodEnd:'2026-12-31'},options('officer',view.version));f.appId=draft.id;
}
async function approve(){
 for(const person of ['officer','reviewer'] as const){const r=await client(person).getDecisionReview(f.appId);await client(person).declareDecisionConflict(f.appId,{status:'clear',reference:'Fictional explicit self-declaration for actual API tests.'},options(person,r.version));}
 const r=await client('officer').getDecisionReview(f.appId);await client('officer').confirmDecisionReview(f.appId,{evidenceBasisHash:r.evidenceBasisHash,mode:'manual',reviewedSources:true,reviewedScenarios:true,reason:'Automated fictional review record, not independent human approval.'},options('officer',r.version));
 const w=await client('officer').getStaffDecisionWorkspace(f.appId),recommendation=await client('officer').recommendOffer(f.appId,{assessmentId:w.assessment!.id,offerVersionId:f.offerId,inputVersion:w.assessment!.inputVersion,reason:'Fictional checked principal-only offer.'},options('officer',w.application.version));
 const body={outcome:'approve' as const,assessmentId:w.assessment!.id,recommendationId:recommendation.id,offerVersionId:f.offerId,rationale:'Fictional separate reviewer checked saved facts and dated costs.',departureReason:'',exceptions:[],reviewDate:'2026-12-31'};
 const current=await client('reviewer').getStaffDecisionWorkspace(f.appId),preview=await client('reviewer').previewDecision(f.appId,body,options('reviewer',current.application.version));
 const decision=await client('reviewer').recordDecision(f.appId,{previewId:preview.id,decision:{...body,explanationReviewed:true}},options('reviewer',current.application.version));
 const view=await client('member').getMemberDecision(f.appId);if(view.state!=='available'||!view.data||!view.data.documentVersionId)throw Error('Missing actual member terms');
 const memberApp=await client('member').getMemberApplication(f.appId);await client('member').acceptMemberDecision(f.appId,{decisionId:decision.id,documentVersionId:view.data.documentVersionId,acknowledgment:true},options('member',memberApp.version));
}
async function pending(){await approve();return client('cashier').createPendingOrigination(f.appId,{method:'cash'},options('cashier'));}
async function release(){const loan=await pending();return client('cashier').prepareConnectedDisbursement(loan.id,{loanId:loan.id,amountCentavos:100000,currency:'PHP',effectiveDate:f.day,method:'cash',instrumentReference:'FICTIONAL-RELEASE',reason:reason.reason},options('cashier'));}
async function settle(c:Awaited<ReturnType<typeof release>>,outcome:'confirmed'|'unknown'='confirmed'){
 const authorized=await client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,options('authorizer',c.version));
 const submitted=await client('cashier').submitConnectedFinancialCommand(c.id,reason,options('cashier',authorized.version));
 return client('cashier').observeConnectedSimulation(c.id,{...reason,outcome},options('cashier',submitted.version));
}
async function counts(){return (await owner.query('SELECT (SELECT count(*) FROM accounting.journals WHERE organization_id=$1)::int AS journals,(SELECT count(*) FROM servicing.postings WHERE organization_id=$1)::int AS postings,(SELECT count(*) FROM servicing.action_reasons WHERE organization_id=$1)::int AS reasons',[f.org])).rows[0];}
async function closePeriod(){await owner.query("UPDATE accounting.periods SET state='closing' WHERE id=$1",[f.periodId]);await owner.query("UPDATE accounting.periods SET state='closed' WHERE id=$1",[f.periodId]);}

describe('Connected actual financial transport and posting',()=>{
 it('runs accepted terms through separate release, scheduled repayment, member reads, immutable receipt and balanced GL',async()=>{
  await normalIntake();const c=await release();expect(c.state).toBe('prepared');expect(await counts()).toMatchObject({journals:0,postings:0});
  const settled=await settle(c);expect(settled.state).toBe('confirmed_unposted');expect(await counts()).toMatchObject({journals:0,postings:0});
  const posted=await client('authorizer').postConnectedFinancialCommand(c.id,reason,options('authorizer',settled.version));expect(posted.principalAfterCentavos).toBe(100000);
  const view=await client('cashier').getConnectedLoanWorkspace(c.loanId,{asOfDate:f.day});expect(view.position).toMatchObject({principalCentavos:100000,interestDueCentavos:0,feesDueCentavos:0});expect(view.commands[0]).toMatchObject({preparedBy:f.cashier.actor.userId,reviewRequired:false});
  const payment=await client('cashier').prepareConnectedRepayment(c.loanId,{loanId:c.loanId,amountCentavos:50000,currency:'PHP',effectiveDate:f.day,method:'cash',instrumentReference:'FICTIONAL-PAYMENT',reason:reason.reason},options('cashier'));
  const observed=await settle(payment),receipt=await client('authorizer').postConnectedFinancialCommand(payment.id,reason,options('authorizer',observed.version));expect(receipt).toMatchObject({amountCentavos:50000,principalAfterCentavos:50000,kind:'repayment'});expect(receipt.receiptId).not.toBeNull();
  const member=await client('member').listMemberLoans();if(member.state!=='available')throw Error('Missing actual posted member position');expect(member.data.find(l=>l.id===c.loanId)?.position.principalCentavos).toBe(50000);
  const final=await client('auditor').getConnectedLoanWorkspace(c.loanId,{asOfDate:f.day});expect(final.position?.receipts).toEqual([receipt]);expect(final.position?.overdueCentavos).toBe(0);expect(await counts()).toMatchObject({journals:2,postings:2,reasons:10});
  const totals=(await owner.query("SELECT j.id,sum(CASE WHEN l.side='debit' THEN l.amount_centavos ELSE -l.amount_centavos END)::text AS balance FROM accounting.journals j JOIN accounting.journal_lines l ON l.organization_id=j.organization_id AND l.journal_id=j.id WHERE j.organization_id=$1 GROUP BY j.id",[f.org])).rows;expect(totals).toHaveLength(2);expect(totals.every(r=>r.balance==='0')).toBe(true);
  expect(JSON.stringify(final)).not.toMatch(/payloadHash|authority|providerKey|snapshotHash/);
  const report=await client('auditor').createReconciliation({fromDate:f.day,throughDate:f.day},options('auditor'));expect(report.report.status).toBe('matched');expect(report.report.events).toHaveLength(2);
  const support=await client('member').createMemberSupport({message:'Fictional essential expenses are difficult despite the scheduled payment.',loanId:c.loanId,contactPreference:'portal',noticeVersion:config.PRIVACY_NOTICE_VERSION,sharingConfirmed:true,checkIn:{canMeetEssentials:'no',borrowedToRepay:'no',financialStrain:'reported'}},options('member'));
  const assigned=await client('administrator').assignSupportRequest(support.id,{officerId:f.officer.actor.userId,reason:'Fictional normal support assignment.'},options('administrator',1));
  const currentPosition=await client('officer').getSupportPosition(support.id);expect(currentPosition).toMatchObject({state:'available',data:{principalCentavos:50000,overdueCentavos:0}});
  await client('officer').respondSupportRequest(support.id,{response:'Fictional staff conversation arranged; original loan terms remain unchanged.',internalNote:'SECRET-MONEY-WORKFLOW-NOTE',followUpDate:f.day},options('officer',assigned.version));
  const source=await client('member').getMemberSupportCorrectionSource(support.id);expect(source.request.response).toContain('conversation arranged');expect(JSON.stringify(source)).not.toContain('SECRET-MONEY-WORKFLOW-NOTE');
  const followups=await client('officer').listSupportFollowUps('open'),task=followups.items.find(t=>t.requestId===support.id);if(!task)throw Error('Missing actual staff follow-up');
  expect((await client('officer').completeSupportFollowUp(task.id,{note:'Fictional conversation completed without a contractual change.'},options('officer',task.version))).status).toBe('completed');expect(await counts()).toMatchObject({journals:2,postings:2,reasons:10});
 });
 it('checks roles, CSRF, exact body fields, stale versions and a separate authorizer',async()=>{
  const c=await release();await expect(client('cashier').authorizeConnectedFinancialCommand(c.id,reason,options('cashier',c.version))).rejects.toMatchObject({status:403});
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['cashier','financial_authorizer'] WHERE id=$1",[f.cashier.actor.userId]);
  await expect(client('cashier').authorizeConnectedFinancialCommand(c.id,reason,options('cashier',c.version))).rejects.toMatchObject({status:403});
  await expect(client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,options('authorizer',99))).rejects.toMatchObject({status:412});
  await expect(client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,{...options('authorizer',c.version),csrfToken:'invalid'})).rejects.toMatchObject({status:403});
  await expect(client('officer').getConnectedLoanWorkspace(c.loanId,{asOfDate:f.day})).rejects.toMatchObject({status:403});
  await expect(client('auditor').postConnectedFinancialCommand(c.id,reason,options('auditor',c.version))).rejects.toMatchObject({status:403});
  const forged=await fetch(`${base}/api/v1/financial-commands/${c.id}/simulation-observations`,{method:'POST',headers:{Cookie:`agap_session=${f.cashier.token}`,Origin:config.PUBLIC_ORIGIN,'Content-Type':'application/json','X-CSRF-Token':identity().csrfToken(f.cashier.token),'Idempotency-Key':randomUUID(),'If-Match':`"${c.version}"`},body:JSON.stringify({...reason,outcome:'confirmed',verified:true,amountMinorUnits:1})});expect(forged.status).toBe(422);expect(await counts()).toMatchObject({journals:0,postings:0});
 });
 it('binds action reasons to the same-key receipt and stores them once',async()=>{
  const c=await release(),key=randomUUID(),o=options('authorizer',c.version,key),first=await client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,o);
  expect(await client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,o)).toEqual(first);
  await expect(client('authorizer').authorizeConnectedFinancialCommand(c.id,{reason:'Changed reason under the same key'},o)).rejects.toMatchObject({status:409});
  expect((await owner.query("SELECT reason FROM servicing.action_reasons WHERE command_id=$1 AND action='authorize'",[c.id])).rows).toEqual([reason]);
 });
 it('permanently prevents parallel fresh-key first releases',async()=>{
  const loan=await pending(),body={loanId:loan.id,amountCentavos:100000,currency:'PHP' as const,effectiveDate:f.day,method:'cash' as const,instrumentReference:'FICTIONAL-CONCURRENT',reason:reason.reason};
  const results=await Promise.allSettled([client('cashier').prepareConnectedDisbursement(loan.id,body,options('cashier')),client('cashier').prepareConnectedDisbursement(loan.id,body,options('cashier'))]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await owner.query('SELECT count(*) FROM servicing.release_claims WHERE origination_id=$1',[loan.id])).rows[0].count).toBe('1');
 });
 it('preserves an unknown original movement across restart and resolves it without a replacement identity',async()=>{
  const c=await release(),unknown=await settle(c,'unknown');expect(unknown.state).toBe('unknown');await app.close();await start();
  expect((await client('cashier').getConnectedFinancialCommand(c.id)).state).toBe('unknown');
  const confirmed=await client('cashier').observeConnectedSimulation(c.id,{...reason,outcome:'confirmed'},options('cashier',unknown.version));
  const receipt=await client('authorizer').postConnectedFinancialCommand(c.id,reason,options('authorizer',confirmed.version));expect(receipt.principalAfterCentavos).toBe(100000);
  expect((await owner.query('SELECT count(DISTINCT provider_key) FROM servicing.release_claims WHERE origination_id=$1',[c.loanId])).rows[0].count).toBe('1');expect(await counts()).toMatchObject({journals:1,postings:1});
 });
 it('retains committed settlement when a closed accounting period blocks a new posting',async()=>{
  const c=await release(),settled=await settle(c);await closePeriod();
  await expect(client('authorizer').postConnectedFinancialCommand(c.id,reason,options('authorizer',settled.version))).rejects.toMatchObject({status:409});expect((await client('cashier').getConnectedFinancialCommand(c.id)).state).toBe('confirmed_unposted');expect(await counts()).toMatchObject({journals:0,postings:0});
  expect((await owner.query('SELECT state FROM accounting.periods WHERE id=$1',[f.periodId])).rows[0].state).toBe('closed');
 });
 it('replays an already committed posting after period closure without a second journal',async()=>{
  const c=await release(),settled=await settle(c),o=options('authorizer',settled.version),first=await client('authorizer').postConnectedFinancialCommand(c.id,reason,o);
  await closePeriod();
  expect(await client('authorizer').postConnectedFinancialCommand(c.id,reason,o)).toEqual(first);expect(await client('authorizer').postConnectedFinancialCommand(c.id,reason,options('authorizer',settled.version))).toEqual(first);expect(await counts()).toMatchObject({journals:1,postings:1});
 });
 it('rolls back every new effect after a real GL call fails, preserving the earlier observation',async()=>{
  const c=await release(),settled=await settle(c),uow=new PostgresUnitOfWork(runtimePool,{lendingGuard:true}),muow=new PostgresMemberUnitOfWork(runtimePool,{lendingGuard:true});
  const ports=new LendingMoneyProducers(new LendingDecisionProducers(new WorkflowDecisionProducer(new WorkflowService(uow,muow,false,true)),true),true),ledger=new AccountingService();
  const failed=new ConnectedMoneyService(uow,ports,{post:async(tx,body)=>{await ledger.post(tx,body);throw Error('Fictional failure after actual provisional GL posting');}});
  await expect(failed.finalize(f.authorizer.actor,c.id,reason,settled.version,randomUUID())).rejects.toMatchObject({status:503});expect(await counts()).toMatchObject({journals:0,postings:0});expect((await client('cashier').getConnectedFinancialCommand(c.id)).state).toBe('confirmed_unposted');
  await client('authorizer').postConnectedFinancialCommand(c.id,reason,options('authorizer',settled.version));expect(await counts()).toMatchObject({journals:1,postings:1});
 });
 it('rejects current revocation before receipt replay and hides foreign financial records',async()=>{
  const c=await release(),o=options('authorizer',c.version);await client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,o);
  await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[f.authorizer.actor.userId]);await expect(client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,o)).rejects.toMatchObject({status:401});
  await expect(client('cashier').getConnectedLoanWorkspace(randomUUID(),{asOfDate:f.day})).rejects.toMatchObject({status:404});await expect(client('cashier').getConnectedFinancialApplications({cursor:randomUUID()})).rejects.toMatchObject({status:404});
  const other=await connectedMoneyFixture(),foreign=await fetch(`${base}/api/v1/loans/${c.loanId}/workspace?asOfDate=${f.day}`,{headers:{Cookie:`agap_session=${other.cashier.token}`,Origin:config.PUBLIC_ORIGIN}});expect(foreign.status).toBe(404);
  await expect(client('cashier').getConnectedFinancialApplications({cursor:other.appId})).rejects.toMatchObject({status:404});
 });
 it('requires fresh MFA for authorization while preserving permitted financial reads',async()=>{
  const c=await release();await owner.query("UPDATE identity.sessions SET authenticated_at=now()-interval '1 hour' WHERE id=$1",[f.authorizer.actor.sessionId]);
  await expect(client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,options('authorizer',c.version))).rejects.toMatchObject({status:403,code:'fresh_mfa_required'});
  expect((await client('authorizer').getConnectedLoanWorkspace(c.loanId,{asOfDate:f.day})).commands[0].state).toBe('prepared');expect(await counts()).toMatchObject({journals:0,postings:0});
 });
 it('makes recorded reasons append-only and refuses attribution to another actor',async()=>{
  const c=await release(),row=(await owner.query('SELECT id,reason FROM servicing.action_reasons WHERE command_id=$1',[c.id])).rows[0];
  await expect(owner.query("UPDATE servicing.action_reasons SET reason='Changed recorded reason' WHERE id=$1",[row.id])).rejects.toThrow();expect((await owner.query('SELECT reason FROM servicing.action_reasons WHERE id=$1',[row.id])).rows[0].reason).toBe(row.reason);
  const uow=new PostgresUnitOfWork(runtimePool,{lendingGuard:true});
  await expect(uow.run(f.cashier.actor,tx=>tx.query("INSERT INTO servicing.action_reasons(id,organization_id,branch_id,loan_id,command_id,user_id,action,reason,correlation_id) VALUES($1,$2,$3,$4,$5,$6,'prepare_release','Fictional wrong attribution',$7)",[randomUUID(),f.org,f.branch,c.loanId,c.id,f.authorizer.actor.userId,randomUUID()]))).rejects.toMatchObject({code:'42501'});
 });
 it('keeps unsupported repayment amounts and future posted positions unavailable',async()=>{
  const c=await release(),settled=await settle(c);await client('authorizer').postConnectedFinancialCommand(c.id,reason,options('authorizer',settled.version));
  await expect(client('cashier').prepareConnectedRepayment(c.loanId,{loanId:c.loanId,amountCentavos:49999,currency:'PHP',effectiveDate:f.day,method:'cash',instrumentReference:'FICTIONAL-UNSUPPORTED',reason:reason.reason},options('cashier'))).rejects.toMatchObject({status:409});
  const before=new Date(Date.parse(`${f.day}T00:00:00Z`)-86400000).toISOString().slice(0,10),future=new Date(Date.parse(`${f.day}T00:00:00Z`)+86400000).toISOString().slice(0,10);
  expect((await client('cashier').getConnectedLoanWorkspace(c.loanId,{asOfDate:before})).position).toBeNull();await expect(client('cashier').getConnectedLoanWorkspace(c.loanId,{asOfDate:future})).rejects.toMatchObject({status:409});
 });
 it('keeps the public money path unavailable when connected mode is off',async()=>{
  await app.close();await start(false);try{await expect(client('cashier').getConnectedFinancialApplications({})).rejects.toMatchObject({status:501});expect((await client('cashier').getSession()).connectedLending).toBeUndefined();expect(await counts()).toMatchObject({journals:0,postings:0});}finally{await app.close();await start();}
 });
});
