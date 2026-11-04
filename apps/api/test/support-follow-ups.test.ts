import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {INestApplication} from '@nestjs/common';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createApp} from '../src/app.js';
import {IdentityService} from '../src/modules/identity/identity.service.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {SupportFollowUps,manilaDay} from '../src/modules/monitoring/support-follow-ups.service.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {config,identityPool,owner,prepareDatabase,resetFixtures,closePools,runtimePool,uow} from './database.js';
import {memberFixture} from './member-fixtures.js';

let app:INestApplication,base:string,f:Awaited<ReturnType<typeof resetFixtures>>,member:Awaited<ReturnType<typeof memberFixture>>;
const today=()=>manilaDay();
const date=(offset:number)=>{const value=new Date(`${today()}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);};
beforeAll(async()=>{await prepareDatabase();app=await createApp(config);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{f=await resetFixtures();member=await memberFixture(f.officer.actor);});
afterAll(async()=>{await app?.close();await closePools();});
async function call(path:string,options:{method?:string;body?:unknown;key?:string;version?:number;token?:string;member?:boolean;csrf?:boolean}={}){
 const token=options.token??f.officer.token,headers:Record<string,string>={Cookie:`${options.member?'agap_member_session':'agap_session'}=${token}`,Origin:config.PUBLIC_ORIGIN};
 if(options.body!==undefined)headers['Content-Type']='application/json';if(options.key)headers['Idempotency-Key']=options.key;if(options.version!==undefined)headers['If-Match']=`"${options.version}"`;
 if(options.csrf!==false)headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);
 const response=await fetch(`${base}/api/v1${path}`,{method:options.method??'GET',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});return {status:response.status,body:await response.json()};
}
async function request(){
 const monitoring=new MonitoringService(uow,new LoanReads(uow)),members=new PostgresMemberUnitOfWork(runtimePool);
 const row=await members.run(member.actor,tx=>monitoring.submit(tx,{loanId:null,message:'Fictional member requests a follow-up conversation.',contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION},randomUUID()));
 await monitoring.assign(f.administrator.actor,row.id,{officerId:f.officer.actor.userId,reason:'Fictional follow-up assignment'},1,randomUUID());return row;
}
async function dated(requestId:string,when:string|null=today()){
 await uow.run(f.officer.actor,async tx=>{const row=(await tx.query('SELECT version FROM monitoring.requests WHERE id=$1',[requestId])).rows[0];await tx.query('SELECT monitoring.respond_support($1,$2::jsonb,$3)',[requestId,JSON.stringify({response:'Fictional published conversation offer.',internalNote:'Private source follow-up note.',followUpDate:when}),row.version]);});
 return (await call('/support-follow-ups/queues/open')).body.items.filter((row:{requestId:string})=>row.requestId===requestId);
}
const complete=(id:string,version=1,key=randomUUID(),note='Private follow-up action: contacted member.')=>call(`/support-follow-ups/${id}/completions`,{method:'POST',body:{note},version,key});
const reschedule=(id:string,when=date(2),version=1,key=randomUUID())=>call(`/support-follow-ups/${id}/reschedules`,{method:'POST',body:{date:when,reason:'Private reason: member requested a later conversation.'},version,key});

describe('HLT-01 real follow-up workflow',()=>{
 it('uses Manila calendar boundaries rather than the execution host timezone',()=>{
  expect(manilaDay(new Date('2026-11-03T15:59:59Z'))).toBe('2026-11-03');expect(manilaDay(new Date('2026-11-03T16:00:00Z'))).toBe('2026-11-04');
 });
 it('creates one task atomically for each dated response and none for an undated response, including original command replay',async()=>{
  const row=await request(),key=randomUUID(),body={response:'Fictional published follow-up.',internalNote:'Private scheduling note.',followUpDate:date(1)};
  const first=await call(`/support-requests/${row.id}/actions`,{method:'POST',body,version:2,key});expect(first.status).toBe(201);
  expect((await call(`/support-requests/${row.id}/actions`,{method:'POST',body,version:2,key})).body).toEqual(first.body);
  await dated(row.id,null);await dated(row.id,date(1));
  const queue=await call('/support-follow-ups/queues/open');expect(queue.body.items).toHaveLength(2);expect(new Set(queue.body.items.map((t:{sourceActionId:string})=>t.sourceActionId)).size).toBe(2);
  const detail=await call(`/support-follow-ups/${queue.body.items[0].id}`);expect(detail.status).toBe(200);expect(detail.body.events).toHaveLength(1);expect(detail.body.source.followUpDate).toBe(date(1));
 });
 it('filters the full server queue by open/scheduled/due/overdue/completed and returns a dated complete empty result',async()=>{
  const row=await request();await dated(row.id,date(-1));await dated(row.id);await dated(row.id,date(1));
  const all=(await call('/support-follow-ups/queues/open')).body;expect(all.items).toHaveLength(3);expect(all.asOfDate).toBe(today());
  for(const [filter,expected] of [['overdue',date(-1)],['due',today()],['scheduled',date(1)]]){const page=await call(`/support-follow-ups/queues/${filter}`);expect(page.body.items).toHaveLength(1);expect(page.body.items[0].dueDate).toBe(expected);}
  expect((await complete(all.items[0].id)).status).toBe(201);expect((await call('/support-follow-ups/queues/completed')).body.items).toHaveLength(1);
  expect((await call('/support-follow-ups/queues/unknown')).status).toBe(422);
 });
 it('pages a larger queue without duplicates and validates page bounds and query fields',async()=>{
  const row=await request();for(let i=0;i<28;i++)await dated(row.id);
  const first=(await call('/support-follow-ups/queues/open')).body,next=(await call(`/support-follow-ups/queues/open?cursor=${first.nextCursor}`)).body;
  expect(first.items).toHaveLength(25);expect(next.items).toHaveLength(3);expect(next.nextCursor).toBeNull();expect(new Set([...first.items,...next.items].map(t=>t.id)).size).toBe(28);
  for(const query of ['limit=0','limit=101','cursor=bad','unexpected=true'])expect((await call(`/support-follow-ups/queues/open?${query}`)).status).toBe(422);
 });
 it('reschedules and completes with immutable reasons while leaving source response, request version and member history unchanged',async()=>{
  const row=await request(),[task]=await dated(row.id),source=(await call(`/support-requests/${row.id}/history`)).body;
  const later=await reschedule(task.id);expect(later.status).toBe(201);expect(later.body.version).toBe(2);expect(later.body.originalDate).toBe(today());expect(later.body.dueDate).toBe(date(2));
  const done=await complete(task.id,2);expect(done.body.status).toBe('completed');expect(done.body.completedAt).toBeTruthy();
  const detail=(await call(`/support-follow-ups/${task.id}`)).body;expect(detail.events.map((e:{kind:string})=>e.kind)).toEqual(['completed','rescheduled','scheduled']);expect(detail.source.followUpDate).toBe(today());
  expect((await call(`/support-requests/${row.id}/history`)).body).toEqual(source);
  const memberView=await call('/member/support-requests',{token:member.token,member:true});expect(memberView.status).toBe(200);expect(memberView.body.data[0].response).toBe('Fictional published conversation offer.');expect(JSON.stringify(memberView.body)).not.toContain('Private');
 });
 it('preserves an original reschedule replay after later rescheduling and completion, caching only a version receipt',async()=>{
  const row=await request(),[task]=await dated(row.id),key=randomUUID(),first=await reschedule(task.id,date(1),1,key);
  await reschedule(task.id,date(2),2);await complete(task.id,3);
  expect((await reschedule(task.id,date(1),1,key)).body).toEqual(first.body);
  const cached=await uow.run(f.auditor.actor,tx=>tx.query("SELECT response FROM platform.idempotency WHERE scope LIKE '%support.follow_up.%'"));
  expect(cached.rows.every(row=>Object.keys(row.response as object).join(',')==='version')).toBe(true);expect(JSON.stringify(cached.rows)).not.toContain('Private');
  expect((await call(`/support-follow-ups/${task.id}/reschedules`,{method:'POST',body:{date:date(3),reason:'Changed reason'},version:1,key})).status).toBe(409);
 });
 it('makes completed tasks terminal while permitting the exact original completion replay',async()=>{
  const row=await request(),[task]=await dated(row.id),key=randomUUID(),first=await complete(task.id,1,key);
  expect((await complete(task.id,1,key)).body).toEqual(first.body);expect((await complete(task.id,2)).status).toBe(409);expect((await reschedule(task.id,date(2),2)).status).toBe(409);
 });
 it('replays an original reschedule after its date has passed without applying new-command date validation',async()=>{
  const row=await request(),[task]=await dated(row.id),when=date(1),later=date(3),key=randomUUID(),service=new SupportFollowUps(uow);
  const body={date:when,reason:'Private cross-day retry reason.'},first=await service.reschedule(f.officer.actor,task.id,body,1,key);
  vi.useFakeTimers({toFake:['Date']});try{
   vi.setSystemTime(new Date(`${later}T04:00:00Z`));expect(manilaDay()>when).toBe(true);
   expect(await service.reschedule(f.officer.actor,task.id,body,1,key)).toEqual(first);
  }finally{vi.useRealTimers();}
 });
 it('serializes competing writes and creates one action for concurrent same-key retries',async()=>{
  const row=await request(),[task]=await dated(row.id),key=randomUUID();
  const same=await Promise.all([reschedule(task.id,date(1),1,key),reschedule(task.id,date(1),1,key)]);expect(same.map(r=>r.status)).toEqual([201,201]);expect(same[0].body).toEqual(same[1].body);
  const different=await Promise.all([complete(task.id,2),reschedule(task.id,date(2),2)]);expect(different.map(r=>r.status).sort()).toEqual([201,412]);
  expect((await call(`/support-follow-ups/${task.id}/events`)).body.items).toHaveLength(3);
 });
 it('requires current versions, CSRF, command keys, nonblank reasons and a different nonpast reschedule date',async()=>{
  const row=await request(),[task]=await dated(row.id),path=`/support-follow-ups/${task.id}/completions`;
  expect((await call(path,{method:'POST',body:{note:'Fictional action'},key:randomUUID()})).status).toBe(428);
  expect((await call(path,{method:'POST',body:{note:'Fictional action'},version:1})).status).toBe(400);
  expect((await call(path,{method:'POST',body:{note:'Fictional action'},version:1,key:randomUUID(),csrf:false})).status).toBe(403);
  expect((await complete(task.id,1,randomUUID(),'  ')).status).toBe(422);expect((await complete(task.id,2)).status).toBe(412);
  for(const when of [date(-1),today(),'2026-02-30'])expect((await reschedule(task.id,when)).status).toBe(422);
  expect((await call(`/support-follow-ups/${task.id}`)).body.task.version).toBe(1);
 });
 it('pages long task history by immutable boundaries and rejects cursors from another task',async()=>{
  const row=await request(),[task]=await dated(row.id);for(let i=0;i<27;i++)expect((await reschedule(task.id,date(i+1),i+1)).status).toBe(201);
  const first=(await call(`/support-follow-ups/${task.id}`)).body;expect(first.events).toHaveLength(25);
  await reschedule(task.id,date(40),28);const older=(await call(`/support-follow-ups/${task.id}/events?cursor=${first.eventsNextCursor}`)).body;
  expect(older.items).toHaveLength(3);expect([...first.events,...older.items].map(e=>e.version)).toEqual(Array.from({length:28},(_,i)=>28-i));
  const second=(await dated(row.id)).find((item:{id:string})=>item.id!==task.id);
  expect((await call(`/support-follow-ups/${second.id}/events?cursor=${first.eventsNextCursor}`)).status).toBe(422);
 });
 it('denies metadata administrators, auditors, other officers, members and other organizations private follow-up reads/writes',async()=>{
  const row=await request(),[task]=await dated(row.id);
  for(const token of [f.administrator.token,f.auditor.token,f.revocationTarget.token])for(const path of ['/support-follow-ups/queues/open',`/support-follow-ups/${task.id}`,`/support-follow-ups/${task.id}/events`])expect((await call(path,{token})).status).toBe(403);
  expect((await call(`/support-follow-ups/${task.id}`,{token:member.token,member:true})).status).toBe(401);
  expect((await call(`/support-follow-ups/${task.id}`,{token:f.other.token})).status).toBe(404);expect((await call('/support-follow-ups/queues/open',{token:f.other.token})).body.items).toEqual([]);
  expect((await call(`/support-follow-ups/${task.id}/completions`,{token:f.administrator.token,method:'POST',body:{note:'Forbidden private action'},version:1,key:randomUUID()})).status).toBe(403);
 });
 it('transfers access with current assignment and denies old reads and original-command replay',async()=>{
  const row=await request(),[task]=await dated(row.id),key=randomUUID();await reschedule(task.id,date(1),1,key);
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['officer'] WHERE id=$1",[f.revocationTarget.actor.userId]);
  const monitoring=new MonitoringService(uow,new LoanReads(uow));await monitoring.assign(f.administrator.actor,row.id,{officerId:f.revocationTarget.actor.userId,reason:'Fictional follow-up reassignment'},3,randomUUID());
  expect((await call(`/support-follow-ups/${task.id}`)).status).toBe(404);expect((await reschedule(task.id,date(1),1,key)).status).toBe(404);
  expect((await call('/support-follow-ups/queues/open')).body.items).toEqual([]);expect((await call(`/support-follow-ups/${task.id}`,{token:f.revocationTarget.token})).status).toBe(200);
  await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[f.revocationTarget.actor.userId]);expect((await call(`/support-follow-ups/${task.id}`,{token:f.revocationTarget.token})).status).toBe(401);
 });
 it('rolls back task transition, receipt, audit and outbox on coordinator failure',async()=>{
  const row=await request(),[task]=await dated(row.id),key=randomUUID();
  const broken=new SupportFollowUps({run:(actor,work)=>uow.run(actor,async tx=>{await work(tx);throw new Error('Fictional follow-up rollback');})});
  await expect(broken.complete(f.officer.actor,task.id,{note:'Private rollback action'},1,key)).rejects.toMatchObject({status:503});
  expect((await call(`/support-follow-ups/${task.id}`)).body.task.version).toBe(1);
  expect((await owner.query("SELECT count(*) FROM platform.audit_events WHERE event_type LIKE 'support.follow_up.%'")).rows[0].count).toBe('0');
  expect((await owner.query("SELECT count(*) FROM platform.outbox WHERE event_type LIKE 'support.follow_up.%'")).rows[0].count).toBe('0');
  expect((await complete(task.id,1,key)).status).toBe(201);
 });
 it('rolls back a dated response and its triggered task together, then retries once successfully',async()=>{
  const row=await request(),key=randomUUID(),body={response:'Fictional atomic dated response.',internalNote:'Private atomic scheduling note.',followUpDate:date(1)};
  const broken=new MonitoringService({run:(actor,work)=>uow.run(actor,async tx=>{await work(tx);throw new Error('Fictional response/task rollback');})},new LoanReads(uow));
  await expect(broken.respondPaged(f.officer.actor,row.id,body,2,key)).rejects.toMatchObject({status:503});
  expect((await owner.query('SELECT count(*) FROM monitoring.follow_ups')).rows[0].count).toBe('0');expect((await owner.query('SELECT count(*) FROM monitoring.follow_up_events')).rows[0].count).toBe('0');
  expect((await call(`/support-requests/${row.id}/actions`,{method:'POST',body,version:2,key})).status).toBe(201);expect((await call('/support-follow-ups/queues/open')).body.items).toHaveLength(1);
 });
 it('enforces raw-table isolation, append-only evidence and bounded SQL transition validation',async()=>{
  const row=await request(),[task]=await dated(row.id);
  await expect(uow.run(f.officer.actor,tx=>tx.query('SELECT * FROM monitoring.follow_up_events'))).rejects.toMatchObject({code:'42501'});
  await expect(owner.query('UPDATE monitoring.follow_up_events SET note=$1 WHERE follow_up_id=$2',['Tampered',task.id])).rejects.toMatchObject({code:'42501'});
  await expect(uow.run(f.officer.actor,tx=>tx.query("SELECT monitoring.transition_follow_up($1,'completed',NULL,'Fictional action',NULL)",[task.id]))).rejects.toMatchObject({code:'P0412'});
  const privateRows=await uow.run(f.administrator.actor,tx=>tx.query('SELECT * FROM monitoring.staff_follow_up_events'));expect(privateRows.rows).toEqual([]);
 });
 it('backfills every historical dated action through the actual additive migration, retaining original dates and authors',async()=>{
  const row=await request();await dated(row.id,date(-3));await dated(row.id,date(-2));await dated(row.id,null);
  const client=await owner.connect();try{
   await client.query('BEGIN');
   await client.query('DROP TRIGGER response_follow_up ON monitoring.actions; DROP VIEW monitoring.staff_follow_ups,monitoring.staff_follow_up_events; DROP FUNCTION monitoring.schedule_response_follow_up(),monitoring.transition_follow_up(uuid,text,date,text,bigint); DROP TABLE monitoring.follow_up_events,monitoring.follow_ups;');
   await client.query(await readFile(new URL('../src/modules/monitoring/migrations/004-follow-ups.sql',import.meta.url),'utf8'));
   const backfill=await client.query("SELECT to_char(e.due_date,'YYYY-MM-DD') AS due_day,e.recorded_by,e.recorded_at=a.recorded_at AS retained_time FROM monitoring.follow_ups t JOIN monitoring.follow_up_events e ON e.follow_up_id=t.id JOIN monitoring.actions a ON a.id=t.source_action_id ORDER BY e.due_date");
   expect(backfill.rows.map(r=>r.due_day)).toEqual([date(-3),date(-2)]);expect(backfill.rows.every(r=>r.recorded_by===f.officer.actor.userId&&r.retained_time)).toBe(true);
  }finally{await client.query('ROLLBACK');client.release();}
 });
});
