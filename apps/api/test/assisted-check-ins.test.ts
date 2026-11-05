import {randomUUID} from 'node:crypto';
import type {INestApplication} from '@nestjs/common';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createApp} from '../src/app.js';
import {IdentityService} from '../src/modules/identity/identity.service.js';
import {AssistedCheckInsService} from '../src/modules/monitoring/assisted-check-ins.service.js';
import {MemberPortalService,unavailableMemberDomains} from '../src/modules/member-portal/member-portal.service.js';
import {MemberApplicationsService} from '../src/modules/applications/member-applications.service.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,owner,identityPool,runtimePool,uow,prepareDatabase,resetFixtures,closePools} from './database.js';
import {memberFixture} from './member-fixtures.js';
import {supportPositionFixture} from './support-position-fixture.js';
let app:INestApplication,base:string,f:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>,other:typeof member,source:string;
const members=new PostgresMemberUnitOfWork(runtimePool),loans=new LoanReads(uow);
const content=()=>({message:'Fictional staff-prepared member words. Please arrange a conversation.',contactPreference:'portal' as const,checkIn:{canMeetEssentials:'no' as const,borrowedToRepay:'declined' as const,financialStrain:'reported' as const}});
beforeAll(async()=>{await prepareDatabase();app=await createApp(config);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{
 f=await resetFixtures();member=await memberFixture(f.officer.actor);other=await memberFixture(f.officer.actor);
 const monitoring=new MonitoringService(uow,loans),request=await members.run(member.actor,tx=>monitoring.submit(tx,{...content(),message:'Original fictional member concern',loanId:null,sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION},randomUUID()));source=request.id;
 await monitoring.assign(f.administrator.actor,source,{officerId:f.officer.actor.userId,reason:'Fictional assigned support officer'},1,randomUUID());
});
afterAll(async()=>{await app?.close();await closePools();});
async function call(path:string,o:{method?:string;body?:unknown;key?:string;version?:number;token?:string;staff?:boolean;csrf?:boolean}={}){
 const token=o.token??member.token,headers:Record<string,string>={Cookie:`${o.staff?'agap_session':'agap_member_session'}=${token}`,Origin:config.PUBLIC_ORIGIN};
 if(o.body!==undefined)headers['Content-Type']='application/json';if(o.key)headers['Idempotency-Key']=o.key;if(o.version)headers['If-Match']=`"${o.version}"`;
 if(o.csrf!==false)headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);
 const r=await fetch(`${base}/api/v1${path}`,{method:o.method??'GET',headers,body:o.body===undefined?undefined:JSON.stringify(o.body)});return{status:r.status,body:await r.json()};
}
const staff=(token=f.officer.token)=>({staff:true,token});
async function prepare(key=randomUUID()){const r=await call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:content(),version:2,key});expect(r.status).toBe(201);return r.body as {id:string;version:number;state:string;resultingRequestId:string|null};}
async function read(id:string){const r=await call(`/member/assisted-check-ins/${id}`);expect(r.status).toBe(200);return r.body;}
async function confirm(id:string,options:{version?:number;key?:string;body?:unknown}={}){const current=await read(id);return call(`/member/assisted-check-ins/${id}/confirmations`,{method:'POST',body:options.body??{sharingConfirmed:true,noticeVersion:current.noticeVersion,payloadSha256:current.payloadSha256},version:options.version??current.version,key:options.key??randomUUID()});}
async function revise(id:string,version=1,key=randomUUID()){return call(`/support-assisted-check-ins/${id}/revisions`,{...staff(),method:'POST',body:{...content(),message:'Revised fictional member words'},version,key});}
async function reassignAwayAndBack(){
 const user=randomUUID();await owner.query("INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$1::uuid::text,'Other branch officer',$4,ARRAY['officer'])",[user,f.org,config.OIDC_ISSUER,[f.branch]]);
 const monitoring=new MonitoringService(uow,loans);await monitoring.assign(f.administrator.actor,source,{officerId:user,reason:'Fictional reassignment'},2,randomUUID());await monitoring.assign(f.administrator.actor,source,{officerId:f.officer.actor.userId,reason:'Fictional return assignment'},3,randomUUID());
}
describe('fictional assisted check-ins through actual API and PostgreSQL',()=>{
 it('keeps drafts out of confirmed history/counts and creates a new unassigned request only after member confirmation',async()=>{
  const draft=await prepare();expect(draft).toMatchObject({version:1,state:'pending',resultingRequestId:null});
  expect((await call('/member/support-requests')).body.data).toHaveLength(1);
  const current=await read(draft.id);expect(current).toMatchObject({fictional:true,sourceRequestId:source,content:{...content(),loanId:null},confirmationAllowed:true});
  expect((await owner.query('SELECT count(*) FROM monitoring.disclosures')).rows[0].count).toBe('1');
  const result=await confirm(draft.id);expect(result.status).toBe(201);expect(result.body).toMatchObject({id:draft.id,version:2,state:'confirmed'});
  const next=(await owner.query('SELECT * FROM monitoring.requests WHERE id=$1',[result.body.resultingRequestId])).rows[0];expect(next).toMatchObject({assigned_officer_id:null,status:'submitted',version:'1',member_id:member.record.id});
  const original=(await owner.query('SELECT * FROM monitoring.requests WHERE id=$1',[source])).rows[0];expect(original).toMatchObject({version:'2',status:'assigned',assigned_officer_id:f.officer.actor.userId});
  const history=await call('/member/support-requests');expect(history.body.data).toHaveLength(2);expect(history.body.data.find((r:{id:string})=>r.id===next.id)).toMatchObject({message:content().message,checkIn:content().checkIn,response:null});
  const provenance=(await owner.query('SELECT * FROM monitoring.assisted_check_in_revisions WHERE draft_id=$1 AND version=2',[draft.id])).rows[0];expect(provenance).toMatchObject({staff_id:null,member_id:member.record.id,member_link_id:member.actor.linkId,member_session_id:member.actor.sessionId,confirmation_method:'member_session',resulting_request_id:next.id});
  expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0');expect((await owner.query('SELECT count(*) FROM servicing.postings')).rows[0].count).toBe('0');
 });
 it('keeps generic command receipts and audit/outbox metadata free of private draft content',async()=>{
  const draft=await prepare();await confirm(draft.id);
  for(const table of ['platform.idempotency','portal.commands','platform.audit_events','portal.events','platform.outbox']){
   const data=JSON.stringify((await owner.query(`SELECT * FROM ${table}${table==='portal.commands'?" WHERE scope LIKE 'support.assisted.%'":''}`)).rows);expect(data).not.toContain(content().message);expect(data).not.toContain('canMeetEssentials');
  }
 });
 it('replays an exact preparation and confirmation once, including after later state changes',async()=>{
  const key=randomUUID(),draft=await prepare(key);expect(await prepare(key)).toEqual(draft);
  const current=await read(draft.id),body={sharingConfirmed:true,noticeVersion:current.noticeVersion,payloadSha256:current.payloadSha256},confirmKey=randomUUID();
  const first=await confirm(draft.id,{body,version:1,key:confirmKey});expect(first.status).toBe(201);
  const replay=await confirm(draft.id,{body,version:1,key:confirmKey});expect(replay).toEqual(first);
  expect((await owner.query('SELECT count(*) FROM monitoring.requests')).rows[0].count).toBe('2');
  const conflict=await confirm(draft.id,{body:{...body,payloadSha256:'a'.repeat(64)},version:1,key:confirmKey});expect(conflict.status).toBe(409);
 });
 it('requires a new review after revision and preserves every older version',async()=>{
  const draft=await prepare(),old=await read(draft.id);expect((await revise(draft.id)).status).toBe(201);
  expect((await confirm(draft.id,{version:1,body:{sharingConfirmed:true,noticeVersion:old.noticeVersion,payloadSha256:old.payloadSha256}})).status).toBe(412);
  expect((await confirm(draft.id,{version:2,body:{sharingConfirmed:true,noticeVersion:old.noticeVersion,payloadSha256:old.payloadSha256}})).status).toBe(409);
  const current=await read(draft.id);expect(current.content.message).toBe('Revised fictional member words');expect(current.payloadSha256).not.toBe(old.payloadSha256);
  expect((await confirm(draft.id)).status).toBe(201);
  const revisions=(await owner.query('SELECT content FROM monitoring.assisted_check_in_revisions WHERE draft_id=$1 ORDER BY version',[draft.id])).rows;expect(revisions).toHaveLength(3);expect(revisions[0].content.message).toBe(content().message);
 });
 it('allows member decline, staff withdrawal and safe exact replays without creating a concern',async()=>{
  const draft=await prepare(),key=randomUUID(),path=`/member/assisted-check-ins/${draft.id}/declines`,options={method:'POST',body:{},version:1,key};
  const declined=await call(path,options);expect(declined.status).toBe(201);expect(declined.body.state).toBe('declined');expect(await call(path,options)).toEqual(declined);
  expect((await confirm(draft.id)).status).toBe(409);
  const next=await prepare(),withdrawKey=randomUUID(),withdrawPath=`/support-assisted-check-ins/${next.id}/withdrawals`,withdrawOptions={...staff(),method:'POST',body:{reason:'Private fictional withdrawal reason'},version:1,key:withdrawKey};
  const withdrawn=await call(withdrawPath,withdrawOptions);expect(withdrawn.status).toBe(201);expect(withdrawn.body.state).toBe('withdrawn');expect(await call(withdrawPath,withdrawOptions)).toEqual(withdrawn);
  expect(JSON.stringify(await read(next.id))).not.toContain('Private fictional withdrawal reason');expect((await owner.query('SELECT count(*) FROM monitoring.requests')).rows[0].count).toBe('1');
 });
 it('prevents duplicate pending drafts and accepts one concurrent creation',async()=>{
  const results=await Promise.all([1,2].map(()=>call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:content(),version:2,key:randomUUID()})));expect(results.map(r=>r.status).sort()).toEqual([201,409]);
  expect((await owner.query('SELECT count(*) FROM monitoring.assisted_check_ins')).rows[0].count).toBe('1');
 });
 it('serializes confirmation against revision/withdrawal and creates at most one new request',async()=>{
  const draft=await prepare(),old=await read(draft.id),body={sharingConfirmed:true,noticeVersion:old.noticeVersion,payloadSha256:old.payloadSha256};
  const results=await Promise.all([confirm(draft.id,{body,version:1}),revise(draft.id)]);expect(results.map(r=>r.status).sort()).toEqual([201,412]);
  const count=Number((await owner.query('SELECT count(*) FROM monitoring.requests')).rows[0].count);expect(count).toBe(results[0].status===201?2:1);
 });
 it('does not revive stale authority when reassigned away and back, but still lets the member decline',async()=>{
  const draft=await prepare();await reassignAwayAndBack();
  const own=await read(draft.id);expect(own.confirmationAllowed).toBe(false);expect((await confirm(draft.id)).status).toBe(409);
  expect((await call(`/support-assisted-check-ins/${draft.id}`,staff())).status).toBe(404);
  const fresh=await call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:content(),version:4,key:randomUUID()});expect(fresh.status).toBe(201);
  expect((await call(`/member/assisted-check-ins/${draft.id}/declines`,{method:'POST',body:{},version:1,key:randomUUID()})).status).toBe(201);
 });
 it('invalidates pending drafts when staff access changes, including revoke then reactivate',async()=>{
  const draft=await prepare();await owner.query('UPDATE identity.staff_users SET active=false,version=version+1 WHERE id=$1',[f.officer.actor.userId]);expect((await read(draft.id)).confirmationAllowed).toBe(false);
  await owner.query('UPDATE identity.staff_users SET active=true,version=version+1 WHERE id=$1',[f.officer.actor.userId]);expect((await confirm(draft.id)).status).toBe(409);
 });
 it('rechecks the owning member link before receipt replay',async()=>{
  const draft=await prepare(),current=await read(draft.id),key=randomUUID(),body={sharingConfirmed:true,noticeVersion:current.noticeVersion,payloadSha256:current.payloadSha256};expect((await confirm(draft.id,{body,version:1,key})).status).toBe(201);
  await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1',[member.linkId]);expect((await call(`/member/assisted-check-ins/${draft.id}/confirmations`,{method:'POST',body,version:1,key})).status).toBe(401);
 });
 it('denies other members, organizations, roles and administrator private reads',async()=>{
  const draft=await prepare();expect((await call('/member/assisted-check-ins',{token:other.token})).body.items).toEqual([]);
  for(const endpoint of [`/member/assisted-check-ins/${draft.id}`,`/member/assisted-check-ins/${draft.id}/confirmations`])expect((await call(endpoint,{token:other.token,...(endpoint.endsWith('confirmations')?{method:'POST',body:{sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION,payloadSha256:'a'.repeat(64)},version:1,key:randomUUID()}:{} )})).status).toBe(404);
  for(const token of [f.administrator.token,f.auditor.token])expect((await call(`/support-assisted-check-ins/${draft.id}`,staff(token))).status).toBe(403);
  expect((await call(`/support-assisted-check-ins/${draft.id}`,staff(f.other.token))).status).toBe(404);
  expect((await call(`/support-assisted-check-ins/${draft.id}`,{token:member.token})).status).toBe(401);
 });
 it('never includes internal response notes and never accepts member, actor or loan selection',async()=>{
  await new MonitoringService(uow,loans).respond(f.officer.actor,source,{response:'Public fictional response',internalNote:'SECRET internal response note',followUpDate:null},2,randomUUID());
  const prepared=await call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:content(),version:3,key:randomUUID()});expect(prepared.status).toBe(201);expect(JSON.stringify(await read(prepared.body.id))).not.toContain('SECRET');
  for(const field of ['memberId','actor','loanId','internalNote'])expect((await call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:{...content(),[field]:randomUUID()},version:3,key:randomUUID()})).status).toBe(422);
 });
 it('requires version, CSRF, explicit sharing and all stated check-in answers',async()=>{
  expect((await call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:content(),key:randomUUID()})).status).toBe(428);
  expect((await call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:content(),version:2,key:randomUUID(),csrf:false})).status).toBe(403);
  expect((await call(`/support-requests/${source}/assisted-check-ins`,{...staff(),method:'POST',body:{...content(),checkIn:{}},version:2,key:randomUUID()})).status).toBe(422);
  const draft=await prepare();expect((await confirm(draft.id,{body:{sharingConfirmed:false,noticeVersion:config.PRIVACY_NOTICE_VERSION,payloadSha256:'a'.repeat(64)}})).status).toBe(422);
 });
 it('pages exact member-owned cursor boundaries and rejects foreign or oversized requests',async()=>{
  const ids:string[]=[];for(let i=0;i<4;i++){const draft=await prepare();ids.push(draft.id);await call(`/support-assisted-check-ins/${draft.id}/withdrawals`,{...staff(),method:'POST',body:{reason:'Fictional pagination fixture'},version:1,key:randomUUID()});}
  const first=await call('/member/assisted-check-ins?limit=2');expect(first.body.items).toHaveLength(2);expect(first.body.nextCursor).toBe(first.body.items[1].id);
  const next=await call(`/member/assisted-check-ins?limit=2&cursor=${first.body.nextCursor}`);expect(next.body.items).toHaveLength(2);expect(next.body.nextCursor).toBeNull();expect(new Set([...first.body.items,...next.body.items].map((d:{id:string})=>d.id))).toEqual(new Set(ids));
  expect((await call(`/member/assisted-check-ins?cursor=${ids[0]}`,{token:other.token})).status).toBe(422);expect((await call('/member/assisted-check-ins?limit=26')).status).toBe(422);
  expect((await call(`/support-requests/${source}/assisted-check-ins?limit=2`,staff())).body.items).toHaveLength(2);
 });
 it('makes revisions and original identity immutable and grants runtime no raw tables or private helpers',async()=>{
  const draft=await prepare();await expect(owner.query('UPDATE monitoring.assisted_check_in_revisions SET content=$2 WHERE draft_id=$1',[draft.id,'{}'])).rejects.toMatchObject({code:'42501'});
  await expect(owner.query('DELETE FROM monitoring.assisted_check_ins WHERE id=$1',[draft.id])).rejects.toMatchObject({code:'42501'});
  await expect(owner.query('UPDATE monitoring.assisted_check_ins SET prepared_by_name=$2 WHERE id=$1',[draft.id,'Changed'])).rejects.toMatchObject({code:'42501'});
  for(const sql of ['SELECT * FROM monitoring.assisted_check_ins','SELECT * FROM monitoring.assisted_check_in_revisions',`SELECT monitoring.assisted_authorized('${source}','${f.officer.actor.userId}',1,2)`])await expect(uow.run(f.officer.actor,tx=>tx.query(sql))).rejects.toMatchObject({code:'42501'});
 });
 it('rolls back disclosure, revision, event and command receipt together when confirmation fails',async()=>{
  const draft=await prepare(),key=randomUUID();
  await owner.query("CREATE FUNCTION monitoring.test_fail_assisted() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type='support.assisted.confirmed' THEN RAISE EXCEPTION 'fictional rollback test'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_fail_assisted BEFORE INSERT ON portal.events FOR EACH ROW EXECUTE FUNCTION monitoring.test_fail_assisted()");
  try{expect((await confirm(draft.id,{key})).status).toBe(503);}finally{await owner.query('DROP TRIGGER test_fail_assisted ON portal.events; DROP FUNCTION monitoring.test_fail_assisted()');}
  expect((await read(draft.id)).version).toBe(1);expect((await owner.query('SELECT count(*) FROM monitoring.requests')).rows[0].count).toBe('1');expect((await owner.query('SELECT count(*) FROM portal.commands WHERE scope LIKE $1',[`%${key}`])).rows[0].count).toBe('0');
  expect((await confirm(draft.id,{key})).status).toBe(201);
 });
 it('requires the current configured sharing notice and still permits decline',async()=>{
  const draft=await prepare(),changed=new AssistedCheckInsService(uow,loans,'fictional-new-notice',true);
  expect((await members.run(member.actor,tx=>changed.memberGet(tx,draft.id))).confirmationAllowed).toBe(false);
  const current=await read(draft.id);await expect(members.run(member.actor,tx=>changed.confirm(tx,draft.id,{sharingConfirmed:true,noticeVersion:current.noticeVersion,payloadSha256:current.payloadSha256},1,randomUUID()))).rejects.toMatchObject({status:409});
  expect((await members.run(member.actor,tx=>changed.decline(tx,draft.id,{},1,randomUUID()))).state).toBe('declined');
 });
 it('resolves the original owned loan, captures its public position at confirmation and never rereads it for exact replay',async()=>{
  const money=await supportPositionFixture(),publicRead=vi.fn((tx:Parameters<LoanReads['memberLoans']>[0])=>loans.memberLoans(tx)),assistance=new AssistedCheckInsService(uow,{memberLoans:publicRead},config.PRIVACY_NOTICE_VERSION,true);
  const draft=await assistance.prepare(money.officer,money.request.id,content(),2,randomUUID());expect(publicRead).not.toHaveBeenCalled();
  const current=await members.run(money.memberActor,tx=>assistance.memberGet(tx,draft.id));expect(current.content.loanId).toBe(money.release.loan.id);
  const body={sharingConfirmed:true as const,noticeVersion:current.noticeVersion,payloadSha256:current.payloadSha256},key=randomUUID();
  const receipt=await members.run(money.memberActor,tx=>assistance.confirm(tx,draft.id,body,1,key));expect(publicRead).toHaveBeenCalledTimes(1);
  const position=(await owner.query('SELECT position FROM monitoring.disclosures WHERE request_id=$1',[receipt.resultingRequestId])).rows[0].position;expect(position).toMatchObject({loanId:money.release.loan.id,principalCentavos:1_000_000});
  publicRead.mockRejectedValue(new Error('Fictional public reader outage after confirmed save'));
  expect(await members.run(money.memberActor,tx=>assistance.confirm(tx,draft.id,body,1,key))).toEqual(receipt);expect(publicRead).toHaveBeenCalledTimes(1);
 });
 it('fails closed for unavailable/foreign loan evidence and rechecks staff authority after a delayed loan read',async()=>{
  const money=await supportPositionFixture(),assistance=new AssistedCheckInsService(uow,loans,config.PRIVACY_NOTICE_VERSION,true),draft=await assistance.prepare(money.officer,money.request.id,content(),2,randomUUID());
  const current=await members.run(money.memberActor,tx=>assistance.memberGet(tx,draft.id)),body={sharingConfirmed:true as const,noticeVersion:current.noticeVersion,payloadSha256:current.payloadSha256};
  const unavailable=new AssistedCheckInsService(uow,{memberLoans:async()=>({state:'unavailable',message:'Fictional reader outage'})},config.PRIVACY_NOTICE_VERSION,true);
  await expect(members.run(money.memberActor,tx=>unavailable.confirm(tx,draft.id,body,1,randomUUID()))).rejects.toMatchObject({status:501});
  const foreign=new AssistedCheckInsService(uow,{memberLoans:async()=>({state:'available',data:[]})},config.PRIVACY_NOTICE_VERSION,true);
  await expect(members.run(money.memberActor,tx=>foreign.confirm(tx,draft.id,body,1,randomUUID()))).rejects.toMatchObject({status:404});
  let started!:()=>void,release!:()=>void;const ready=new Promise<void>(done=>started=done),gate=new Promise<void>(done=>release=done);
  const delayed=new AssistedCheckInsService(uow,{memberLoans:async tx=>{const view=await loans.memberLoans(tx);started();await gate;return view;}},config.PRIVACY_NOTICE_VERSION,true);
  const pending=members.run(money.memberActor,tx=>delayed.confirm(tx,draft.id,body,1,randomUUID())),outcome=expect(pending).rejects.toMatchObject({status:409});
  await ready;try{await owner.query('UPDATE identity.staff_users SET active=false,version=version+1 WHERE id=$1',[money.officer.userId]);}finally{release();}await outcome;
  expect((await members.run(money.memberActor,tx=>assistance.memberGet(tx,draft.id))).state).toBe('pending');
 });
 it('closes every new service and injected member-domain route before data access in real mode',async()=>{
  const run=vi.fn(),stub={run},closed=new AssistedCheckInsService(stub,loans,config.PRIVACY_NOTICE_VERSION,false),memberDomains={...unavailableMemberDomains,assistedCheckIns:vi.fn()},portal=new MemberPortalService(stub,new MemberApplicationsService(members,config.PRIVACY_NOTICE_VERSION),config.PRIVACY_NOTICE_VERSION,memberDomains,false);
  for(const action of [()=>closed.list(f.officer.actor,source,{}),()=>closed.get(f.officer.actor,randomUUID()),()=>closed.prepare(f.officer.actor,source,content(),2,randomUUID()),()=>closed.revise(f.officer.actor,randomUUID(),content(),1,randomUUID()),()=>closed.withdraw(f.officer.actor,randomUUID(),{reason:'fictional'},1,randomUUID()),()=>closed.memberList({actor:member.actor,query:vi.fn()},{}),()=>closed.memberGet({actor:member.actor,query:vi.fn()},randomUUID()),()=>closed.confirm({actor:member.actor,query:vi.fn()},randomUUID(),{},1,randomUUID()),()=>closed.decline({actor:member.actor,query:vi.fn()},randomUUID(),{},1,randomUUID())])await expect(action()).rejects.toMatchObject({status:501});
  expect(()=>portal.assistedCheckIns(member.actor,{})).toThrow();expect(run).not.toHaveBeenCalled();expect(memberDomains.assistedCheckIns).not.toHaveBeenCalled();
 });
});
