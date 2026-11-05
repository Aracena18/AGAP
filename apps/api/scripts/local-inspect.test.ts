import {describe,it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {compareMigrationHistory,inspectionFailure,localConfiguration,migrationInventory} from './local-inspect.js';
const env=()=>({NODE_ENV:'development',EVIDENCE_RECORD_MODE:'fictional',DATABASE_URL:'postgresql://agap_runtime:PRIVATE-RUNTIME@127.0.0.1:55435/agap',IDENTITY_DATABASE_URL:'postgresql://agap_identity:PRIVATE-IDENTITY@127.0.0.1:55435/agap',MIGRATION_DATABASE_URL:'postgresql://agap_owner:PRIVATE-OPERATOR@127.0.0.1:55435/agap',PUBLIC_ORIGIN:'http://127.0.0.1:5174',API_PORT:'4100',OIDC_ISSUER:'http://127.0.0.1:18080/realms/agap',SESSION_SECRET:'PRIVATE-SESSION-SECRET-WITH-32-CHARACTERS',OIDC_CLIENT_SECRET:'PRIVATE-CLIENT',PRIVACY_NOTICE_VERSION:'fictional-local-test'});
describe('Local startup inspection boundaries',()=>{
  it('uses existing application validation and preserves configured endpoints without exposing credentials',()=>{
    const c=localConfiguration(env());expect(c).toMatchObject({databasePort:55435,identityPort:18080,webPort:5174,apiPort:4100,databaseName:'agap'});expect(JSON.stringify(c)).not.toMatch(/PRIVATE|postgresql|DATABASE_URL|SECRET/);
  });
  it.each([{NODE_ENV:'production'},{NODE_ENV:'test'},{EVIDENCE_RECORD_MODE:'real'},{DATABASE_URL:'postgresql://u:p@remote.example/agap'},{MIGRATION_DATABASE_URL:'postgresql://u:p@127.0.0.1/customer_records'},{PUBLIC_ORIGIN:'http://remote.example:5174'},{API_HOST:'0.0.0.0'},{OIDC_ISSUER:'http://127.0.0.1:18080/realms/another'},{MIGRATION_DATABASE_URL:'postgresql://u:p@127.0.0.1:55432/agap'},{API_PORT:'5174'},{DATABASE_URL:'postgresql://u:p@127.0.0.1:0/agap'}])('refuses an incompatible local target %j',change=>{expect(()=>localConfiguration({...env(),...change})).toThrow();});
  it('formats bracketed IPv6 endpoints correctly',()=>{const c=localConfiguration({...env(),API_HOST:'::1',PUBLIC_ORIGIN:'http://[::1]:5174',OIDC_ISSUER:'http://[::1]:18080/realms/agap'});expect(c.apiUrl).toBe('http://[::1]:4100');expect(c.webHost).toBe('::1');});
  it('distinguishes pending files, changed checksums and history absent from the branch',()=>{
    expect(compareMigrationHistory({first:'a',next:'b'},[{name:'first',checksum:'changed'},{name:'future',checksum:'c'}])).toEqual({pending:['next'],changed:['first'],unknown:['future']});
    expect(compareMigrationHistory({first:'a'},[])).toEqual({pending:['first'],changed:[],unknown:[]});
  });
  it('discovers the registered migration inventory without applying it',async()=>{const inventory=await migrationInventory(process.cwd());expect(Object.keys(inventory).length).toBeGreaterThan(50);const name='apps/api/src/modules/servicing/migrations/010-connected-action-reasons.sql';expect(inventory[name]).toMatch(/^[a-f0-9]{64}$/);expect(await readFile(name,'utf8')).toContain('CREATE TABLE servicing.action_reasons');});
  it('keeps raw validation/database errors and connection strings out of diagnostics',()=>{
    const c={...env(),SESSION_SECRET:'PRIVATE'};let error;try{localConfiguration(c);}catch(e){error=e;}expect(inspectionFailure(error).message).toContain('SESSION_SECRET');expect(JSON.stringify(inspectionFailure(error))).not.toContain('PRIVATE');
    expect(JSON.stringify(inspectionFailure(new Error('postgresql://owner:PRIVATE@localhost/agap')))).not.toContain('PRIVATE');expect(inspectionFailure({code:'28P01',message:'PRIVATE'}).message).toContain('credentials were rejected');
  });
});
