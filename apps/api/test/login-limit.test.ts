import { afterAll,beforeAll,expect,it } from 'vitest';
import { closePools,identityPool,owner,prepareDatabase } from './database.js';
import { limitLogin } from '../src/modules/identity/login-limit.js';
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
