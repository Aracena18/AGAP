# Benedict (C): accountable decisions and servicing

Tracker: [Assignment.md — Benedict](../../../Assignment.md#benedict). **Current direction: 25 October 2026.** This supersedes earlier task directions where they differ, adding explicit conflict restrictions and a first-demonstration hardship amendment.

Read the [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery/path boundaries](../../AGAP_Delivery_Plan.md), [design](../../../design.md) and AGENTS.md. Assignment.md alone records task status.

## Work packages and ownership

Own DEC-01, PAY-01 and SRV-01. Retain decision/loans/payments staff features, `src/domain/review.ts`, `explanation.ts` and tests, API modules `decisions/` and `servicing/` with payment adapters. Robert owns member-phone screens/facade and shared contracts/wiring. Earl owns accounting and support-request records; do not write their tables or create a separate ledger.

Use Aaron's checked assessments and one reusable AI adapter. Your domain owns source/figure validation and reviewed explanation prompts, with deterministic fallback. AI never supplies approval authority, authoritative figures or payment commands.

## First-demonstration slice — 12 relative units

| Work | Units | Required result |
| --- | --- | --- |
| DEC-01 | 4 | Current-input recommendation, separate reviewer, conflict/exception guards, immutable brief and acceptance |
| PAY-01 | 5 | One controlled fictional manual disbursement → repayment → receipt, atomically posted through Earl's real service |
| SRV-01 | 3 | One policy-permitted fictional due-date amendment with compared terms, approval/member acceptance and retained history |

Include tests/review. Full provider-backed operations, allocation variants, refunds, settlement and write-off/recovery remain your stage 2 work; the minimal path does not complete those obligations.

## Interfaces and execution order

1. Review the candidate assessment, release, financial command, posting and position ports. Propose conflict declarations and amendment compare/approve/accept fields through Robert's FND-03 revision.
2. Require current assessment/input versions and actual authority. The preparer cannot provide final approval. Record relevant conflict declarations, restrictions and reassignment/recusal; administrative access does not grant financial authority. Exceptions need a permitted rule, reason and authorized reviewer, and cannot fabricate missing evidence.
3. Preserve recommendation/decision, evidence and policy versions. Changed material inputs invalidate pending votes and hold unreleased loans for renewed review; historic decisions remain inspectable. Clarification is available with incomplete data.
4. Build durable prepared/authorized/submitted/confirmed/failed/unknown commands. A timeout cannot create a second transfer. Production manual records need actual cash/bank movement evidence. The demo uses explicitly simulated manual movements; neither a voucher nor its simulation pretends to send electronic funds.
5. Use the same transaction for servicing allocations, Earl's journal, command state and audit. Underlying business events and webhook IDs are distinct deduplication boundaries. Keep confirmed-but-unposted failures durable for reconciliation.
6. Publish dated posted loan/schedule/receipt positions with freshness for Robert/Earl. Earl owns the member-confirmed support request; your service produces only configured amendment comparisons and controls financial changes.
7. For the first hardship path, calculate old/new dates, amounts and total cost from approved rules. An authorized person approves, the member accepts, and a new effective schedule retains the original. Pending help does not stop fees or amend the loan. Return the result through ports for Robert's portal and Earl's follow-up.

## Acceptance and retained work

- Server tests reject preparer self-approval, unresolved applicable conflicts, unauthorized exceptions, stale inputs and expired/missing prerequisites. An authorized exception is visible, not automatically misconduct.
- Source-linked AI explanations match supplied calculations and actual decisions; manual/template fallback remains usable. No unsupported offer or income assumption is invented.
- Test duplicate/late/unknown provider outcomes, crash retries, atomic subledger/GL behavior and receipt/reconciliation references for the shown path.
- Test support request versus amendment separation, member rejection/pending acceptance, effective-date changes and preservation of original terms/decision snapshots.
- Retain partial/early/late payments, unapplied excess, reversals/refunds, broader restructures, settlement, write-off/recovery and provider reconciliation as assigned stage 2 work. Coordinate approved postings with Earl.
- Payment status never establishes household wellbeing. No member-portal screens, monitoring table writes, parallel ledger or shared-file edits.

## Progress and handoff notes

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.

25 October 2026: PLN-01 revised this brief, ownership and first-demonstration slices. This note records documentation only; no new feature implementation or review acceptance is claimed. Use Assignment.md for the current task status and next action.
