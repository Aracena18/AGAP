# Earl (D): accounting, financial health and independent model evaluation

Tracker: [Assignment.md — Earl](../../../Assignment.md#earl). **Current direction: 2 November 2026; the policy-source refinement below supplements ongoing work and the retained goal/5C assignments.** This replaces earlier task directions where they differ, adding confirmed support requests, corpus/split ownership and independent Qwen/EBM evaluation.

Read the [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery/path boundaries](../../AGAP_Delivery_Plan.md), [design](../../../design.md) and AGENTS.md. Assignment.md is the only status register.

## 26 October candidate handoff

Start interface review from [the current platform guide](../../AGAP_Platform_Foundation.md), [member contract proposal](../../AGAP_Member_Contract_Proposal.md) and [verification/limits](../../AGAP_Robert_Member_Verification.md) on `feat/robert-member-platform`. Executable 0.2.0 is supplied for review; no consuming-owner agreement is recorded. Member actor/transactions are separate from staff, and domain defaults are unavailable. This supersedes earlier future-tense instructions about creating the member contracts from scratch. Assignment.md remains the only status tracker.

## Work packages and ownership

Own GL-01, HLT-01, GOL-01, ACC-01 and EVAL-01/EVAL-02/EVAL-03. Retain staff accounting/monitoring UI, API modules `accounting/` and `monitoring/`, their rules/migrations/read models/tests; add planned `evaluation/synthetic/` for the corpus/splits/Qwen benchmark and `evaluation/explainable/` for independent survey split/protocol/evaluation reports. Trainers own their model directories, not these evaluation paths. Robert owns every member-phone screen/facade and shared schemas/wiring. Benedict owns loan accounts/amendments; do not write servicing tables or change balances.

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

## Goal-guidance addition (29 October 2026)

Own GOL-01 within monitoring and its staff UI/domain prompts: voluntary member goals/consent, dedicated funds/progress with source/as-of status, reviewed educational content/versioning, checked guidance drafts, authorized product-specific suitability review and preserved/stale advice history. Use Aaron's CRD-02 planner/catalogue and single AI adapter through Robert's proposed FND-04 contracts. All member-phone screens remain Robert's MOB-02. A contribution plan or member-reported saving is not a posted transaction; never change loan/accounting balances or reserve actual funds from a goal operation.

Own EVAL-02 in evaluation/synthetic, with independent expected goal-planning results, reviewed fictional guidance labels and grouped household/template splits. Review financial content/product suitability labels with the cooperative's authorized responsible person; hand training/validation material to Benedict before QWN-02 completion, reserve holdout for later final scoring, and include the calculator-plus-reviewed-template baseline. Check centavo/date/horizon/fee/liquidity/allocation errors, unknowns, no surplus, stale products, invented/unsafe advice, declined/paused goals, sales pressure, source fidelity and member comprehension/correction effort. Keep EBM outputs outside goals, advice, suitability and support ranking.

Apply [product scope](../../AGAP_Product_Solution.md#member-goals-savings-and-cooperative-product-guidance) and [design.md](../../../design.md#11-planned-goals-savings-and-product-guidance-29-october-2026); do not create another UI guide. GOL-01/EVAL-02 are stage 2 by default, unestimated beyond your existing 16-unit slice. Current statuses and accounting duties remain unchanged; technical scenario success or saving a plan is not evidence of real savings, goal completion or improved wellbeing.

## Institution-rubric 5C addition (29 October 2026)

Own EVAL-03 within evaluation/synthetic: independently reviewed fictional rubric/source/criterion examples, expected rule arithmetic, grouped household/template/rubric splits and final model/expert/checklist comparison. Hand off training/validation references to Benedict before artifact completion; reserve holdout labels and report correction burden, unsupported findings/scores/reasons, inappropriate unknown/applicability handling and source/score-trace fidelity. Counterfactually vary irrelevant demographic/language details while financial facts remain unchanged; preserve Ben's shortfall, Cora's incomplete assessment and no-history clarification without inferred dishonesty. Institutional rubric/credit experts review labels and limits; synthetic rubric agreement is not calibration of repayment probability or proof of fairness/household benefit. XAI-01 EBM/logistic research remains outside credit scoring/explanation. Consume Robert's FND-05 and Aaron's CRD-03 definitions; new stage 2 estimates are Pending beyond current demo/goal scope and do not transfer staff credit UI or decisions to you.

## New-feature deliverables

These steps expand the existing goal/monitoring/evaluation tasks. Preserve first-demo priorities; new work defaults to stage 2 with separate Pending estimates. Assignment.md alone records status. Data/protocol handoff precedes model completion, while final independent evaluation follows returned artifacts.

### GOL-01 — goals, guidance and staff review

1. Agree FND-04 proposals with Robert. Define voluntary goal/consent, current source/as-of inputs, dedicated funds/progress, reviewed content and advice-review/history operations in monitoring. After CRD-02, HLT-01 and AI-01 are available, consume their reviewed contracts for integrated guidance.
2. Implement source-validated domain prompts through Aaron's single adapter and checked planner results. Provide manual/template guidance, member choice/pause/withdrawal, stale-result handling and an authorized suitability-review queue. Personalized investment drafts stay staff-only until review; loan eligibility does not depend on accepting a goal.
3. Hand own-record goal/guidance/progress projections to Robert for MOB-02. Supply consent/access, correction, review authority, source/version/history and no-financial-write checks plus staff UI screenshots. Record reported progress separately from posted saving/accounting facts; no goal action moves funds or changes a loan.

### EVAL-02 — independent goal-guidance evidence

1. After FND-04 and reviewed goal/content protocol, define independent planner expectations and guidance labels with Aaron and an authorized product/advice reviewer. Freeze grouped household/template training/validation/holdout manifests; include missing inputs, no surplus, duplicate reserves, fees/liquidity, stale products and declined goals.
2. Hand approved training/validation references and comparison protocol to Benedict before QWN-02 completes. Retain final labels; compare checked planner plus reviewed template, eligible baseline and returned adapted artifacts without tuning on holdout.
3. Report exact money/date/source errors, unsuitable/invented advice, sales pressure, review-status failures, comprehension/correction burden and regression results. Send versioned promotion/non-promotion evidence and limits to Robert/Aaron/Benedict; synthetic success does not prove real saving or improved wellbeing.

### EVAL-03 — independent 5C evidence and comparison

1. After FND-05 and reviewed rubric/source protocol, agree independently reviewed source/criterion labels and expected rule traces with Aaron and credit/rubric reviewers. Freeze grouped household/template/rubric-family splits, with missing/conflicting evidence, no credit history, inapplicable collateral and persistent cash shortages.
2. Hand training/validation references to Benedict before QWN-03 completes. Independently test rule points/weights/denominators/rounding and compare checklist/template, blinded staff review, baseline and returned adapted artifacts; protect final holdout from tuning.
3. Report source/trace fidelity, unsupported findings/percentages/reasons, unknown/applicability mistakes, stale versions and correction/comprehension burden. Check irrelevant demographic/language changes with financial facts held constant and regress enabled Qwen capabilities. Return a separate release recommendation and uncertainty to Robert/Aaron/Benedict; rubric agreement is not repayment calibration, demonstrated fairness or household-outcome evidence.

Keep evaluation expectations independent of the engine under test; reference canonical fixtures/oracles rather than duplicating them. Record task ID, branch/base, contract/rubric/model/data versions, split hashes, checks, unresolved review inputs and receiving owner for every handoff. EBM stays in its separate offline research boundary.

## Policy-source refinement — 2 November 2026

Continue the merged GL-01 posting, ACC-01 principal-comparison and EVAL-01 corpus/paired-comparison tools. The [source register](../../AGAP_Policy_Clarification_Register.md) supplements existing acceptance; it does not require a new ledger or evaluation framework. Review P04/P05/P10 component, fee and capital interpretations with the responsible institution and Aaron/Benedict before adopting posting mappings. Keep actual PAY-01 evidence readers, consistent snapshots, authorization and atomic integration distinct from the pure checker and fictional caller harness.

At the owner checkpoint supply branch/base, delivered slice, checks, actual integration gaps and remaining effort. Independently review agreed rate/period/rounding, unknown/zero and double-counting expectations in fictional cases. New corpus changes require explicit versions and reviewed manifests; preserve any already frozen training release and private holdout rather than silently adding labels or forcing trainer restarts. Keep accounting, model evaluation and participant/household outcomes distinct. Full product/reloan/SRV-01 and numerical 5C breadth retains staged scope. Robert coordinates shared schema/registration; draft PR #18 is separate. No supplied named record becomes a fixture, model input or operational import.

## Progress and handoff notes

Historical baseline note: no production implementation progress was recorded in the earlier brief. Read dated handoffs, where present, and Assignment.md for subsequent evidence; confirm unreported current progress at the owner checkpoint. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.

25 October 2026: PLN-01 revised this brief, ownership and first-demonstration slices. This note records documentation only; no new feature implementation or review acceptance is claimed. Use Assignment.md for the current task status and next action.

25 October 2026 — PLN-02: the user-requested model-training revision supersedes this brief’s earlier 12-unit allocation. Current scope is the 16-unit table above and the [model training plan](../../AGAP_Model_Training_Plan.md); recorded implementation history remains unchanged. No training result or new feature implementation is claimed.

29 October 2026 — PLN-03: goal-guidance responsibilities and future acceptance added by user request. Existing feature/model progress, exclusive ownership and first-demo budgets remain unchanged; new goal packages have separate pending estimates.

29 October 2026 — PLN-04: added planned 5C review/trace/handoff responsibilities without changing existing feature/model progress, original first-demo budgets or the separate goal packages. Numeric rubric configuration remains pending.

## GL-01 implementation candidate — 29 October 2026

Task branch: `feat/earl-gl-01`, using a normal checkout by the user's explicit instruction. Initial development combined main `1f4cc5b` with Robert's existing member-platform candidate `4577c850dcca44393f5978648bb861e3bf390656` in local merge `079b1bd`. That merge retained main's then-current shared planning text; its historical 0.1.0 references did not change the imported candidate's executable 0.2.0 contract. This was a provisional development base, not recorded Robert/Benedict agreement, integration or a live release.

The user subsequently published the GL-01 candidate at `93d1e60` as [PR #15](https://github.com/Aracena18/AGAP/pull/15), targeting `main`. The local conflict resolution brings in updated main `34aa9f8`, which already contains Robert's platform/member and UI work. Shared planning documents retain that main version, including the newer goal/5C assignments and platform/UI evidence; the accounting implementation and this GL-01 handoff are preserved. Repository publication still does not establish consuming-owner acceptance or activate the financial path. The user remains responsible for pushing the local resolution; no GitHub PR merge is performed here.

### Contract and independent acceptance examples

Implement the existing `PostingPort.post(tx, request)` in the owned accounting module. The caller supplies its existing transaction; only the platform unit of work commits or rolls back. Accounting validates current financial-role access, organization, PHP, positive integer-centavo lines, safe balanced totals, dated rule/account mappings, permanent source-event identity and open periods. A returned journal receipt is provisional until the caller commits.

Clearly fictional accounting examples, independent of the canonical Ana/Ben/Cora registry: PHP 10,000 principal disbursement debits Loans Receivable and credits Cash; PHP 2,000 principal repayment debits Cash and credits Loans Receivable. Interest, fees, allocation/recognition and actual institution mappings require separate review; no absent component is assumed to be zero.

Identical same-event requests replay one preserved journal, including after its period closes. Conflicting reuse fails. Source-event uniqueness is permanent and organization-wide, independent of user/HTTP idempotency keys. Ordinary runtime roles cannot insert or rewrite journal tables directly; the database posting function also enforces balance, accounts, mappings and actor scope. Corrections use one linked full reversal in an open period, preserving the original rule/history. Partial adjustments, inactive-account reversal policies and complete period-close acceptance remain later work. No reversal of a reversal is supported in this minimal candidate.

Acceptance includes independent amounts, invalid amounts/currency/accounts/rules, safe-total overflow, role/organization/member isolation, concurrent duplicates and conflicts, original immutability, exact reversal, caller rollback and both posting/closing lock orders. The caller must acquire the module's period lock before servicing loan/command locks. Its own financial-event uniqueness must prevent duplicate loan allocations; ledger deduplication alone does not implement PAY-01.

### Receiving owners and pending integration

- Robert: review the base/contract and registration proposal in the [module handoff](../../../apps/api/src/modules/accounting/README.md); register the accounting migration directory and provider after review, retaining unavailable HTTP/capability defaults until the controlled PAY-01 path is integrated. Canonical schemas/client, bootstrap, shared migration registry, dependencies, UI and Assignment.md are not authored by this task.
- Benedict: use the same transaction and permanent business-event identity, preserve authorization/command checks, and supply reviewed allocation/mapping details. The accounting database tests use an explicitly fictional caller-effect harness; actual loan-subledger/receipt integration remains PAY-01 work.
- Earl: preserve module migrations/tests and versioned verification below. Account/rule/period configuration is operator-owned in this candidate; no live defaults, HTTP financial endpoint, accounting screen or complete close/report/reconciliation workflow is supplied.
- Institutional accounting/authority approval and the exact fictional posting mappings still need owner review. Passing fictional tests cannot establish those approvals or production readiness. Robert retains the sole task/status tracker.

### Local verification and limitations

29 October 2026, native Windows, portable Node **24.22.2**, isolated PostgreSQL **18.6** on localhost:55440 using only public fictional development credentials and database `agap_test`. The installed system Node/PostgreSQL and existing databases were not changed. Earlier exploratory checks used the installed PostgreSQL 15; the final results below use 18.6. Temporary test servers are stopped after verification.

| Check | Observed result |
| --- | --- |
| Focused GL-01 suite | **42 passed**: 11 boundary validations and 31 real database/permission/transaction tests, including period and configuration races |
| `npm run check` | Lint, contract drift, web/API builds and **118 domain/UI tests passed**. Backend/contracts: **107 passed, 3 failed of 110**; all 42 GL-01 tests passed |
| Full-check limits | Two unchanged `document-store.test.ts` cases require POSIX directory mode 0700; unchanged `provisioning.test.ts` requires private input mode 0600. Native Windows does not provide those mode semantics. Controls were not weakened or tests disabled; a Linux full-check pass remains required before integration |
| `npm run test:e2e` | Final target-version rerun: **24 Chromium tests passed**, including existing keyboard, 320px, accessibility, staff/member isolation and preserved-decision journeys. Domain simulations remain labeled; these tests do not establish actual PAY-01 integration |
| Browser rerun recovery | An intermediate rerun timed out while large portable tooling was under Vite's watched root. Moving only ignored tooling to `node_modules/.cache/agap-gl01` removed that condition; the unchanged browser suite then passed |
| Shared artifacts | Generated client/OpenAPI working copies were temporarily normalized from CRLF to LF for the drift check; their canonical content is unchanged and checkout endings are restored afterward |
| Documentation/whitespace | Relative-file links resolve; module handoff fragment and `git diff --check` checked |
| Navigation graph tools | `graft` and `graphify` are unavailable on this machine; navigation used `rg` and Git, and no graph update is claimed |

The append-only module migrations are `001-ledger.sql`, `002-posting.sql` and `003-configuration-locks.sql`. The last preserves used configuration and locks/rechecks account/rule versions through commit. Registration remains a proposal for Robert; no shared registry, financial HTTP capability or servicing implementation was authored here. Module tests temporarily register the directory in memory with the existing migrator and use a disposable caller-effect table to prove atomicity/retry conservation, not a real loan table.

### Verification after synchronizing with main `34aa9f8`

29 October 2026, same Windows/Node 24.22.2/PostgreSQL 18.6 test environment. The accounting source, migrations and tests are unchanged by the conflict resolution. The branch differs from main only in the accounting module, this handoff and the shared PR template.

- `npm run check`: lint, contract drift and web/API builds passed; **126 domain/UI tests passed**. Backend/contracts: **127 passed, 3 failed of 130**, including all **42 GL-01 tests passing**. The same two document-store permission cases and one staff-provisioning case fail under native Windows; Linux full-check verification remains required.
- `AGAP_E2E_WEB_PORT=5184 AGAP_E2E_API_PORT=4111 npm run test:e2e`: **32 Chromium tests passed**, using dedicated local ports and the guarded fictional database. Test servers are stopped afterward.
- Documentation audit: **169 local links/anchors across 10 Markdown files resolved**; no conflict markers or diff whitespace errors remain. The seven shared planning files involved in the GitHub conflicts match updated main; this brief preserves its GL-01 additions.
- Generated client/OpenAPI checkout line endings were temporarily normalized for the drift check and restored afterward; their canonical content remains unchanged. `graft` and `graphify` remain unavailable.

The conflict resolution is committed locally on `feat/earl-gl-01` and ready for the user to push. PR #15 exists; no remote CI pass, merge of GL-01 into main, owner acceptance or production approval is claimed. GL-01 is an implementation candidate for review, not declared integrated; Robert must reconcile the central task status, accept/register the base/service, and repeat full checks on the supported Linux environment with Benedict's actual money path.

## EVAL-01 data/protocol implementation candidate — 29 October 2026

Branch/base: `feat/earl-eval-01` from main `75c7e7f`. Owned changes are the offline tools/tests in `evaluation/synthetic/`, the separate research protocol in `evaluation/explainable/`, and this handoff. Shared contracts, configuration, CI, application routes and financial modules are unchanged.

### Supplied boundary

The [synthetic evaluation module](../../../evaluation/synthetic/README.md) supplies twelve fictional development cases, fourteen source pages and eighteen expected findings. The paired repayment/strain cases share a scenario group, leaving eleven independent development groups. Authored expectations use fixed centavos/dates and source excerpts independently of the production finance engine; independent label/format review remains pending.

Tools validate records, checksums, citations, unknowns and augmentation ancestry; keep connected household/scenario/content groups together; export inputs separately from targets; and reject overlapping private holdout families/templates/content. Reviewed-release creation requires hash-bound review evidence and an external private holdout. Private scoring also requires the frozen release commitment. Default exports remain development previews, with no accepted review or holdout fabricated by the tools.

The structured scorer reports exact money/availability, date, recurrence, relevance, action and source errors with case denominators, plus missing/unsolicited fields and unsupported recorded values. Simulated predictions remain harness evidence; unmeasured timing/memory stays null. Free-text question/reason meaning and participant effort require separate review/observation. No trained artifact, model comparison, runtime promotion or household-benefit result is supplied.

The renderer supplies labeled text-document PNG previews and exact image/source hashes. Representative images were visually inspected. The unreadable-field example uses a transcription placeholder; these images are not a realistic degraded-scan/OCR benchmark. Image input formats and broader template coverage need consuming-owner review.

The development corpus hash is `792a4a0aaccd786b910429e2ccc429c21b0b3eb7c1de5bb20ca8f71d49a7af1f`. A locally generated bundle at `node_modules/.cache/agap-eval01/preview-final` verifies against that commitment; source images are at `node_modules/.cache/agap-eval01/images-final`. Generated outputs are reproducible development artifacts outside the tracked source, not a frozen training release.

The [research protocol](../../../evaluation/explainable/README.md) records required access/codebook, cohort/target/feature, preprocessing/weight, split, artifact and final-report evidence for Aaron's EBM/logistic comparison. It adopts no guessed response mapping and downloads no survey data. Actual research inputs, reviewer agreement and returned artifacts remain pending.

### Verification

Native Windows, Node 24.22.2; repository regression checks used the isolated fictional PostgreSQL 18.6 `agap_test` database on localhost:55440.

| Check | Observed result |
| --- | --- |
| Focused EVAL-01 suite | **46 passed**, including malformed values/citations, transitive grouping, duplicate-content isolation, stale reviews, holdout leakage/commitments, missing-as-zero, scoring alignment and simulated-output limits |
| Scoped typecheck and lint | `tsc -p evaluation/synthetic/tsconfig.json --noEmit` and `eslint evaluation/synthetic` passed |
| CLI and rendering | Generated/verified the development input/target/schema bundle; rendered fourteen PNGs and inspected representative documents |
| `npm run check` | Lint, contract drift, web/API builds and **126 domain/UI tests passed**. Backend/contracts: **127 passed, 3 failed of 130**, with all accounting tests executed |
| Full-check limitations | The same two document-store POSIX-mode cases and one staff-provisioning case fail on native Windows. Supported Linux verification remains required; checks and controls were not weakened |
| `npm run test:e2e` | **32 Chromium tests passed**, using dedicated 5184/4111 test ports |
| Temporary test setup | Generated client/OpenAPI and accounting SQL working-copy newlines were temporarily normalized to LF for checksum compatibility, then restored. An initial accounting setup mismatch was resolved by confirming the LF hashes against the existing disposable test database; migration-history records and SQL logic were unchanged |
| Tooling and cleanup | `graft`/`graphify` unavailable; navigation used `rg`/Git. Temporary test servers were stopped after verification |

### Receiving owners and remaining acceptance

- Robert: review the evaluation-local formats and shared-schema compatibility; register focused evaluation tests/typechecking in the shared check/CI flow. Existing root test discovery excludes `evaluation/`. Update Assignment.md from PR evidence; this handoff does not declare EVAL-01 integrated or claim a remote CI result.
- Benedict: review the concrete source/target/schema and image formats, confirm the loader/artifact interface, then consume an agreed frozen training/validation release before QWN-01 tuning.
- Aaron: review expected evidence/expense meanings and recurrence/deduplication cases; supply verified research access/codebook/cohort/feature/artifact evidence and agree the independent split protocol with Earl.
- Earl: complete independent label review, evaluator-controlled holdout storage/families, actual frozen comparison criteria and release evidence. Later execute returned artifacts and report independent Qwen/checklist/plain-form and EBM/logistic comparisons. The first data/protocol candidate is not completion of final EVAL-01 evaluation.

## ACC-01 comparison implementation candidate — 1 November 2026

Branch/base: `feat/earl-acc-01` from `266379a`. The [accounting module](../../../apps/api/src/modules/accounting/README.md#acc-01-principal-reconciliation-candidate) now supplies a pure principal-disbursement/repayment checker, independent fictional tests, and a concrete evidence-format proposal for Robert/Benedict review. This is the first comparison slice, not integrated PAY-01 reconciliation.

The checker compares complete event/allocation/receipt and journal inventories by permanent source-event identity. It detects missing/orphan/duplicate records, reused IDs, wrong loan/reference/date, incorrect principal/direction and account/side/amount mismatches. Per-event checks retain offsetting errors even when totals agree. Missing components never become zero; journal summation is exact. Prepared/unknown movements and confirmed-but-unposted exceptions remain visible. Missing mappings, incomplete sources, mismatched snapshots and unsupported nonprincipal/correction cases do not receive a clean result.

The local input proposal reuses canonical financial primitives and posting/command schemas; it is not a published shared API. Consistent snapshot/completeness assertions must be established by the eventual owner adapters/platform coordinator. Organization validation in this pure function is not authentication or reporting authorization. No source reader, servicing-table access, report persistence, HTTP endpoint, staff/member UI, new migration or capability activation is supplied by this slice.

### Remaining integration and receiving owners

- Benedict: review/provide complete PAY-01 event/allocation/receipt projections with permanent source-event, loan, receipt/journal references, timestamps, status and snapshot/version semantics. Confirm fictional principal mappings before integration; current loan balances/member receipt fields alone are insufficient.
- Robert: review/publish accepted shared schema/port, organization/branch reporting permissions, consistent transaction/snapshot orchestration and route/client/provider registration. Update `Assignment.md` from reviewed evidence; it is unchanged here.
- Earl: build the accounting evidence reader and recorded staff results once those boundaries are agreed, then exercise actual PAY-01/GL runtime authorization, concurrency, rollback and corrections. Full bank/provider reconciliation, capital/reports and period-close acceptance remain later work.

### Verification

1 November 2026, native Windows, Node 24.22.2. Database regression checks used the isolated fictional PostgreSQL 18.6 `agap_test` database on localhost:55440.

| Check | Observed result |
| --- | --- |
| Focused ACC-01 checker | **72 tests passed**, without a database; independent expected values cover matching/missing/orphan/duplicate evidence, references, offsetting errors, states, mappings, exact totals, snapshots, unknowns and validation |
| `npm run check` | Lint, generated-contract checks and web/API builds passed; **165 domain/UI tests passed**. Backend/contracts: **199 passed, 3 failed of 202**, including the ACC-01 tests |
| Remaining full-check failures | Two unchanged document-store cases require POSIX directory mode 0700; the unchanged staff-provisioning case requires private input mode 0600. Native Windows full-check failure remains; controls/tests were not weakened and supported Linux verification is still required |
| `npm run test:e2e` | **34 Chromium tests passed**. These are existing regression journeys, not an integrated ACC-01 UI/PAY-01 demonstration. Windows cleanup stalled after all cases reported pass; stopping only the verified task API/Vite processes allowed the runner to complete with exit 0 |
| Test environment | An initial sandboxed check stopped at API bundling on denied ancestor-directory access. Rerunning with process access resolved that build issue. Unchanged generated/SQL working-copy newlines were temporarily normalized after HEAD/checksum verification, then restored; migration history/content was not changed |
| Documentation/tooling | **18 local links/anchors resolved** across the module README and this brief; diff whitespace checked. `graft` and `graphify` are unavailable, so navigation used `rg`/Git. Temporary database/test servers were stopped |

No consuming-owner approval, successful remote CI, full ACC-01 integration or production readiness is claimed by this evidence.

## EVAL-01 comparison-report candidate — 1 November 2026

Branch/base: `feat/earl-eval-01-comparison` from `1776d9f`, which contains the merged ACC-01 checker. The owned [comparison implementation](../../../evaluation/synthetic/src/compare.ts) and [usage contract](../../../evaluation/synthetic/README.md#paired-comparison-reports) add a `compare` CLI command without changing application/shared contracts or the financial modules.

Two to sixteen supplied prediction files are scored through the existing scorer on the same corpus, with a selected baseline and common declared protocol hash. Reports retain raw count/accuracy deltas and each expected field's improved/regressed/both-correct/both-incorrect outcome. Missing answers stay in the denominator, additional findings remain counted, and equal accuracy does not hide offsetting improvements/regressions. Model prompt/output-schema mismatches, duplicate identities/labels, incompatible corpus/case inventories and mixed simulated/declared evidence fail before output creation.

An exclusive output directory contains machine-readable JSON, readable Markdown and an artifact-hash manifest written last. Canonical prediction hashes retain run provenance; no actual inference, authenticity, independent protocol acceptance or model promotion is attested. Simulated reports remain `harness_only`; paired resource metrics require jointly observed cases under the same declared environment, with unavailable values left null. Existing external-holdout/frozen-release guards are shared by scoring and comparison. Related case/household groups are not treated as independent statistical observations.

A generated local demonstration at `node_modules/.cache/agap-eval-comparison/demo-v1/report/comparison.md` uses hand-authored fictional outputs only. Its three simulated runs each match 17 of 18 expected fields, while each candidate fixes one baseline error and introduces one different error. This demonstrates the checker/report format, not model or participant performance. The generated report/input files remain ignored development artifacts.

Receiving owners: Benedict/Aaron review the prediction/protocol handoff and later supply fixed, independently executed baseline/model/checklist outputs under the agreed conditions. Robert reviews the local formats and registers focused evaluation checks in shared CI. Earl still completes independent label review, protected holdout, frozen comparison criteria/release and final artifact execution/reporting. The comparison framework does not complete EVAL-01; the separate EBM/logistic evaluator and final research inputs remain pending.

### Verification

1 November 2026, native Windows, Node 24.22.2. Required database regressions used the isolated fictional PostgreSQL 18.6 `agap_test` database on localhost:55440.

| Check | Observed result |
| --- | --- |
| Focused evaluation suite | **76 passed**: 46 existing cases and 30 comparison cases covering per-field gains/regressions, missing/additional answers, alignment/provenance/protocol validation, paired resource denominators, inert labels, exclusive artifact output and private-release guards |
| Evaluation typecheck/lint | `tsc -p evaluation/synthetic/tsconfig.json --noEmit` and `eslint evaluation/synthetic` passed |
| `npm run check` | Lint, generated contracts and web/API builds passed; **165 domain/UI tests passed**. Backend/contracts: **199 passed, 3 failed of 202**. These root suites still exclude the separately executed evaluation suite |
| Remaining full-check failures | Same two document-store POSIX 0700 checks and private staff-provisioning 0600 check fail on native Windows; no control/test was weakened. Supported Linux full-check evidence remains required |
| `npm run test:e2e` | **34 Chromium tests passed**, using dedicated 5184/4111 ports; these verify existing browser journeys, not actual model execution |
| Artifact/document audit | Generated the three-run fictional comparison through the real CLI, inspected Markdown, verified report/protocol hashes; **29 local documentation links/anchors resolved** and diff/new-source whitespace checks passed |
| Environment/tooling | Unchanged generated/SQL checkout newlines were temporarily normalized after HEAD/checksum verification and restored afterward; migration records/content are unchanged. `graft`/`graphify` unavailable. Temporary database/browser servers stopped and dedicated ports released |

No actual model or participant result, completed reviewed training release, accepted research evaluation, remote CI pass or runtime promotion is claimed.
