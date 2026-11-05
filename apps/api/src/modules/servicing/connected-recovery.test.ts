import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PostingPort, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { closePools, owner, prepareDatabase, resetFixtures, runtimePool } from '../../../test/database.js';
import { connectedLedgerFixture, connectedLendingFixture } from '../../../test/connected-lending-fixture.js';
import { PostgresUnitOfWork } from '../../platform/database.js';
import { PostgresMemberUnitOfWork } from '../../platform/member-database.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { DecisionReviewService } from '../decisions/decision-review.service.js';
import { DecisionsService } from '../decisions/decisions.service.js';
import { LendingDecisionProducers } from '../decisions/lending-producers.js';
import { WorkflowDecisionProducer } from '../evidence/decision-basis.producer.js';
import { WorkflowService } from '../evidence/workflow.service.js';
import { FictionalSettlementService } from './fictional-settlement.service.js';
import { FinancialActions } from './financial-actions.service.js';
import { LendingMoneyProducers } from './lending-money.producers.js';
import { MoneyService } from './money.service.js';
import { ServicingService } from './servicing.service.js';

const key=()=>randomUUID(),reason={reason:'Automated fictional recovery exercise; no real movement or human approval.'};
const uow=new PostgresUnitOfWork(runtimePool,{lendingGuard:true}),muow=new PostgresMemberUnitOfWork(runtimePool,{lendingGuard:true});
const workflow=new WorkflowService(uow,muow,false,true),decisionPorts=new LendingDecisionProducers(new WorkflowDecisionProducer(workflow),true);
const reviews=new DecisionReviewService(uow,decisionPorts),decisions=new DecisionsService(uow,decisionPorts),ports=new LendingMoneyProducers(decisionPorts,true);
const releases=new ServicingService(uow,ports),ledger=new AccountingService(),money=new MoneyService(uow,ports,ledger);
let f:Awaited<ReturnType<typeof connectedLendingFixture>>,loanId:string,commandId:string;
async function version(){return Number((await owner.query('SELECT version FROM applications.applications WHERE id=$1',[f.appId])).rows[0].version);}
async function count(table:string){return Number((await owner.query(`SELECT count(*) FROM ${table} WHERE organization_id=$1`,[f.org])).rows[0].count);}
async function submittedRelease(){
  for(const user of [f.officer,f.reviewer])await reviews.declare(user.actor,f.appId,{status:'clear',reference:reason.reason},await version(),key());
  const review=await reviews.get(f.officer.actor,f.appId);
  await reviews.confirm(f.officer.actor,f.appId,{evidenceBasisHash:review.evidenceBasisHash,mode:'manual',reviewedSources:true,reviewedScenarios:true,reason:reason.reason},review.version,key());
  const assessment=(await workflow.view(f.officer.actor,f.appId)).latestAssessment!;
  const recommendation=await decisions.recommend(f.officer.actor,f.appId,{assessmentId:assessment.id,inputVersion:assessment.inputVersion,offerVersionId:f.offerId,reason:reason.reason},await version(),key());
  const input={outcome:'approve' as const,assessmentId:assessment.id,recommendationId:recommendation.id,offerVersionId:f.offerId,rationale:reason.reason,departureReason:'',exceptions:[],reviewDate:'2026-12-31'};
  const preview=await decisions.preview(f.reviewer.actor,f.appId,input,await version(),key());
  const decision=await decisions.record(f.reviewer.actor,f.appId,{...input,explanationReviewed:true},await version(),key(),preview.id);
  const view=await muow.run(f.member.actor,tx=>decisions.memberDecision(tx,f.appId));
  if(view.state!=='available'||!view.data?.documentVersionId)throw new Error('Actual own-member terms required.');
  const acceptanceVersion=await version(),documentVersionId=view.data.documentVersionId;
  await muow.run(f.member.actor,tx=>decisions.memberAccept(tx,f.appId,{decisionId:decision.id,documentVersionId,acknowledgment:true},acceptanceVersion,key()));
  const loan=await releases.originate(f.cashier.actor,f.appId,{method:'cash'},key());loanId=loan.id;
  await connectedLedgerFixture(f);
  const command=await releases.prepare(f.cashier.actor,loanId,{loanId,amountCentavos:100000,currency:'PHP',effectiveDate:'2026-11-05',method:'cash',instrumentReference:'FICTIONAL-RECOVERY-RELEASE',reason:reason.reason},key());commandId=command.id;
  await releases.authorize(f.authorizer.actor,commandId,1,key(),reason.reason);
  await releases.submitIntent(f.cashier.actor,commandId,2,key(),reason.reason);
}
beforeAll(prepareDatabase);afterAll(closePools);
beforeEach(async()=>{await resetFixtures();f=await connectedLendingFixture({sameDayFirstPayment:true});});

