import {randomUUID} from 'node:crypto';
import type {INestApplication} from '@nestjs/common';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createApp} from '../src/app.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {MemberPortalService,unavailableMemberDomains} from '../src/modules/member-portal/member-portal.service.js';
import {MemberApplicationsService} from '../src/modules/applications/member-applications.service.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,owner,prepareDatabase,resetFixtures,closePools,runtimePool,uow} from './database.js';
import {memberFixture} from './member-fixtures.js';

let app:INestApplication,base:string,f:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>,other:typeof member,foreign:typeof member;
const members=new PostgresMemberUnitOfWork(runtimePool),monitoring=new MonitoringService(uow,new LoanReads(uow));
beforeAll(async()=>{await prepareDatabase();app=await createApp(config);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{f=await resetFixtures();member=await memberFixture(f.officer.actor);other=await memberFixture(f.officer.actor);foreign=await memberFixture(f.other.actor);});
afterAll(async()=>{await app?.close();await closePools();});
async function page(query='',token=member.token,cookie='agap_member_session'){
 const response=await fetch(`${base}/api/v1/member/support-history${query}`,{headers:{Cookie:`${cookie}=${token}`}});return{status:response.status,body:await response.json()};
}
async function populate(count:number,person=member){return members.run(person.actor,async tx=>{
 const rows=[];for(let i=0;i<count;i++)rows.push(await monitoring.submit(tx,{loanId:null,message:`Fictional member history request ${i+1}.`,contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION,checkIn:{canMeetEssentials:'unavailable',borrowedToRepay:'declined',financialStrain:'reported'}},randomUUID()));return rows;
});}
describe('own-member support history paging',()=>{
 it('distinguishes empty, 24, 25 and 26 records and makes completion explicit',async()=>{
  expect((await page()).body).toEqual({state:'available',data:{items:[],nextCursor:null}});
  await populate(24);let result=await page();expect(result.body.data.items).toHaveLength(24);expect(result.body.data.nextCursor).toBeNull();
  await populate(1);result=await page();expect(result.body.data.items).toHaveLength(25);expect(result.body.data.nextCursor).toBeNull();
  await populate(1);result=await page();expect(result.body.data.items).toHaveLength(25);expect(result.body.data.nextCursor).toBe(result.body.data.items.at(-1).id);
  const last=await page(`?cursor=${result.body.data.nextCursor}`);expect(last.body.data.items).toHaveLength(1);expect(last.body.data.nextCursor).toBeNull();
 });
 it('reads all 125 requests without skips or duplicates despite a newer submission between pages',async()=>{
  const submitted=await populate(125),first=await page(),newest=(await populate(1))[0],items=[...first.body.data.items];let cursor=first.body.data.nextCursor;
  while(cursor){const next=await page(`?cursor=${cursor}`);expect(next.status).toBe(200);items.push(...next.body.data.items);cursor=next.body.data.nextCursor;}
  expect(items.map(item=>item.id)).toEqual(submitted.map(item=>item.id).reverse());expect(new Set(items.map(item=>item.id)).size).toBe(125);expect(items.some(item=>item.id===newest.id)).toBe(false);
  expect((await page()).body.data.items[0].id).toBe(newest.id);
  const legacy=await fetch(`${base}/api/v1/member/support-requests`,{headers:{Cookie:`agap_member_session=${member.token}`}});expect(legacy.status).toBe(422);
 });
 it('uses request ID to break exact submission timestamp ties',async()=>{
  const submitted=await populate(30);await owner.query("UPDATE monitoring.requests SET submitted_at='2026-11-01T00:00:00.123456Z' WHERE member_id=$1",[member.record.id]);
  const first=await page('?limit=13'),next=await page(`?limit=13&cursor=${first.body.data.nextCursor}`),last=await page(`?cursor=${next.body.data.nextCursor}`);
  expect([...first.body.data.items,...next.body.data.items,...last.body.data.items].map(item=>item.id)).toEqual(submitted.map(item=>item.id).sort().reverse());expect(last.body.data.nextCursor).toBeNull();
 });
 it('checks cursor ownership, bounded limits, malformed fields and missing cursors without disclosing existence',async()=>{
  await populate(2);const [outside]=await populate(1,other),[abroad]=await populate(1,foreign);
  for(const id of [outside.id,abroad.id,randomUUID()]){const result=await page(`?cursor=${id}`);expect(result.status).toBe(422);expect(result.body.error.code).toBe('invalid_history_cursor');}
  for(const query of ['?cursor=bad','?limit=0','?limit=101','?limit=1.5','?memberId='+other.record.id,'?throughVersion=1'])expect((await page(query)).status).toBe(422);
  expect((await page('?limit=100')).body.data.items).toHaveLength(2);
 });
 it('keeps other accounts and private staff/task/assignment fields out of every page',async()=>{
  const [request]=await populate(1);await populate(1,other);await populate(1,foreign);
  await monitoring.assign(f.administrator.actor,request.id,{officerId:f.officer.actor.userId,reason:'PRIVATE assignment reason'},1,randomUUID());
  await monitoring.respondPaged(f.officer.actor,request.id,{response:'Published fictional response.',internalNote:'PRIVATE internal action',followUpDate:'2099-01-01'},2,randomUUID());
  const task=(await owner.query('SELECT id FROM monitoring.follow_ups WHERE request_id=$1',[request.id])).rows[0];await monitoring.followUps.complete(f.officer.actor,task.id,{note:'PRIVATE completed task'},1,randomUUID());
  const result=await page();expect(result.status).toBe(200);expect(result.body.data.items).toHaveLength(1);expect(result.body.data.items[0]).toMatchObject({id:request.id,response:'Published fictional response.',status:'reviewed',checkIn:{borrowedToRepay:'declined'}});
  const serialized=JSON.stringify(result.body);expect(serialized).not.toContain('PRIVATE');expect(serialized).not.toContain('assignedOfficerId');expect(serialized).not.toContain('internalNote');
  expect((await page('',other.token)).body.data.items).toHaveLength(1);expect((await page('',foreign.token)).body.data.items).toHaveLength(1);
 });
 it('requires member authentication and rechecks active linkage and session expiry between pages',async()=>{
  await populate(26);const first=await page();expect(first.body.data.nextCursor).toBeTruthy();
  for(const token of [f.officer.token,f.administrator.token])expect((await page('',token,'agap_session')).status).toBe(401);
  expect((await fetch(`${base}/api/v1/member/support-history`)).status).toBe(401);
  await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1',[member.actor.linkId]);expect((await page(`?cursor=${first.body.data.nextCursor}`)).status).toBe(401);
  await owner.query("UPDATE identity.member_sessions SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE link_id=$1",[other.actor.linkId]);expect((await page('',other.token)).status).toBe(401);
 });
 it('returns explicit unavailable when an injected producer lacks paging instead of calling the legacy reader',async()=>{
  const legacy=vi.fn(async()=>({state:'available' as const,data:[]}));
  const portal=new MemberPortalService(members,new MemberApplicationsService(members,config.PRIVACY_NOTICE_VERSION),config.PRIVACY_NOTICE_VERSION,{...unavailableMemberDomains,support:legacy});
  expect(await portal.supportHistory(member.actor,{})).toMatchObject({state:'unavailable'});expect(legacy).not.toHaveBeenCalled();
 });
 it('rejects a producer response with undeclared private fields before it can reach the client',async()=>{
  const portal=new MemberPortalService(members,new MemberApplicationsService(members,config.PRIVACY_NOTICE_VERSION),config.PRIVACY_NOTICE_VERSION,{...unavailableMemberDomains,supportPage:async()=>({state:'available',data:{items:[],nextCursor:null,internalNote:'PRIVATE malformed producer'}})});
  await expect(portal.supportHistory(member.actor,{})).rejects.toMatchObject({status:503});
 });
});
