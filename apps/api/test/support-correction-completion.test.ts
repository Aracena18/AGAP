import {randomUUID} from 'node:crypto';
import type {INestApplication} from '@nestjs/common';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createApp} from '../src/app.js';
import {IdentityService} from '../src/modules/identity/identity.service.js';
import {SupportCorrections} from '../src/modules/monitoring/support-expansion.service.js';
import {MemberPortalService,unavailableMemberDomains} from '../src/modules/member-portal/member-portal.service.js';
import {MemberApplicationsService} from '../src/modules/applications/member-applications.service.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,owner,identityPool,runtimePool,uow,prepareDatabase,resetFixtures,closePools} from './database.js';
import {memberFixture} from './member-fixtures.js';
import {supportPositionFixture} from './support-position-fixture.js';
let app:INestApplication,changed:INestApplication,base:string,changedBase:string,f:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>,other:typeof member,id:string;
const members=new PostgresMemberUnitOfWork(runtimePool),loans=new LoanReads(uow),monitoring=new MonitoringService(uow,loans);
const input=()=>({loanId:null,message:'Original fictional support words',contactPreference:'phone' as const,checkIn:{canMeetEssentials:'no' as const,borrowedToRepay:'declined' as const,financialStrain:'unavailable' as const},noticeVersion:config.PRIVACY_NOTICE_VERSION,sharingConfirmed:true as const});
const correction=()=>({...input(),message:'Corrected fictional support words',reason:'Member corrects the original wording'});
beforeAll(async()=>{await prepareDatabase();app=await createApp(config);changed=await createApp({...config,PRIVACY_NOTICE_VERSION:'fictional-updated-notice'});await app.listen(0,'127.0.0.1');await changed.listen(0,'127.0.0.1');base=await app.getUrl();changedBase=await changed.getUrl();});
beforeEach(async()=>{f=await resetFixtures();member=await memberFixture(f.officer.actor);other=await memberFixture(f.officer.actor);id=(await members.run(member.actor,tx=>monitoring.submit(tx,input(),randomUUID()))).id;});
afterAll(async()=>{await Promise.all([app?.close(),changed?.close()]);await closePools();});
async function call(path:string,o:{method?:string;body?:unknown;key?:string;token?:string;staff?:boolean;target?:string;csrf?:boolean}={}){
 const token=o.token??member.token,headers:Record<string,string>={Cookie:`${o.staff?'agap_session':'agap_member_session'}=${token}`,Origin:config.PUBLIC_ORIGIN};if(o.body!==undefined)headers['Content-Type']='application/json';if(o.key)headers['Idempotency-Key']=o.key;if(o.csrf!==false)headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);
 const r=await fetch(`${o.target??base}/api/v1${path}`,{method:o.method??'GET',headers,body:o.body===undefined?undefined:JSON.stringify(o.body)});return{status:r.status,body:await r.json()};
}
const source=(request=id,o:Parameters<typeof call>[1]={})=>call(`/member/support-requests/${request}/correction-source`,o);
const correct=(request=id,key=randomUUID(),body:unknown=correction(),target=base)=>call(`/member/support-requests/${request}/corrections`,{method:'POST',body,key,target});
describe('member correction completion with actual HTTP, identity and PostgreSQL',()=>{
 it('reads one owned source with explicit answers/contact and no internal notes or assignment metadata',async()=>{
  await monitoring.assign(f.administrator.actor,id,{officerId:f.officer.actor.userId,reason:'Private assignment reason'},1,randomUUID());
  await monitoring.respond(f.officer.actor,id,{response:'Published fictional response',internalNote:'SECRET private staff note',followUpDate:null},2,randomUUID());
  const r=await source();expect(r.status).toBe(200);expect(r.body).toEqual({request:{id,submittedAt:expect.any(String),status:'reviewed',message:input().message,response:'Published fictional response',checkIn:input().checkIn,loanId:null},contactPreference:'phone',links:{requestId:id,replacesId:null,replacedById:null},reason:null,sharingNoticeVersion:config.PRIVACY_NOTICE_VERSION});
  expect(JSON.stringify(r.body)).not.toMatch(/SECRET|Private assignment|assignedOfficer|branchId|internalNote/);
 });
 it('opens an old request independently of paged history and reads replacement links/reason one record at a time',async()=>{
  await members.run(member.actor,async tx=>{for(let n=0;n<105;n++)await monitoring.submit(tx,{...input(),message:`Fictional later history ${n}`},randomUUID());});
  const history=await call('/member/support-history');expect(history.body.data.items).toHaveLength(25);expect(history.body.data.items.some((r:{id:string})=>r.id===id)).toBe(false);expect((await source()).body.request.id).toBe(id);
  const first=await correct(),second=await correct(first.body.id);expect(first.status).toBe(201);expect(second.status).toBe(201);
  expect((await source()).body.links.replacedById).toBe(first.body.id);
  expect((await source(first.body.id)).body).toMatchObject({reason:correction().reason,links:{replacesId:id,replacedById:second.body.id}});
  expect((await source(second.body.id)).body.links).toEqual({requestId:second.body.id,replacesId:first.body.id,replacedById:null});
 });
 it('rechecks own-member linkage and excludes other members, organizations and staff',async()=>{
  expect((await source(id,{token:other.token})).status).toBe(404);expect((await source(randomUUID())).status).toBe(404);
  const foreign=await memberFixture(f.other.actor);expect((await source(id,{token:foreign.token})).status).toBe(404);
  expect((await source(id,{token:f.administrator.token,staff:true})).status).toBe(401);
  await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1',[member.linkId]);expect((await source()).status).toBe(401);
 });
 it('fails closed for corrupt cross-member links without exposing the other identifier',async()=>{
  const foreign=(await members.run(other.actor,tx=>monitoring.submit(tx,input(),randomUUID()))).id;
  await owner.query('INSERT INTO monitoring.corrections VALUES($1,$2,$3,$4)',[f.org,id,foreign,'Fictional corrupt import relationship']);
  const r=await source();expect(r.status).toBe(503);expect(JSON.stringify(r.body)).not.toContain(foreign);
 });
 it('rejects malformed saved source data and does not turn missing evidence into default answers',async()=>{
  const bad=randomUUID();await owner.query('INSERT INTO monitoring.requests(id,organization_id,member_id,branch_id) VALUES($1,$2,$3,$4)',[bad,f.org,member.record.id,f.branch]);
  expect((await source(bad)).status).toBe(503);
  await owner.query("INSERT INTO monitoring.disclosures(request_id,organization_id,message,contact_preference,notice_version,check_in) VALUES($1,$2,'Fictional incomplete check-in','portal',$3,'{}')",[bad,f.org,config.PRIVACY_NOTICE_VERSION]);
  expect((await source(bad)).status).toBe(503);
 });
 it('recovers an exact successful correction after the notice changes without creating another record',async()=>{
  const key=randomUUID(),first=await correct(id,key);expect(first.status).toBe(201);
  expect((await source(id,{target:changedBase})).body.sharingNoticeVersion).toBe('fictional-updated-notice');
  expect(await correct(id,key,correction(),changedBase)).toEqual(first);
  expect((await owner.query('SELECT count(*) FROM monitoring.requests')).rows[0].count).toBe('2');
  expect((await correct(id,key,{...correction(),reason:'Different body'},changedBase)).status).toBe(409);
  await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1',[member.linkId]);expect((await correct(id,key,correction(),changedBase)).status).toBe(401);
 });
 it('rejects a fresh old-notice correction and rolls back its provisional receipt',async()=>{
  const key=randomUUID(),r=await correct(id,key,correction(),changedBase);expect(r.status).toBe(409);expect(r.body.error.code).toBe('notice_changed');
  expect((await owner.query('SELECT count(*) FROM portal.commands WHERE scope=$1',[`support.correct:${key}`])).rows[0].count).toBe('0');
  expect((await correct(id,key,{...correction(),noticeVersion:'fictional-updated-notice'},changedBase)).status).toBe(201);
 });
 it('never calls the loan reader or correction writer during recovery-only requests',async()=>{
  const read=vi.fn(async()=>{throw Error('Loan reader must not run');}),recovery=new SupportCorrections({memberLoans:read}),key=randomUUID();
  await expect(members.run(member.actor,tx=>recovery.recover(tx,id,{...correction(),loanId:randomUUID()},key))).rejects.toMatchObject({status:409,code:'notice_changed'});expect(read).not.toHaveBeenCalled();
  const first=await correct(id,key);expect(await members.run(member.actor,tx=>recovery.recover(tx,id,correction(),key))).toEqual(first.body);expect(read).not.toHaveBeenCalled();
 });
 it('retains ID-only receipts, unchanged original/follow-ups and exactly one successor under competition',async()=>{
  await monitoring.assign(f.administrator.actor,id,{officerId:f.officer.actor.userId,reason:'Fictional support responsibility'},1,randomUUID());
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());await monitoring.respond(f.officer.actor,id,{response:'Original published reply',internalNote:'Private original action',followUpDate:date},2,randomUUID());
  const before=(await owner.query('SELECT * FROM monitoring.disclosures WHERE request_id=$1',[id])).rows[0],tasks=(await owner.query('SELECT * FROM monitoring.follow_ups WHERE request_id=$1',[id])).rows;
  const results=await Promise.all([correct(),correct()]);expect(results.map(r=>r.status).sort()).toEqual([201,409]);
  expect((await owner.query('SELECT * FROM monitoring.disclosures WHERE request_id=$1',[id])).rows[0]).toEqual(before);expect((await owner.query('SELECT * FROM monitoring.follow_ups WHERE request_id=$1',[id])).rows).toEqual(tasks);
  const receipt=(await owner.query("SELECT response FROM portal.commands WHERE scope LIKE 'support.correct:%'")).rows;expect(receipt).toHaveLength(1);expect(Object.keys(receipt[0].response)).toEqual(['id']);expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0');
 });
 it('keeps optional producer absence explicit and never bypasses old producer notice checks',async()=>{
  const called=vi.fn(),domains={...unavailableMemberDomains,correctSupport:called},portal=new MemberPortalService(members,new MemberApplicationsService(members,config.PRIVACY_NOTICE_VERSION),'fictional-updated-notice',domains);
  await expect(portal.supportCorrectionSource(member.actor,id)).rejects.toMatchObject({status:501});
  await expect(portal.correctSupport(member.actor,id,correction(),randomUUID())).rejects.toMatchObject({status:409,code:'notice_changed'});expect(called).not.toHaveBeenCalled();
 });
 it('does not grant raw disclosure/correction table access to the runtime role',async()=>{
  for(const sql of ['SELECT * FROM monitoring.disclosures','SELECT * FROM monitoring.corrections'])await expect(members.run(member.actor,tx=>tx.query(sql))).rejects.toMatchObject({code:'42501'});
  await expect(members.run(other.actor,tx=>tx.query('SELECT monitoring.correction_source($1)',[id]))).rejects.toMatchObject({code:'P0002'});
 });
 it('copies only a validated owned posted-loan position and never changes financial records',async()=>{
  const money=await supportPositionFixture(),corrector=new SupportCorrections(loans),before=(await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count;
  const body={...correction(),loanId:money.release.loan.id},key=randomUUID(),result=await members.run(money.memberActor,tx=>corrector.correct(tx,money.request.id,body,key));
  const saved=(await owner.query('SELECT position FROM monitoring.disclosures WHERE request_id=$1',[result.id])).rows[0].position;expect(saved).toMatchObject({loanId:money.release.loan.id,principalCentavos:1_000_000});
  expect((await source(result.id,{token:money.memberToken})).body.request.loanId).toBe(money.release.loan.id);expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe(before);
  const outage=new SupportCorrections({memberLoans:async()=>{throw Error('Fictional loan read outage');}});expect(await members.run(money.memberActor,tx=>outage.correct(tx,money.request.id,body,key))).toEqual(result);
 });
 it('rejects malformed or mismatched producer positions without retaining a correction receipt',async()=>{
  const money=await supportPositionFixture(),inventory=await members.run(money.memberActor,tx=>loans.memberLoans(tx));if(inventory.state!=='available')throw Error('Expected fictional posted loan');
  const key=randomUUID(),body={...correction(),loanId:money.release.loan.id},mismatch=new SupportCorrections({memberLoans:async()=>({...inventory,data:inventory.data.map(l=>({...l,position:{...l.position,loanId:randomUUID()}}))})});
  await expect(members.run(money.memberActor,tx=>mismatch.correct(tx,money.request.id,body,key))).rejects.toMatchObject({status:503});
  expect((await owner.query('SELECT count(*) FROM portal.commands WHERE scope=$1',[`support.correct:${key}`])).rows[0].count).toBe('0');
  const malformed=new SupportCorrections({memberLoans:async()=>({state:'available',data:[{id:money.release.loan.id}]}) as never});await expect(members.run(money.memberActor,tx=>malformed.correct(tx,money.request.id,body,key))).rejects.toMatchObject({status:503});
 });
});
