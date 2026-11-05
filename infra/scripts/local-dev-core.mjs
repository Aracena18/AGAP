import {execFile,spawn} from 'node:child_process';
import {readFile,readdir,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,join} from 'node:path';
import {createServer} from 'node:net';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
const exec=promisify(execFile);
export const delay=ms=>new Promise(done=>setTimeout(done,ms));
export class LocalProblem extends Error{}
export function argumentsFor(args){
  if(args.length===2&&['doctor','start'].includes(args[0])&&args[1]==='--help')return {command:'help',flags:new Set()};
  const [command='help',...flags]=args,allowed=command==='doctor'?['--json','--no-infra']:command==='start'?['--init-env','--migrate','--seed','--fresh','--no-infra']:[];
  if(!['doctor','start','help','--help'].includes(command)||flags.some(f=>!allowed.includes(f))||new Set(flags).size!==flags.length)throw new LocalProblem('Unknown or repeated option. Run npm.cmd run local:dev -- --help for usage.');
  return {command:command==='--help'?'help':command,flags:new Set(flags)};
}
export async function command(file,args,options={}){return exec(file,args,{windowsHide:true,timeout:15000,maxBuffer:2*1024*1024,...options});}
export async function selectNode(root,current={path:process.execPath,version:process.version}){
  if(/^v24\./.test(current.version))return current.path;
  const folder=resolve(root,'node_modules/.cache/agap-gl01'),suffix=`-${process.platform==='win32'?'win':process.platform}-${process.arch}`;
  let entries=[];try{entries=await readdir(folder);}catch{/* An existing cache is optional. */}
  for(const name of entries.filter(n=>n.startsWith('node-v24.')&&n.endsWith(suffix)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))){
    const candidate=join(folder,name,process.platform==='win32'?'node.exe':'bin/node');
    try{if(/^v24\./.test((await command(candidate,['--version'])).stdout.trim()))return candidate;}catch{/* Try another existing candidate. */}
  }
  throw new LocalProblem('Node 24 is required. Install/use Node 24, or restore the existing repository Node 24 cache. No runtime was downloaded and PATH was not changed.');
}
export async function checkDependencies(root){
  try{
    const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8')),lock=JSON.parse(await readFile(join(root,'package-lock.json'),'utf8'));
    for(const name of Object.keys({...pkg.dependencies,...pkg.devDependencies})){
      const installed=JSON.parse(await readFile(join(root,'node_modules',name,'package.json'),'utf8'));
      if(installed.version!==lock.packages[`node_modules/${name}`]?.version)throw new Error('Mismatch');
    }
    await access(join(root,'node_modules/tsx/dist/loader.mjs'),constants.R_OK);await access(join(root,'node_modules/vite/bin/vite.js'),constants.R_OK);
  }catch{throw new LocalProblem('Dependencies are missing or differ from package-lock.json. Run npm.cmd ci, then retry.');}
}
export function nodeOptions(root){return {cwd:root,env:{...process.env,TSX_TSCONFIG_PATH:resolve(root,'tsconfig.platform.json')}};}
export function typescriptArgs(root,file,args=[]){return [`--env-file=${resolve(root,'.env')}`,'--import',pathToFileURL(join(root,'node_modules/tsx/dist/loader.mjs')).href,resolve(root,file),...args];}
export async function inspect(root,node,mode){
  let out;try{out=await command(node,typescriptArgs(root,'apps/api/scripts/local-inspect.ts',[mode]),nodeOptions(root));}catch(error){out=error;}
  let response;try{response=JSON.parse(out.stdout);}catch{throw new LocalProblem('Local inspection could not run. Check Node 24, .env permissions and npm.cmd ci. Probe stderr is withheld to protect configuration values.');}
  if(!response.ok)throw new LocalProblem(response.message);
  return response.data;
}
export async function portStatus(host,port){
  return new Promise(done=>{const server=createServer();server.once('error',error=>done(error.code==='EADDRINUSE'?'occupied':error.code==='EACCES'?'reserved':'unavailable'));server.listen({host,port,exclusive:true},()=>server.close(()=>done('free')));});
}
export function excludedPorts(text){return text.split(/\r?\n/).flatMap(line=>{const match=line.match(/^\s*(\d+)\s+(\d+)\s*\*?\s*$/);return match?[[Number(match[1]),Number(match[2])]]:[];});}
export async function windowsReservations(ports){
  if(process.platform!=='win32')return [];
  try{const result=await command('netsh',['interface','ipv4','show','excludedportrange','protocol=tcp']);return ports.filter(port=>excludedPorts(result.stdout).some(([start,end])=>port>=start&&port<=end));}catch{return [];}
}
export function composeOverride(config){return `services:\n  database:\n    ports: !override\n      - "127.0.0.1:${config.databasePort}:5432"\n  keycloak:\n    ports: !override\n      - "127.0.0.1:${config.identityPort}:8080"\n`;}
export function compatibleCompose(version){const m=version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);return !!m&&(Number(m[1])>2||Number(m[1])===2&&(Number(m[2])>24||Number(m[2])===24&&Number(m[3])>=4));}
export async function dockerReady(){
  try{await command('docker',['info','--format','{{.ServerVersion}}']);}catch{throw new LocalProblem('Docker is unavailable. Open Docker Desktop and wait for the Linux engine, then retry.');}
  let version;try{version=(await command('docker',['compose','version','--short'])).stdout;}catch{throw new LocalProblem('Docker Compose is unavailable. Enable the Docker Compose plugin.');}
  if(!compatibleCompose(version))throw new LocalProblem('Docker Compose 2.24.4 or later is required for safe port replacement. Update Docker Desktop/Compose.');
}
export async function httpReady(url,validate,timeout=2000){
  try{const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(timeout)});if(!response.ok){await response.body?.cancel();return false;}return await validate(response);}catch{return false;}
}
export function apiHealthy(response,version){return response.json().then(body=>body.status==='ok'&&body.contractVersion===version).catch(()=>false);}
export async function identityReady(config){return httpReady(`${config.issuer}/.well-known/openid-configuration`,r=>r.json().then(body=>body.issuer===config.issuer));}
export async function waitForIdentity(config,signal,timeout=75000){
  const until=Date.now()+timeout;
  while(Date.now()<until){if(signal?.aborted)throw new LocalProblem('Startup cancelled.');if(await identityReady(config))return true;await delay(300);}
  return false;
}
export function redact(text){return text.replace(/\b(postgres(?:ql)?:\/\/)[^\s/@]+@/gi,'$1[redacted]@').replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi,'Bearer [redacted]');}

