import { execFileSync } from 'node:child_process';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll,beforeAll,expect,it } from 'vitest';
import { owner,ownerUrl,config,prepareDatabase,resetFixtures,closePools } from './database.js';
let fixture:Awaited<ReturnType<typeof resetFixtures>>;
beforeAll(async()=>{await prepareDatabase();fixture=await resetFixtures();});afterAll(closePools);
it('operator provisioning is explicit, atomic, branch-checked and records the reviewed input',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'agap-provision-'));const file=join(directory,'staff.json');
  const input={organizationId:fixture.org,issuer:config.OIDC_ISSUER,subject:'fictional-new-subject',displayName:'Fictional New Officer',branchIds:[fixture.otherBranch],roles:['officer'],operatorReference:'FICTIONAL-REVIEW-001',reason:'Fictional approved test access'};
  const env={...process.env,...Object.fromEntries(Object.entries(config).map(([k,v])=>[k,String(v)])),MIGRATION_DATABASE_URL:ownerUrl,TSX_TSCONFIG_PATH:'tsconfig.platform.json'};
  const run=()=>execFileSync(process.execPath,['--import','tsx','apps/api/scripts/provision-staff.ts',file],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  try{
    await writeFile(file,JSON.stringify(input),{mode:0o600});expect(run).toThrow();
    expect((await owner.query('SELECT count(*) FROM identity.staff_provisionings')).rows[0].count).toBe('0');
    input.branchIds=[fixture.branch];await writeFile(file,JSON.stringify(input));
    const result=JSON.parse(run());expect(result.state).toBe('staff_provisioned');
    const saved=(await owner.query('SELECT snapshot FROM identity.staff_provisionings WHERE staff_id=$1',[result.staffId])).rows[0].snapshot;
    expect(saved).toEqual(input);expect(run).toThrow();
    expect((await owner.query('SELECT count(*) FROM identity.staff_provisionings')).rows[0].count).toBe('1');
  }finally{await rm(directory,{recursive:true,force:true});}
});
