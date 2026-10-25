import { randomUUID } from 'node:crypto';
import { afterAll,beforeAll,beforeEach,expect,it } from 'vitest';
import { closePools,owner,prepareDatabase,resetFixtures,ownerUrl } from './database.js';
import { createPool } from '../src/platform/database.js';
import { DatabaseWorker } from '../src/platform/worker.js';
let fixture:Awaited<ReturnType<typeof resetFixtures>>;
const url=new URL(ownerUrl);url.username='agap_worker_test';url.password='fictional-test-worker';
const pool=createPool(url.href);
beforeAll(async()=>{
  await prepareDatabase();
  await owner.query("DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='agap_worker_test') THEN CREATE ROLE agap_worker_test LOGIN PASSWORD 'fictional-test-worker' NOSUPERUSER NOBYPASSRLS; END IF; END $$; GRANT agap_worker TO agap_worker_test");
});
beforeEach(async()=>{fixture=await resetFixtures();});
afterAll(async()=>{await pool.end();await closePools();});
async function enqueue(kind='fictional.check',organizationId=fixture.org){const id=randomUUID();await owner.query('INSERT INTO platform.jobs(id,organization_id,kind,payload) VALUES($1,$2,$3,$4)',[id,organizationId,kind,{recordId:randomUUID()}]);return id;}
it('concurrent workers handle each committed job once, within their organization',async()=>{
  const id=await enqueue();const foreign=await enqueue('fictional.check',fixture.otherOrg);const handled:string[]=[];
  const handlers=new Map([['fictional.check',async(item:{id:string})=>{handled.push(item.id);}]]);
  const a=new DatabaseWorker(pool,fixture.org,handlers),b=new DatabaseWorker(pool,fixture.org,handlers);
  expect((await Promise.all([a.tick('jobs'),b.tick('jobs')])).filter(Boolean)).toHaveLength(1);expect(handled).toEqual([id]);
  expect((await owner.query('SELECT completed_at FROM platform.jobs WHERE id=$1',[foreign])).rows[0].completed_at).toBeNull();
});
it('failed handler effects roll back, retries are bounded, unknown kinds remain pending',async()=>{
  const id=await enqueue();const unknown=await enqueue('not.registered');
  const worker=new DatabaseWorker(pool,fixture.org,new Map([['fictional.check',async()=>{throw new Error('Do not log this secret payload');}]]));
  for(let attempt=0;attempt<5;attempt++){
    await owner.query('UPDATE platform.jobs SET available_at=now() WHERE id=$1',[id]);await worker.tick('jobs');
  }
  const saved=(await owner.query('SELECT attempts,failed_at,last_error_code,completed_at FROM platform.jobs WHERE id=$1',[id])).rows[0];
  expect(saved.attempts).toBe(5);expect(saved.failed_at).not.toBeNull();expect(saved.last_error_code).toBe('handler_failed');expect(saved.completed_at).toBeNull();
  expect(await worker.tick('jobs')).toBe(false);
  expect((await owner.query('SELECT attempts FROM platform.jobs WHERE id=$1',[unknown])).rows[0].attempts).toBe(0);
  await expect(pool.query('SELECT * FROM members.members')).rejects.toThrow('permission denied');
});
it('rolls back partial database effects before retaining the failure record',async()=>{
  const id=await enqueue();const other=await enqueue('other');
  const worker=new DatabaseWorker(pool,fixture.org,new Map([['fictional.check',async(_item,tx)=>{await tx.query('UPDATE platform.jobs SET completed_at=now() WHERE id=$1',[other]);throw new Error('crash');}]]));
  await worker.tick('jobs');expect((await owner.query('SELECT completed_at FROM platform.jobs WHERE id=$1',[other])).rows[0].completed_at).toBeNull();
  expect((await owner.query('SELECT attempts FROM platform.jobs WHERE id=$1',[id])).rows[0].attempts).toBe(1);
});
