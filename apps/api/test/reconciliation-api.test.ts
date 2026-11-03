import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { createApp } from '../src/app.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { config,identityPool,owner,prepareDatabase,resetFixtures,closePools } from './database.js';
import { prepareReconciliationFixtures,reconciliationFixture } from '../src/modules/accounting/testing/reconciliation-fixture.js';

let app:INestApplication,base:string,f:Awaited<ReturnType<typeof reconciliationFixture>>,ordinary:Awaited<ReturnType<typeof resetFixtures>>;
const dates={fromDate:'2026-11-01',throughDate:'2026-11-03'};
beforeAll(async()=>{await prepareDatabase();await prepareReconciliationFixtures();app=await createApp(config);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{ordinary=await resetFixtures();f=await reconciliationFixture();});
afterAll(async()=>{await app?.close();await closePools();});
async function call(path='/reconciliations',options:{method?:string;body?:unknown;key?:string;token?:string;csrf?:boolean}={}){
  const token=options.token??f.token,headers:Record<string,string>={Cookie:`agap_session=${token}`,Origin:config.PUBLIC_ORIGIN};
  if(options.body!==undefined)headers['Content-Type']='application/json';
  if(options.key)headers['Idempotency-Key']=options.key;
  if(options.csrf!==false)headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);
  const result=await fetch(`${base}/api/v1${path}`,{method:options.method??'GET',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});
  return {status:result.status,headers:result.headers,body:await result.json()};
}
describe('ACC-01 authenticated staff API',()=>{
  it('creates, lists and reopens one actual principal reconciliation',async()=>{
    await f.release();
    const result=await call('/reconciliations',{method:'POST',body:dates,key:randomUUID()});
    expect(result.status).toBe(201);expect(result.body.report.status).toBe('matched');
    const list=await call();expect(list.status).toBe(200);expect(list.body.items[0].id).toBe(result.body.id);
    const saved=await call(`/reconciliations/${result.body.id}`);expect(saved.body).toEqual(result.body);
    expect(saved.headers.get('cache-control')).toBe('no-store');
  });
  it('replays an original result after a lost response and rejects changed key reuse',async()=>{
    const key=randomUUID(),first=await call('/reconciliations',{method:'POST',body:dates,key});
    expect((await call('/reconciliations',{method:'POST',body:dates,key})).body).toEqual(first.body);
    expect((await call('/reconciliations',{method:'POST',body:{...dates,fromDate:'2026-11-02'},key})).status).toBe(409);
    expect((await owner.query('SELECT count(*) FROM accounting.reconciliation_runs')).rows[0].count).toBe('1');
  });
  it('requires real authentication, CSRF, auditor role and full branch scope',async()=>{
    expect((await call('/reconciliations',{token:'not-a-session'})).status).toBe(401);
    expect((await call('/reconciliations',{method:'POST',body:dates,key:randomUUID(),csrf:false})).status).toBe(403);
    expect((await call('/reconciliations',{token:ordinary.officer.token})).status).toBe(403);
    expect((await call('/reconciliations',{token:ordinary.administrator.token})).status).toBe(403);
    expect((await call('/reconciliations',{token:ordinary.auditor.token})).status).toBe(403);
  });
  it('denies revoked sessions before create/replay and detail reads',async()=>{
    const key=randomUUID(),first=await call('/reconciliations',{method:'POST',body:dates,key});
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[f.actor.userId]);
    expect((await call('/reconciliations',{method:'POST',body:dates,key})).status).toBe(401);
    expect((await call(`/reconciliations/${first.body.id}`)).status).toBe(401);
  });
  it('rejects client-authored scope/results, invalid ranges and absent idempotency keys',async()=>{
    for(const body of [{...dates,organizationId:f.actor.organizationId},{...dates,report:{status:'matched'}},{...dates,throughDate:'2026-12-02'}])
      expect((await call('/reconciliations',{method:'POST',body,key:randomUUID()})).status).toBe(422);
    expect((await call('/reconciliations',{method:'POST',body:dates})).status).toBe(400);
    expect((await call('/reconciliations?limit=21')).status).toBe(422);
    expect((await call('/reconciliations?limit=1')).status).toBe(200);
  });
});
