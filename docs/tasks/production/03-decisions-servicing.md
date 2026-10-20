# Benedict (C): decisions and servicing

Tracker: [Assignment.md — Benedict](../../../Assignment.md#benedict). Record handoffs in this brief for Robert to incorporate into the central tracker.

Read the [product priorities](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery plan](../../AGAP_Delivery_Plan.md) and root AGENTS.md before implementation. Follow [design.md](../../../design.md) for all decision, servicing and explanation UI.

## Work packages and ownership

Own DEC-01, PAY-01 and SRV-01. Own the decision/loans/payments feature paths, existing review/explanation modules/tests, backend decisions/servicing and its payment adapters. Do not write accounting tables or create a separate ledger. Use B's checked assessments and D's transactional posting service through A's canonical contracts.

Implement recommendation, configured approvals/quorum, exceptions, immutable snapshots, member acceptance and release prerequisites. A changed material input invalidates pending review; an old signed-off snapshot remains inspectable. Return for clarification remains available with incomplete evidence. No AI decision authority.

Implement prepared/authorized/submitted/confirmed/failed/unknown financial commands and confirmed-but-unposted exception handling. Keep provider/business-event identities stable across retries and duplicate notifications. A timeout never justifies a second transfer with a new key.

On confirmed disbursement, payment, reversal, refund or other financial event, use the shared transaction and D's posting interface so loan allocations and GL entries commit together. Keep unprocessed confirmations durable if posting fails. Manual cash/bank evidence must represent an actual controlled movement; sandbox adapters must be labeled.

Implement partial/early/late payments, unapplied excess, authorized amendments/restructures, settlement and write-off/recovery commands with approved rules. Preserve contractual and schedule history. Produce member statements and briefs from the appropriate saved version, not a recalculation of an old decision.

## Acceptance and handoff

- Test stale/current versions, prerequisites, separate preparer/checker identities, authority limits/quorum and required explanations/exceptions.
- Test duplicate success events with different webhook IDs for one underlying transfer, timeout/unknown handling, provider reconciliation and retries after crashes.
- Demonstrate all-or-nothing subledger/GL posting, correct allocation, excess/reversal/refund conservation and preserved original restructure terms.
- Publish loan-position/read-model semantics and freshness for D's health reviews. Never infer member wellbeing from payment status.
- Optional AI explanation is an additional reviewed adapter with deterministic fallback, not a substitute for the above work.

## Progress and handoff notes

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.
