import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { owner, config, prepareDatabase, closePools } from './database.js';

let direct:INestApplication,proxied:INestApplication,replica:INestApplication,directUrl:string,proxyUrl:string,replicaUrl:string;
beforeAll(async()=>{
  await prepareDatabase();
  const limits={...config,LOGIN_RATE_LIMIT_MAX:2,LOGIN_RATE_LIMIT_WINDOW_SECONDS:60};
  direct=await createApp(limits);proxied=await createApp({...limits,LOGIN_TRUSTED_PROXY_CIDRS:['127.0.0.1']});
  replica=await createApp({...limits,LOGIN_TRUSTED_PROXY_CIDRS:['127.0.0.1']});
  await direct.listen(0,'127.0.0.1');await proxied.listen(0,'127.0.0.1');
  await replica.listen(0,'127.0.0.1');replicaUrl=await replica.getUrl();
  directUrl=await direct.getUrl();proxyUrl=await proxied.getUrl();
});
beforeEach(async()=>{
  await owner.query('TRUNCATE identity.login_limits');
  vi.spyOn(IdentityService.prototype,'beginLogin').mockResolvedValue({cookie:'f'.repeat(43),url:'https://identity.example.invalid/authorize'});
});
afterEach(()=>vi.restoreAllMocks());
afterAll(async()=>{await direct?.close();await proxied?.close();await replica?.close();await closePools();});
const login=(base:string,ip:string,audience='staff')=>fetch(`${base}/api/v1/${audience==='member'?'member/':''}auth/login`,{redirect:'manual',headers:{'X-Forwarded-For':ip}});

it('keeps staff/member counters shared across replicas and reports the remaining wait',async()=>{
  expect((await login(proxyUrl,'203.0.113.8')).status).toBe(302);
  expect((await login(replicaUrl,'203.0.113.8','member')).status).toBe(302);
  const limited=await login(proxyUrl,'203.0.113.8');
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
  expect(Number(limited.headers.get('Retry-After'))).toBeLessThanOrEqual(60);
  expect((await limited.json()).error.code).toBe('login_rate_limited');
  expect((await login(proxyUrl,'203.0.113.9')).status).toBe(302);
  expect(IdentityService.prototype.beginLogin).toHaveBeenCalledTimes(3);
  expect((await owner.query('SELECT attempts FROM identity.login_limits ORDER BY attempts')).rows).toEqual([{attempts:1},{attempts:3}]);
});
it('does not let direct callers rotate a forged forwarding header to evade a limit',async()=>{
  expect((await login(directUrl,'203.0.113.8')).status).toBe(302);
  expect((await login(directUrl,'203.0.113.9')).status).toBe(302);
  expect((await login(directUrl,'203.0.113.10','member')).status).toBe(429);
  expect((await owner.query('SELECT count(*) FROM identity.login_limits')).rows[0].count).toBe('1');
});
it('refuses missing/invalid forwarded client identity without initiating OIDC or allocating a counter',async()=>{
  expect((await fetch(`${proxyUrl}/api/v1/auth/login`,{redirect:'manual'})).status).toBe(503);
  expect((await login(proxyUrl,'forged')).status).toBe(503);
  expect(IdentityService.prototype.beginLogin).not.toHaveBeenCalled();
  expect((await owner.query('SELECT count(*) FROM identity.login_limits')).rows[0].count).toBe('0');
});
