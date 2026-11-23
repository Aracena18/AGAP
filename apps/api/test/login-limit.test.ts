import { afterAll,beforeAll,expect,it } from 'vitest';
import { closePools,identityPool,owner,prepareDatabase } from './database.js';
import { limitLogin,LoginRateLimitError } from '../src/modules/identity/login-limit.js';
beforeAll(async()=>{await prepareDatabase();await owner.query('TRUNCATE identity.login_limits');});
afterAll(closePools);
it('limits concurrent login requests across processes without saving raw addresses',async()=>{
  const results=await Promise.allSettled(Array.from({length:4},()=>limitLogin(identityPool,'fictional-secret','fictional-network-address',3)));
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(3);
  const rejected=results.find(result=>result.status==='rejected');expect(rejected?.status==='rejected'&&rejected.reason.status).toBe(429);
  const saved=(await owner.query('SELECT source_hash,attempts FROM identity.login_limits')).rows;
  expect(saved[0].source_hash).not.toContain('network');expect(saved[0].attempts).toBe(4);
  await owner.query("UPDATE identity.login_limits SET expires_at=now()-interval '1 second'");await expect(limitLogin(identityPool,'fictional-secret','fictional-network-address',3)).resolves.toBeUndefined();
});
it('applies a configured fixed window across independent connections and retains retry timing',async()=>{
  await owner.query('TRUNCATE identity.login_limits');
  await limitLogin(identityPool,'fictional-secret','another-fictional-source',1,60);
  await owner.query("UPDATE identity.login_limits SET expires_at=now()+interval '12 seconds'");
  try{await limitLogin(identityPool,'fictional-secret','another-fictional-source',1,60);throw new Error('Expected rate limit');}
  catch(error){expect(error).toBeInstanceOf(LoginRateLimitError);expect((error as LoginRateLimitError).retryAfterSeconds).toBeGreaterThan(0);expect((error as LoginRateLimitError).retryAfterSeconds).toBeLessThanOrEqual(12);}
  await owner.query("UPDATE identity.login_limits SET expires_at=now()-interval '1 second'");
  const attempts=await Promise.allSettled(Array.from({length:3},()=>limitLogin(identityPool,'fictional-secret','another-fictional-source',1,60)));
  expect(attempts.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect((await owner.query('SELECT attempts FROM identity.login_limits')).rows[0].attempts).toBe(3);
});
