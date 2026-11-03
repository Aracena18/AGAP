import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fictionalScope } from '../src/platform/fictional-scope.js';
import { changeMemberLink } from '../src/modules/identity/member-provisioning.js';
import { config, owner } from './database.js';

/** Test-only records in the disposable fictional database; no runtime provisioning. */
export async function presentationFixtures(){
  const {organizationId,branchId,memberId}=fictionalScope;
  const realm=JSON.parse(await readFile('infra/keycloak/agap-realm.json','utf8')) as {users:{id:string;username:string}[]};
  const staff=realm.users.find(user=>user.username==='administrator')!;
  const member=realm.users.find(user=>user.username==='member')!;
  const staffId=randomUUID();
  await owner.query('INSERT INTO platform.organizations VALUES($1,$2)',[organizationId,'Fictional presentation cooperative']);
  await owner.query('INSERT INTO platform.branches VALUES($1,$2,$3)',[branchId,organizationId,'Fictional presentation branch']);
  await owner.query("INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$4,$5,$6,ARRAY['administrator'])",[staffId,organizationId,config.OIDC_ISSUER,staff.id,'Fictional Administrator',[branchId]]);
  await owner.query('INSERT INTO members.members(id,organization_id,branch_id,external_reference,full_name,notice_version) VALUES($1,$2,$3,$4,$5,$6)',[memberId,organizationId,branchId,'FICTIONAL-PORTAL-001','Fictional Portal Member',config.PRIVACY_NOTICE_VERSION]);
  const link=await changeMemberLink(owner,config.OIDC_ISSUER,{action:'provision',organizationId,branchId,memberId,issuer:config.OIDC_ISSUER,subject:member.id,verificationReference:'FICTIONAL-PRESENTATION-TEST',operatorReference:'FICTIONAL-TEST-OPERATOR',reason:'Disposable presentation test fixture'});
  return {staffId,linkId:link.linkId};
}
