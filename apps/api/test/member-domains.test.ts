import { createHash,randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { createApp } from '../src/app.js';
import { unavailableMemberDomains } from '../src/modules/member-portal/member-portal.service.js';
import { MemberApplicationsService } from '../src/modules/applications/member-applications.service.js';
import { PostgresMemberUnitOfWork } from '../src/platform/member-database.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import type { MemberDomainPorts } from '../../../packages/contracts/src/ports.js';
import type { z } from 'zod';
import type { schemas } from '../../../packages/contracts/src/schemas.js';
import { config,owner,runtimePool,identityPool,prepareDatabase,resetFixtures,closePools } from './database.js';
import { memberFixture } from './member-fixtures.js';
type Output<K extends keyof typeof schemas>=z.output<(typeof schemas)[K]>;
let app:INestApplication,base:string,member:Awaited<ReturnType<typeof memberFixture>>,other:typeof member,application:Output<'MemberApplication'>;
let sources:Output<'MemberSource'>[],drafts:Output<'AiDraft'>[],uploads:{metadata:unknown;bytes:Buffer;actor:unknown;key:string}[],confirmations:unknown[],supportRequests:unknown[],downloadCalls:number,wrongSize:boolean;
let currentLoans:Output<'MemberLoan'>[];
const bytes=Buffer.from('%PDF-1.7\nFICTIONAL TEST DOCUMENT\n');
const domains:MemberDomainPorts={...unavailableMemberDomains,
  evidence:async()=>({state:'available',data:{sources,drafts}}),
  upload:async(tx,_id,metadata,stream,key)=>{const chunks:Buffer[]=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));uploads.push({metadata,bytes:Buffer.concat(chunks),actor:tx.actor,key});return sources[0];},
  download:async()=>{downloadCalls++;async function* content(){yield bytes;}return {metadata:{fileName:'fictional.pdf',mediaType:'application/pdf',size:bytes.byteLength+(wrongSize?1:0)},stream:content()};},
  confirm:async(tx,id,input,version,key)=>{confirmations.push({actor:tx.actor,id,input,version,key});return {id:randomUUID(),version:version+1};},
  loans:async()=>({state:'available',data:currentLoans}),
  requestSupport:async(tx,input,key)=>{supportRequests.push({actor:tx.actor,input,key});return {id:randomUUID(),submittedAt:new Date().toISOString(),status:'submitted',message:input.message,response:null};},
};
beforeAll(async()=>{await prepareDatabase();app=await createApp(config,domains);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{
  const fixture=await resetFixtures();member=await memberFixture(fixture.officer.actor);other=await memberFixture(fixture.officer.actor);
  application=await new MemberApplicationsService(new PostgresMemberUnitOfWork(runtimePool),config.PRIVACY_NOTICE_VERSION).create(member.actor,{purpose:'Fictional domain interface test',requestedPrincipalCentavos:100000,requestedTermMonths:3,currency:'PHP',noticeVersion:config.PRIVACY_NOTICE_VERSION,noticeAcknowledged:true},randomUUID());
  sources=[{id:randomUUID(),fileName:'fictional.pdf',state:'quarantined',version:1,verification:'not_checked'}];drafts=[];uploads=[];confirmations=[];supportRequests=[];downloadCalls=0;wrongSize=false;currentLoans=[];
});
afterAll(async()=>{await app?.close();await closePools();});
function headers(token=member.token){return {Cookie:`agap_member_session=${token}`,Origin:config.PUBLIC_ORIGIN,'X-CSRF-Token':new IdentityService(identityPool,config).csrfToken(token),'Idempotency-Key':randomUUID()};}
const url=(suffix:string)=>`${base}/api/v1/member/applications/${application.id}${suffix}`;
async function upload({size=bytes.byteLength,content=bytes,type='application/pdf',token=member.token}={}){return fetch(url('/documents'),{method:'POST',headers:{...headers(token),'Content-Type':type,'X-File-Name':encodeURIComponent('fictional.pdf'),'X-Upload-Size':String(size)},body:content});}
describe('member facade delegates to explicit domain ports',()=>{
  it('forwards bounded exact document bytes, server hash and the member context without asserting verification',async()=>{
    const result=await upload();expect(result.status).toBe(201);expect(await result.json()).toMatchObject({state:'quarantined',verification:'not_checked'});
    expect(uploads).toHaveLength(1);expect(uploads[0]).toMatchObject({metadata:{size:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex')},actor:{kind:'member',memberId:member.record.id}});expect(uploads[0].bytes).toEqual(bytes);
    expect((await owner.query('SELECT version FROM applications.applications WHERE id=$1',[application.id])).rows[0].version).toBe('1');
  });
  it('rejects incomplete, oversized, unsupported and other-member uploads before domain persistence',async()=>{
    expect((await upload({size:bytes.byteLength+1})).status).toBe(422);
    expect((await upload({size:bytes.byteLength-1})).status).toBe(413);
    expect((await upload({type:'image/svg+xml'})).status).toBe(422);
    expect((await upload({token:other.token})).status).toBe(404);
    expect(uploads).toHaveLength(0);
  });
  it('blocks quarantined files and another member, then downloads a cleared file as a private attachment',async()=>{
    const fileUrl=url(`/documents/${sources[0].id}`);
    expect((await fetch(fileUrl,{headers:headers()})).status).toBe(404);expect(downloadCalls).toBe(0);
    sources[0].state='cleared';
    expect((await fetch(fileUrl,{headers:headers(other.token)})).status).toBe(404);expect(downloadCalls).toBe(0);
    const result=await fetch(fileUrl,{headers:headers()});expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('no-store');expect(result.headers.get('content-disposition')).toMatch(/^attachment;/);expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
    wrongSize=true;expect((await fetch(fileUrl,{headers:headers()})).status).toBe(503);
  });
  it('keeps unavailable amounts and dates explicit when forwarding a source-versioned confirmation',async()=>{
    const body={draftId:randomUUID(),sourceId:sources[0].id,sourceVersion:1,action:'correct',value:{availability:'unavailable',reason:'Date and amount need clarification'},effectiveDate:null,reason:'Fictional member is unsure'};
    const result=await fetch(url('/confirmations'),{method:'POST',headers:{...headers(),'Content-Type':'application/json','If-Match':'"1"'},body:JSON.stringify(body)});expect(result.status).toBe(201);
    expect(confirmations).toEqual([expect.objectContaining({actor:expect.objectContaining({kind:'member',memberId:member.record.id}),input:body,version:1})]);
    const forged=await fetch(url('/confirmations'),{method:'POST',headers:{...headers(),'Content-Type':'application/json','If-Match':'"1"'},body:JSON.stringify({...body,verified:true})});expect(forged.status).toBe(422);expect(confirmations).toHaveLength(1);
  });
  it('requires confirmed sharing, validates any loan reference and leaves financial records unchanged',async()=>{
    const body={loanId:null,message:'Fictional request for a conversation',contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION};
    const send=(data:unknown)=>fetch(`${base}/api/v1/member/support-requests`,{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify(data)});
    expect((await send({...body,sharingConfirmed:false})).status).toBe(422);expect((await send({...body,loanId:randomUUID()})).status).toBe(404);
    const result=await send(body);expect(result.status).toBe(201);expect(await result.json()).toMatchObject({status:'submitted',response:null});expect(supportRequests).toHaveLength(1);
    expect((await owner.query('SELECT status,version FROM applications.applications WHERE id=$1',[application.id])).rows[0]).toEqual({status:'draft',version:'1'});
  });
  it('does not allow an unversioned or fabricated acceptance when approved terms are unavailable',async()=>{
    const body={decisionId:randomUUID(),documentVersionId:randomUUID(),acknowledgment:true};
    const send=(version?:string)=>fetch(url('/acceptances'),{method:'POST',headers:{...headers(),'Content-Type':'application/json',...(version?{'If-Match':version}:{})},body:JSON.stringify(body)});
    expect((await send()).status).toBe(428);expect((await send('"1"')).status).toBe(501);
  });
  it('refuses AI suggestions without provenance and refuses a draft from an uncleared source',async()=>{
    drafts=[{id:randomUUID(),origin:'model',provenance:null,source:{sourceId:sources[0].id,sourceVersion:1,excerpt:'Fictional uncertain expense'},value:{availability:'unavailable',reason:'Unknown'},question:'Does this apply?',state:'suggested'}];
    expect((await fetch(url('/evidence'),{headers:headers()})).status).toBe(503);
    drafts[0].origin='simulated';expect((await fetch(url('/evidence'),{headers:headers()})).status).toBe(503);
  });
});
