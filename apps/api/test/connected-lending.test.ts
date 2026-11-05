import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { changeMemberLink } from '../src/modules/identity/member-provisioning.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { assertConnectedLending, loadConfig } from '../src/platform/config.js';
import { prepareDatabase, resetFixtures, closePools, owner, identityPool, config } from './database.js';
import { memberFixture } from './member-fixtures.js';
import { connectedLedgerFixture, connectedLendingFixture } from './connected-lending-fixture.js';

let app:INestApplication,base:string,directory:string,previous:string|undefined,f:Awaited<ReturnType<typeof connectedLendingFixture>>;
beforeAll(async()=>{await prepareDatabase();previous=process.env.DOCUMENT_DIRECTORY;directory=await mkdtemp(join(tmpdir(),'agap-cl2-http-'));process.env.DOCUMENT_DIRECTORY=directory;app=await createApp({...config,EVIDENCE_WORKFLOW_ENABLED:true,CONNECTED_LENDING_ENABLED:true});await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{await resetFixtures();f=await connectedLendingFixture({sameDayFirstPayment:true});});
afterAll(async()=>{await app?.close();await closePools();if(previous===undefined)delete process.env.DOCUMENT_DIRECTORY;else process.env.DOCUMENT_DIRECTORY=previous;if(directory)await rm(directory,{recursive:true,force:true});});
async function request(path:string,token=f.officer.token,body?:unknown,version?:number,key=randomUUID()){
  const headers:Record<string,string>={Cookie:`agap_session=${token}`,Origin:config.PUBLIC_ORIGIN};
  if(body!==undefined){headers['Content-Type']='application/json';headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);headers['Idempotency-Key']=key;}
  if(version!==undefined)headers['If-Match']=`"${version}"`;
  return fetch(`${base}/api/v1${path}`,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
}
async function memberRequest(path:string,token=f.member.token,body?:unknown,version?:number,key=randomUUID()){
  const headers:Record<string,string>={Cookie:`agap_member_session=${token}`,Origin:config.PUBLIC_ORIGIN};
  if(body!==undefined){headers['Content-Type']='application/json';headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);headers['Idempotency-Key']=key;}
  if(version!==undefined)headers['If-Match']=`"${version}"`;
  return fetch(`${base}/api/v1/member${path}`,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
}
async function json(path:string,token=f.officer.token,body?:unknown,version?:number){const response=await request(path,token,body,version);const data=await response.json();expect(response.status,JSON.stringify(data)).toBe(body===undefined?200:201);return data;}
async function version(){return Number((await owner.query('SELECT version FROM applications.applications WHERE id=$1',[f.appId])).rows[0].version);}
async function ready(){
  for(const user of [f.officer,f.reviewer])await json(`/applications/${f.appId}/decision-review/conflicts`,user.token,{status:'clear',reference:'Explicit fictional HTTP self-declaration.'},await version());
  const review=await json(`/applications/${f.appId}/decision-review`);
  await json(`/applications/${f.appId}/decision-review/confirmations`,f.officer.token,{evidenceBasisHash:review.evidenceBasisHash,mode:'manual',reviewedSources:true,reviewedScenarios:true,reason:'Automated fictional HTTP review record; no human validation claimed.'},review.version);
}
describe('CL2 authenticated HTTP and actual owner services',()=>{
  it('keeps connected lending default-off and refuses real/production or evidence-disabled activation',()=>{
    expect(loadConfig({DATABASE_URL:config.DATABASE_URL,IDENTITY_DATABASE_URL:config.IDENTITY_DATABASE_URL,SESSION_SECRET:config.SESSION_SECRET,OIDC_CLIENT_SECRET:config.OIDC_CLIENT_SECRET}).CONNECTED_LENDING_ENABLED).toBe(false);
    for(const extra of [{NODE_ENV:'production' as const},{EVIDENCE_RECORD_MODE:'real' as const},{EVIDENCE_WORKFLOW_ENABLED:false}])expect(()=>assertConnectedLending({...config,EVIDENCE_WORKFLOW_ENABLED:true,CONNECTED_LENDING_ENABLED:true,...extra})).toThrow('fictional non-production');
  });
  it('records a scoped recommendation and separate exact preview approval, then downloads the immutable bytes',async()=>{
    await ready();const path=`/applications/${f.appId}`;
    const workspace=await json(`${path}/decision-workspace`);
    const recommendation=await json(`${path}/recommendations`,f.officer.token,{assessmentId:workspace.assessment.id,offerVersionId:f.offerId,inputVersion:workspace.assessment.inputVersion,reason:'Reviewed actual saved dated figures.'},workspace.application.version);
    const body={outcome:'approve',assessmentId:workspace.assessment.id,recommendationId:recommendation.id,offerVersionId:f.offerId,rationale:'Separate fictional HTTP reviewer inspected sources, full horizon and payment dates.',departureReason:'',exceptions:[],reviewDate:'2026-12-31'};
    expect((await request(`${path}/decision-previews`,f.officer.token,body,await version())).status).toBe(403);
    const proof=await json(`${path}/decision-previews`,f.reviewer.token,body,await version());
    expect((await request(`${path}/decisions`,f.reviewer.token,{...body,explanationReviewed:true},await version())).status).toBe(422);
    const envelope={previewId:proof.id,decision:{...body,explanationReviewed:true}},v=await version(),k=randomUUID();
    const first=await request(`${path}/decisions`,f.reviewer.token,envelope,v,k);expect(first.status).toBe(201);const d=await first.json();
    expect(await (await request(`${path}/decisions`,f.reviewer.token,envelope,v,k)).json()).toEqual(d);
    const history=await json(`${path}/decisions?limit=1`,f.reviewer.token);expect(history.items).toHaveLength(1);expect(history.items[0].id).toBe(d.id);
    const brief=await json(`${path}/decisions/${d.id}`,f.reviewer.token),document=await request(`${path}/decisions/${d.id}/document`,f.reviewer.token);
    expect(document.status).toBe(200);const bytes=Buffer.from(await document.arrayBuffer());expect(bytes.toString('utf8')).toBe(proof.terms);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(brief.document.sha256);expect(document.headers.get('X-Content-SHA256')).toBe(brief.document.sha256);
    expect((await request(`${path}/decision-workspace`,f.cashier.token)).status).toBe(403);
    const memberPath=`/applications/${f.appId}`,memberDecision=await (await memberRequest(`${memberPath}/decision`)).json();
    expect(memberDecision).toMatchObject({state:'available',data:{id:d.id,accepted:false}});
    expect(JSON.stringify(memberDecision)).not.toMatch(/reviewParticipantIds|approvalLimitCentavos|conflicts|recordedBy/);
    const exact=await memberRequest(`${memberPath}/decision-documents/${brief.document.id}`);expect(exact.status).toBe(200);
    expect(await exact.json()).toEqual({id:brief.document.id,sha256:brief.document.sha256,mediaType:'text/plain; charset=utf-8',text:proof.terms});
    const other=await memberFixture(f.officer.actor);
    expect((await memberRequest(`${memberPath}/decision-documents/${brief.document.id}`,other.token)).status).toBe(404);
    expect((await request(`/member${memberPath}/decision-documents/${brief.document.id}`)).status).toBe(401);
    expect((await request(`${path}/originations`,f.cashier.token,{method:'cash'})).status).toBe(409);
    const acceptance={decisionId:d.id,documentVersionId:brief.document.id,acknowledgment:true},acceptKey=randomUUID(),acceptV=await version();
    expect((await memberRequest(`${memberPath}/acceptances`,f.member.token,{...acceptance,documentVersionId:randomUUID()},acceptV)).status).toBe(409);
    const accepted=await memberRequest(`${memberPath}/acceptances`,f.member.token,acceptance,acceptV,acceptKey);expect(accepted.status).toBe(201);const receipt=await accepted.json();
    expect(await (await memberRequest(`${memberPath}/acceptances`,f.member.token,acceptance,acceptV,acceptKey)).json()).toEqual(receipt);
    expect((await memberRequest(`${memberPath}/acceptances`,f.member.token,acceptance,await version())).status).toBe(409);
    expect(await(await memberRequest(`${memberPath}/decision`)).json()).toMatchObject({state:'available',data:{accepted:true}});
    expect((await request(`${path}/originations`,f.officer.token,{method:'cash'})).status).toBe(403);
    const originKey=randomUUID(),pending=await request(`${path}/originations`,f.cashier.token,{method:'cash'},undefined,originKey);expect(pending.status).toBe(201);const pendingReceipt=await pending.json();
    expect(await(await request(`${path}/originations`,f.cashier.token,{method:'cash'},undefined,originKey)).json()).toEqual(pendingReceipt);
    expect((await request(`${path}/originations`,f.cashier.token,{method:'cash'})).status).toBe(409);
    expect((await owner.query('SELECT count(*) FROM decisions.acceptances')).rows[0].count).toBe('1');
    expect((await owner.query('SELECT count(*) FROM servicing.originations')).rows[0].count).toBe('1');
    expect((await owner.query('SELECT count(*) FROM servicing.postings')).rows[0].count).toBe('0');
    expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0');
    const loan=pendingReceipt.id,loanPath=`/loans/${loan}`,loanWorkspace=await json(`${loanPath}/workspaces/2026-11-05`,f.cashier.token);
    expect(loanWorkspace).toMatchObject({position:null,canPrepareRelease:true,origination:{principalCentavos:100000}});
    const releaseBody={loanId:loan,amountCentavos:100000,currency:'PHP',effectiveDate:'2026-11-05',method:'cash',instrumentReference:'FICTIONAL-CL4-HTTP',reason:'Fictional exact accepted release.'};
    const prepared=await json(`${loanPath}/release-preparations`,f.cashier.token,releaseBody);
    const commandPath=`${loanPath}/commands/${prepared.id}`,reason={reason:'Fictional separate financial authorization.'};
    expect((await request(`${commandPath}/authorizations`,f.cashier.token,reason,1)).status).toBe(403);
    const authorized=await json(`${commandPath}/authorizations`,f.authorizer.token,reason,1);expect(authorized.version).toBe(2);
    await json(`${commandPath}/submission-intents`,f.cashier.token,{reason:'Commit one fictional submission intent before settlement.'},2);
    expect((await request(`${commandPath}/simulated-settlements`,f.cashier.token,{reason:'Forged browser evidence.',verified:true},3)).status).toBe(422);
    expect((await owner.query('SELECT count(*) FROM servicing.fictional_movements')).rows[0].count).toBe('0');
    const settlementKey=randomUUID(),settlementReason={reason:'Record the server-produced fictional settlement.'};
    const settlement=await request(`${commandPath}/simulated-settlements`,f.cashier.token,settlementReason,3,settlementKey);expect(settlement.status).toBe(201);const observed=await settlement.json();expect(observed.version).toBe(4);
    expect(await(await request(`${commandPath}/simulated-settlements`,f.cashier.token,settlementReason,3,settlementKey)).json()).toEqual(observed);
    expect((await owner.query('SELECT count(*) FROM servicing.fictional_movements')).rows[0].count).toBe('1');
    expect(await json(`${loanPath}/workspaces/2026-11-05`,f.cashier.token)).toMatchObject({position:null,commands:[{state:'confirmed_unposted'}]});
    const closed=await request(`${commandPath}/finalizations`,f.authorizer.token,{reason:'Fictional posting before an open period is configured.'},4);expect(closed.status).toBe(409);
    expect((await owner.query('SELECT count(*) FROM servicing.fictional_movement_observations')).rows[0].count).toBe('1');
    expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0');
    await connectedLedgerFixture(f);
    const pendingReport=await json('/reconciliations',f.auditor.token,{fromDate:'2026-11-01',throughDate:'2026-11-30'});
    expect(pendingReport.report.status,JSON.stringify(pendingReport.report)).toBe('discrepancy');expect(pendingReport.report.events).toHaveLength(1);expect(pendingReport.report.events[0].findings).toContainEqual(expect.objectContaining({code:'confirmed_unposted'}));

    const posted=await json(`${commandPath}/finalizations`,f.authorizer.token,{reason:'Post the exact fictional movement to the actual test ledger.'},4);
    expect(posted).toMatchObject({kind:'disbursement',amountCentavos:100000,principalAfterCentavos:100000,receiptId:null});
    expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('1');
    expect((await owner.query('SELECT count(*) FROM servicing.postings')).rows[0].count).toBe('1');
    expect((await owner.query('SELECT count(*) FROM servicing.action_notes')).rows[0].count).toBe('4');
    expect(await json(`${loanPath}/workspaces/2026-11-05`,f.authorizer.token)).toMatchObject({position:{principalCentavos:100000,state:'active'},commands:[{state:'confirmed'}]});
    expect(await(await memberRequest('/loans')).json()).toMatchObject({state:'available',data:[{position:{principalCentavos:100000}}]});
    const repaymentBody={...releaseBody,amountCentavos:50000,effectiveDate:f.policy.offers[0].payments[0].date,instrumentReference:'FICTIONAL-CL5-HTTP',reason:'Exact first scheduled fictional repayment.'};
    expect((await request(`${loanPath}/repayment-preparations`,f.cashier.token,{...repaymentBody,amountCentavos:49999})).status).toBe(409);
    const repayment=await json(`${loanPath}/repayment-preparations`,f.cashier.token,repaymentBody),repayPath=`${loanPath}/commands/${repayment.id}`;
    await json(`${repayPath}/authorizations`,f.authorizer.token,{reason:'Separate fictional repayment authorization.'},1);
    await json(`${repayPath}/submission-intents`,f.cashier.token,{reason:'Original committed fictional repayment intent.'},2);
    const received=await json(`${repayPath}/simulated-settlements`,f.cashier.token,{reason:'Server-produced fictional repayment evidence.'},3);
    const repaid=await json(`${repayPath}/finalizations`,f.authorizer.token,{reason:'Atomic principal repayment and test ledger posting.'},received.version);
    expect(repaid).toMatchObject({kind:'repayment',amountCentavos:50000,principalAfterCentavos:50000});expect(repaid.receiptId).toBeTruthy();
    expect(await(await memberRequest('/loans')).json()).toMatchObject({state:'available',data:[{position:{principalCentavos:50000},receipts:[{id:repaid.receiptId,amountCentavos:50000}]}]});
    const report=await json('/reconciliations',f.auditor.token,{fromDate:'2026-11-01',throughDate:'2026-11-30'});
    expect(report.report.status,JSON.stringify(report.report)).toBe('matched');expect(report.report.events).toHaveLength(2);
    expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('2');
    expect((await owner.query('SELECT count(*) FROM servicing.action_notes')).rows[0].count).toBe('8');
    await owner.query("UPDATE accounting.periods SET state='closing' WHERE organization_id=$1",[f.org]);
    await owner.query("UPDATE accounting.periods SET state='closed' WHERE organization_id=$1",[f.org]);
    expect(await json(`${commandPath}/finalizations`,f.authorizer.token,{reason:'Recover the already committed posting under a new key.'},4)).toEqual(posted);
    expect(await json(`${repayPath}/finalizations`,f.authorizer.token,{reason:'Recover the original repayment after period closure.'},received.version)).toEqual(repaid);
    expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('2');


  });
  it('replays an already committed acceptance after a later review hold, but never after member-link revocation',async()=>{
    await ready();const path=`/applications/${f.appId}`,w=await json(`${path}/decision-workspace`);
    const r=await json(`${path}/recommendations`,f.officer.token,{assessmentId:w.assessment.id,offerVersionId:f.offerId,inputVersion:w.assessment.inputVersion,reason:'Fictional acceptance recovery setup.'},w.application.version);
    const body={outcome:'approve',assessmentId:w.assessment.id,recommendationId:r.id,offerVersionId:f.offerId,rationale:'Fictional separate reviewer acceptance replay setup.',departureReason:'',exceptions:[],reviewDate:'2026-12-31'};
    const preview=await json(`${path}/decision-previews`,f.reviewer.token,body,await version());
    const decision=await json(`${path}/decisions`,f.reviewer.token,{previewId:preview.id,decision:{...body,explanationReviewed:true}},await version());
    const view=await(await memberRequest(`${path}/decision`)).json(),input={decisionId:decision.id,documentVersionId:view.data.documentVersionId,acknowledgment:true},v=await version(),k=randomUUID();
    const first=await memberRequest(`${path}/acceptances`,f.member.token,input,v,k);expect(first.status).toBe(201);const receipt=await first.json();
    await json(`${path}/decision-review/conflicts`,f.reviewer.token,{status:'restricted',reference:'Fictional newly reported reviewer conflict after committed member acknowledgment.'},await version());
    expect(await(await memberRequest(`${path}/decision`)).json()).toMatchObject({state:'unavailable'});
    expect(await(await memberRequest(`${path}/acceptances`,f.member.token,input,v,k)).json()).toEqual(receipt);
    expect((await memberRequest(`${path}/acceptances`,f.member.token,input,await version())).status).toBe(409);
    expect((await memberRequest(`${path}/decision-documents/${input.documentVersionId}`)).status).toBe(200);
    await changeMemberLink(owner,config.OIDC_ISSUER,{action:'revoke',linkId:f.member.linkId,expectedVersion:1,operatorReference:'Automated fictional test operator',reason:'Fictional member access revocation before transport replay.'});
    expect((await memberRequest(`${path}/acceptances`,f.member.token,input,v,k)).status).toBe(401);
    expect((await owner.query('SELECT count(*) FROM decisions.acceptances')).rows[0].count).toBe('1');
  });
  it('rejects stale review submissions and administrator lending actions while preserving exact command replay',async()=>{
    const path=`/applications/${f.appId}/decision-review`,state=await json(path),body={status:'clear',reference:'Actual fictional HTTP declaration.'},k=randomUUID();
    const first=await request(`${path}/conflicts`,f.officer.token,body,state.version,k);expect(first.status).toBe(201);const receipt=await first.json();
    expect(await (await request(`${path}/conflicts`,f.officer.token,body,state.version,k)).json()).toEqual(receipt);
    expect((await request(`${path}/conflicts`,f.officer.token,body,state.version)).status).toBe(412);
    expect((await request(`${path}/conflicts`,f.administrator.token,body,await version())).status).toBe(403);
    const other=await resetFixtures();expect((await request(path,other.officer.token)).status).toBe(404);
  });
});
