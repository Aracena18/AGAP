import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {NestExpressApplication} from '@nestjs/platform-express';
import {AgapClient} from '../../../packages/api-client/src/index.js';
import {createApp} from '../src/app.js';
import {PrivateDocumentStore} from '../src/platform/document-store.js';
import {DocumentsService} from '../src/modules/evidence/documents.service.js';
import {IdentityService} from '../src/modules/identity/identity.service.js';
import {prepareRecordingCase,recordingPolicy,recordingServices} from '../src/modules/reviews/recording-preparation.js';
import {owner,identityPool,config,prepareDatabase,closePools} from './database.js';
import {createPilotFixture} from './pilot-fixture.js';
import {memberFixture} from './member-fixtures.js';
let app:NestExpressApplication,base:string,directory:string,f:Awaited<ReturnType<typeof createPilotFixture>>,services:ReturnType<typeof recordingServices>,documents:DocumentsService,requested:string,alternative:string;
const identity=new IdentityService(identityPool,config),previous=process.env.DOCUMENT_DIRECTORY;
beforeAll(async()=>{await prepareDatabase();directory=await mkdtemp(join(tmpdir(),'agap-recording-test-'));process.env.DOCUMENT_DIRECTORY=directory;app=await createApp({...config,FICTIONAL_PILOT_ENABLED:true,EVIDENCE_WORKFLOW_ENABLED:true});await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{f=await createPilotFixture();services=recordingServices(f.uow,f.memberUow);documents=new DocumentsService(services.workflow,new PrivateDocumentStore(directory));requested=randomUUID();alternative=randomUUID();const policy=randomUUID();await owner.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[policy,f.f.org,JSON.stringify(recordingPolicy(policy,randomUUID(),requested,alternative))]);});
afterAll(async()=>{await app?.close();await closePools();await rm(directory,{recursive:true,force:true});if(previous===undefined)delete process.env.DOCUMENT_DIRECTORY;else process.env.DOCUMENT_DIRECTORY=previous;});
function client(who:{token:string},member=false){return new AgapClient(base+'/api/v1',async(input,init)=>{const headers=new Headers(init?.headers);headers.set('Cookie',`${member?'agap_member_session':'agap_session'}=${who.token}`);headers.set('Origin',config.PUBLIC_ORIGIN);return fetch(input,{...init,headers});});}
function prepare(comparison=false,member=f.member,take='take-01'){return prepareRecordingCase({owner,uow:f.uow,memberUow:f.memberUow,officer:f.f.officer.actor,reviewer:f.reviewer.actor,administrator:f.f.administrator.actor,member:member.actor,notice:config.PRIVACY_NOTICE_VERSION,take,name:comparison?'Leo Cruz':'Maya Santos',comparison,requestedOfferId:requested,alternativeOfferId:alternative,documents,store:new PrivateDocumentStore(directory)});}
it('persists real documents, answers, assessment and equal authorized packets; exact recommendation retry exposes only safe terms',async()=>{
 const main=await prepare(),comparison=await memberFixture(f.f.officer.actor),leo=await prepare(true,comparison);
 expect(main.comparisons).toEqual([{offerId:requested,minimum:-600000,withRepair:-800000,passes:false},{offerId:alternative,minimum:800000,withRepair:600000,passes:true}]);expect(leo.readiness).toBe('ready_for_approval');
 const officer=client(f.f.officer),member=client(f.member,true),a=await officer.getPreparedReview(main.applicationId),b=await member.getMemberPreparedReview(main.applicationId);expect(a).toEqual(b);if(a.state!=='ready')throw new Error('Packet missing');
 expect(a.guidance.history.length).toBeGreaterThan(20);expect(a.guidance.items.every(i=>i.reviewState==='accepted'&&i.questions.every(q=>q.answer?.status==='answered'))).toBe(true);expect(a.workflow.sources.filter(s=>s.kind==='document')).toHaveLength(2);expect(a.workflow.sources.filter(s=>s.kind==='document').every(s=>s.state==='quarantined'&&s.verification==='not_checked')).toBe(true);expect(a.attention).toBe('urgent');expect(a.packet.findings.map(f=>f.name)).toEqual(['Character','Capacity','Capital','Collateral','Conditions']);expect(JSON.stringify(a)).not.toMatch(/confidence|percent|authenticity verified/);
 const before=Number((await owner.query('SELECT count(*) FROM evidence.facts WHERE application_id=$1',[main.applicationId])).rows[0].count);expect((await prepare()).applicationId).toBe(main.applicationId);expect(Number((await owner.query('SELECT count(*) FROM evidence.facts WHERE application_id=$1',[main.applicationId])).rows[0].count)).toBe(before);
 const privateReason='Private officer note: independently reviewed exact dated alternative.';const body={assessmentId:a.workflow.latestAssessment!.id,offerVersionId:alternative,inputVersion:a.workflow.inputVersion,reason:privateReason},options={version:a.workflow.version,idempotencyKey:randomUUID(),csrfToken:identity.csrfToken(f.f.officer.token)};
 // The committed response is deliberately discarded, as after a lost network response.
 await officer.recommendPilotOffer(main.applicationId,body,options);const receipt=await officer.recommendPilotOffer(main.applicationId,body,options);expect(receipt.id).toBeTruthy();expect(Number((await owner.query('SELECT count(*) FROM decisions.recommendations WHERE application_id=$1',[main.applicationId])).rows[0].count)).toBe(1);
 const after=await member.getMemberPreparedReview(main.applicationId);expect(after.state).toBe('ready');if(after.state==='ready'){expect(after.recommendation?.offer.id).toBe(alternative);expect(after.attention).toBe('urgent');expect(after.workflow.version).toBeGreaterThan(a.workflow.version);}expect(JSON.stringify(after)).not.toContain(privateReason);expect((await officer.getPilotWorkspace(main.applicationId)).status).toBe('recommended');
 await expect(client(comparison,true).getMemberPreparedReview(main.applicationId)).rejects.toMatchObject({status:404});await expect(client(f.f.other).getPreparedReview(main.applicationId)).rejects.toMatchObject({status:404});
 await f.memberUow.run(f.member.actor,async tx=>{expect((await tx.query('SELECT * FROM decisions.recommendations WHERE application_id=$1',[main.applicationId])).rows).toHaveLength(0);});
 const retake=await prepare(false,f.member,'take-02');expect(retake.applicationId).not.toBe(main.applicationId);expect((await member.getMemberPreparedReview(main.applicationId)).state).toBe('ready');
});
it('rejects changed material, append-only edits, and runtime packet publication',async()=>{
 const prepared=await prepare(),member=client(f.member,true),packet=await member.getMemberPreparedReview(prepared.applicationId);if(packet.state!=='ready')throw new Error('Packet missing');
 await expect(f.uow.run(f.f.officer.actor,tx=>tx.query('INSERT INTO reviews.prepared_packets(id,organization_id,application_id,basis_hash,body) VALUES($1,$2,$3,$4,$5)',[randomUUID(),f.f.org,prepared.applicationId,'a'.repeat(64),'{}']))).rejects.toMatchObject({code:'42501'});
 await expect(owner.query('UPDATE reviews.prepared_packets SET basis_hash=$1 WHERE id=$2',['a'.repeat(64),packet.packet.id])).rejects.toBeDefined();
 const fact=packet.workflow.facts.find(f=>f.input.category==='income')!;await services.workflow.saveFact(f.member.actor,prepared.applicationId,{...fact.input,factId:fact.id,value:{availability:'recorded',amountCentavos:2100000},reason:'New explicitly confirmed fictional amount.'},packet.workflow.version,randomUUID());
 expect(await member.getMemberPreparedReview(prepared.applicationId)).toEqual({state:'stale',message:expect.any(String)});expect(await client(f.f.officer).getPreparedReview(prepared.applicationId)).toEqual({state:'stale',message:expect.any(String)});
});
it('publishes a safe recommendation projection with a non-superuser definer and rejects forged inserts',async()=>{
 const prepared=await prepare(),officer=client(f.f.officer),packet=await officer.getPreparedReview(prepared.applicationId);if(packet.state!=='ready')throw new Error('Packet missing');
 await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agap_recording_definer_test') THEN CREATE ROLE agap_recording_definer_test NOLOGIN NOSUPERUSER NOBYPASSRLS;END IF;END $$;
 GRANT USAGE ON SCHEMA reviews,decisions,platform,identity,evidence,applications TO agap_recording_definer_test;
 GRANT CREATE ON SCHEMA reviews,decisions TO agap_recording_definer_test;
 GRANT SELECT,INSERT ON reviews.prepared_recommendations TO agap_recording_definer_test;
 GRANT SELECT ON applications.applications,decisions.streams,identity.staff_users TO agap_recording_definer_test;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA platform,evidence,decisions TO agap_recording_definer_test;
 ALTER FUNCTION reviews.project_prepared_recommendation() OWNER TO agap_recording_definer_test;
 ALTER FUNCTION decisions.prepared_recommendation(uuid) OWNER TO agap_recording_definer_test;`);
 try{await officer.recommendPilotOffer(prepared.applicationId,{assessmentId:packet.workflow.latestAssessment!.id,offerVersionId:alternative,inputVersion:packet.workflow.inputVersion,reason:'Reviewed fictional alternative and evidence limitations.'},{version:packet.workflow.version,idempotencyKey:randomUUID(),csrfToken:identity.csrfToken(f.f.officer.token)});expect((await client(f.member,true).getMemberPreparedReview(prepared.applicationId)).state).toBe('ready');const projection=await client(f.member,true).getMemberPreparedReview(prepared.applicationId);expect(projection.state==='ready'&&projection.recommendation?.offer.id).toBe(alternative);await expect(f.uow.run(f.f.officer.actor,tx=>tx.query('INSERT INTO reviews.prepared_recommendations SELECT * FROM reviews.prepared_recommendations LIMIT 1'))).rejects.toMatchObject({code:'42501'});}finally{await owner.query('ALTER FUNCTION reviews.project_prepared_recommendation() OWNER TO agap_owner;ALTER FUNCTION decisions.prepared_recommendation(uuid) OWNER TO agap_owner;');}
});

it.each(['source','policy'] as const)('invalidates a prepared packet after a %s change without relying on a workflow-version change',async change=>{
 const prepared=await prepare(),member=client(f.member,true),packet=await member.getMemberPreparedReview(prepared.applicationId);if(packet.state!=='ready')throw new Error('Packet missing');
 if(change==='source'){const source=packet.workflow.sources.find(s=>s.kind==='document')!;await owner.query("UPDATE evidence.processing SET message='Scanner unavailable; manual follow-up required' WHERE source_id=$1",[source.id]);}
 else{const policy=randomUUID();await owner.query('INSERT INTO credit.policies(id,organization_id,body) VALUES($1,$2,$3)',[policy,f.f.org,JSON.stringify(recordingPolicy(policy,randomUUID(),requested,alternative))]);}
 expect((await member.getMemberPreparedReview(prepared.applicationId)).state).toBe('stale');
});

it('leaves an ordinary application without a prepared packet on its existing workflow',async()=>{expect(await client(f.f.officer).getPreparedReview(f.application.id)).toEqual({state:'absent'});expect(await client(f.member,true).getMemberPreparedReview(f.application.id)).toEqual({state:'absent'});});
