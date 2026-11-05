import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { lendingLockSql } from '../../platform/lending-transaction.js';
import { z } from 'zod';
import { Id,Text,Version } from '../../../../../packages/contracts/src/schemas.js';

const Input=z.discriminatedUnion('action',[
  z.strictObject({action:z.literal('provision'),organizationId:Id,branchId:Id,memberId:Id,issuer:z.url(),subject:Text,verificationReference:Text,operatorReference:Text,reason:Text}),
  z.strictObject({action:z.literal('revoke'),linkId:Id,expectedVersion:Version,operatorReference:Text,reason:Text}),
]);
/** Operator-only, externally verified enrollment/recovery. Not a public registration endpoint. */
export async function changeMemberLink(pool:Pool,trustedIssuer:string,input:unknown){
  const data=Input.parse(input),client=await pool.connect();
  try{
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const organizationId=data.action==='provision' ? data.organizationId : (await client.query('SELECT organization_id FROM identity.member_links WHERE id=$1',[data.linkId])).rows[0]?.organization_id;
    if(!organizationId)throw new Error('Member link unavailable.');
    await client.query("SET LOCAL lock_timeout='5s'");await client.query(lendingLockSql,[organizationId]);
    let id:string;
    if(data.action==='provision'){
      if(data.issuer!==trustedIssuer)throw new Error('Trusted issuer mismatch.');
      await client.query("SELECT set_config('agap.organization_id',$1,true),set_config('agap.branch_ids',$2,true),set_config('agap.member_id','',true)",[data.organizationId,JSON.stringify([data.branchId])]);
      const member=await client.query('SELECT id FROM members.members WHERE organization_id=$1 AND branch_id=$2 AND id=$3 FOR SHARE',[data.organizationId,data.branchId,data.memberId]);
      if(member.rowCount!==1)throw new Error('Verified member/branch mismatch.');
      id=randomUUID();
      await client.query('INSERT INTO identity.member_links(id,organization_id,member_id,issuer,subject,verification_reference) VALUES($1,$2,$3,$4,$5,$6)',[id,data.organizationId,data.memberId,data.issuer,data.subject,data.verificationReference]);
      await client.query("SELECT set_config('agap.member_id',$1,true)",[data.memberId]);
      await client.query('INSERT INTO portal.preferences(organization_id,member_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[data.organizationId,data.memberId]);
    }else{
      id=data.linkId;
      const result=await client.query('UPDATE identity.member_links SET active=false,version=version+1 WHERE id=$1 AND version=$2 AND active RETURNING id',[id,data.expectedVersion]);
      if(result.rowCount!==1)throw new Error('Link is changed, inactive or unavailable.');
      await client.query('DELETE FROM identity.member_sessions WHERE link_id=$1',[id]);
    }
    await client.query('INSERT INTO identity.member_link_events(id,link_id,event_type,operator_reference,reason) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,data.action,data.operatorReference,data.reason]);
    await client.query('COMMIT');return {linkId:id,state:data.action==='provision'?'member_linked':'member_link_revoked'};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
