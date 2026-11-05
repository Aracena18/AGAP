import { afterAll,beforeAll,beforeEach,expect,it } from 'vitest';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AgapClient } from '../../../packages/api-client/src/index.js';
import { schemas } from '../../../packages/contracts/src/schemas.js';
import { createApp } from '../src/app.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { config,identityPool,prepareDatabase,closePools,owner } from './database.js';
import { createPilotFixture } from './pilot-fixture.js';

let app:NestExpressApplication,base:string,directory:string,f:Awaited<ReturnType<typeof createPilotFixture>>;
const identity=new IdentityService(identityPool,config),previousDirectory=process.env.DOCUMENT_DIRECTORY;
beforeAll(async()=>{await prepareDatabase();directory=await mkdtemp(join(tmpdir(),'agap-integrated-pilot-'));process.env.DOCUMENT_DIRECTORY=directory;app=await createApp({...config,FICTIONAL_PILOT_ENABLED:true,EVIDENCE_WORKFLOW_ENABLED:true});await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{f=await createPilotFixture();});
afterAll(async()=>{await app?.close();await closePools();if(previousDirectory===undefined)delete process.env.DOCUMENT_DIRECTORY;else process.env.DOCUMENT_DIRECTORY=previousDirectory;if(directory)await rm(directory,{recursive:true,force:true});});
function client(who:{token:string},member=false){return new AgapClient(base+'/api/v1',async(input,init)=>{const headers=new Headers(init?.headers);headers.set('Cookie',`${member?'agap_member_session':'agap_session'}=${who.token}`);headers.set('Origin',config.PUBLIC_ORIGIN);return fetch(input,{...init,headers});});}
const options=(who:{token:string},version?:number)=>({version,csrfToken:identity.csrfToken(who.token),idempotencyKey:randomUUID()});
async function decide(){
 const id=f.application.id,officer=client(f.f.officer),reviewer=client(f.reviewer),member=client(f.member,true);
 let w=await officer.getPilotWorkspace(id);
 await officer.declarePilotConflict(id,{status:'clear',reason:'Explicit fictional preparer declaration.'},options(f.f.officer,w.applicationVersion));
 await reviewer.declarePilotConflict(id,{status:'clear',reason:'Explicit fictional independent reviewer declaration.'},options(f.reviewer,w.applicationVersion));
 w=await officer.getPilotWorkspace(id);expect(w.canRecommend).toBe(true);
 await officer.recommendPilotOffer(id,{assessmentId:w.assessment!.id,offerVersionId:f.offerId,inputVersion:w.inputVersion,reason:'Reviewed current confirmed household information.'},options(f.f.officer,w.applicationVersion));
 const readiness=await officer.getPriorityReviewSummary(id);expect(readiness.readiness.ready).toBe(true);
 w=await reviewer.getPilotWorkspace(id);expect(w.canReview).toBe(true);
 const preview=await reviewer.previewPilotDecision(id,{outcome:'approve',assessmentId:w.assessment!.id,recommendationId:w.recommendation!.id,offerVersionId:f.offerId,rationale:'Separate authorized review of the recorded fictional terms.',departureReason:'',exceptions:[],reviewDate:'2026-12-01'},options(f.reviewer,w.applicationVersion));
 await reviewer.recordPilotDecision(id,{previewId:preview.id,explanationReviewed:true},options(f.reviewer,w.applicationVersion));
 const result=await member.getPilotMemberDecision(id);expect(result.state).toBe('available');if(result.state!=='available'||!result.data?.document)throw new Error('Expected exact saved terms.');
 const saved=await reviewer.getPilotSavedBrief(id,result.data.id);expect(saved.document).toEqual(result.data.document);
 await member.acceptPilotMemberDecision(id,{decisionId:result.data.id,documentVersionId:result.data.document.id,acknowledgment:true},options(f.member,result.data.applicationVersion));
 return {officer,reviewer,member};
}
it('registers the actual review/decision/member/money services and validates public responses through the generated client',async()=>{
 const id=f.application.id,{officer,member}=await decide(),cashier=client(f.cashier),authorizer=client(f.authorizer);
 expect((await officer.getSession()).fictionalPilot).toBe(true);
 await expect(officer.getPilotMoneyApplications()).rejects.toMatchObject({status:403});
 const queue=await cashier.getPilotMoneyApplications();expect(queue.items.map(i=>i.applicationId)).toContain(id);expect(JSON.stringify(queue)).not.toContain('datedFacts');
 const money=await cashier.getPilotMoneyApplication(id);expect(money.releaseBasisAvailable).toBe(true);expect(money.terms?.principalCentavos).toBe(100000);
 const loan=await cashier.originatePilotLoan({applicationId:id,method:'cash'},options(f.cashier));
 for(const kind of ['release','repayment']as const){
  const body={loanId:loan.id,amountCentavos:100000,currency:'PHP' as const,effectiveDate:'2026-11-05',method:'cash' as const,instrumentReference:'FICTIONAL-'+kind,reason:'Integrated fictional server simulation; no real funds.'};
  let c=await(kind==='release'?cashier.preparePilotDisbursement(loan.id,body,options(f.cashier)):cashier.preparePilotRepayment(loan.id,body,options(f.cashier)));
  c=await authorizer.authorizePilotCommand(c.id,options(f.authorizer,c.version));c=await cashier.submitPilotCommand(c.id,options(f.cashier,c.version));c=await cashier.simulatePilotCommand(c.id,{outcome:'confirmed',reason:'Server-created simulated movement evidence.'},options(f.cashier,c.version));
  const posted=await authorizer.postPilotCommand(c.id,options(f.authorizer,c.version));expect(posted.journalId).toBeTruthy();
  const position=await cashier.getPilotLoan(loan.id);expect(position.position?.principalCentavos).toBe(kind==='release'?100000:0);
 }
 const loans=await member.listMemberLoans();expect(loans.state).toBe('available');if(loans.state==='available')expect(loans.data[0].receipts).toHaveLength(1);
 expect(Number((await owner.query('SELECT count(*) FROM accounting.journals WHERE organization_id=$1',[f.f.org])).rows[0].count)).toBe(2);
 await owner.query('UPDATE identity.staff_users SET branch_ids=ARRAY[$1::uuid,$2::uuid] WHERE id=$3',[f.f.branch,f.f.secondBranch,f.f.auditor.actor.userId]);
 const audit=await client(f.f.auditor).createReconciliation({fromDate:'2026-11-05',throughDate:'2026-11-05'},options(f.f.auditor));expect(audit.report.status).toBe('matched');expect(audit.report.events).toHaveLength(2);
 const helpKey=options(f.member),body={loanId:loan.id,message:'Fictional request to discuss the settled principal account.',contactPreference:'portal' as const,sharingConfirmed:true as const,noticeVersion:config.PRIVACY_NOTICE_VERSION};
 const help=await member.createMemberSupport(body,helpKey);expect(await member.createMemberSupport(body,helpKey)).toEqual(help);
 expect((await owner.query('SELECT position FROM monitoring.disclosures WHERE request_id=$1',[help.id])).rows[0].position).toMatchObject({loanId:loan.id,principalCentavos:0});
 const assigned=await client(f.f.administrator).assignSupportRequest(help.id,{officerId:f.f.officer.actor.userId,reason:'Fictional linked account support assignment.'},options(f.f.administrator,1));
 await officer.respondSupportRequest(help.id,{response:'We can discuss your recorded principal account.',internalNote:'Private fictional staff context.',followUpDate:null},options(f.f.officer,assigned.version));
 const history=await member.listMemberSupport();expect(history.state).toBe('available');expect(JSON.stringify(history)).toContain(help.id);expect(JSON.stringify(history)).not.toContain('Private fictional staff context.');
});
it('keeps the static model-off path editable and denies an unreviewed final decision',async()=>{
 const id=f.application.id,officer=client(f.f.officer),workflow=await officer.getStaffWorkflow(id),source=workflow.sources[0];
 await expect(officer.createPrioritySourceReview(id,{question:'What needs clarification?',sources:[{sourceId:source.id,sourceVersion:source.version,textVersionId:source.textVersionId,page:1,start:0,end:source.pages[0].text.length}]},options(f.f.officer,1))).rejects.toMatchObject({status:501,code:'module_not_available'});
 expect((await officer.getStaffWorkflow(id)).facts).toHaveLength(4);
 await expect(client(f.reviewer).recordPilotDecision(id,{previewId:randomUUID(),explanationReviewed:false} as unknown as {previewId:string;explanationReviewed:true},options(f.reviewer,workflow.version))).rejects.toMatchObject({status:422});
 expect(schemas.PilotDecisionPreview.safeParse({explanationReviewed:true}).success).toBe(false);
});
