import { mkdtemp,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll,beforeAll,beforeEach,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { GuidanceService } from '../src/modules/evidence/guidance.service.js';
import { WorkflowService } from '../src/modules/evidence/workflow.service.js';
import { PostgresMemberUnitOfWork } from '../src/platform/member-database.js';
import { ApplicationsService } from '../src/modules/applications/applications.service.js';
import { MembersService } from '../src/modules/members/members.service.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { owner,runtimePool,identityPool,uow,config,prepareDatabase,resetFixtures,closePools } from './database.js';
import { memberFixture } from './member-fixtures.js';
import { guidanceFixture } from './guidance-fixture.js';
import { clarifiedFact,type GuidanceResponseType } from '../../../packages/contracts/src/guidance.js';
let directory:string;
let fixture:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>,application:{id:string},draft:Awaited<ReturnType<typeof guidanceFixture>>,app:INestApplication,base:string;
const workflow=new WorkflowService(uow,new PostgresMemberUnitOfWork(runtimePool),false,true),guidance=new GuidanceService(workflow);
beforeAll(async()=>{await prepareDatabase();directory=await mkdtemp(join(tmpdir(),'agap-guidance-'));process.env.DOCUMENT_DIRECTORY=directory;app=await createApp({...config,EVIDENCE_WORKFLOW_ENABLED:true});await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{fixture=await resetFixtures();member=await memberFixture(fixture.officer.actor);application=await new ApplicationsService(uow,new MembersService(uow,config.PRIVACY_NOTICE_VERSION)).create(fixture.officer.actor,{memberId:member.record.id,purpose:'Fictional response guidance',requestedPrincipalCentavos:100000,requestedTermMonths:1,currency:'PHP'},randomUUID());draft=await guidanceFixture(fixture.org,application.id);});
afterAll(async()=>{await app?.close();await closePools();if(directory)await rm(directory,{recursive:true,force:true});delete process.env.DOCUMENT_DIRECTORY;});
function body(view:GuidanceResponseType,field:string,answer:unknown){const item=view.items[0];return {draftId:item.draftId,questionId:item.questions.find(q=>q.field===field)!.id,sourceVersion:item.source.sourceVersion,textVersionId:item.textVersionId,applicationVersion:view.applicationVersion,answer};}
async function req(data?:unknown,version?:number,key=randomUUID(),token=member.token,staff=false){return fetch(`${base}/api/v1${staff?'':'/member'}/applications/${application.id}/guidance${data?'/responses':''}`,{method:data?'POST':'GET',headers:{Cookie:`${staff?'agap_session':'agap_member_session'}=${token}`,Origin:config.PUBLIC_ORIGIN,'X-CSRF-Token':new IdentityService(identityPool,config).csrfToken(token),'Content-Type':'application/json','Idempotency-Key':key,...(version?{'If-Match':`"${version}"`}:{})},body:data?JSON.stringify(data):undefined});}
it('saves unknown and declined responses through HTTP without accepting a draft or changing financial inputs, with exact retry',async()=>{
 const first=await(await req()).json() as GuidanceResponseType,key=randomUUID(),input=body(first,'cashDates',{status:'unknown',value:null});
 const saved=await req(input,first.version,key);expect(saved.status).toBe(201);const receipt=await saved.json();expect(await(await req(input,first.version,key)).json()).toEqual(receipt);
 const next=await guidance.read(member.actor,application.id);expect(next.items[0].questions.find(q=>q.field==='cashDates')?.answer).toEqual({status:'unknown',value:null});
 expect((await req(body(next,'amount',{status:'declined',value:null}),next.version)).status).toBe(201);
 const current=await workflow.view(member.actor,application.id);expect(current).toMatchObject({version:1,inputVersion:1,facts:[]});expect(current.drafts[0].state).toBe('suggested');expect((await guidance.read(fixture.officer.actor,application.id)).history).toHaveLength(2);
 await expect(owner.query("UPDATE evidence.clarifications SET body='{}'")).rejects.toThrow('immutable');
});
it('rejects wrong control values, stale revisions, changed request keys and stale application context',async()=>{
 const first=await guidance.read(member.actor,application.id),input=body(first,'amount',{status:'answered',value:'not money'});expect((await req(input,first.version)).status).toBe(422);
 const valid=body(first,'amount',{status:'answered',value:50000}),key=randomUUID();expect((await req(valid,first.version,key)).status).toBe(201);
 expect((await req({...valid,answer:{status:'answered',value:60000}},first.version,key)).status).toBe(409);
 expect((await req(body(first,'relevance',{status:'answered',value:'included'}),first.version)).status).toBe(412);
 const next=await guidance.read(member.actor,application.id);expect((await req({...body(next,'relevance',{status:'answered',value:'included'}),applicationVersion:2},next.version)).status).toBe(412);
});
it('denies cross-member, other-organization, auditor writes and revoked member linkage',async()=>{
 const first=await guidance.read(member.actor,application.id),other=await memberFixture(fixture.officer.actor);
 expect((await req(undefined,undefined,randomUUID(),other.token)).status).toBe(404);
 expect((await req(body(first,'amount',{status:'unknown',value:null}),1,randomUUID(),other.token)).status).toBe(404);
 expect((await req(undefined,undefined,randomUUID(),fixture.other.token,true)).status).toBe(404);
 expect((await req(body(first,'amount',{status:'unknown',value:null}),1,randomUUID(),fixture.auditor.token,true)).status).toBe(409);
 await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1',[member.linkId]);expect((await req()).status).toBe(401);
});
it('preserves earlier answers when text changes and prevents confirmation from a stale source',async()=>{
 const first=await guidance.read(member.actor,application.id);await req(body(first,'amount',{status:'answered',value:50000}),1);
 await owner.query("UPDATE evidence.processing SET state='blocked',pages='[]' WHERE source_id=$1",[draft.source.sourceId]);
 const changed=await guidance.read(member.actor,application.id);expect(changed.history).toHaveLength(1);expect(changed.items[0]).toMatchObject({current:false,actions:['inspect_source']});
 expect((await req(body(changed,'relevance',{status:'answered',value:'included'}),changed.version)).status).toBe(409);
});
it('serializes concurrent answers and confirms complete reviewed information only through the existing command',async()=>{
 let view=await guidance.read(member.actor,application.id);const race=await Promise.all([req(body(view,'relevance',{status:'answered',value:'included'}),1),req(body(view,'amount',{status:'answered',value:50000}),1)]);expect(race.map(r=>r.status).sort()).toEqual([201,412]);
 const values:Record<string,unknown>={relevance:'included',amount:50000,effectiveDate:'2026-11-01',cashDates:['2026-11-20'],coverageStart:'2026-11-01',coverageEnd:'2026-11-30'};
 for(const field of Object.keys(values)){view=await guidance.read(member.actor,application.id);await guidance.respond(member.actor,application.id,body(view,field,{status:'answered',value:values[field]}),view.version,randomUUID());}
 view=await guidance.read(member.actor,application.id);const fact=clarifiedFact(draft,view.items[0].questions,'Member explicitly confirmed this one-time expense and the November coverage.');expect(fact?.cashDates).toEqual(['2026-11-20']);
 await expect(workflow.review(member.actor,application.id,{draftId:draft.id,action:'confirm',fact,reason:fact!.reason},view.applicationVersion,randomUUID())).rejects.toMatchObject({status:412,code:'guidance_changed'});
 await guidance.respond(member.actor,application.id,body(view,'amount',{status:'answered',value:50000}),view.version,randomUUID());
 await expect(workflow.review(member.actor,application.id,{draftId:draft.id,action:'confirm',fact,reason:fact!.reason,guidanceVersion:view.version},view.applicationVersion,randomUUID())).rejects.toMatchObject({status:412,code:'guidance_changed'});
 view=await guidance.read(member.actor,application.id);
 await workflow.review(member.actor,application.id,{draftId:draft.id,action:'confirm',fact,reason:fact!.reason,guidanceVersion:view.version},view.applicationVersion,randomUUID());
 const confirmed=await workflow.view(member.actor,application.id);expect(confirmed.facts).toHaveLength(1);expect(confirmed.inputVersion).toBe(2);expect((await guidance.read(member.actor,application.id)).items[0].actions).toEqual(['inspect_source']);
});
