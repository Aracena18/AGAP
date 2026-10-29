import { randomBytes,randomUUID } from 'node:crypto';
import { MembersService } from '../src/modules/members/members.service.js';
import { changeMemberLink } from '../src/modules/identity/member-provisioning.js';
import { tokenHash } from '../src/modules/identity/identity.service.js';
import type { MemberActorContext,ActorContext } from '../../../packages/contracts/src/ports.js';
import { config,owner,uow } from './database.js';
export async function memberFixture(staff:ActorContext,issuer=config.OIDC_ISSUER){
  const record=await new MembersService(uow,config.PRIVACY_NOTICE_VERSION).create(staff,{externalReference:randomUUID(),fullName:'Fictional Portal Member',phone:null,branchId:staff.branchIds[0],noticeVersion:config.PRIVACY_NOTICE_VERSION,noticeAcknowledged:true},randomUUID());
  const subject=randomUUID();
  const link=await changeMemberLink(owner,issuer,{action:'provision',organizationId:staff.organizationId,branchId:staff.branchIds[0],memberId:record.id,issuer,subject,verificationReference:'FICTIONAL-VERIFICATION-001',operatorReference:'FICTIONAL-TEST-OPERATOR',reason:'Explicitly verified fictional test membership'});
  const sessionId=randomUUID(),token=randomBytes(32).toString('base64url');
  await owner.query("INSERT INTO identity.member_sessions(id,token_hash,link_id,authenticated_at,expires_at) VALUES($1,$2,$3,now(),now()+interval '30 minutes')",[sessionId,tokenHash(token),link.linkId]);
  const actor:MemberActorContext={kind:'member',linkId:link.linkId,memberId:record.id,organizationId:staff.organizationId,sessionId,correlationId:randomUUID()};
  return {record,subject,linkId:link.linkId,actor,token};
}
