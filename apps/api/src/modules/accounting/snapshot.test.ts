import { describe,expect,it,vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresUnitOfWork } from '../../platform/database.js';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';

function fixture(options:{isolation?:'repeatable read'}={}){
  const clients:Array<{query:ReturnType<typeof vi.fn>;release:ReturnType<typeof vi.fn>}>=[];
  const pool={connect:vi.fn(async()=>{const client={query:vi.fn<(...args:unknown[])=>Promise<{rows:{authorized:boolean}[]}>>().mockResolvedValue({rows:[{authorized:true}]}),release:vi.fn()};clients.push(client);return client;})};
  const actor:ActorContext={userId:'fixture-user',organizationId:'fixture-org',branchIds:['fixture-branch'],roles:['auditor'],sessionId:'fixture-session',correlationId:'fixture-correlation',authenticatedAt:new Date(),authenticationMethods:['mfa']};
  return {clients,pool,actor,uow:new PostgresUnitOfWork(pool as unknown as Pool,options)};
}
describe('reporting snapshot retry boundary',()=>{
  it('establishes isolation before any identity query and revalidates every retry',async()=>{
    const f=fixture({isolation:'repeatable read'});let attempts=0;
    await expect(f.uow.run(f.actor,async()=>{if(++attempts<3)throw {code:'40001'};return 'saved';})).resolves.toBe('saved');
    expect(f.clients).toHaveLength(3);
    for(const client of f.clients){expect(client.query.mock.calls[0]).toEqual(['BEGIN ISOLATION LEVEL REPEATABLE READ']);expect(client.query.mock.calls.length).toBe(6);expect(client.release).toHaveBeenCalledOnce();}
    expect(f.clients[0].query.mock.calls.at(-1)).toEqual(['ROLLBACK']);expect(f.clients[2].query.mock.calls.at(-1)).toEqual(['COMMIT']);
  });
  it('bounds retry attempts and rolls back every unsuccessful snapshot',async()=>{
    const f=fixture({isolation:'repeatable read'}),failure={code:'40001'};
    await expect(f.uow.run(f.actor,async()=>{throw failure;})).rejects.toBe(failure);expect(f.clients).toHaveLength(3);
    expect(f.clients.every(client=>client.query.mock.calls.at(-1)?.[0]==='ROLLBACK')).toBe(true);
  });
  it('does not automatically replay existing default-mode commands',async()=>{
    const f=fixture();await expect(f.uow.run(f.actor,async()=>{throw {code:'40001'};})).rejects.toMatchObject({code:'40001'});
    expect(f.clients).toHaveLength(1);expect(f.clients[0].query.mock.calls[0]).toEqual(['BEGIN']);
  });
  it('does not retry unrelated errors inside reporting transactions',async()=>{
    const f=fixture({isolation:'repeatable read'});await expect(f.uow.run(f.actor,async()=>{throw {code:'23514'};})).rejects.toMatchObject({code:'23514'});
    expect(f.clients).toHaveLength(1);
  });
});