/** Own only direct child handles/groups created here. Never discover/kill a port owner. */
export class OwnedProcesses{
  children=[];
  stopping=false;
  constructor(log=console.log){this.log=log;}
  start(name,file,args,options={}){
    const child=spawn(file,args,{...options,detached:true,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
    const record={name,child,ended:false,error:null};this.children.push(record);
    child.once('error',()=>{record.error=true;record.ended=true;});child.once('exit',()=>{record.ended=true;});
    for(const stream of [child.stdout,child.stderr]){let line='';stream?.setEncoding('utf8');stream?.on('data',chunk=>{line+=chunk;const lines=line.split(/\r?\n/);line=lines.pop();for(const text of lines)this.log(`[${name}] ${redact(text).slice(0,16000)}`);if(line.length>65536){this.log(`[${name}] ${redact(line).slice(0,16000)} [truncated]`);line='';}});stream?.once('end',()=>{if(line)this.log(`[${name}] ${redact(line).slice(0,16000)}`);});}
    return record;
  }
  assertRunning(){if(this.children.some(r=>r.ended))throw new LocalProblem('An owned development server exited. Both servers will be stopped; inspect the prefixed server output.');}
  async stop(){
    this.stopping=true;
    await Promise.all(this.children.map(async r=>{
      if(r.ended||!r.child.pid)return;
      if(process.platform==='win32'){
        try{await command('taskkill',['/PID',String(r.child.pid),'/T','/F'],{timeout:10000});}catch{if(!r.ended)throw new LocalProblem('An owned server could not be stopped. Close its originating terminal; unrelated processes were not targeted.');}
      }else{
        try{process.kill(-r.child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
        const until=Date.now()+3000;while(!r.ended&&Date.now()<until)await delay(50);
        if(!r.ended)try{process.kill(-r.child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}
      }
    }));
    const until=Date.now()+2000;while(this.children.some(r=>!r.ended)&&Date.now()<until)await delay(30);
  }
}
export async function waitFor(owned,url,validate,timeout=45000,stopped=()=>false){
  const until=Date.now()+timeout;
  while(Date.now()<until){if(stopped())throw new LocalProblem('Startup cancelled.');owned.assertRunning();if(await httpReady(url,validate))return;await delay(200);}
  throw new LocalProblem('A development server did not become ready before the timeout. Both owned servers will be stopped.');
}
