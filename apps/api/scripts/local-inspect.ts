import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CONTRACT_VERSION} from '../../../packages/contracts/src/schemas.js';
import {loadConfig} from '../src/platform/config.js';
import {createPool} from '../src/platform/database.js';
import {migrationDirectories} from '../src/platform/migrate.js';

const local=(host:string)=>['127.0.0.1','localhost','[::1]','::1'].includes(host);
export class LocalConfigurationError extends Error{}
function database(value:string|undefined){
  if(!value)throw new LocalConfigurationError('Set MIGRATION_DATABASE_URL in the private .env file.');
  const u=new URL(value);
  if(!['postgres:','postgresql:'].includes(u.protocol)||!local(u.hostname)||!['/agap','/agap_test'].includes(u.pathname))throw new LocalConfigurationError('Local commands require loopback fictional databases named agap or agap_test.');
  return u;
}
/** Reuse application validation. Return endpoints only, never credentials or environment values. */
export function localConfiguration(env:NodeJS.ProcessEnv){
  const c=loadConfig(env),origin=new URL(c.PUBLIC_ORIGIN),issuer=new URL(c.OIDC_ISSUER);
  if(c.NODE_ENV!=='development'||c.EVIDENCE_RECORD_MODE!=='fictional'||!c.PRIVACY_NOTICE_VERSION.startsWith('fictional')||!local(c.API_HOST)||!local(origin.hostname)||origin.protocol!=='http:'||!local(issuer.hostname)||issuer.protocol!=='http:'||issuer.pathname!=='/realms/agap'||issuer.username||issuer.password||issuer.search||issuer.hash)throw new LocalConfigurationError('Local commands require fictional loopback development and the local agap identity realm.');
  const urls=[database(c.DATABASE_URL),database(c.IDENTITY_DATABASE_URL),database(env.MIGRATION_DATABASE_URL)];
  if(urls.some(u=>(u.port||'5432')!==(urls[0].port||'5432')||u.pathname!==urls[0].pathname))throw new LocalConfigurationError('Runtime, identity and migration connections must target the same local database and port.');
  const apiUrl=new URL('http://localhost');apiUrl.hostname=c.API_HOST.includes(':')?`[${c.API_HOST.replace(/^\[|\]$/g,'')}]`:c.API_HOST;apiUrl.port=String(c.API_PORT);
  const ports=[c.API_PORT,Number(origin.port||80),Number(issuer.port||80),Number(urls[0].port||5432)];
  if(ports.some(p=>!Number.isInteger(p)||p<1||p>65535)||new Set(ports).size!==ports.length)throw new LocalConfigurationError('API, frontend, identity and database must use valid different ports.');
  return {origin:origin.origin,webHost:origin.hostname.replace(/^\[|\]$/g,''),webPort:ports[1],apiUrl:apiUrl.origin,apiHost:c.API_HOST.replace(/^\[|\]$/g,''),apiPort:c.API_PORT,issuer:issuer.href,identityPort:ports[2],databasePort:ports[3],databaseName:urls[0].pathname.slice(1),contractVersion:CONTRACT_VERSION};
}
export async function migrationInventory(root:string){
  const files:Record<string,string>={};
  for(const directory of migrationDirectories)for(const file of (await readdir(resolve(root,directory))).filter(f=>f.endsWith('.sql')).sort()){
    const name=`${directory}/${file}`;files[name]=createHash('sha256').update(await readFile(resolve(root,name),'utf8')).digest('hex');
  }
  return files;
}
export function compareMigrationHistory(expected:Record<string,string>,applied:{name:string;checksum:string}[]){
  const known=new Map(applied.map(r=>[r.name,r.checksum]));
  return {pending:Object.keys(expected).filter(name=>!known.has(name)),changed:Object.keys(expected).filter(name=>known.has(name)&&known.get(name)!==expected[name]),unknown:applied.filter(r=>!Object.hasOwn(expected,r.name)).map(r=>r.name)};
}
/** All connection probes and history reads run inside read-only transactions. */
export async function inspectLocalDatabase(env:NodeJS.ProcessEnv,root:string){
  localConfiguration(env);
  const expected=await migrationInventory(root),urls=[env.DATABASE_URL!,env.IDENTITY_DATABASE_URL!,env.MIGRATION_DATABASE_URL!];
  const result=await Promise.all(urls.map(async(url,index)=>{
    const pool=createPool(url,{max:1,connectionTimeoutMillis:2000,query_timeout:3000,idleTimeoutMillis:1000}),client=await pool.connect().catch(async error=>{await pool.end();throw error;});
    try{
      await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='3s'");await client.query('SELECT 1');
      if(index!==2)return null;
      const exists=(await client.query("SELECT to_regclass('public.agap_migrations') AS history")).rows[0]?.history;
      return compareMigrationHistory(expected,exists?(await client.query<{name:string;checksum:string}>('SELECT name,checksum FROM public.agap_migrations')).rows:[]);
    }finally{try{await client.query('ROLLBACK');}finally{client.release();await pool.end();}}
  }));
  return result[2]!;
}
export function inspectionFailure(error:unknown){
  if(error instanceof LocalConfigurationError)return {ok:false,code:'configuration',message:error.message};
  if(error&&typeof error==='object'&&'issues'in error){const keys=(error as {issues:{path:unknown[]}[]}).issues.map(i=>i.path.join('.')).filter(k=>/^[A-Z_0-9]+$/.test(k));return {ok:false,code:'configuration',message:`Check required .env settings${keys.length?`: ${[...new Set(keys)].join(', ')}`:'.'}`};}
  const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  const messages:Record<string,string>={ECONNREFUSED:'PostgreSQL is not accepting connections at the configured local port.',ETIMEDOUT:'The local database connection timed out.','28P01':'The local database credentials were rejected.','3D000':'The configured fictional database does not exist.','42501':'The configured operator cannot read migration history.'};
  return {ok:false,code:'inspection_failed',message:messages[code]??'Local configuration or database inspection failed. Check the private .env and local PostgreSQL service; credentials are not printed.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const mode=process.argv[2];if(mode!=='config'&&mode!=='database')throw new LocalConfigurationError('Choose config or database inspection.');const data=mode==='config'?localConfiguration(process.env):await inspectLocalDatabase(process.env,process.cwd());console.log(JSON.stringify({ok:true,data}));}
  catch(error){console.log(JSON.stringify(inspectionFailure(error)));process.exitCode=1;}
}
