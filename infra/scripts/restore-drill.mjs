import { execFileSync,spawnSync } from 'node:child_process';
import { mkdir,writeFile,readFile,rm,chmod } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { randomBytes,randomUUID,createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// This drill reads ONLY the dedicated fictional test database. It never restores
// into an existing database or uses production configuration/credentials.
const started=new Date(),id=randomUUID(),container=`agap-restore-${id}`;
const root=resolve('.backups',`drill-${id}`),source=join(root,'source'),restored=join(root,'restored');
const docker=(args,options={})=>execFileSync('docker',args,{maxBuffer:64*1024*1024,...options});
const compose=['compose','-f','infra/compose.test.yml','exec','-T','database'];
const sourceSql=sql=>docker([...compose,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','agap_owner','-d','agap_test','-c',sql]).toString().trim();
const tables=sourceSql("SELECT format('%I.%I',schemaname,tablename) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_toast%' ORDER BY schemaname,tablename").split('\n');
const fingerprintSql=tables.map(table=>`SELECT '${table}',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'')) FROM ${table} t`).join(' UNION ALL ');
const restic=args=>docker(['run','--rm','--network','none','--user',`${process.getuid()}:${process.getgid()}`,'--mount',`type=bind,src=${root},dst=/work`,'restic/restic:0.18.1','--no-cache','--repo','/work/repository','--password-file','/work/recovery-key',...args]).toString();
let cloneStarted=false;
try{
  await mkdir(source,{recursive:true,mode:0o700});await chmod(root,0o700);
  await writeFile(join(root,'recovery-key'),randomBytes(32).toString('hex'),{mode:0o600});
  const before=sourceSql(fingerprintSql);
  assert(Number(sourceSql('SELECT count(*) FROM members.members'))>0,'Run browser tests first so the backup contains persisted member/application history.');
  const dump=docker([...compose,'pg_dump','-U','agap_owner','-d','agap_test','--format=custom']);
  assert.equal(sourceSql(fingerprintSql),before,'Test records changed during backup; stop test writers and repeat.');
  await writeFile(join(source,'agap.dump'),dump,{mode:0o600});
  // A separate private-file fixture exercises document recovery. Full evidence
  // file/metadata reconciliation waits for Aaron's document lifecycle module.
  await mkdir(join(source,'documents'),{mode:0o700});
  const document=Buffer.from('Fictional immutable document for AGAP recovery drill.\n');
  await writeFile(join(source,'documents',id),document,{mode:0o600});
  const manifest={schema:1,fictional:true,createdAt:started.toISOString(),tables,databaseSha256:createHash('sha256').update(dump).digest('hex'),document:{key:id,sha256:createHash('sha256').update(document).digest('hex')}};
  await writeFile(join(source,'manifest.json'),JSON.stringify(manifest),{mode:0o600});
  restic(['init','--quiet']);
  const output=restic(['backup','/work/source','--tag','agap-fictional-restore-drill','--json']);
  const summary=output.trim().split('\n').map(line=>JSON.parse(line)).find(line=>line.message_type==='summary');
  assert(summary?.snapshot_id,'Encrypted snapshot did not complete.');
  restic(['check','--read-data','--quiet']);
  await rm(source,{recursive:true});
  restic(['restore',summary.snapshot_id,'--target','/work/restored','--quiet']);
  const recovered=join(restored,'work','source');
  assert.equal(createHash('sha256').update(await readFile(join(recovered,'agap.dump'))).digest('hex'),manifest.databaseSha256);
  assert.equal(createHash('sha256').update(await readFile(join(recovered,'documents',id))).digest('hex'),manifest.document.sha256);
  docker(['run','-d','--rm','--name',container,'--network','none','--tmpfs','/var/lib/postgresql','--mount',`type=bind,src=${resolve('infra/postgres/init.sql')},dst=/docker-entrypoint-initdb.d/000-roles.sql,readonly`,'-e','POSTGRES_USER=agap_owner','-e','POSTGRES_PASSWORD=fictional-restore-only','-e','POSTGRES_DB=agap_restored','postgres:18-alpine']);cloneStarted=true;
  for(let attempt=0;attempt<60;attempt++){
    // initdb briefly starts an intermediate server: wait for entrypoint completion.
    const logs=docker(['logs',container],{stdio:['ignore','pipe','ignore']}).toString();
    const ready=spawnSync('docker',['exec',container,'pg_isready','-U','agap_owner','-d','agap_restored'],{stdio:'ignore'});
    if(logs.includes('PostgreSQL init process complete')&&ready.status===0)break;
    assert(attempt<59,'Restore database did not become ready.');await new Promise(done=>setTimeout(done,500));
  }
  docker(['exec',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','agap_owner','-d','agap_restored','-c','CREATE ROLE agap_worker NOLOGIN NOSUPERUSER NOBYPASSRLS']);
  docker(['exec','-i',container,'pg_restore','--exit-on-error','-U','agap_owner','-d','agap_restored'],{input:await readFile(join(recovered,'agap.dump'))});
  const after=docker(['exec',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','agap_owner','-d','agap_restored','-c',fingerprintSql]).toString().trim();
  assert.equal(after,before,'Restored rows/history differ from the source.');
  const evidence={executedAt:new Date().toISOString(),result:'passed',fictional:true,durationSeconds:Math.round((Date.now()-started.getTime())/1000),postgresImage:'postgres:18-alpine',backupImage:'restic/restic:0.18.1',encryptedRepositoryChecked:true,plaintextStageRemovedBeforeRestore:true,isolatedDatabaseRestored:true,tableCounts:Object.fromEntries(before.split('\n').map(line=>{const [table,count]=line.split('|');return [table,Number(count)];})),allTableFingerprintsMatched:true,privateDocumentSha256Matched:true,limitations:['Local repository and recovery key share the development host; not offsite recovery.','Identity-provider database, institutional keys and an integrated financial cutover are outside this dedicated test drill.','No approved RPO/RTO or production capacity claim.']};
  await writeFile('docs/AGAP_Member_Restore_Drill.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
}finally{if(cloneStarted)docker(['rm','-f',container]);}
