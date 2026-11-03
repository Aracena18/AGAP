/** Fictional test producers only; never imported by application startup. */
import { randomBytes } from 'node:crypto';
import { owner,uow } from '../../../../test/database.js';
import { tokenHash } from '../../identity/identity.service.js';
import { seedMoneyFixture,moneyPorts } from '../../servicing/testing/money-db-fixture.js';
import { LoanReads } from '../../servicing/loan-reads.js';
import { PostgresUnitOfWork } from '../../../platform/database.js';
import { runtimePool } from '../../../../test/database.js';
import { ReconciliationService } from '../reconciliation.service.js';

export async function prepareReconciliationFixtures(){
  await owner.query(`CREATE TABLE IF NOT EXISTS servicing.test_money_context(organization_id uuid NOT NULL REFERENCES platform.organizations(id),application_id uuid PRIMARY KEY,body jsonb NOT NULL,policy jsonb NOT NULL);
    ALTER TABLE servicing.test_money_context ENABLE ROW LEVEL SECURITY; ALTER TABLE servicing.test_money_context FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS fixture_scope ON servicing.test_money_context;
    CREATE POLICY fixture_scope ON servicing.test_money_context USING(organization_id=platform.current_organization());
    GRANT SELECT,UPDATE ON servicing.test_money_context TO agap_runtime;`);
}
export async function reconciliationFixture(){
  const f=await seedMoneyFixture();
  const actor={...f.officer,roles:['auditor'] as const},token=randomBytes(32).toString('base64url');
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['auditor'] WHERE id=$1",[actor.userId]);
  await owner.query('UPDATE identity.sessions SET token_hash=$2 WHERE id=$1',[actor.sessionId,tokenHash(token)]);
  for(const kind of ['disbursement','repayment'])await owner.query(`INSERT INTO accounting.reconciliation_mappings
    (id,organization_id,posting_rule_version_id,kind,currency,effective_from,effective_through,cash_account_id,principal_account_id,review_reference)
    VALUES(gen_random_uuid(),$1,$2,$3,'PHP',$4,$5,$6,$7,'Fictional integration fixture; not institutional approval')`,
  [actor.organizationId,kind==='disbursement'?f.policy.releaseRuleId:f.policy.repaymentRuleId,kind,f.policy.effectiveFrom,f.policy.effectiveThrough,f.policy.cashAccountId,f.policy.principalAccountId]);
  const snapshot=new PostgresUnitOfWork(runtimePool,{isolation:'repeatable read'}),reads=new LoanReads(uow,moneyPorts);
  const service=new ReconciliationService(snapshot,reads);
  async function release(){const result=await f.settledRelease();await f.money.finalize(f.authorizer,result.command.id,4,crypto.randomUUID());return result;}
  return {...f,actor,token,snapshot,reads,service,release};
}
