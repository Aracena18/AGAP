import {access,copyFile,mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {argumentsFor,LocalProblem,command,selectNode,checkDependencies,nodeOptions,typescriptArgs,inspect,portStatus,windowsReservations,composeOverride,dockerReady,httpReady,apiHealthy,identityReady,waitForIdentity,OwnedProcesses,waitFor,delay} from './local-dev-core.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const help=`AGAP fictional local development

  npm.cmd run local:doctor                 Read-only checks; no services/data changed
  npm.cmd run local:dev                    Start dependencies, API and frontend
  npm.cmd run local:dev -- --fresh          Re-optimize Vite dependencies on startup
  npm.cmd run local:dev -- --migrate        Explicitly apply pending local migrations
  npm.cmd run local:dev -- --seed           Explicitly run the existing fictional seed
  npm.cmd run local:dev -- --init-env       Create .env from .env.example if absent
  npm.cmd run local:dev -- --no-infra       Use already managed local dependencies

Options may be combined. First setup: --init-env --migrate --seed
Doctor accepts --json and --no-infra. Open Docker Desktop first.
Run npm.cmd ci after dependency changes. Ctrl+C stops only the owned API/frontend.
Database and identity containers remain running. No port owners are killed.
`;
async function hasEnv(folder){try{await access(join(folder,'.env'),constants.R_OK);return true;}catch{return false;}}
export async function initializeEnv(folder){
  try{await copyFile(join(folder,'.env.example'),join(folder,'.env'),constants.COPYFILE_EXCL);return true;}
  catch(error){if(error.code==='EEXIST')return false;throw new LocalProblem('Could not create .env. Check local file permissions; existing configuration was not overwritten.');}
}
function historyProblem(history){
  if(history.changed.length||history.unknown.length)return 'Database migration history differs from this checkout. Use the matching branch and investigate the checksum/history; no automatic repair or rollback is performed.';
  if(history.pending.length)return `${history.pending.length} migration(s) pending. Run npm.cmd run local:dev -- --migrate to apply them explicitly.`;
  return null;
}
function portMessage(label,port,state){return `${label} port ${port} is ${state}. Stop its owning terminal yourself, or configure matching local ports in .env. On Windows, inspect Get-NetTCPConnection and netsh interface ipv4 show excludedportrange protocol=tcp. No process was stopped.`;}
export async function doctor(folder,flags,log=console.log){
  const checks=[];let node,config;
  const check=async(label,work)=>{try{const message=await work();checks.push({label,status:'ok',message:message??'Ready'});return true;}catch(error){checks.push({label,status:'error',message:error instanceof LocalProblem?error.message:'Check failed; private diagnostic details are withheld.'});return false;}};
  await check('Node 24',async()=>{node=await selectNode(folder);return `Selected ${node}`;});
  const deps=await check('Dependencies',()=>checkDependencies(folder));
  const env=await check('.env',async()=>{if(!await hasEnv(folder))throw new LocalProblem('.env is missing. Use npm.cmd run local:dev -- --init-env for explicit setup.');});
  if(!flags.has('--no-infra'))await check('Docker / Compose',dockerReady);
  if(node&&deps&&env)await check('Fictional local configuration',async()=>{config=await inspect(folder,node,'config');return `Frontend ${config.origin}; API ${config.apiUrl}; PostgreSQL port ${config.databasePort}; identity port ${config.identityPort}.`;});
  if(config){
    await check('Database / migrations',async()=>{const history=await inspect(folder,node,'database'),problem=historyProblem(history);if(problem)throw new LocalProblem(problem);return 'Runtime and identity connections work; registered migration checksums match.';});
    await check('Identity discovery',async()=>{if(!await identityReady(config))throw new LocalProblem(`Local Keycloak discovery is unavailable on port ${config.identityPort}, or its issuer differs from .env. Start the local identity service and check OIDC_ISSUER.`);});
    const reserved=await windowsReservations([config.apiPort,config.webPort]);
    for(const [label,host,port,url,validate] of [['API',config.apiHost,config.apiPort,`${config.apiUrl}/api/v1/health`,r=>apiHealthy(r,config.contractVersion)],['Frontend',config.webHost,config.webPort,config.origin,r=>r.text().then(html=>html.includes('/@vite/client'))]]){
      const state=await portStatus(host,port);
      if(state==='free'&&!reserved.includes(port))checks.push({label,status:'ok',message:`Port ${port} is free; ready to start.`});
      else if(await httpReady(url,validate))checks.push({label,status:'info',message:`Already responding on port ${port}. local:dev will not replace this process; stop its original terminal before starting another instance.`});
      else checks.push({label,status:'error',message:portMessage(label,port,reserved.includes(port)?'reserved by Windows':state)});
    }
  }
  const report={ok:!checks.some(c=>c.status==='error'),checks};
  if(flags.has('--json'))log(JSON.stringify(report,null,2));else{for(const c of checks)log(`[${c.status.toUpperCase()}] ${c.label}: ${c.message}`);log(report.ok?'Local checks passed.':'Resolve the reported checks, then retry.');}
  return report.ok?0:1;
}
export async function assertComposeBindings(config,execute=command){
  const list=(await execute('docker',['ps','--filter','label=com.docker.compose.project=agap-platform','--format','{{.ID}} {{.Label "com.docker.compose.service"}}'])).stdout;
  for(const line of list.trim().split(/\r?\n/).filter(Boolean)){
    const [id,service]=line.split(/\s+/),target=service==='database'?['5432/tcp',config.databasePort]:service==='keycloak'?['8080/tcp',config.identityPort]:null;
    if(!target)continue;
    const bindings=JSON.parse((await execute('docker',['inspect','--format','{{json .NetworkSettings.Ports}}',id])).stdout);
    const active=bindings?.[target[0]]??[];
    if(active.length!==1||active[0].HostIp!=='127.0.0.1'||Number(active[0].HostPort)!==target[1])throw new LocalProblem(`The running agap-platform ${service} uses different bindings. Match .env to that service or stop/reconfigure it explicitly. No running infrastructure was replaced.`);
  }
}
async function startInfrastructure(folder,config,log,signal){
  if(config.databaseName!=='agap')throw new LocalProblem('The development Compose services create agap. Use --no-infra for an independently managed agap_test database.');
  await dockerReady();await assertComposeBindings(config);
  const directory=await mkdtemp(join(tmpdir(),'agap-local-dev-')),override=join(directory,'compose.override.yml');
  try{
    await writeFile(override,composeOverride(config),{mode:0o600});log('Starting/checking local PostgreSQL and Keycloak with the ports from .env…');
    try{await command('docker',['compose','-f',resolve(folder,'infra/compose.yml'),'-f',override,'--profile','identity','up','-d','--wait','--wait-timeout','75'],{cwd:folder,timeout:100000,signal});}
    catch(error){if(signal?.aborted)throw new LocalProblem('Startup cancelled.');const bind=/ports are not available|bind:|address already in use|forbidden by its access permissions/i.test(`${error.stdout??''}${error.stderr??''}`);throw new LocalProblem(bind?`Docker cannot bind PostgreSQL ${config.databasePort} or Keycloak ${config.identityPort}. Check occupied/Windows-reserved ports and configure matching .env endpoints. No process was killed and no volume was reset.`:'Local infrastructure did not become healthy. Check Docker Desktop and the agap-platform Compose service logs. No volume or credentials were reset.');}
  }finally{await unlink(override).catch(()=>{});await rmdir(directory).catch(()=>{});}
}
async function operatorCommand(folder,node,file,label,log,signal){
  log(label);
  try{const result=await command(node,typescriptArgs(folder,file),{...nodeOptions(folder),signal,timeout:120000});log(result.stdout.trim());}
  catch{throw new LocalProblem(`${label} did not complete. Inspect the existing dedicated operator command. Private error details are withheld; no rollback/reset is attempted.`);}
}
export async function start(folder,flags,{signal,log=console.log}={}){
  const node=await selectNode(folder);await checkDependencies(folder);
  if(flags.has('--init-env'))log(await initializeEnv(folder)?'Created fictional .env from .env.example.':'Kept the existing .env unchanged.');
  if(!await hasEnv(folder))throw new LocalProblem('.env is missing. Use --init-env for explicit first-time setup.');
  const config=await inspect(folder,node,'config');
  if(flags.has('--seed')&&config.databaseName!=='agap')throw new LocalProblem('The existing fictional seed supports only the local agap database. No seed was run.');
  log(`Using Node 24: ${node}`);
  const reserved=await windowsReservations([config.apiPort,config.webPort]);
  for(const [label,host,port] of [['API',config.apiHost,config.apiPort],['Frontend',config.webHost,config.webPort]]){const state=await portStatus(host,port);if(state!=='free'||reserved.includes(port))throw new LocalProblem(portMessage(label,port,reserved.includes(port)?'reserved by Windows':state));}
  if(!flags.has('--no-infra'))await startInfrastructure(folder,config,log,signal);
  if(signal?.aborted)return 0;
  let history=await inspect(folder,node,'database');
  if(history.changed.length||history.unknown.length)throw new LocalProblem(historyProblem(history));
  if(flags.has('--migrate')){await operatorCommand(folder,node,'apps/api/scripts/migrate.ts','Applying explicitly requested local migrations',log,signal);history=await inspect(folder,node,'database');}
  const problem=historyProblem(history);if(problem)throw new LocalProblem(problem);
  if(flags.has('--seed'))await operatorCommand(folder,node,'apps/api/scripts/seed.ts','Running the explicitly requested fictional seed',log,signal);
  log(`Waiting for local Keycloak discovery on port ${config.identityPort}…`);
  if(!await waitForIdentity(config,signal))throw new LocalProblem(`Keycloak discovery did not match OIDC_ISSUER on port ${config.identityPort} before the readiness timeout. Check the local identity service. Authentication modes and credentials were not changed.`);
  if(signal?.aborted)return 0;
  const owned=new OwnedProcesses(log);
  try{
    owned.start('API',node,typescriptArgs(folder,'apps/api/src/main.ts'),nodeOptions(folder));
    await waitFor(owned,`${config.apiUrl}/api/v1/health`,r=>apiHealthy(r,config.contractVersion),45000,()=>signal?.aborted);
    owned.start('Web',node,[join(folder,'node_modules/vite/bin/vite.js'),'--host',config.webHost,'--port',String(config.webPort),'--strictPort',...(flags.has('--fresh')?['--force']:[])],{cwd:folder,env:{...process.env,AGAP_API_TARGET:config.apiUrl}});
    await waitFor(owned,config.origin,r=>r.text().then(html=>html.includes('/@vite/client')),45000,()=>signal?.aborted);
    if(!await httpReady(`${config.origin}/api/v1/health`,r=>apiHealthy(r,config.contractVersion)))throw new LocalProblem('Frontend-to-API proxy health failed. Check the configured API host and origin.');
    log(`AGAP is ready: ${config.origin}/\nAPI health: ${config.apiUrl}/api/v1/health\nPress Ctrl+C to stop this API and frontend. PostgreSQL and Keycloak will remain running.`);
    while(!signal?.aborted){owned.assertRunning();await delay(200);}
    return 0;
  }finally{await owned.stop();log('Owned API/frontend stopped. Shared PostgreSQL and Keycloak were left running.');}
}
export async function main(args,options={}){
  const {command:mode,flags}=argumentsFor(args);
  if(mode==='help'){(options.log??console.log)(help);return 0;}
  const folder=options.root??root;
  return mode==='doctor'?doctor(folder,flags,options.log):start(folder,flags,options);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const abort=new AbortController(),stop=()=>abort.abort();process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try{process.exitCode=await main(process.argv.slice(2),{signal:abort.signal});}
  catch(error){if(abort.signal.aborted){console.log('Local startup cancelled.');process.exitCode=0;}else{console.error(error instanceof LocalProblem?error.message:'Local startup failed. Run npm.cmd run local:doctor; private error details are withheld.');process.exitCode=1;}}
  finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
}
