import {randomUUID} from 'node:crypto';
import {businessDay} from '../src/modules/servicing/command-rules.js';
import {connectedLendingFixture} from './connected-lending-fixture.js';
import {owner} from './database.js';

/** Independent fictional money organization; no development config or canonical fixtures. */
export async function connectedMoneyFixture(){
 const day=businessDay(new Date().toISOString()),next=new Date(Date.parse(`${day}T00:00:00Z`)+30*86400000).toISOString().slice(0,10);
 const f=await connectedLendingFixture([day,next]),p=f.configuration.principalPolicy,periodId=randomUUID();
 await owner.query("INSERT INTO accounting.accounts(id,organization_id,code,label,currency) VALUES($1,$2,'cash','Fictional connected cash','PHP'),($3,$2,'principal','Fictional connected receivable','PHP')",[p.cashAccountId,f.org,p.principalAccountId]);
 await owner.query("INSERT INTO accounting.posting_rules VALUES($1,$2,'disbursement','PHP','2026-01-01','2026-12-31'),($3,$2,'repayment','PHP','2026-01-01','2026-12-31')",[p.releaseRuleId,f.org,p.repaymentRuleId]);
 await owner.query("INSERT INTO accounting.rule_accounts VALUES($1,$2,$3,'debit'),($1,$2,$4,'credit'),($1,$5,$4,'debit'),($1,$5,$3,'credit')",[f.org,p.releaseRuleId,p.principalAccountId,p.cashAccountId,p.repaymentRuleId]);
 await owner.query("INSERT INTO accounting.periods VALUES($1,$2,'2026-01-01','2026-12-31','open')",[periodId,f.org]);
 for(const kind of ['disbursement','repayment'])await owner.query("INSERT INTO accounting.reconciliation_mappings(id,organization_id,posting_rule_version_id,kind,currency,effective_from,effective_through,cash_account_id,principal_account_id,review_reference) VALUES($1,$2,$3,$4,'PHP','2026-01-01','2026-12-31',$5,$6,'Fictional connected fixture; no institutional approval')",[randomUUID(),f.org,kind==='disbursement'?p.releaseRuleId:p.repaymentRuleId,kind,p.cashAccountId,p.principalAccountId]);
 return {...f,day,periodId};
}