function settlement(scenario?:ConstructorParameters<typeof FictionalSettlementService>[4],releaseService=releases,moneyService=money){
  return new FictionalSettlementService(uow,ports,releaseService,moneyService,scenario);
}
describe('connected fictional movement recovery against actual authorized PostgreSQL owners',()=>{
  it('retains one unknown movement across restart/new keys and resolves only by explicit status of the original submission',async()=>{
    await submittedRelease();
    const first=await settlement({submit:()=> 'unknown',status:previous=>previous}).record(f.cashier.actor,loanId,commandId,reason,3,key());
    expect(first.version).toBe(4);
    const original=(await owner.query('SELECT id,provider_key,business_event_id,submission_id FROM servicing.fictional_movements WHERE command_id=$1',[commandId])).rows[0];
    const restarted=settlement({submit:()=>{throw new Error('Restart must not submit a replacement movement.');},status:()=> 'confirmed'});
    expect(await restarted.record(f.cashier.actor,loanId,commandId,reason,3,key())).toEqual(first);
    expect(await count('servicing.fictional_movements')).toBe(1);expect(await count('servicing.fictional_movement_observations')).toBe(1);
    await expect(money.finalize(f.authorizer.actor,commandId,4,key(),reason.reason)).rejects.toBeDefined();
    expect(await count('accounting.journals')).toBe(0);
    expect((await restarted.record(f.cashier.actor,loanId,commandId,reason,4,key(),true)).version).toBe(5);
    expect((await owner.query('SELECT id,provider_key,business_event_id,submission_id FROM servicing.fictional_movements WHERE command_id=$1',[commandId])).rows[0]).toEqual(original);
    expect(await count('servicing.fictional_movement_observations')).toBe(2);
    const posted=await money.finalize(f.authorizer.actor,commandId,5,key(),reason.reason);
    expect(posted).toMatchObject({kind:'disbursement',amountCentavos:100000,principalAfterCentavos:100000});
    expect(await money.finalize(f.authorizer.actor,commandId,5,key(),reason.reason)).toEqual(posted);
    // An ordinary settlement retry after posting recovers existing evidence;
    // it must not call the scenario or record another physical movement.
    expect((await restarted.record(f.cashier.actor,loanId,commandId,reason,5,key())).version).toBe(5);
    expect(await count('servicing.fictional_movements')).toBe(1);expect(await count('servicing.fictional_movement_observations')).toBe(2);
    expect(await count('accounting.journals')).toBe(1);expect(await count('servicing.postings')).toBe(1);
  });
  it('preserves committed inbox evidence when domain observation fails, then reuses those exact bytes after restart',async()=>{
    await submittedRelease();
    class InterruptedObservation extends ServicingService {
      override async observe(...args:Parameters<ServicingService['observe']>):Promise<never>{
        // Exercise the real observe transaction before simulating loss of its
        // response; subsequent replay must find the committed original result.
        await super.observe(...args);throw new Error('Injected lost response after actual observation commit.');
      }
    }
    const k=key(),interrupted=settlement(undefined,new InterruptedObservation(uow,ports));
    await expect(interrupted.record(f.cashier.actor,loanId,commandId,reason,3,k)).rejects.toMatchObject({code:'servicing_unavailable'});
    const before=(await owner.query('SELECT id,body_text,body_hash FROM servicing.fictional_movement_observations')).rows;
    expect(before).toHaveLength(1);expect(await count('servicing.action_notes')).toBe(3);
    const receipt=await settlement({submit:()=>{throw new Error('Must recover original inbox.');},status:p=>p}).record(f.cashier.actor,loanId,commandId,reason,3,k);
    expect(receipt.version).toBe(4);
    expect((await owner.query('SELECT id,body_text,body_hash FROM servicing.fictional_movement_observations')).rows).toEqual(before);
    expect(await count('servicing.fictional_movements')).toBe(1);expect(await count('servicing.action_notes')).toBe(3);
    expect((await money.finalize(f.authorizer.actor,commandId,4,key(),reason.reason)).principalAfterCentavos).toBe(100000);
  });
  it('keeps the independently committed inbox when observation transaction rolls back after command revision insertion',async()=>{
    await submittedRelease();
    const interruptedUow:UnitOfWork={run:(actor,work)=>uow.run(actor,tx=>work({...tx,query:async<Row extends Record<string,unknown>>(sql:string,values?:readonly unknown[])=>{
      if(sql.includes('INSERT INTO servicing.action_notes')&&values?.includes('observe'))throw new Error('Injected failure before observation transaction commits.');
      return tx.query<Row>(sql,values);
    }}))};
    const interrupted=settlement(undefined,new ServicingService(interruptedUow,ports));
    const k=key();
    await expect(interrupted.record(f.cashier.actor,loanId,commandId,reason,3,k)).rejects.toMatchObject({code:'servicing_unavailable'});
    expect(await count('servicing.fictional_movements')).toBe(1);expect(await count('servicing.fictional_movement_observations')).toBe(1);
    expect(await count('servicing.action_notes')).toBe(2);
    const revision=await owner.query('SELECT max(version) AS version FROM servicing.command_revisions WHERE command_id=$1',[commandId]);
    expect(Number(revision.rows[0].version)).toBe(3);
    expect((await settlement({submit:()=>{throw new Error('Original evidence must survive.');},status:p=>p}).record(f.cashier.actor,loanId,commandId,reason,3,k)).version).toBe(4);
    expect(await count('servicing.fictional_movement_observations')).toBe(1);expect(await count('servicing.action_notes')).toBe(3);
  });
  it('rolls back journal and money effects after actual ledger posting failure, preserving the prior movement evidence',async()=>{
    await submittedRelease();await settlement().record(f.cashier.actor,loanId,commandId,reason,3,key());
    const failingLedger:PostingPort={post:async(tx,input)=>{await ledger.post(tx,input);throw new Error('Injected failure after actual accounting.post_journal.');}};
    const interrupted=new MoneyService(uow,ports,failingLedger),notes=await count('servicing.action_notes');
    await expect(interrupted.finalize(f.authorizer.actor,commandId,4,key(),reason.reason)).rejects.toMatchObject({code:'servicing_unavailable'});
    expect(await count('accounting.journals')).toBe(0);expect(await count('servicing.postings')).toBe(0);expect(await count('servicing.money_revisions')).toBe(0);
    expect(await count('servicing.action_notes')).toBe(notes);expect(await count('servicing.fictional_movement_observations')).toBe(1);
    const recovered=await new MoneyService(uow,ports,new AccountingService()).finalize(f.authorizer.actor,commandId,4,key(),reason.reason);
    expect(recovered).toMatchObject({amountCentavos:100000,principalAfterCentavos:100000});
    expect(await count('accounting.journals')).toBe(1);expect(await count('servicing.postings')).toBe(1);
  });
  it('rejects wrong loan/command routes before cached results and keeps staff movement/notes invisible to linked members',async()=>{
    await submittedRelease();const actions=new FinancialActions(uow,ports,releases,money,settlement()),k=key();
    await actions.settlement.record(f.cashier.actor,loanId,commandId,reason,3,k);
    await expect(actions.settlement.record(f.cashier.actor,key(),commandId,reason,3,k)).rejects.toMatchObject({status:404});
    await expect(actions.finalize(f.authorizer.actor,key(),commandId,reason,4,key())).rejects.toMatchObject({status:404});
    for(const table of ['staff_fictional_movements','staff_fictional_movement_observations','staff_action_notes']){
      expect(await uow.run(f.cashier.actor,async tx=>(await tx.query(`SELECT * FROM servicing.${table}`)).rowCount)).toBeGreaterThan(0);
      expect(await muow.run(f.member.actor,async tx=>(await tx.query(`SELECT * FROM servicing.${table}`)).rowCount)).toBe(0);
    }
  });
  it('posts an exact scheduled repayment once after a lost posting attempt, with the actual ledger retaining 50000 centavos principal',async()=>{
    await submittedRelease();await settlement().record(f.cashier.actor,loanId,commandId,reason,3,key());
    await money.finalize(f.authorizer.actor,commandId,4,key(),reason.reason);
    const repayment=await money.prepareRepayment(f.cashier.actor,loanId,{loanId,amountCentavos:50000,currency:'PHP',effectiveDate:f.policy.offers[0].payments[0].date,method:'cash',instrumentReference:'FICTIONAL-RECOVERY-REPAYMENT',reason:reason.reason},key());
    await money.authorize(f.authorizer.actor,repayment.id,1,key(),reason.reason);
    await money.submitIntent(f.cashier.actor,repayment.id,2,key(),reason.reason);
    await settlement().record(f.cashier.actor,loanId,repayment.id,reason,3,key());
    const notes=await count('servicing.action_notes');
    const interrupted=new MoneyService(uow,ports,{post:async(tx,input)=>{await ledger.post(tx,input);throw new Error('Injected lost repayment transaction before commit.');}});
    await expect(interrupted.finalize(f.authorizer.actor,repayment.id,4,key(),reason.reason)).rejects.toMatchObject({code:'servicing_unavailable'});
    expect(await count('accounting.journals')).toBe(1);expect(await count('servicing.postings')).toBe(1);expect(await count('servicing.action_notes')).toBe(notes);
    expect(await count('servicing.fictional_movement_observations')).toBe(2);
    const restarted=new MoneyService(uow,ports,new AccountingService()),posted=await restarted.finalize(f.authorizer.actor,repayment.id,4,key(),reason.reason);
    expect(posted).toMatchObject({kind:'repayment',amountCentavos:50000,principalAfterCentavos:50000});expect(posted.receiptId).toMatch(/^[a-f0-9-]{36}$/);
    expect(await restarted.finalize(f.authorizer.actor,repayment.id,4,key(),reason.reason)).toEqual(posted);
    expect(await count('accounting.journals')).toBe(2);expect(await count('servicing.postings')).toBe(2);
    const balances=(await owner.query(`SELECT a.code,sum(CASE WHEN l.side='debit' THEN l.amount_centavos ELSE -l.amount_centavos END)::text AS balance
      FROM accounting.journal_lines l JOIN accounting.accounts a ON a.organization_id=l.organization_id AND a.id=l.account_id
      WHERE l.organization_id=$1 GROUP BY a.code ORDER BY a.code`,[f.org])).rows;
    expect(balances).toEqual([{code:'cash',balance:'-50000'},{code:'principal',balance:'50000'}]);
  });
  it('runs intake triggers and staff views with non-superuser non-BYPASSRLS owners under FORCE RLS',async()=>{
    const role='agap_connected_recovery_owner',tables=['fictional_movements','fictional_movement_observations','action_notes'];
    const functions=['require_fictional_intent()','require_intake_observation()','require_action_note()'];
    await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='agap_connected_recovery_owner') THEN CREATE ROLE agap_connected_recovery_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
      GRANT USAGE ON SCHEMA servicing,platform,identity,monitoring TO ${role};GRANT CREATE ON SCHEMA servicing TO ${role};
      GRANT SELECT ON ALL TABLES IN SCHEMA servicing,identity TO ${role};
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA servicing,platform,identity,monitoring TO ${role};`);
    try{
      for(const table of tables){await owner.query(`ALTER TABLE servicing.${table} OWNER TO ${role}`);await owner.query(`ALTER VIEW servicing.staff_${table} OWNER TO ${role}`);}
      for(const fn of functions)await owner.query(`ALTER FUNCTION servicing.${fn} OWNER TO ${role}`);
      expect((await owner.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])).rows[0]).toEqual({rolsuper:false,rolbypassrls:false});
      const forced=await owner.query("SELECT relname,relforcerowsecurity FROM pg_class WHERE oid=ANY($1::regclass[])",[tables.map(t=>`servicing.${t}`)]);
      expect(forced.rows).toHaveLength(3);expect(forced.rows.every(r=>r.relforcerowsecurity===true)).toBe(true);
      await submittedRelease();await settlement().record(f.cashier.actor,loanId,commandId,reason,3,key());
      expect((await money.finalize(f.authorizer.actor,commandId,4,key(),reason.reason)).principalAfterCentavos).toBe(100000);
      for(const table of tables)expect(await muow.run(f.member.actor,async tx=>(await tx.query(`SELECT * FROM servicing.staff_${table}`)).rowCount)).toBe(0);
    }finally{
      for(const fn of functions)await owner.query(`ALTER FUNCTION servicing.${fn} OWNER TO agap_owner`);
      for(const table of tables){await owner.query(`ALTER VIEW servicing.staff_${table} OWNER TO agap_owner`);await owner.query(`ALTER TABLE servicing.${table} OWNER TO agap_owner`);}
    }
  });
});
