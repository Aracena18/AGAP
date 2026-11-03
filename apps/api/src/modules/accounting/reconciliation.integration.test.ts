import { randomUUID } from 'node:crypto';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import type { ActorContext,TransactionContext,UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { owner,uow,prepareDatabase,resetFixtures,closePools } from '../../../test/database.js';
import { ApiError } from '../../platform/errors.js';
import { LedgerReader,requireReportingSnapshot } from './ledger-reader.js';
import { ReconciliationService } from './reconciliation.service.js';
import { prepareReconciliationFixtures,reconciliationFixture } from './testing/reconciliation-fixture.js';

let f:Awaited<ReturnType<typeof reconciliationFixture>>,base:Awaited<ReturnType<typeof resetFixtures>>;
const request={fromDate:'2026-11-01',throughDate:'2026-11-03'},key=()=>randomUUID();
const count=async()=>Number((await owner.query('SELECT count(*) FROM accounting.reconciliation_runs')).rows[0].count);
const auditCount=async()=>Number((await owner.query("SELECT count(*) FROM platform.audit_events WHERE event_type='accounting.reconciliation_recorded'")).rows[0].count);
const orphan=()=>uow.run(f.authorizer,tx=>f.ledger.post(tx,{sourceEventId:key(),postingKind:'repayment',postingRuleVersionId:f.policy.repaymentRuleId,
  effectiveDate:'2026-11-02',currency:'PHP',reversalOfJournalId:null,lines:[{accountId:f.policy.cashAccountId,side:'debit',amountCentavos:1},{accountId:f.policy.principalAccountId,side:'credit',amountCentavos:1}]}));
beforeAll(async()=>{await prepareDatabase();await prepareReconciliationFixtures();});
beforeEach(async()=>{base=await resetFixtures();f=await reconciliationFixture();});
afterAll(closePools);

describe('ACC-01 actual snapshot, journal reader and immutable run persistence',()=>{
  it('reconciles actual release/repayment/GL records and records one audit event without financial changes',async()=>{
    const r=await f.release(),c=await f.money.prepareRepayment(f.cashier,r.loan.id,r.request,key());
    await f.money.authorize(f.authorizer,c.id,1,key());const intent=await f.money.submitIntent(f.cashier,c.id,2,key());
    await f.money.observe(f.cashier,c.id,await f.paymentEvidence(intent),3,key());await f.money.finalize(f.authorizer,c.id,4,key());
    const before=(await owner.query('SELECT count(*) AS n FROM accounting.journals')).rows[0].n;
    const run=await f.service.create(f.actor,request,key());
    expect(run.report.status).toBe('matched');expect(run.report.events).toHaveLength(2);
    expect(run.mappingVersionIds).toHaveLength(2);expect(run.evidenceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(run.report.scope.cutoffAt).toMatch(/\.\d{6}Z$/);
    expect(await f.service.get(f.actor,run.id)).toEqual(run);expect(await auditCount()).toBe(1);
    expect((await owner.query('SELECT count(*) AS n FROM accounting.journals')).rows[0].n).toBe(before);
  });
  it('finds an orphan journal through an independent inventory',async()=>{
    await f.release();await orphan();const run=await f.service.create(f.actor,request,key());
    expect(run.report.status).toBe('discrepancy');expect(run.report.events.flatMap(row=>row.findings.map(finding=>finding.code))).toContain('missing_event');
  });
  it('reads journal_lines instead of trusting the saved posting request as actual line evidence',async()=>{
    await f.release();
    class BrokenEvidence extends LedgerReader {
      override inventory(tx:TransactionContext,scope:Parameters<LedgerReader['inventory']>[1]){
        const proxy:TransactionContext={actor:tx.actor,query:async<Row extends Record<string,unknown>>(sql:string,values?:readonly unknown[])=>{
          const result=await tx.query<Row>(sql,values);
          if(sql.includes('FROM accounting.journal_lines'))(result.rows[0] as Record<string,unknown>).amount='1';
          return result;
        }};
        return super.inventory(proxy,scope);
      }
    }
    const service=new ReconciliationService(f.snapshot,f.reads,new BrokenEvidence());
    const run=await service.create(f.actor,request,key());
    expect(run.report.status).toBe('discrepancy');expect(run.report.events[0].findings.map(finding=>finding.code)).toContain('unbalanced_journal');
  });
  it('holds both inventories on one real snapshot while another actor posts concurrently',async()=>{
    await f.release();
    const service=new ReconciliationService(f.snapshot,{inventory:async(tx,scope)=>{const data=await f.reads.inventory(tx,scope);await orphan();return data;}});
    const first=await service.create(f.actor,request,key());expect(first.report.status).toBe('matched');expect(first.report.events).toHaveLength(1);
    expect((await f.service.create(f.actor,request,key())).report.status).toBe('discrepancy');
  });
  it('refuses a coordinator that has not established a repeatable snapshot',async()=>{
    await expect(new ReconciliationService(uow,f.reads).create(f.actor,request,key())).rejects.toMatchObject({code:'snapshot_unavailable'});
    await expect(uow.run(f.actor,requireReportingSnapshot)).rejects.toMatchObject({code:'snapshot_unavailable'});
    expect(await count()).toBe(0);
  });
  it('preserves a confirmed-but-unposted movement as an exception',async()=>{
    await f.settledRelease();const run=await f.service.create(f.actor,request,key());
    expect(run.report.status).toBe('discrepancy');expect(run.report.events[0].findings.map(finding=>finding.code)).toContain('confirmed_unposted');
  });
  it('distinguishes a complete empty date range from missing mapping evidence',async()=>{
    const empty=await f.service.create(f.actor,request,key());expect(empty.report.status).toBe('empty');
    await f.release();
    // Operator configuration is absent in this isolated fixture; never infer it from the journal.
    await owner.query('TRUNCATE accounting.reconciliation_mappings');
    const run=await f.service.create(f.actor,request,key());expect(run.report.status).toBe('unavailable');
    expect(run.report.events[0].findings.map(finding=>finding.code)).toContain('posting_mapping_unavailable');
  });
  it('retains explicit source unavailability instead of manufacturing zero records',async()=>{
    const service=new ReconciliationService(f.snapshot,{inventory:async()=>({state:'unavailable',reason:'Fictional source is incomplete.'})});
    const run=await service.create(f.actor,request,key());expect(run.report.status).toBe('unavailable');expect(run.report.events).toEqual([]);
    expect(run.report.sourceIssues).toContain('servicing: Fictional source is incomplete.');
  });
  it('does not disguise authorization failure as unavailable or save a report',async()=>{
    const service=new ReconciliationService(f.snapshot,{inventory:async()=>{throw new ApiError(403,'source_forbidden','Denied');}});
    await expect(service.create(f.actor,request,key())).rejects.toMatchObject({status:403});expect(await count()).toBe(0);
  });
  it('rolls back run, audit/outbox and idempotency when commit work fails',async()=>{
    const failing:UnitOfWork={run:(actor,work)=>f.snapshot.run(actor,async tx=>{await work(tx);throw new Error('Fictional failure after report insertion.');})};
    const attempt=key();await expect(new ReconciliationService(failing,f.reads).create(f.actor,request,attempt)).rejects.toMatchObject({status:503});
    expect(await count()).toBe(0);expect(await auditCount()).toBe(0);
    expect((await owner.query("SELECT count(*) FROM platform.idempotency WHERE scope LIKE '%accounting.reconciliation.create%'")).rows[0].count).toBe('0');
    await f.service.create(f.actor,request,attempt);expect(await count()).toBe(1);
  });
  it('replays the preserved snapshot after new postings and rejects changed requests under the same key',async()=>{
    await f.release();const attempt=key(),first=await f.service.create(f.actor,request,attempt);await orphan();
    expect(await f.service.create(f.actor,request,attempt)).toEqual(first);
    await expect(f.service.create(f.actor,{...request,fromDate:'2026-11-02'},attempt)).rejects.toMatchObject({status:409,code:'idempotency_conflict'});
    expect(await count()).toBe(1);expect(await auditCount()).toBe(1);
    expect((await f.service.create(f.actor,request,key())).report.status).toBe('discrepancy');
  });
  it('records one result/audit for concurrent identical submissions under repeatable-read retries',async()=>{
    await f.release();const attempt=key(),runs=await Promise.all(Array.from({length:3},()=>f.service.create(f.actor,request,attempt)));
    expect(new Set(runs.map(run=>run.id)).size).toBe(1);expect(await count()).toBe(1);expect(await auditCount()).toBe(1);
  });
  it('denies ordinary staff and incomplete branch scope on create, replay and saved reads',async()=>{
    await expect(f.service.create(f.cashier,request,key())).rejects.toMatchObject({status:403});
    const attempt=key(),run=await f.service.create(f.actor,request,attempt);
    await owner.query("INSERT INTO platform.branches VALUES($1,$2,'Other reporting branch')",[key(),f.actor.organizationId]);
    await expect(f.service.get(f.actor,run.id)).rejects.toMatchObject({status:403});
    await expect(f.service.create(f.actor,request,attempt)).rejects.toMatchObject({status:403});
    await expect(f.service.list(f.actor,{})).rejects.toMatchObject({status:403});
  });
  it('denies revoked access before idempotency replay',async()=>{
    const attempt=key();await f.service.create(f.actor,request,attempt);
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1',[f.actor.userId]);
    await expect(f.service.create(f.actor,request,attempt)).rejects.toMatchObject({status:401});
  });
  it('isolates another organization and denies raw runtime writes',async()=>{
    const run=await f.service.create(f.actor,request,key());
    await owner.query("UPDATE identity.staff_users SET roles=ARRAY['auditor'] WHERE id=$1",[base.other.actor.userId]);
    const other:ActorContext={...base.other.actor,roles:['auditor']};
    await expect(f.service.get(other,run.id)).rejects.toMatchObject({status:404});
    expect((await uow.run(other,tx=>tx.query('SELECT * FROM accounting.reconciliation_runs'))).rows).toEqual([]);
    await expect(uow.run(f.actor,tx=>tx.query("UPDATE accounting.reconciliation_runs SET status='matched'"))).rejects.toMatchObject({code:'42501'});
    await expect(owner.query("UPDATE accounting.reconciliation_runs SET status='matched' WHERE id=$1",[run.id])).rejects.toMatchObject({code:'42501'});
    expect(await f.service.get(f.actor,run.id)).toEqual(run);
  });
  it('paginates immutable history without duplicate or skipped runs',async()=>{
    for(let i=0;i<21;i++)await f.service.create(f.actor,request,key());
    const first=await f.service.list(f.actor,{});expect(first.items).toHaveLength(20);expect(first.nextCursor).not.toBeNull();
    const second=await f.service.list(f.actor,{cursor:first.nextCursor});expect(second.items).toHaveLength(1);
    expect(new Set([...first.items,...second.items].map(row=>row.id)).size).toBe(21);expect(second.nextCursor).toBeNull();
  });
  it.each([{fromDate:'2026-11-01',throughDate:'2026-12-02'}, {...request,organizationId:randomUUID()}, {...request,throughDate:'2026-02-30'}])('rejects invalid/client-controlled request %j',async value=>{
    await expect(f.service.create(f.actor,value,key())).rejects.toMatchObject({status:422});expect(await count()).toBe(0);
  });
});
