# Benedict (C): Qwen training, accountable decisions and servicing

Tracker: [Assignment.md — Benedict](../../../Assignment.md#benedict). **Current direction: 25 October 2026.** This supersedes earlier task directions where they differ, retaining conflict restrictions and adding your Qwen training assignment. The first contractual hardship amendment moves from the earlier demo allocation to stage 2.

Read the [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery/path boundaries](../../AGAP_Delivery_Plan.md), [design](../../../design.md) and AGENTS.md. Assignment.md alone records task status.

## 26 October candidate handoff

Start interface review from [the current platform guide](../../AGAP_Platform_Foundation.md), [member contract proposal](../../AGAP_Member_Contract_Proposal.md) and [verification/limits](../../AGAP_Robert_Member_Verification.md) on `feat/robert-member-platform`. Executable 0.2.0 is supplied for review; no consuming-owner agreement is recorded. Member actor/transactions are separate from staff, and domain defaults are unavailable. This supersedes earlier future-tense instructions about creating the member contracts from scratch. Assignment.md remains the only status tracker.

## Work packages and ownership

Own QWN-01, DEC-01, PAY-01 and stage 2 SRV-01. Add exclusive planned `models/qwen/` for baseline/LoRA notebooks, training/configs, artifact manifests and model/run cards. Retain decision/loans/payments staff features, `src/domain/review.ts`, `explanation.ts` and tests, API modules `decisions/` and `servicing/` with payment adapters. Robert owns member-phone screens/facade and shared contracts/wiring. Earl owns accounting and support-request records; do not write their tables or create a separate ledger.

Use Aaron's checked assessments and one reusable AI adapter. Your domain owns source/figure validation and reviewed explanation prompts, with deterministic fallback. AI never supplies approval authority, authoritative figures or payment commands.

## First-demonstration slice — 16 relative units

| Work | Units | Required result |
| --- | --- | --- |
| DEC-01 | 4 | Current-input recommendation, separate reviewer, conflict/exception guards, immutable brief and acceptance |
| PAY-01 | 5 | One controlled fictional manual disbursement → repayment → receipt, atomically posted through Earl's real service |
| QWN-01 | 7 | Pretrained Qwen baseline, reviewed synthetic-data LoRA training, reproducible artifact/model card and handoff to Aaron |

Include training/data preparation, tests/review and correction effort. The team estimate increases from 48 to 64 units. SRV-01, including the first compared/approved/accepted hardship amendment, remains your stage 2 work alongside full provider-backed operations, allocation variants, refunds, settlement and write-off/recovery; the minimal path does not complete those obligations.

## Interfaces and execution order

1. Review the candidate assessment, release, financial command, posting and position ports. Propose conflict declarations and amendment compare/approve/accept fields through Robert's FND-03 revision.
2. Require current assessment/input versions and actual authority. The preparer cannot provide final approval. Record relevant conflict declarations, restrictions and reassignment/recusal; administrative access does not grant financial authority. Exceptions need a permitted rule, reason and authorized reviewer, and cannot fabricate missing evidence.
3. Preserve recommendation/decision, evidence and policy versions. Changed material inputs invalidate pending votes and hold unreleased loans for renewed review; historic decisions remain inspectable. Clarification is available with incomplete data.
4. Build durable prepared/authorized/submitted/confirmed/failed/unknown commands. A timeout cannot create a second transfer. Production manual records need actual cash/bank movement evidence. The demo uses explicitly simulated manual movements; neither a voucher nor its simulation pretends to send electronic funds.
5. Use the same transaction for servicing allocations, Earl's journal, command state and audit. Underlying business events and webhook IDs are distinct deduplication boundaries. Keep confirmed-but-unposted failures durable for reconciliation.
6. Publish dated posted loan/schedule/receipt positions with freshness for Robert/Earl. Earl owns the member-confirmed support request; your service produces only configured amendment comparisons and controls financial changes.
7. In stage 2 under SRV-01, for the first hardship path, calculate old/new dates, amounts and total cost from approved rules. An authorized person approves, the member accepts, and a new effective schedule retains the original. Pending help does not stop fees or amend the loan. Return the result through ports for Robert's portal and Earl's follow-up.

## Qwen training — QWN-01

Follow the [model training plan](../../AGAP_Model_Training_Plan.md): **Qwen3.5-2B with LoRA**, not random-weight pretraining. Earl supplies reviewed fictional documents, known truth and grouped training/validation manifests; he retains final holdout evaluation. You own model/training code, not the corpus, holdout labels or application AI adapter.

Agree source-linked extraction/clarification outputs with Aaron and proposed shared provenance fields with Robert. Run the pretrained baseline first, then a small free-cloud-GPU smoke test using a pinned, hardware-compatible environment. Record actual precision/memory/runtime and limits; current model-specific instructions advise against 4-bit QLoRA. Free GPU availability or uninterrupted sessions are not guaranteed.

Tune only on training/validation data. Return base/processor revisions, adapter/config/checksum, dataset/split hashes, seed/environment, logs and reproducible inference instructions/model card. Keep large weights and checkpoints in an approved artifact location outside Git. Aaron integrates eligible inference through the single `ai/` adapter; Robert owns dependency/schema/route/runtime registration. Do not add a second application provider client or reach operational member/financial tables from notebooks.

Earl compares pretrained/tuned Qwen and checklist performance independently. The trained artifact is promoted only after the reviewed gate passes; document no gain or unfinished training honestly. Financial numbers in documents remain untrusted candidate text until validated/confirmed; the existing deterministic engine calculates, independent methods verify claims and people decide.

## Acceptance and retained work

- Server tests reject preparer self-approval, unresolved applicable conflicts, unauthorized exceptions, stale inputs and expired/missing prerequisites. An authorized exception is visible, not automatically misconduct.
- Source-linked AI explanations match supplied calculations and actual decisions; manual/template fallback remains usable. No unsupported offer or income assumption is invented.
- Test duplicate/late/unknown provider outcomes, crash retries, atomic subledger/GL behavior and receipt/reconciliation references for the shown path.
- In the first demo, payment help ends at staff review/recorded response with unchanged terms. For stage 2 SRV-01, test support request versus amendment separation, member rejection/pending acceptance, effective-date changes and preservation of original terms/decision snapshots.
- Retain partial/early/late payments, unapplied excess, reversals/refunds, broader restructures, settlement, write-off/recovery and provider reconciliation as assigned stage 2 work. Coordinate approved postings with Earl.
- Payment status never establishes household wellbeing. No member-portal screens, monitoring table writes, parallel ledger or shared-file edits.

## Progress and handoff notes

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.

25 October 2026: PLN-01 revised this brief, ownership and first-demonstration slices. This note records documentation only; no new feature implementation or review acceptance is claimed. Use Assignment.md for the current task status and next action.

25 October 2026 — PLN-02: the user-requested model-training revision supersedes this brief’s earlier 12-unit allocation. Current scope is the 16-unit table above and the [model training plan](../../AGAP_Model_Training_Plan.md); recorded implementation history remains unchanged. No training result or new feature implementation is claimed.
