import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import type {ActorContext,MemberActorContext} from '../../../packages/contracts/src/ports.js';
import {MonitoringService} from '../src/modules/monitoring/monitoring.service.js';
import {SupportLoanPositionProducer} from '../src/modules/servicing/support-position.producer.js';
import {LoanReads} from '../src/modules/servicing/loan-reads.js';
import {PostgresMemberUnitOfWork} from '../src/platform/member-database.js';
import {prepareReconciliationFixtures,reconciliationFixture} from '../src/modules/accounting/testing/reconciliation-fixture.js';
import {closePools,owner,prepareDatabase,resetFixtures,runtimePool,uow,config} from './database.js';
let money:Awaited<ReturnType<typeof reconciliationFixture>>,request:string,officer:ActorContext,admin:ActorContext;
const service=new MonitoringService(uow,new LoanReads(uow),new SupportLoanPositionProducer());
beforeAll(async()=>{await prepareDatabase();await prepareReconciliationFixtures();});
afterAll(closePools);
beforeEach(async()=>{
 await resetFixtures();money=await reconciliationFixture();
 // The accounting fixture's original officer is intentionally an auditor. Add actual scoped support identities.
 async function staff(role:'officer'|'administrator'){
  const actor={...money.actor,userId:randomUUID(),sessionId:randomUUID(),roles:[role],authenticatedAt:new Date()} as ActorContext;
  await owner.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$1::uuid::text,$4,$5,$6)',[actor.userId,actor.organizationId,config.OIDC_ISSUER,'Fictional support reviewer',actor.branchIds,actor.roles]);
  await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,now(),ARRAY['mfa'],now()+interval '30 minutes')",[actor.sessionId,randomUUID(),actor.userId]);return actor;
 }
 officer=await staff('officer');admin=await staff('administrator');
 const released=await money.release(),person=money.context.basis.current.application,linkId=randomUUID(),sessionId=randomUUID();
 await owner.query("INSERT INTO identity.member_links(id,organization_id,member_id,issuer,subject,verification_reference) VALUES($1,$2,$3,$4,$1::uuid::text,'FICTIONAL-verified')",[linkId,person.organizationId,person.memberId,config.OIDC_ISSUER]);
 await owner.query("INSERT INTO identity.member_sessions(id,token_hash,link_id,authenticated_at,expires_at) VALUES($1,$2,$3,now(),now()+interval '30 minutes')",[sessionId,randomUUID(),linkId]);
 const member:MemberActorContext={kind:'member',linkId,memberId:person.memberId,organizationId:person.organizationId,sessionId,correlationId:randomUUID()};
 const submitted=await new PostgresMemberUnitOfWork(runtimePool).run(member,tx=>service.submit(tx,{loanId:released.loan.id,message:'Fictional essentials concern',contactPreference:'portal',sharingConfirmed:true,noticeVersion:config.PRIVACY_NOTICE_VERSION,checkIn:{canMeetEssentials:'no',borrowedToRepay:'declined',financialStrain:'reported'}},randomUUID()));
 request=submitted.id;await service.assign(admin,request,{officerId:officer.userId,reason:'Fictional current support purpose'},1,randomUUID());
});
describe('purpose-bound actual posted support position',()=>{
 it('preserves captured position while returning later posted repayments without writing money',async()=>{
  const original=await service.history(officer,request),fresh=await service.freshPosition(officer,request);
  expect(original.position?.principalCentavos).toBe(1_000_000);expect(fresh).toMatchObject({state:'available',data:{asOfDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date()),principalCentavos:1_000_000}});
  const loan=(await owner.query('SELECT id FROM servicing.originations WHERE organization_id=$1',[officer.organizationId])).rows[0].id;
  const requestBody={loanId:loan,amountCentavos:1_000_000,currency:'PHP',effectiveDate:'2026-11-02',method:'cash',instrumentReference:'FICTIONAL-SUPPORT-PAYMENT',reason:'Fictional scheduled payment'};
  const c=await money.money.prepareRepayment(money.cashier,loan,requestBody,randomUUID());await money.money.authorize(money.authorizer,c.id,1,randomUUID());
  const intent=await money.money.submitIntent(money.cashier,c.id,2,randomUUID());
  expect(await service.freshPosition(officer,request)).toMatchObject({state:'available',data:{principalCentavos:1_000_000,pendingMovementCount:1}});
  await money.money.observe(money.cashier,c.id,await money.paymentEvidence(intent),3,randomUUID());await money.money.finalize(money.authorizer,c.id,4,randomUUID());
  const before=(await owner.query('SELECT (SELECT count(*) FROM servicing.postings) AS postings,(SELECT count(*) FROM accounting.journals) AS journals')).rows[0];
  expect(await service.freshPosition(officer,request)).toMatchObject({state:'available',data:{loanId:loan,principalCentavos:0,overdueCentavos:0,pendingMovementCount:0}});
  expect((await service.history(officer,request)).position).toEqual(original.position);
  expect((await owner.query('SELECT (SELECT count(*) FROM servicing.postings) AS postings,(SELECT count(*) FROM accounting.journals) AS journals')).rows[0]).toEqual(before);
 });
 it('rejects metadata administrators, unassigned officers, revoked assignment and direct raw reads',async()=>{
  await expect(service.freshPosition(admin,request)).rejects.toMatchObject({status:403});
  await expect(service.freshPosition(money.actor,request)).rejects.toMatchObject({status:403});
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['officer'] WHERE id=$1",[admin.userId]);
  await expect(service.freshPosition({...admin,roles:['officer']},request)).rejects.toMatchObject({status:404});
  await expect(uow.run(officer,tx=>tx.query('SELECT * FROM servicing.originations'))).rejects.toMatchObject({code:'42501'});
  await expect(uow.run(officer,tx=>tx.query('SELECT * FROM servicing.postings'))).rejects.toMatchObject({code:'42501'});
  await expect(uow.run(officer,tx=>tx.query('SELECT servicing.support_position($1)',[randomUUID()]))).rejects.toMatchObject({code:'P0002'});
  await owner.query('UPDATE monitoring.requests SET assigned_officer_id=NULL WHERE id=$1',[request]);
  await expect(service.freshPosition(officer,request)).rejects.toMatchObject({status:404});
 });
 it('rejects forged member linkage and branch changes without granting a loan workspace',async()=>{
  const otherMember=randomUUID(),forged=randomUUID(),loan=(await owner.query('SELECT id FROM servicing.originations WHERE organization_id=$1',[officer.organizationId])).rows[0].id;
  await owner.query("INSERT INTO members.members(id,organization_id,branch_id,external_reference,full_name,notice_version) VALUES($1,$2,$3,$1::uuid::text,'Fictional other member','fictional')",[otherMember,officer.organizationId,officer.branchIds[0]]);
  await owner.query('INSERT INTO monitoring.requests(id,organization_id,member_id,branch_id,assigned_officer_id) VALUES($1,$2,$3,$4,$5)',[forged,officer.organizationId,otherMember,officer.branchIds[0],officer.userId]);
  await owner.query("INSERT INTO monitoring.disclosures(request_id,organization_id,message,contact_preference,notice_version,loan_id,check_in) VALUES($1,$2,'Fictional forged loan linkage','portal','fictional',$3,'{}')",[forged,officer.organizationId,loan]);
  expect(await service.freshPosition(officer,forged)).toMatchObject({state:'unavailable'});
  expect((await uow.run(officer,tx=>tx.query('SELECT * FROM servicing.staff_originations'))).rows).toEqual([]);
  await owner.query('UPDATE identity.staff_users SET branch_ids=ARRAY[]::uuid[] WHERE id=$1',[officer.userId]);
  await expect(service.freshPosition(officer,request)).rejects.toMatchObject({status:401});
 });
 it('runs projection under non-superuser function ownership and forced row-level security',async()=>{
  const role='agap_support_projection_test_owner';
  await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agap_support_projection_test_owner') THEN CREATE ROLE agap_support_projection_test_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
   GRANT USAGE ON SCHEMA platform,identity,members,applications,portal,decisions,evidence,credit,servicing,accounting,monitoring TO agap_support_projection_test_owner;
   GRANT CREATE ON SCHEMA servicing,monitoring TO agap_support_projection_test_owner;
   GRANT ALL ON ALL TABLES IN SCHEMA platform,identity,members,applications,portal,decisions,evidence,credit,servicing,accounting,monitoring TO agap_support_projection_test_owner;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA platform,identity,members,applications,portal,decisions,evidence,credit,servicing,accounting,monitoring TO agap_support_projection_test_owner;`);
  const tables=(await owner.query("SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('monitoring','servicing') AND c.relkind IN ('r','v')")).rows;
  const functions=(await owner.query("SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS args,pg_get_userbyid(p.proowner) AS owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('monitoring','servicing')")).rows;
  async function transfer(target?:string){for(const t of tables)await owner.query(`ALTER ${t.relkind==='v'?'VIEW':'TABLE'} ${t.nspname}.${t.relname} OWNER TO ${target??t.owner}`);for(const f of functions)await owner.query(`ALTER FUNCTION ${f.nspname}.${f.proname}(${f.args}) OWNER TO ${target??f.owner}`);}
  try{
   await transfer(role);
   expect(await service.freshPosition(officer,request)).toMatchObject({state:'available',data:{principalCentavos:1_000_000}});
   await expect(service.freshPosition(admin,request)).rejects.toMatchObject({status:403});
   await expect(uow.run(officer,tx=>tx.query('SELECT * FROM servicing.postings'))).rejects.toMatchObject({code:'42501'});
   await owner.query('UPDATE monitoring.requests SET assigned_officer_id=NULL WHERE id=$1',[request]);
   await expect(service.freshPosition(officer,request)).rejects.toMatchObject({status:404});
  }finally{await transfer();}
 });
 it('keeps missing producer unavailable only after current request authorization',async()=>{
  const unavailable=new MonitoringService(uow,new LoanReads(uow));
  expect(await unavailable.freshPosition(officer,request)).toMatchObject({state:'unavailable'});
  await expect(unavailable.freshPosition(officer,randomUUID())).rejects.toMatchObject({status:404});
 });
});
