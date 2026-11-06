import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {resourceNames,cleanupOwned,inventorySql,securitySql} from './restore-drill-core.mjs';

// No .env, existing databases, published ports, shared Compose projects or host UID.
export async function drill(root=process.cwd()) {
  const id=randomUUID(),names=resourceNames(id),started=Date.now();
  const report={schema:1,fictional:true,runId:id,executedAt:new Date().toISOString(),result:'failed',hostPlatform:process.platform,
    images:{postgres:'postgres:18-alpine',node:'node:24-bookworm',restic:'restic/restic:0.18.1'},checks:{},
    limitations:['Fictional local recovery only; no production approval or approved RPO/RTO.',
      'Keycloak/MFA, external identity, institutional signing keys, offsite copies, retention and independent key custody are not tested.',
      'Document scanner/extractor use explicit test adapters; this does not evaluate malware detection, OCR or AI.',
      'Private snapshots, plaintext, fixture sessions and recovery key are destroyed with run-owned resources.']};
  const containers=[names.installer,names.seed,names.verify,names.source,names.restore,names.backup];
  const volumes=[names.dependencies,names.data];let phase='preflight',destination,failed;
  const docker=(args,input)=>{
    try{return execFileSync('docker',args,{input,windowsHide:true,maxBuffer:64*1024*1024,timeout:900000,stdio:['pipe','pipe','pipe']});}
    catch(error){throw new Error(`Recovery ${phase} failed (Docker exit ${error.status??'unavailable'}).`,{cause:error});}
  };
  const labels=['--label','agap.task=recovery-verification','--label',`agap.recovery.run=${id}`];
  const sql=(container,query,user='agap_owner')=>docker(['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d','agap_test'],query).toString().trim();
  const write=(path,bytes)=>docker(['exec','-i',names.backup,'sh','-c','umask 077; cat > "$1"','sh',path],bytes);
  const restic=(args,passwordFile='/recovery/key')=>docker(['exec',names.backup,'restic','--no-cache','--repo','/recovery/repository','--password-file',passwordFile,...args]).toString();
  async function database(name,user) {
    docker(['run','-d','--name',name,...labels,'--network','none','--tmpfs','/var/lib/postgresql',
      '-e',`POSTGRES_USER=${user}`,'-e','POSTGRES_PASSWORD=development-owner','-e','POSTGRES_DB=agap_test',report.images.postgres]);
    for(let attempt=0;attempt<120;attempt++){
      const log=docker(['logs',name]).toString();
      if(log.includes('PostgreSQL init process complete')){try{sql(name,'SELECT 1',user);return;}catch{/* Final server may still be starting. */}}
      await new Promise(done=>setTimeout(done,500));
    }
    throw new Error('Disposable PostgreSQL did not become ready.');
  }
  function fixture(name,database,mode){
    docker(['run','--name',name,...labels,'--network',`container:${database}`,
      '--mount',`type=bind,src=${root},dst=/app,readonly`,'--mount',`type=volume,src=${names.dependencies},dst=/app/node_modules`,
      '--mount',`type=volume,src=${names.data},dst=/recovery`,'-w','/app',
      '-e','AGAP_TEST_DATABASE_URL=postgresql://agap_owner:development-owner@127.0.0.1:5432/agap_test',
      '-e',`AGAP_RECOVERY_RUN=${id}`,report.images.node,'node','node_modules/tsx/dist/cli.mjs','--tsconfig','tsconfig.platform.json',
      'apps/api/test/recovery-fixture.ts',mode]);
  }
  try{
    assert(process.argv.slice(2).length===0,'ops:drill accepts no database, output or container overrides.');
    root=await assertDirectory(root);
    const backupRoot=join(root,'.backups');await mkdir(backupRoot,{recursive:true,mode:0o700});await assertDirectory(backupRoot);
    destination=join(backupRoot,`recovery-${id}`);await mkdir(destination,{mode:0o700});
    assert.equal(docker(['info','--format','{{.OSType}}']).toString().trim(),'linux','Docker must use Linux containers.');
    for(const name of volumes)docker(['volume','create',...labels,name]);
    phase='dependency installation';console.log('Recovery: installing isolated Linux dependencies.');
    docker(['run','--name',names.installer,...labels,'--mount',`type=bind,src=${root},dst=/app,readonly`,
      '--mount',`type=volume,src=${names.dependencies},dst=/app/node_modules`,'-w','/app',report.images.node,'npm','ci','--ignore-scripts','--no-audit','--no-fund']);
    phase='source fixture';console.log('Recovery: creating a fictional financial workflow and evidence files.');
    docker(['run','-d','--name',names.backup,...labels,'--network','none','--mount',`type=volume,src=${names.data},dst=/recovery`,
      '--entrypoint','sh',report.images.restic,'-c','mkdir -m 700 /recovery/source; exec sleep infinity']);
    await database(names.source,'agap_owner');
    sql(names.source,"CREATE ROLE agap_runtime LOGIN PASSWORD 'development-runtime' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; CREATE ROLE agap_identity LOGIN PASSWORD 'development-identity' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;");
    fixture(names.seed,names.source,'seed');
    // The fixture process has exited. Only this coordinator can write either cluster.
    const before=sql(names.source,inventorySql),security=sql(names.source,securitySql);
    const dump=docker(['exec',names.source,'pg_dump','-U','agap_owner','-d','agap_test','--format=custom']);
    const roles=docker(['exec',names.source,'pg_dumpall','-U','agap_owner','--roles-only','--no-role-passwords']);
    assert.equal(sql(names.source,inventorySql),before,'Source changed during backup.');
    write('/recovery/source/database.dump',dump);write('/recovery/source/roles.sql',roles);
    write('/recovery/key',randomBytes(32).toString('hex'));write('/recovery/wrong-key',randomBytes(32).toString('hex'));
    docker(['exec',names.backup,'sh','-c','cd /recovery/source && find . -type f -exec sha256sum {} + > /recovery/checksums']);
    phase='encrypted backup';console.log('Recovery: encrypting and checking the backup.');
    restic(['init','--quiet']);
    const summary=restic(['backup','/recovery/source','--tag','agap-fictional-recovery','--json']).trim().split('\n').map(line=>JSON.parse(line)).find(line=>line.message_type==='summary');
    assert(summary?.snapshot_id,'Backup did not produce a snapshot.');restic(['check','--read-data','--quiet']);
    assert.throws(()=>restic(['snapshots','--json'],'/recovery/wrong-key'),'Wrong password unexpectedly opened the repository.');
    report.checks.encryptedRepositoryAndWrongPassword=true;
    // These are fixed paths in this run's newly created private Docker volume.
    docker(['exec',names.backup,'rm','-rf','/recovery/source']);
    docker(['exec',names.backup,'test','!','-e','/recovery/source']);report.checks.plaintextRemovedBeforeRestore=true;
    phase='restore';console.log('Recovery: restoring into a separate cluster.');
    restic(['restore',summary.snapshot_id,'--target','/recovery/restored','--verify','--quiet']);
    phase='restored file hashes';const recovered='/recovery/restored/recovery/source';
    docker(['exec',names.backup,'sh','-c','cd "$1" && sha256sum -c /recovery/checksums','sh',recovered]);report.checks.allBackupFileHashesMatched=true;
    phase='restore cluster startup';await database(names.restore,'agap_recovery_admin');
    phase='restore roles';
    sql(names.restore,docker(['exec',names.backup,'cat',`${recovered}/roles.sql`]),'agap_recovery_admin');
    // Passwords are excluded from the dump. Only public fictional credentials are re-established.
    sql(names.restore,"ALTER ROLE agap_owner PASSWORD 'development-owner'; ALTER ROLE agap_runtime PASSWORD 'development-runtime'; ALTER ROLE agap_identity PASSWORD 'development-identity'; ALTER DATABASE agap_test OWNER TO agap_owner;",'agap_recovery_admin');
    phase='restore database';docker(['exec','-i',names.restore,'pg_restore','--exit-on-error','-U','agap_owner','-d','agap_test'],docker(['exec',names.backup,'cat',`${recovered}/database.dump`]));
    phase='restored database fingerprints';
    assert.equal(sql(names.restore,inventorySql),before,'Restored database rows or sequence positions differ.');
    const restoredSecurity=sql(names.restore,securitySql);
    if(restoredSecurity!==security){
      await writeFile(join(destination,'source-security.json'),security,{flag:'wx',mode:0o600});
      await writeFile(join(destination,'restored-security.json'),restoredSecurity,{flag:'wx',mode:0o600});
      throw new Error('Restored roles, ACLs, owners or RLS differ; inspect private security diagnostics.');
    }
    report.checks.allTableAndSequenceFingerprintsMatched=true;report.checks.roleOwnershipAclAndRlsMatched=true;
    report.tableCounts=Object.fromEntries(Object.entries(JSON.parse(before)).filter(([,v])=>'count' in v).map(([table,v])=>[table,v.count]));
    // Deliberately unsafe changes in rolled-back transactions must change the security fingerprint.
    for(const change of ['ALTER ROLE agap_runtime BYPASSRLS','GRANT DELETE ON public.agap_migrations TO agap_runtime']){
      const altered=sql(names.restore,`BEGIN; ${change}; ${securitySql} ROLLBACK;`);
      assert.notEqual(altered,security,'Security verification did not detect a deliberate privilege change.');
      assert.equal(sql(names.restore,securitySql),security,'Security fault injection did not roll back.');
    }
    report.checks.permissionDriftDetected=true;
    phase='restored application verification';fixture(names.verify,names.restore,'verify');
    const business=JSON.parse(docker(['exec',names.backup,'cat','/recovery/result.json']).toString());
    assert.equal(business.passed,true);report.business=business;report.result='passed';
  }catch(error){
    failed=error;report.failure={phase,message:error.message};
    if(destination&&error.cause?.stderr)await writeFile(join(destination,'failure.log'),error.cause.stderr.subarray(0,32768),{flag:'wx',mode:0o600});
  }
  finally{
    const cleanup=cleanupOwned([['container',containers],['volume',volumes]],id,(type,name)=>{
      try{return JSON.parse(docker([type,'inspect',name]).toString())[0];}
      catch(error){if(/No such (object|container|volume)/i.test(error.cause?.stderr?.toString()??''))return null;throw error;}
    },(type,name)=>docker(type==='container'?['rm','-f',name]:['volume','rm',name]));
    report.checks.ownedResourcesRemoved=cleanup.length===0;
    if(cleanup.length){report.result='failed';report.cleanupRequired=cleanup;failed??=new Error('Run-owned resources could not be removed; inspect the report.');}
    report.durationSeconds=Math.round((Date.now()-started)/1000);
    if(destination){await writeFile(join(destination,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(`Recovery report: ${join(destination,'report.json')}`);}
  }
  if(failed)throw failed;
  console.log('Recovery passed. Disposable databases, private files and keys removed.');return report;
}
async function assertDirectory(path){const info=await lstat(path);assert(info.isDirectory()&&!info.isSymbolicLink(),'Recovery directories must be real directories, not symlinks.');return resolve(path);}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))drill().catch(error=>{console.error(error.message);process.exitCode=1;});
