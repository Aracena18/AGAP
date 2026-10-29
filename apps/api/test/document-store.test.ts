import { afterEach,describe,expect,it } from 'vitest';
import { mkdtemp,readdir,rm,symlink,readFile,stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import { PrivateDocumentStore } from '../src/platform/document-store.js';
let root='';afterEach(async()=>{if(root)await rm(root,{recursive:true,force:true});});
async function setup(){root=await mkdtemp(join(tmpdir(),'agap-private-test-'));return new PrivateDocumentStore(join(root,'documents'));}
async function* bytes(value:string){yield Buffer.from(value);}
describe('Private quarantine adapter',()=>{
  it('stores exact immutable bytes with restrictive modes and checksum',async()=>{
    const store=await setup();const value='Fictional document bytes';const saved=await store.putQuarantined(bytes(value),100);
    expect(saved.sha256).toBe(createHash('sha256').update(value).digest('hex'));expect(saved.size).toBe(Buffer.byteLength(value));
    const chunks=[];for await(const chunk of await store.read(saved.key))chunks.push(Buffer.from(chunk));expect(Buffer.concat(chunks).toString()).toBe(value);
    expect((await stat(join(root,'documents',saved.key))).mode&0o777).toBe(0o600);
    expect(await readdir(join(root,'documents'))).toEqual([saved.key]);
    await store.remove(saved.key);await expect(store.read(saved.key)).rejects.toThrow();
  });
  it('removes partial uploads on overflow, empty input and interrupted streams',async()=>{
    const store=await setup();await expect(store.putQuarantined(bytes('too much'),2)).rejects.toThrow();
    await expect(store.putQuarantined(bytes(''),10)).rejects.toThrow();
    async function* broken(){yield Buffer.from('partial');throw new Error('Stream interrupted');}
    await expect(store.putQuarantined(broken(),100)).rejects.toThrow();expect(await readdir(join(root,'documents'))).toEqual([]);
  });
  it('rejects traversal, symlink documents and a symlink root',async()=>{
    const store=await setup();await store.initialize();
    await expect(store.read('../../package.json')).rejects.toThrow();
    const key=randomUUID();await symlink(join(process.cwd(),'package.json'),join(root,'documents',key));await expect(store.read(key)).rejects.toThrow();
    expect((await readFile('package.json','utf8')).length).toBeGreaterThan(0);
    await symlink(join(root,'documents'),join(root,'alias'));await expect(new PrivateDocumentStore(join(root,'alias')).initialize()).rejects.toThrow();
  });
});
