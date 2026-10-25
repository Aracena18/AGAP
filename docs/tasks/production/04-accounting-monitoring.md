# Earl (D): accounting, financial health and independent model evaluation

Tracker: [Assignment.md — Earl](../../../Assignment.md#earl). **Current direction: 25 October 2026.** This replaces earlier task directions where they differ, adding confirmed support requests, corpus/split ownership and independent Qwen/EBM evaluation.

Read the [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery/path boundaries](../../AGAP_Delivery_Plan.md), [design](../../../design.md) and AGENTS.md. Assignment.md is the only status register.

## Work packages and ownership

Own GL-01, HLT-01, ACC-01 and EVAL-01. Retain staff accounting/monitoring UI, API modules `accounting/` and `monitoring/`, their rules/migrations/read models/tests; add planned `evaluation/synthetic/` for the corpus/splits/Qwen benchmark and `evaluation/explainable/` for independent survey split/protocol/evaluation reports. Trainers own their model directories, not these evaluation paths. Robert owns every member-phone screen/facade and shared schemas/wiring. Benedict owns loan accounts/amendments; do not write servicing tables or change balances.

Own health-domain prompts, faithful summary validation and member-confirmed sharing through Aaron's single AI adapter. Do not create another provider client or infer honesty, shame, mental health or creditworthiness from language. A direct structured answer needs no AI interpretation.

## First-demonstration slice — 16 relative units

| Work | Units | Required result |
| --- | --- | --- |
| GL-01 | 5 | Real balanced transactional posting, source-event uniqueness and period guards for the shown money path |
| HLT-01 | 3 | Confirmed check-in/help request, dated loan position, assigned staff action and explicit unavailable responses |
| ACC-01 | 2 | Minimum receipt/loan-subledger/GL reconciliation for the demonstration |
| EVAL-01 | 6 | Reviewed synthetic corpus/grouped splits; independent pretrained/tuned Qwen/checklist and EBM/logistic evaluation, errors and uncertainty |

These provisional slices include data preparation, tests/review and independent final scoring. The team estimate expands from 48 to 64 units; evaluation is no longer a two-unit checklist. Benedict’s first contractual amendment moves to stage 2 while support requests/staff response stay in the demo. Complete capital, cash/bank reconciliation, period close, financial reports, adjustments and broader health/evaluation work remain yours in stage 2.

## Interfaces and execution order

1. Review the shared transaction/posting/loan-position ports and propose support-request, confirmed-sharing and evaluation-manifest needs through Robert's FND-03 revision.
2. Publish the real posting service early for Benedict. Validate organization/currency/accounts, balanced nonzero lines, permanent source-event identity and open periods in the caller's transaction. Never report financial success before the atomic commit.
3. Enforce immutable posted journals; corrections use linked reversals/open-period adjustments. Period-close races and duplicate events remain financial invariants, not optional UI checks. Minimal reconciliation makes unexplained differences visible.
4. Record member-confirmed check-ins and help requests, shared text, source/date, explicit unknown/declined responses, staff assignment/action and follow-up. Consume Benedict's as-of posted position and freshness. Robert implements submission/preview in the portal; your service owns the records and staff queue.
5. Demonstrate a member paying on time while reporting essential-expense strain. Route to a human next step; a pending request does not amend a loan, pause charges or create a healthy/unhealthy label. Benedict controls any approved/member-accepted amendment in stage 2 and returns its reference; the first demo leaves terms unchanged.
6. Build synthetic documents/statements and a separate known-truth manifest with seed/provenance, dates/amounts, conflicts/unknowns and independently checked expected results. Reference existing canonical fixtures/oracles by ID/path; never copy the baseline registry or change `src/demo/` yourself.
7. Freeze grouped training/validation/holdout manifests before tuning; keep related household/scenario pages and augmentations together and reserve unseen template families. Supply train/validation first so Benedict can train; final scoring follows his artifact. Keep holdout labels outside prompt/model tuning. Compare pretrained versus tuned Qwen, an annual-expense checklist and plain check-in form. Report extraction/source correctness, missed costs, unsupported assumptions, appropriate abstention, correction effort, latency and handoff accuracy. Owners supply module evidence; Robert integrates the journey.

## Independent model evaluation — EVAL-01

Use the [model training plan](../../AGAP_Model_Training_Plan.md). Benedict trains Qwen; Aaron trains EBM/logistic and owns the application inference adapter. You own generator/truth/split/evaluation code and final reports, not their model training or operational artifact registration. Keep the synthetic application corpus separate from the public-survey research cache; neither is another demo fixture registry.

Before Qwen tuning, lock reviewed source/field/date/expense labels, grouped manifests and the proposed improvement/regression criteria. Check poor scans, source conflicts, gross/net confusion, ambiguous recurrence, duplicate costs, missing amounts/dates and malicious instructions. Evaluate schema/source correctness, missed costs, unsupported claims, abstention, correction effort and actual resource/latency limits with denominators and error examples. Do not silently regenerate a failing holdout until it passes.

For Aaron’s XAI-01, independently review dataset access/codebook, cohort/target/feature mappings, weights/missingness/leakage and development/holdout IDs before training. Consume both fixed artifacts for same-split discrimination, calibration/Brier, validation-chosen threshold, uncertainty and subgroup-size reporting. A public survey models reported difficulty, not loan default or causal response to help. Keep EBM output outside member/lending/support-ranking interfaces. Report weak/null results rather than guaranteeing improvement.

Use an early data/protocol handoff and later final-artifact evaluation, not whole-task circular prerequisites. Return versioned evidence and promotion/non-promotion recommendation to Robert/Aaron/Benedict; no automatic runtime promotion or promise that synthetic accuracy improves real wellbeing.

## Acceptance and retained work

- Real transaction/permission tests cover balanced posting, duplicate events, reversals, period guards and reconciled loan/GL/receipt relationships. Full chart/recognition/report mappings need accountant approval before live use.
- Unknown or declined check-in responses remain unavailable. Members can review/correct shared text; support disclosures do not silently become adverse credit signals or ledger changes.
- Synthetic pairs include identical current repayment records with different explicitly reported household circumstances. Avoid unsupported conclusions from spending changes or silence.
- Expense cases cover missing values, source conflicts, gross/net confusion, beyond-cycle costs and duplicate/reserve double counting. Domain expected answers are independently reviewed rather than merely recalculated by the production engine being tested.
- Technical synthetic results do not establish actual reduced defaults, better wellbeing or population fairness. The overlooked-expense mechanism and support benefit require partner validation and later appropriate outcome evaluation.
- Retain full share-capital accounting, reports, adjustments, period close, loan/bank reconciliation and longitudinal financial-health outcomes for stage 2. No member-phone UI, loan-table writes or provider command-state changes.

## Progress and handoff notes

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.

25 October 2026: PLN-01 revised this brief, ownership and first-demonstration slices. This note records documentation only; no new feature implementation or review acceptance is claimed. Use Assignment.md for the current task status and next action.

25 October 2026 — PLN-02: the user-requested model-training revision supersedes this brief’s earlier 12-unit allocation. Current scope is the 16-unit table above and the [model training plan](../../AGAP_Model_Training_Plan.md); recorded implementation history remains unchanged. No training result or new feature implementation is claimed.
