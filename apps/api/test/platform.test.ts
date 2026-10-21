import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { command,recordEvent } from '../src/platform/commands.js';
import { IdentityService,requireFreshMfa } from '../src/modules/identity/identity.service.js';
import { MembersService } from '../src/modules/members/members.service.js';
import { owner,runtimePool,identityPool,uow,config,prepareDatabase,resetFixtures,closePools } from './database.js';

let app:INestApplication,base:string,fixture:Awaited<ReturnType<typeof resetFixtures>>;
beforeAll(async()=>{await prepareDatabase();app=await createApp(config);await app.listen(0,'127.0.0.1');base=await app.getUrl();});
beforeEach(async()=>{fixture=await resetFixtures();});
afterAll(async()=>{await app?.close();await closePools();});
const memberInput=()=>({externalReference:'FIC-001',fullName:'Fictional Member',phone:null,branchId:fixture.branch,noticeVersion:config.PRIVACY_NOTICE_VERSION,noticeAcknowledged:true});
const key=()=>randomUUID();
async function request(path:string,{method='GET',body,version,idempotencyKey,token=fixture.officer.token,csrf=true,origin=config.PUBLIC_ORIGIN}:{method?:string;body?:unknown;version?:number;idempotencyKey?:string;token?:string;csrf?:boolean;origin?:string}={}) {
  const headers:Record<string,string>={Cookie:`agap_session=${token}`,Origin:origin};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(csrf)headers['X-CSRF-Token']=new IdentityService(identityPool,config).csrfToken(token);
  if(version!==undefined)headers['If-Match']=`"${version}"`;
  if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
  const response=await fetch(`${base}/api/v1${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  return {status:response.status,body:await response.json() as Record<string,unknown>,headers:response.headers};
}
async function createMember(){const response=await request('/members',{method:'POST',body:memberInput(),idempotencyKey:key()});expect(response.status).toBe(201);return response.body;}

describe('actual staff API and runtime database roles',()=>{
  it('reassigns intake with fresh admin MFA and history without changing assessment inputs',async()=>{
    const member=await createMember();
    const application=(await request('/applications',{method:'POST',body:{memberId:member.id,purpose:'Fictional reassignment test',requestedPrincipalCentavos:10000,requestedTermMonths:12,currency:'PHP'},idempotencyKey:key()})).body;
    const path=`/applications/${application.id}/assignments`,body={officerId:fixture.auditor.actor.userId,reason:'Fictional workload reassignment'};
    expect((await request(path,{method:'POST',body,version:1,idempotencyKey:key()})).status).toBe(403);
    expect((await request(path,{method:'POST',body,version:1,idempotencyKey:key(),token:fixture.administrator.token})).status).toBe(422);
    await owner.query("UPDATE identity.staff_users SET roles=ARRAY['officer'] WHERE id=$1",[fixture.auditor.actor.userId]);
    const idempotencyKey=key();
    const result=await request(path,{method:'POST',body,version:1,idempotencyKey,token:fixture.administrator.token});
    expect(result.status).toBe(201);expect(result.body).toMatchObject({version:2,assessmentInputVersion:1,assignedOfficerId:body.officerId});
    expect((await request(path,{method:'POST',body,version:1,idempotencyKey,token:fixture.administrator.token})).body).toEqual(result.body);
    expect((await owner.query('SELECT reason FROM applications.assignment_changes')).rows).toEqual([{reason:body.reason}]);
    const edit={purpose:'Fictional updated request',requestedPrincipalCentavos:10000,requestedTermMonths:12,currency:'PHP'};
    expect((await request(`/applications/${application.id}`,{method:'PATCH',body:edit,version:2,idempotencyKey:key()})).status).toBe(403);
    expect((await request(`/applications/${application.id}`,{method:'PATCH',body:edit,version:2,idempotencyKey:key(),token:fixture.auditor.token})).status).toBe(200);
  });
  it('requires a real session and does not trust actor/role headers',async()=>{
    const response=await fetch(`${base}/api/v1/members`,{headers:{'X-User-Role':'administrator','X-Organization-ID':fixture.org}});
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({error:{code:'authentication_required'}});
  });
  it('rejects missing CSRF and foreign origins before a write',async()=>{
    for(const options of [{csrf:false},{origin:'https://attacker.invalid'}]){
      expect((await request('/members',{method:'POST',body:memberInput(),idempotencyKey:key(),...options})).status).toBe(403);
    }
    expect((await owner.query('SELECT count(*) FROM members.members')).rows[0].count).toBe('0');
  });
  it('rejects spoofed actor fields, invalid money, missing amounts and invalid calendar dates',async()=>{
    expect((await request('/members',{method:'POST',body:{...memberInput(),organizationId:fixture.otherOrg},idempotencyKey:key()})).status).toBe(422);
    const member=await createMember();
    for(const amount of [null,undefined,0,-1,0.1,Number.MAX_SAFE_INTEGER+1]){
      const result=await request('/applications',{method:'POST',body:{memberId:member.id,purpose:'Fictional purchase',requestedPrincipalCentavos:amount,requestedTermMonths:12,currency:'PHP'},idempotencyKey:key()});
      expect(result.status).toBe(422);
    }
  });
  it('commits member, history, audit and outbox and replays a concurrent duplicate exactly once',async()=>{
    const idempotencyKey=key();
    const [first,second]=await Promise.all([request('/members',{method:'POST',body:memberInput(),idempotencyKey}),request('/members',{method:'POST',body:memberInput(),idempotencyKey})]);
    expect(first.status).toBe(201);expect(second.status).toBe(201);expect(first.body).toEqual(second.body);
    for(const table of ['members.members','members.member_revisions','platform.audit_events','platform.outbox','platform.idempotency'])expect((await owner.query(`SELECT count(*) FROM ${table}`)).rows[0].count).toBe('1');
    const conflicting=await request('/members',{method:'POST',body:{...memberInput(),fullName:'Different claim'},idempotencyKey});
    expect(conflicting.status).toBe(409);
  });
  it('allows one concurrent edit and returns a stale-version error for the other',async()=>{
    const member=await createMember();
    expect((await request(`/members/${member.id}`,{method:'PATCH',body:{fullName:'No version',phone:null},idempotencyKey:key()})).status).toBe(428);
    const results=await Promise.all(['First correction','Second correction'].map(fullName=>request(`/members/${member.id}`,{method:'PATCH',body:{fullName,phone:null},version:1,idempotencyKey:key()})));
    expect(results.map(r=>r.status).sort()).toEqual([200,412]);
    expect((await owner.query('SELECT count(*) FROM members.member_revisions')).rows[0].count).toBe('2');
    expect((await owner.query('SELECT version FROM members.members')).rows[0].version).toBe('2');
  });
  it('preserves the original member revision after correction',async()=>{
    const member=await createMember();
    await request(`/members/${member.id}`,{method:'PATCH',body:{fullName:'Corrected Member',phone:null},version:1,idempotencyKey:key()});
    const rows=await owner.query('SELECT snapshot FROM members.member_revisions ORDER BY version');
    expect(rows.rows.map(row=>row.snapshot.fullName)).toEqual(['Fictional Member','Corrected Member']);
    await expect(uow.run(fixture.officer.actor,tx=>tx.query('DELETE FROM members.member_revisions'))).rejects.toMatchObject({code:'42501'});
    await expect(uow.run(fixture.officer.actor,tx=>tx.query("UPDATE platform.audit_events SET event_type='changed'"))).rejects.toMatchObject({code:'42501'});
  });
  it('enforces role changes and revocation on the next request, without trusting old session roles',async()=>{
    expect((await request('/members',{method:'POST',body:memberInput(),idempotencyKey:key(),token:fixture.auditor.token})).status).toBe(403);
    await owner.query("UPDATE identity.staff_users SET roles=ARRAY['auditor'] WHERE id=$1",[fixture.officer.actor.userId]);
    expect((await request('/members',{method:'POST',body:memberInput(),idempotencyKey:key()})).status).toBe(403);
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[fixture.officer.actor.userId]);
    expect((await request('/session')).status).toBe(401);
  });
  it('blocks cross-organization and revoked-branch access, including cached responses',async()=>{
    const idempotencyKey=key();
    const created=await request('/members',{method:'POST',body:memberInput(),idempotencyKey});
    expect((await request(`/members/${created.body.id}`,{token:fixture.other.token})).status).toBe(404);
    expect((await request('/members',{token:fixture.other.token})).body.items).toEqual([]);
    await owner.query('UPDATE identity.staff_users SET branch_ids=$2 WHERE id=$1',[fixture.officer.actor.userId,[fixture.secondBranch]]);
    expect((await request(`/members/${created.body.id}`)).status).toBe(404);
    expect((await request('/members',{method:'POST',body:memberInput(),idempotencyKey})).status).toBe(403);
  });
  it('uses non-owner, non-bypass roles and resets organization context after pooled transactions',async()=>{
    const members=new MembersService(uow,config.PRIVACY_NOTICE_VERSION);
    await members.create(fixture.officer.actor,memberInput(),key());
    expect((await runtimePool.query('SELECT count(*) FROM members.members')).rows[0].count).toBe('0');
    expect((await runtimePool.query('SELECT platform.current_organization() AS org')).rows[0].org).toBeNull();
    await expect(runtimePool.query('SELECT * FROM identity.sessions')).rejects.toMatchObject({code:'42501'});
    const roles=await owner.query("SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('agap_runtime','agap_identity')");
    expect(roles.rows.every(role=>!role.rolsuper&&!role.rolbypassrls)).toBe(true);
  });
  it('rolls back the complete write and its idempotency claim after a later SQL failure',async()=>{
    const id=randomUUID(),idempotencyKey=key();
    await expect(uow.run(fixture.officer.actor,tx=>command(tx,'rollback-proof',idempotencyKey,{},async()=>{
      await tx.query('INSERT INTO members.members(id,organization_id,branch_id,external_reference,full_name,notice_version) VALUES($1,$2,$3,$4,$5,$6)',[id,fixture.org,fixture.branch,'ROLLBACK','Fictional rollback',config.PRIVACY_NOTICE_VERSION]);
      await recordEvent(tx,'rollback.probe',id,1);
      await tx.query('SELECT * FROM deliberately_nonexistent_posting_target');
      return {id};
    }))).rejects.toMatchObject({code:'42P01'});
    for(const table of ['members.members','platform.audit_events','platform.outbox','platform.idempotency'])expect((await owner.query(`SELECT count(*) FROM ${table}`)).rows[0].count).toBe('0');
    expect(await uow.run(fixture.officer.actor,tx=>command(tx,'rollback-proof',idempotencyKey,{},async()=>({retried:true})))).toEqual({retried:true});
  });
  it('creates and edits a draft application with exact safe centavos and independent input version',async()=>{
    const member=await createMember();
    const payload={memberId:member.id,purpose:'Fictional purchase',requestedPrincipalCentavos:Number.MAX_SAFE_INTEGER,requestedTermMonths:12,currency:'PHP'};
    const created=await request('/applications',{method:'POST',body:payload,idempotencyKey:key()});
    expect(created.status).toBe(201);expect(created.body.requestedPrincipalCentavos).toBe(Number.MAX_SAFE_INTEGER);expect(created.body.assessmentInputVersion).toBe(1);
    const update={purpose:'Updated fictional purpose',requestedPrincipalCentavos:3000000,requestedTermMonths:12,currency:'PHP'};
    const changed=await request(`/applications/${created.body.id}`,{method:'PATCH',body:update,version:1,idempotencyKey:key()});
    expect(changed.status).toBe(200);expect(changed.body).toMatchObject({version:2,assessmentInputVersion:2,requestedPrincipalCentavos:3000000});
    expect((await request(`/applications/${created.body.id}`,{token:fixture.other.token})).status).toBe(404);
    expect((await owner.query('SELECT count(*) FROM applications.application_revisions')).rows[0].count).toBe('2');
  });
  it('does not fake the other owners financial endpoints or approval capabilities',async()=>{
    const result=await request('/payments',{method:'POST',body:{},idempotencyKey:key()});
    expect(result.status).toBe(501);expect(result.body).toMatchObject({error:{code:'module_not_available'}});
    const capabilities=await request('/capabilities');
    expect(capabilities.body.modules).toContainEqual({name:'accounting',owner:'Earl',state:'contract_only'});
  });
  it('removes the server session on logout and does not echo sensitive input in errors',async()=>{
    const result=await request('/auth/logout',{method:'POST'});expect(result.status).toBe(200);
    expect((await request('/session')).status).toBe(401);
    expect(JSON.stringify(result.body)).not.toContain(fixture.officer.token);
  });
  it('requires recent provider-verified MFA for privileged platform actions',()=>{
    expect(()=>requireFreshMfa(fixture.officer.actor)).not.toThrow();
    expect(()=>requireFreshMfa({...fixture.officer.actor,authenticationMethods:['single_factor']})).toThrow('multi-factor');
    expect(()=>requireFreshMfa({...fixture.officer.actor,authenticatedAt:new Date(Date.now()-16*60000)})).toThrow('multi-factor');
  });
  it('rechecks revoked or expanded actor contexts inside the transaction',async()=>{
    await expect(uow.run({...fixture.officer.actor,branchIds:[fixture.branch,fixture.secondBranch]},tx=>tx.query('SELECT 1'))).rejects.toMatchObject({code:'access_changed'});
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[fixture.officer.actor.userId]);
    await expect(uow.run(fixture.officer.actor,tx=>tx.query('SELECT 1'))).rejects.toMatchObject({code:'access_changed'});
  });
  it('revokes scoped staff sessions atomically and preserves the reason without granting financial roles',async()=>{
    const target=fixture.revocationTarget;
    const revoked=await request(`/staff/${target.actor.userId}/revocations`,{method:'POST',body:{reason:'Fictional access review'},version:1,idempotencyKey:key(),token:fixture.administrator.token});
    expect(revoked.status).toBe(201);expect(revoked.body).toMatchObject({active:false,version:2});
    expect((await request('/session',{token:target.token})).status).toBe(401);
    expect((await owner.query('SELECT reason FROM identity.staff_revocations')).rows[0].reason).toBe('Fictional access review');
    expect((await request(`/staff/${fixture.administrator.actor.userId}/revocations`,{method:'POST',body:{reason:'Self revocation'},version:1,idempotencyKey:key(),token:fixture.administrator.token})).status).toBe(403);
    expect((await request('/members',{method:'POST',body:memberInput(),idempotencyKey:key(),token:fixture.administrator.token})).status).toBe(403);
  });
  it('blocks staff administration with a stale/single-factor session and cross-organization target',async()=>{
    const options={method:'POST',body:{reason:'Fictional access review'},version:1,idempotencyKey:key(),token:fixture.administrator.token};
    expect((await request(`/staff/${fixture.other.actor.userId}/revocations`,options)).status).toBe(404);
    await owner.query("UPDATE identity.sessions SET methods=ARRAY['single_factor'] WHERE id=$1",[fixture.administrator.actor.sessionId]);
    expect((await request(`/staff/${fixture.revocationTarget.actor.userId}/revocations`,{...options,idempotencyKey:key()})).status).toBe(403);
  });
});
