import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
import {createServer} from 'node:http';
import {argumentsFor,composeOverride,compatibleCompose,excludedPorts,redact,selectNode,checkDependencies,portStatus,OwnedProcesses,waitFor,waitForIdentity,httpReady,apiHealthy} from './local-dev-core.mjs';
import {initializeEnv,doctor,start,assertComposeBindings} from './local-dev.mjs';

async function temporary(t){const root=await mkdtemp(join(tmpdir(),'agap-local-test-'));t.after(async()=>{assert(root.startsWith(resolve(tmpdir())+sep)&&basename(root).startsWith('agap-local-test-'));await rm(root,{recursive:true,force:true});});return root;}
async function file(root,path,text){const full=join(root,path);await mkdir(resolve(full,'..'),{recursive:true});await writeFile(full,text);}
async function exists(path){try{await access(path);return true;}catch{return false;}}
async function server(handler){const s=createServer(handler);await new Promise(done=>s.listen(0,'127.0.0.1',done));return {server:s,port:s.address().port,close:()=>new Promise(done=>{s.closeAllConnections();s.close(done);})};}
async function freePort(){const s=await server((_,r)=>r.end());const port=s.port;await s.close();return port;}

test('arguments reject writes in doctor and accept only explicit startup choices',()=>{
  assert.equal(argumentsFor(['doctor','--json']).flags.has('--json'),true);assert.equal(argumentsFor(['start','--help']).command,'help');
  for(const args of [['doctor','--migrate'],['start','--reset'],['start','--fresh','--fresh'],['help','--seed']])assert.throws(()=>argumentsFor(args));
  assert.equal(argumentsFor(['start','--migrate','--seed','--fresh']).flags.size,3);
});
test('Compose replaces custom bindings and enforces the required merge capability',()=>{
  const out=composeOverride({databasePort:55435,identityPort:18080});assert.match(out,/ports: !override/);assert.match(out,/127\.0\.0\.1:55435:5432/);assert.match(out,/127\.0\.0\.1:18080:8080/);assert.doesNotMatch(out,/55432|58080/);
  for(const v of ['2.24.4','v2.27.0','5.1.0'])assert(compatibleCompose(v));for(const v of ['2.24.3','2.23.9','1.29.0','unknown'])assert(!compatibleCompose(v));
});
test('Windows reservation parsing ignores localized headings and preserves both range bounds',()=>{assert.deepEqual(excludedPorts('Localized title\n Start End\n  55432 55440 *\n 58000 58099\n'),[[55432,55440],[58000,58099]]);});
test('existing Compose services with mismatched or non-loopback bindings are never replaced',async()=>{
  const calls=[],config={databasePort:55435,identityPort:18080};
  const execute=async(_,args)=>{calls.push(args);return {stdout:args[0]==='ps'?'fictional-id database\n':JSON.stringify({'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'55432'}]})};};
  await assert.rejects(assertComposeBindings(config,execute),/No running infrastructure was replaced/);assert(calls.every(args=>['ps','inspect'].includes(args[0])));
  await assertComposeBindings(config,async(_,args)=>({stdout:args[0]==='ps'?'fictional-id database\n':JSON.stringify({'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'55435'}]})}));
  await assert.rejects(assertComposeBindings(config,async(_,args)=>({stdout:args[0]==='ps'?'fictional-id database\n':JSON.stringify({'5432/tcp':[{HostIp:'0.0.0.0',HostPort:'55435'}]})})),/different bindings/);
});
test('server log filtering removes database credentials and bearer tokens',()=>{assert.equal(redact('postgresql://owner:PRIVATE@localhost:55435/agap Bearer PRIVATE-TOKEN'),'postgresql://[redacted]@localhost:55435/agap Bearer [redacted]');});
test('Node 24 selection keeps a valid current executable without downloading or changing PATH',async()=>{const before=process.env.PATH;assert.equal(await selectNode('/nonexistent',{path:'selected-node',version:'v24.22.2'}),'selected-node');assert.equal(process.env.PATH,before);});
test('unsupported Node with no cache returns an actionable failure',async t=>{const root=await temporary(t);await assert.rejects(selectNode(root,{path:'unused',version:'v26.0.0'}),/Node 24 is required/);});
test('dependency mismatch is detected without installing or rewriting anything',async t=>{
  const root=await temporary(t);await file(root,'package.json',JSON.stringify({dependencies:{example:'1.0.0'}}));await file(root,'package-lock.json',JSON.stringify({packages:{'node_modules/example':{version:'1.0.0'}}}));await file(root,'node_modules/example/package.json',JSON.stringify({version:'0.9.0'}));
  await assert.rejects(checkDependencies(root),/npm.cmd ci/);assert.equal(JSON.parse(await readFile(join(root,'node_modules/example/package.json'),'utf8')).version,'0.9.0');
});
test('explicit environment creation never overwrites an existing private environment',async t=>{
  const root=await temporary(t);await file(root,'.env.example','FICTIONAL=true\n');assert.equal(await initializeEnv(root),true);await file(root,'.env','PRIVATE=unchanged\n');assert.equal(await initializeEnv(root),false);assert.equal(await readFile(join(root,'.env'),'utf8'),'PRIVATE=unchanged\n');
});
test('doctor reports missing setup without creating configuration or running installation',async t=>{
  const root=await temporary(t),output=[];const code=await doctor(root,new Set(['--json','--no-infra']),s=>output.push(s));assert.equal(code,1);assert.equal(await exists(join(root,'.env')),false);assert.equal(await exists(join(root,'node_modules')),false);assert(!JSON.parse(output.join('')).ok);
});
test('owned process cleanup stops its descendant server while an unrelated server stays alive',{timeout:20000},async()=>{
  const unrelated=await server((_,r)=>r.end('unrelated')),owned=new OwnedProcesses(()=>{}),port=await freePort(),descendantPort=await freePort();
  const descendant=`require('node:http').createServer((q,r)=>r.end('descendant')).listen(${descendantPort},'127.0.0.1')`;
  const script=`require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'inherit'});require('node:http').createServer((q,r)=>r.end('owned')).listen(${port},'127.0.0.1')`;
  try{
    owned.start('test',process.execPath,['-e',script]);await waitFor(owned,`http://127.0.0.1:${port}`,r=>r.text().then(t=>t==='owned'),6000);await waitFor(owned,`http://127.0.0.1:${descendantPort}`,r=>r.text().then(t=>t==='descendant'),6000);
    await owned.stop();assert.equal(await portStatus('127.0.0.1',port),'free');assert.equal(await portStatus('127.0.0.1',descendantPort),'free');assert(await httpReady(`http://127.0.0.1:${unrelated.port}`,r=>r.text().then(t=>t==='unrelated')));
    await owned.stop();
  }finally{try{await owned.stop();}finally{await unrelated.close();}}
});
test('a failed child aborts readiness and cleanup stops the other owned server',{timeout:15000},async()=>{
  const owned=new OwnedProcesses(()=>{}),port=await freePort();try{owned.start('healthy',process.execPath,['-e',`require('node:http').createServer((q,r)=>r.end('ok')).listen(${port},'127.0.0.1')`]);await waitFor(owned,`http://127.0.0.1:${port}`,r=>r.text().then(t=>t==='ok'),6000);owned.start('failed',process.execPath,['-e','process.exit(7)']);await assert.rejects(waitFor(owned,`http://127.0.0.1:${await freePort()}`,()=>true,5000),/exited/);}finally{await owned.stop();}assert.equal(await portStatus('127.0.0.1',port),'free');
});
test('readiness timeout leaves cleanup able to stop an owned process',{timeout:10000},async()=>{const owned=new OwnedProcesses(()=>{});try{owned.start('waiting',process.execPath,['-e','setInterval(()=>{},1000)']);await assert.rejects(waitFor(owned,`http://127.0.0.1:${await freePort()}`,()=>true,300),/timeout/);}finally{await owned.stop();}});

/** Controlled child servers verify orchestration only; actual config/database probes have separate tests. */
async function fixture(t,{pending=false,failWeb=false,delayedIdentity=false}={}){
  const root=await temporary(t),apiPort=await freePort(),webPort=await freePort();let issuer,discoveryRequests=0;
  const identity=await server((q,r)=>{discoveryRequests++;r.setHeader('content-type','application/json');r.statusCode=delayedIdentity&&discoveryRequests<3?503:200;r.end(JSON.stringify({issuer}));});issuer=`http://127.0.0.1:${identity.port}/realms/agap`;
  t.after(()=>identity.close());
  const config={origin:`http://127.0.0.1:${webPort}`,webHost:'127.0.0.1',webPort,apiUrl:`http://127.0.0.1:${apiPort}`,apiHost:'127.0.0.1',apiPort,identityPort:identity.port,issuer,databaseName:'agap',databasePort:5432,contractVersion:'test-local'};
  await file(root,'package.json','{"type":"module"}');await file(root,'package-lock.json','{"packages":{}}');await file(root,'.env','FICTIONAL=true\n');await file(root,'.env.example','FICTIONAL=true\n');await file(root,'node_modules/tsx/dist/loader.mjs','');
  await file(root,'apps/api/scripts/local-inspect.ts',`import {existsSync} from 'node:fs';console.log(JSON.stringify({ok:true,data:process.argv[2]==='config'?${JSON.stringify(config)}:{pending:${pending}&&!existsSync('migration-ran')?['pending.sql']:[],changed:[],unknown:[]}}));`);
  await file(root,'apps/api/scripts/migrate.ts',`import {writeFileSync} from 'node:fs';writeFileSync('migration-ran','explicit');`);await file(root,'apps/api/scripts/seed.ts',`import {writeFileSync} from 'node:fs';writeFileSync('seed-ran','explicit');`);
  await file(root,'apps/api/src/main.ts',`import http from 'node:http';http.createServer((q,r)=>{r.setHeader('content-type','application/json');r.end(JSON.stringify({status:'ok',contractVersion:'test-local'}));}).listen(${apiPort},'127.0.0.1');`);
  await file(root,'node_modules/vite/bin/vite.js',failWeb?'process.exit(9);':`import http from 'node:http';import {writeFileSync} from 'node:fs';writeFileSync('web-args',JSON.stringify(process.argv));http.createServer(async(q,r)=>{if(q.url==='/api/v1/health'){const response=await fetch(process.env.AGAP_API_TARGET+q.url);r.setHeader('content-type','application/json');r.end(await response.text());}else r.end('<html><script src="/@vite/client"></script></html>');}).listen(${webPort},'127.0.0.1');`);
  return {root,config,discoveryRequests:()=>discoveryRequests};
}
test('startup refuses pending migrations without implicit migration or seed',{timeout:15000},async t=>{const f=await fixture(t,{pending:true});await assert.rejects(start(f.root,new Set(['--no-infra']),{signal:new AbortController().signal,log:()=>{}}),/pending/);assert.equal(await exists(join(f.root,'migration-ran')),false);assert.equal(await exists(join(f.root,'seed-ran')),false);assert.equal(await portStatus('127.0.0.1',f.config.apiPort),'free');});
test('occupied ports fail before explicitly requested data writes',{timeout:15000},async t=>{
  const f=await fixture(t),other=createServer((_,r)=>r.end('unrelated'));await new Promise(done=>other.listen(f.config.webPort,'127.0.0.1',done));try{await assert.rejects(start(f.root,new Set(['--no-infra','--migrate','--seed']),{signal:new AbortController().signal,log:()=>{}}),/port .*occupied/);assert.equal(await exists(join(f.root,'migration-ran')),false);assert.equal(await exists(join(f.root,'seed-ran')),false);}finally{await new Promise(done=>other.close(done));}
});
test('explicit setup, strict frontend port, fresh cache and proxy readiness share one owned lifecycle',{timeout:25000},async t=>{
  const f=await fixture(t,{pending:true,delayedIdentity:true}),abort=new AbortController(),output=[];let ready=false;
  try{const code=await start(f.root,new Set(['--no-infra','--migrate','--seed','--fresh']),{signal:abort.signal,log:text=>{output.push(text);if(text.startsWith('AGAP is ready:')){ready=true;abort.abort();}}});assert.equal(code,0);assert(ready);assert.equal(await readFile(join(f.root,'migration-ran'),'utf8'),'explicit');assert.equal(await readFile(join(f.root,'seed-ran'),'utf8'),'explicit');const args=JSON.parse(await readFile(join(f.root,'web-args'),'utf8'));assert(args.includes('--strictPort'));assert(args.includes('--force'));assert(output.some(s=>s.includes('API/frontend stopped')));}finally{abort.abort();}
  assert(f.discoveryRequests()>=3);assert.equal(await portStatus('127.0.0.1',f.config.apiPort),'free');assert.equal(await portStatus('127.0.0.1',f.config.webPort),'free');assert(await httpReady(`${f.config.issuer}/.well-known/openid-configuration`,r=>r.json().then(b=>b.issuer===f.config.issuer)));
});
test('identity readiness times out or cancels without starting application processes',{timeout:5000},async()=>{
  const identity=await server((_,r)=>{r.statusCode=503;r.end('starting');});try{const config={issuer:`http://127.0.0.1:${identity.port}`};assert.equal(await waitForIdentity(config,undefined,100),false);const abort=new AbortController();abort.abort();await assert.rejects(waitForIdentity(config,abort.signal),/cancelled/);}finally{await identity.close();}
});
test('frontend startup failure stops the already ready API',{timeout:15000},async t=>{const f=await fixture(t,{failWeb:true});await assert.rejects(start(f.root,new Set(['--no-infra']),{signal:new AbortController().signal,log:()=>{}}),/exited/);assert.equal(await portStatus('127.0.0.1',f.config.apiPort),'free');});
test('API health rejects a stale contract or an unrelated response',async()=>{assert.equal(await apiHealthy(new Response('{"status":"ok","contractVersion":"old"}'),'current'),false);assert.equal(await apiHealthy(new Response('not-json'),'current'),false);});
