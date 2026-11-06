import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,readdir,rename} from 'node:fs/promises';
import {AgapClient} from '../../../packages/api-client/src/index.js';
import {createApp} from '../src/app.js';
import {IdentityService,tokenHash} from '../src/modules/identity/identity.service.js';
import {DocumentsService} from '../src/modules/evidence/documents.service.js';
import {WorkflowService} from '../src/modules/evidence/workflow.service.js';
import {EvidenceWorker} from '../src/modules/evidence/processing-worker.js';
import {PrivateDocumentStore} from '../src/platform/document-store.js';
import {PostgresUnitOfWork} from '../src/platform/database.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {owner,runtimePool,identityPool,config,prepareDatabase,closePools} from './database.js';
import {connectedMoneyFixture} from './connected-money-fixture.js';
import {memberFixture} from './member-fixtures.js';

// Executed only inside the coordinator's private Docker namespace, never via .env.
assert(process.env.AGAP_RECOVERY_RUN?.match(/^[a-f0-9-]{36}$/)&&process.env.AGAP_TEST_DATABASE_URL==='postgresql://agap_owner:development-owner@127.0.0.1:5432/agap_test','Recovery fixture requires the disposable coordinator.');
const mode=process.argv[2];assert(mode==='seed'||mode==='verify');
const root=mode==='seed'?'/recovery/source':'/recovery/restored/recovery/source';
process.env.DOCUMENT_DIRECTORY=`${root}/documents`;
type Fixture=Awaited<ReturnType<typeof connectedMoneyFixture>>;
type Person='member'|'officer'|'reviewer'|'cashier'|'authorizer'|'auditor'|'administrator';
const reason={reason:'Fictional recovery verification of exact saved command.'};
let f:Fixture;
if(mode==='seed'){
  assert.equal((await owner.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n,0,'Source must be a fresh empty cluster.');
  await prepareDatabase();f=await connectedMoneyFixture();
}else f=JSON.parse(await readFile(`${root}/fixture.json`,'utf8')).fixture;
const identity=new IdentityService(identityPool,config);
const app=await createApp({...config,EVIDENCE_WORKFLOW_ENABLED:true,CONNECTED_LENDING_ENABLED:true});
await app.listen(0,'127.0.0.1');const base=await app.getUrl();
function tokenClient(token:string,member=true){return new AgapClient(`${base}/api/v1`,(url,init)=>{const headers=new Headers(init?.headers);headers.set('Cookie',`${member?'agap_member_session':'agap_session'}=${token}`);headers.set('Origin',config.PUBLIC_ORIGIN);return fetch(url,{...init,headers});});}
function client(person:Person){return tokenClient(f[person].token,person==='member');}
function options(person:Person,version?:number){return {csrfToken:identity.csrfToken(f[person].token),idempotencyKey:randomUUID(),...(version===undefined?{}:{version})};}
async function approve(){
  for(const person of ['officer','reviewer'] as const){const r=await client(person).getDecisionReview(f.appId);await client(person).declareDecisionConflict(f.appId,{status:'clear',reference:'Fictional recovery test self-declaration.'},options(person,r.version));}
  const r=await client('officer').getDecisionReview(f.appId);await client('officer').confirmDecisionReview(f.appId,{evidenceBasisHash:r.evidenceBasisHash,mode:'manual',reviewedSources:true,reviewedScenarios:true,reason:'Automated fictional test, not independent human approval.'},options('officer',r.version));
  const w=await client('officer').getStaffDecisionWorkspace(f.appId);assert(w.assessment);
  const recommendation=await client('officer').recommendOffer(f.appId,{assessmentId:w.assessment.id,offerVersionId:f.offerId,inputVersion:w.assessment.inputVersion,reason:'Fictional principal-only offer.'},options('officer',w.application.version));
  const body={outcome:'approve' as const,assessmentId:w.assessment.id,recommendationId:recommendation.id,offerVersionId:f.offerId,rationale:'Fictional recovery test review.',departureReason:'',exceptions:[],reviewDate:'2026-12-31'};
  const current=await client('reviewer').getStaffDecisionWorkspace(f.appId),preview=await client('reviewer').previewDecision(f.appId,body,options('reviewer',current.application.version));
  const decision=await client('reviewer').recordDecision(f.appId,{previewId:preview.id,decision:{...body,explanationReviewed:true}},options('reviewer',current.application.version));
  const terms=await client('member').getMemberDecision(f.appId);assert(terms.state==='available'&&terms.data?.documentVersionId);
  const memberApp=await client('member').getMemberApplication(f.appId);
  await client('member').acceptMemberDecision(f.appId,{decisionId:decision.id,documentVersionId:terms.data.documentVersionId,acknowledgment:true},options('member',memberApp.version));
}
async function settle(c:{id:string;version:number}){
  const authorized=await client('authorizer').authorizeConnectedFinancialCommand(c.id,reason,options('authorizer',c.version));
  const submitted=await client('cashier').submitConnectedFinancialCommand(c.id,reason,options('cashier',authorized.version));
  const observed=await client('cashier').observeConnectedSimulation(c.id,{...reason,outcome:'confirmed'},options('cashier',submitted.version));
  return client('authorizer').postConnectedFinancialCommand(c.id,reason,options('authorizer',observed.version));
}
async function projections(loanId:string,reportId:string){return {workspace:await client('auditor').getConnectedLoanWorkspace(loanId,{asOfDate:f.day}),member:await client('member').listMemberLoans(),reconciliation:await client('auditor').getReconciliation(reportId),terms:await client('member').getMemberDecision(f.appId)};}
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
try{
  if(mode==='seed'){
    // Probe sequence recovery independently of the application's UUID contracts.
    await owner.query('CREATE SEQUENCE public.recovery_drill_sequence START 71');
    await owner.query("SELECT nextval('public.recovery_drill_sequence')");
    await approve();const loan=await client('cashier').createPendingOrigination(f.appId,{method:'cash'},options('cashier'));
    await settle(await client('cashier').prepareConnectedDisbursement(loan.id,{loanId:loan.id,amountCentavos:100000,currency:'PHP',effectiveDate:f.day,method:'cash',instrumentReference:'FICTIONAL-RECOVERY-RELEASE',reason:reason.reason},options('cashier')));
    const receipt=await settle(await client('cashier').prepareConnectedRepayment(loan.id,{loanId:loan.id,amountCentavos:50000,currency:'PHP',effectiveDate:f.day,method:'cash',instrumentReference:'FICTIONAL-RECOVERY-PAYMENT',reason:reason.reason},options('cashier')));
    assert.equal(receipt.principalAfterCentavos,50000);assert(receipt.receiptId);
    const report=await client('auditor').createReconciliation({fromDate:f.day,throughDate:f.day},options('auditor'));assert.equal(report.report.status,'matched');
    const draft=await client('member').createMemberApplication({purpose:'Fictional recovery evidence',requestedPrincipalCentavos:100000,requestedTermMonths:2,currency:'PHP',noticeVersion:config.PRIVACY_NOTICE_VERSION,noticeAcknowledged:true},options('member'));
    const store=new PrivateDocumentStore(`${root}/documents`),workflow=new WorkflowService(new PostgresUnitOfWork(runtimePool,{lendingGuard:true}),new PostgresMemberUnitOfWork(runtimePool,{lendingGuard:true}),false,true);
    const bytes=Buffer.from('%PDF-1.4 Fictional recovery evidence; processing adapters are test doubles.');
    async function* stream(){yield bytes;}
    const source=await new DocumentsService(workflow,store).upload(f.member.actor,draft.id,{fileName:'Fictional recovery.pdf',mediaType:'application/pdf',size:bytes.length},stream(),randomUUID());
    // Recovery exercises persisted original/derived objects, not scanner/OCR quality.
    await new EvidenceWorker(owner,f.org,store,{scan:async()=> 'clean'},{extract:async()=>[{page:1,text:'Fictional recovery evidence, no real member data.'}]},null).tick();
    const other=await memberFixture(f.officer.actor),revoked=await memberFixture(f.officer.actor);
    await identity.logoutMember(revoked.token);
    const files=await readdir(`${root}/documents`);assert.equal(files.length,2,'Original and actual derived text must be persisted.');
    const manifest=await Promise.all(files.map(async key=>({key,sha256:hash(await readFile(`${root}/documents/${key}`))})));
    await writeFile(`${root}/fixture.json`,JSON.stringify({fixture:f,loanId:loan.id,reportId:report.id,receiptId:receipt.receiptId,documentApp:draft.id,sourceId:source.id,otherToken:other.token,revokedToken:revoked.token,manifest,expected:await projections(loan.id,report.id)}),{flag:'wx',mode:0o600});
  }else{
    const saved=JSON.parse(await readFile(`${root}/fixture.json`,'utf8'));
    assert.deepEqual(await projections(saved.loanId,saved.reportId),saved.expected,'Restored financial/decision projections changed.');
    assert.equal((await owner.query("SELECT nextval('public.recovery_drill_sequence')::int n")).rows[0].n,72,'Restored sequence must resume at the exact next value.');
    const receipts=saved.expected.workspace.position.receipts;assert.equal(receipts.length,1);assert.equal(receipts[0].receiptId,saved.receiptId);
    const journals=await owner.query("SELECT j.id,sum(CASE WHEN l.side='debit' THEN l.amount_centavos ELSE -l.amount_centavos END)::text balance FROM accounting.journals j JOIN accounting.journal_lines l ON l.organization_id=j.organization_id AND l.journal_id=j.id GROUP BY j.id");
    assert.equal(journals.rowCount,2);assert(journals.rows.every(row=>row.balance==='0'));
    assert.equal((await owner.query("SELECT count(*)::int n FROM evidence.text_versions")).rows[0].n,1);
    for(const file of saved.manifest)assert.equal(hash(await readFile(`${root}/documents/${file.key}`)),file.sha256);
    const original=await client('member').downloadMemberDocument(saved.documentApp,saved.sourceId);assert(original.size>0);
    await assert.rejects(()=>tokenClient(saved.otherToken).downloadMemberDocument(saved.documentApp,saved.sourceId),{status:404});
    await assert.rejects(()=>tokenClient(saved.revokedToken).listMemberLoans(),{status:401});
    await assert.rejects(()=>client('officer').getConnectedLoanWorkspace(saved.loanId,{asOfDate:f.day}),{status:403});
    const otherLoans=await tokenClient(saved.otherToken).listMemberLoans();assert(otherLoans.state==='available');assert.equal(otherLoans.data.length,0);
    await assert.rejects(()=>runtimePool.query('SELECT * FROM servicing.originations'),{code:'42501'});
    assert.equal((await runtimePool.query('SELECT count(*)::int n FROM members.members')).rows[0].n,0,'Runtime without actor must see no members.');
    const roles=await owner.query("SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('agap_runtime','agap_identity','agap_worker')");assert.equal(roles.rowCount,3);assert(roles.rows.every(r=>!r.rolsuper&&!r.rolbypassrls));
    // Corruption and omission must fail through the real authenticated download.
    const object=(await owner.query('SELECT object_key FROM evidence.sources WHERE id=$1',[saved.sourceId])).rows[0].object_key,path=`${root}/documents/${object}`,bytes=await readFile(path);
    await writeFile(path,Buffer.from('corrupt fictional recovery object'));await assert.rejects(()=>client('member').downloadMemberDocument(saved.documentApp,saved.sourceId),{status:503});
    await writeFile(path,bytes);
    await rename(path,`${path}.missing`);await assert.rejects(()=>client('member').downloadMemberDocument(saved.documentApp,saved.sourceId),{status:500});await rename(`${path}.missing`,path);
    assert.equal(hash(await readFile(path)),hash(bytes));
    assert.equal((await owner.query('SELECT count(*)::int n FROM identity.member_sessions WHERE token_hash=$1',[tokenHash(saved.revokedToken)])).rows[0].n,0);
    await writeFile('/recovery/result.json',JSON.stringify({passed:true,principalCentavos:50000,postedJournals:2,balancedJournals:true,savedReceipts:1,reconciliation:'matched',originalDocuments:1,derivedTextVersions:1,nextSequenceValueMatched:true,financialAndDecisionProjectionsMatched:true,memberIsolationAndRevokedSessionDenied:true,runtimeRlsAndRestrictedRoles:true,corruptObjectRejected:true,missingObjectRejected:true}),{flag:'wx',mode:0o600});
  }
}finally{await app.close();await closePools();}
