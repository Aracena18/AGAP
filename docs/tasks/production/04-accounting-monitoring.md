# Earl (D): accounting and financial-health monitoring

Tracker: [Assignment.md — Earl](../../../Assignment.md#earl). Record handoffs in this brief for Robert to incorporate into the central tracker.

Read the [product priorities](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery plan](../../AGAP_Delivery_Plan.md) and root AGENTS.md before implementation. Follow [design.md](../../../design.md); propose any new screen blueprint through A.

## Work packages and ownership

Own GL-01, HLT-01 and ACC-01. Own accounting/monitoring UI and backend modules, their migrations, domain rules and read models. Do not change loan balances or provider command state directly; consume C's loan positions/events and publish the transactional posting interface through A's contracts.

Build the ledger foundation before any live financial path depends on it. Validate organization/currency/accounts, balanced nonzero lines, permanent source-event uniqueness and period locks. Posting joins the caller's transaction. Ordinary application roles cannot rewrite posted journals. Reversals and open-period adjustments preserve source references.

Implement chart/posting-rule versions, share-capital contributions/permitted refunds, cash/bank and loan-subledger reconciliation, period close, trial balance and required financial statements. All recognition/report mappings require accountant-confirmed policy before live use; balanced arithmetic alone does not establish correct accounting treatment.

Build dated member check-ins and review tasks that record ability to meet essential expenses, additional borrowing to repay, changes and reported strain, including explicit unavailable responses. Show them next to an as-of loan position. A member may pay on time and still report difficulty. Staff decide the next action; a response does not automatically restructure a contract, change a balance or generate a character score.

## Acceptance and handoff

- Test balanced posting, duplicate business events, reversals, closed-period rejection, concurrent posting/close, capital/loan account separation and subledger-to-GL reconciliation.
- Publish the transaction-aware posting interface early for C. Financial success cannot be reported before posting commits.
- Verify report opening/closing relationships and reviewed account mappings with independent examples; keep unexplained differences visible.
- Demonstrate a current-payment/financial-strain case and an unavailable-check-in case without unsupported healthy/unhealthy classifications.
- Keep report/review freshness visible and derive repayment facts from posted events. Refreshing a projection must not duplicate money or follow-up actions.

## Progress and handoff notes

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.
