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

## ACC-01 runtime integration candidate — 3 November 2026

Branch/base: `feat/earl-acc-01-integration` from `a69df08`. The technical [proposal and runtime handoff](../../../apps/api/src/modules/accounting/README.md#acc-01-runtime-integration-proposal--3-november-2026) precede the coordinated shared edits. This adds an actual ledger reader, preserved report/audit/idempotency storage, authenticated reporting API and staff page. The original checker and Benedict's public servicing inventory are reused. No receiving-owner agreement, institutional accounting approval or production release is inferred.

The existing platform coordinator gains explicitly configured REPEATABLE READ reporting with bounded whole-transaction serialization/deadlock retries; other commands retain their original mode. Both inventories and reviewed mapping versions are read in the same actual snapshot. The server retains the database cutoff's microsecond precision. Actual journal lines are enumerated independently of servicing IDs; missing/orphan records, unsupported journal kinds and incomplete/unconfigured producers cannot yield a clean comparison. Complete empty evidence has its own result. Configured comparison limits are 31 inclusive calendar days and 1000 records per source collection; servicing's larger-cohort materialization/paging remains a receiving-owner follow-up.

Append-only migration `004-reconciliation.sql` adds operator-owned principal reporting mappings and immutable run evidence, forced organization/full-auditor policies and a bounded save function with atomic audit/outbox. Existing applied migrations are unchanged. Run replay, creation, listing and detail enforce current identity and all organization branches; neither administrator role nor branch-only access suffices. Date requests contain no actor, organization, snapshot or result supplied by the browser. The evidence hash binds the validated inventory, mapping references, checker version and actual snapshot. Replaying an original key returns its preserved result; later data requires a fresh run.

Shared schemas/client/OpenAPI and route/provider integration are supplied under the proposal. The checker input is canonicalized with a compatibility export; existing financial meanings remain intact. `/#/staff/reconciliations` uses the current shared controls and workspace styles, preserves uncertain retry details, suppresses canceled-read errors, clears cached findings on access denial and supports saved history, event filters and reference inspection. [Frontend behavior](../../AGAP_Frontend_Spec.md#acc-01-staff-reporting-candidate--3-november-2026) records the contract; `design.md` remains the design authority.

Receiving owners: Robert reviews the shared DTO/coordinator/access/registration changes and reconciles `Assignment.md` from evidence; Benedict reviews the consumed inventory, legacy producer configuration and larger-cohort snapshot/completeness semantics; responsible accounting reviewers supply approved principal mappings. Earl retains this reporting slice and its tests. Broader bank/provider reconciliation, capital/report/close accounting, opening-balance proof, linked reversal/netting and nonprincipal treatment remain pending. The application does not register fictional money producers or initiate financial movements from this page.

### Verification

3 November 2026, isolated Linux containers, Node 24.22.2 and PostgreSQL 18.6. The database and all browser records are fictional. Required checks ran sequentially against the guarded `agap_test` database; the final run includes the microsecond cutoff safeguard, unsupported-journal classification and mobile summary correction.

| Check | Observed result |
| --- | --- |
| `npm run check` | **Passed, exit 0**: lint, generated-contract drift, web/API builds, **193 domain/UI**, **549 backend/contracts** and **76 evaluation** tests. The existing POSIX permission/provisioning cases pass in this supported Linux environment |
| ACC-01 backend coverage | **73 pure comparison**, **19 actual servicing/GL integration**, **5 authenticated HTTP** and **4 coordinator** tests passed within the full suite. Cases include independent actual journal lines, orphan evidence, a concurrent posting snapshot, rollback, exact/concurrent replay, changed keys, tenant/role/branch/revocation enforcement, immutable history and paging |
| `npm run test:e2e` | **57 Chromium tests passed, exit 0**, including five ACC-01 journeys with no retries: lost successful response and preserved retry, saved history/reopen/filtering, keyboard/mobile/accessibility, invalid dates, later access denial and ordinary-staff rejection |
| Visual review | Inspected actual API-backed [desktop](../../screenshots/accounting/reconciliation-desktop.png) and [320px](../../screenshots/accounting/reconciliation-320.png) captures; [capture metadata](../../screenshots/accounting/capture.json). Corrected a compressed summary that page-overflow checks alone missed; regression assertions now require readable metadata widths and hash wrapping. Financial tables retain named local keyboard scrolling |
| Change and documentation audit | Earlier applied accounting migrations, dependencies and unrelated generated model schema are unchanged. Local documentation links/anchors and changed/new source whitespace checked; `design.md` remains the UI/UX authority |
| Tooling and environment | `graft`/`graphify` unavailable; navigation used `rg`/Git. Temporary fictional database/browser servers and task-owned containers stopped after verification. No remote CI execution or receiving-owner approval is claimed |

This evidence verifies the bounded principal reporting candidate. Larger-cohort producer paging, operator-approved mappings and the receiving-owner reviews above remain required; full ACC-01 and production readiness are not declared complete.

## HLT-01 support implementation candidate — 3 November 2026

Branch/base: `feat/earl-hlt-01-support-queue` from `56d6be2`, containing merged ACC-01 PR #27. The [module proposal and runtime handoff](../../../apps/api/src/modules/monitoring/README.md) precede coordinated shared schema/wiring/member changes. No receiving-owner acceptance or institutional role assignment is inferred.

Members explicitly confirm the exact message, optional structured check-in and linked loan before submission. Yes/no, reported/not-reported, declined and unavailable remain distinct. Immutable disclosures preserve consent/notice and server dates; member history retains shared answers and the public response. Corrections require a new confirmed submission. Active branch administrators can see assignment metadata and assign a same-branch officer with fresh MFA/reason, without reading disclosures. Only the current assigned officer can inspect/respond. Original assignment/action evidence is retained. Generic platform retry caches store only metadata/version receipts, not disclosures or notes; a cached response is reconstructed from immutable private history under current authorization and a locked assignment.

The public servicing member projection supplies actual owned-loan selection and captured dated positions in member transactions. No raw servicing tables or new balance calculator is used. The staff page labels captured positions as submission-time evidence and fresh staff positions as unavailable; a request without a loan remains usable. A real posted-loan regression compares pre/post repayment snapshots while retaining reported strain after the overdue amount reaches zero. The browser journey exercises loanless confirmed support and real assignment/response APIs, not a simulated live money command.

The [frontend contract](../../AGAP_Frontend_Spec.md#hlt-01-support-candidate--3-november-2026) records queue paging, loaded-record filters, private/public notes, follow-up dates, uncertainty, stale-version discard/reload and cached-disclosure removal. The existing staff shell's duplicate route/navigation blocks are corrected in shared integration. Existing `design.md` patterns/tokens govern all presentation; no new design system is introduced. All support writes/events are transactional and do not change balances, journal entries, payment schedules or terms.

Receiving owners: Robert reviews shared access/contracts/member integration/registration and reconciles `Assignment.md`; Benedict reviews the consumed public loan projection and supplies a narrow fresh staff support-position reader. Institutional owners review notices, assignments and retention. The standalone proposed health-review endpoint, assisted check-in confirmation workflow, corrections linked as superseding records, history beyond the current explicit 100-record limits, external delivery, amendments, AI summaries and longitudinal outcome evidence remain separate work. The initial member-confirmed check-in/support queue does not declare full HLT-01 or production readiness complete.

### Verification

3 November 2026, disposable Linux containers with Node 24 and PostgreSQL 18.6, guarded fictional `agap_test` database. The final run includes the metadata-only retry cache, immutable historical response reconstruction and bounded owner locking without runtime table UPDATE privileges. Existing applied migrations and their checksums were preserved; subsequent monitoring refinements use additive migrations.

| Check | Observed result |
| --- | --- |
| `npm run check` | **Passed, exit 0**: lint, canonical generation/drift checks, web/API builds, **193 domain/UI**, **563 backend/contracts** and **76 evaluation** tests |
| Actual HLT-01 HTTP/database | **12 passed** within the full suite: confirmation, real public posted-loan capture and later repayment/replay, reported strain despite zero overdue, scoped assignment/read/write, private-note/cache isolation, CSRF/MFA/revocation, concurrency/idempotency, stale versions, reassignment before replay, atomic rollback, immutability and paging |
| `npm run test:e2e` | **64 Chromium tests passed, exit 0**. Three new HLT-01 journeys run without retries: actual member submission with a lost successful response and same-key retry, branch administrator assignment, assigned-officer publication and own-member history; later permission denial hides cached data; financial auditing does not confer support access |
| UI and accessibility | Inspected actual API-backed fictional [desktop staff](../../screenshots/monitoring/support-desktop.png), [320px staff](../../screenshots/monitoring/support-320.png) and [320px member](../../screenshots/monitoring/member-support-320.png) screenshots. Keyboard scroll regions, readable metadata widths, page reflow and automated accessibility checks passed. [Capture metadata](../../screenshots/monitoring/capture.json) binds the image hashes |
| Regression refinements | Complete empty loans now come from the integrated public reader. Existing unavailable-loan/support browser cases explicitly simulate producer unavailability; the unavailable behavior is preserved rather than weakening its assertions. Fixed the new check-in heading order and reconciled duplicate staff route/navigation blocks |
| Source/documentation audit | Local links/anchors and changed/new source whitespace checked. No dependency, canonical financial fixture/token, servicing implementation or previously applied accounting migration changes; the unrelated generated model schema has unchanged content |
| Tooling/cleanup | `graft`, `graphify`, Impeccable and 21st tools unavailable; navigation/review used `rg`, Git and actual browser screenshots. Task-owned fictional database/app containers removed after verification. No remote CI run, consuming-owner acceptance or institutional release is claimed |

Required checks establish this implementation candidate's tested behavior. Robert retains shared integration/status review, and Benedict's fresh support-position extension and the other retained work above remain pending.

## EVAL-01 readable review pack — 3 November 2026

Branch/base: `feat/earl-eval-01-release` from `d78f41f`. The owned exporter adds `review` and `verify-review` commands to the existing CLI, reusing validated corpus data and the original compatible development bundle. No trainer/model files, shared contracts/calculators, application behavior, dependencies or canonical fictional fixtures change.

The supplied [review document](../../../evaluation/synthetic/reviews/development-v1/review.md), [offline HTML](../../../evaluation/synthetic/reviews/development-v1/review.html), [coverage inventory](../../../evaluation/synthetic/reviews/development-v1/coverage.json) and [blank worksheet](../../../evaluation/synthetic/reviews/development-v1/review-worksheet.json) project the unchanged public development pilot: 12 cases, 14 source pages and 18 expected fields. Each case retains full source text/version/page/date/checksum, candidate value/date/relevance/recurrence/action/question/citations and authored rationale. Exact centavo displays retain missing versus explicit zero. Coverage tags/group inventories describe authored coverage rather than statistical independence or dataset adequacy; open questions identify label, image/template, prior-training, interface, measurement and protected-holdout work.

The report is marked development/review-pending throughout. It contains a development answer key and is visible to trainers; it cannot become untouched holdout data by renaming IDs or changing a seed. The exporter rejects reserved holdouts before output creation. Its pending worksheet is not the existing freeze approval schema; no reviewer names, approval date, private corpus, training split or model result is fabricated. Reviewers copy the worksheet separately; corrections require a new version retaining previous evidence.

The outer manifest is written last in an exclusive output directory and binds every artifact, including the nested original bundle. Verification checks exact inventory, rejects links, and regenerates the expected pending artifacts from the corpus; checksums attest consistency rather than genuine review/authorship. Review artifact Git attributes retain LF bytes across platforms. Untrusted source/label text is escaped in both documents; the HTML uses no scripts or network resources, supports keyboard source links and reflows for narrow screens/printing. This standalone review document does not add an application route or a competing product design guide.

Receiving owners: Aaron or another appropriate independent label/domain reviewer checks the answer key and rationale; Benedict confirms interface compatibility and discloses prior training/prompt lineage; Robert reviews shared compatibility and protected-storage arrangements with Earl. Actual review decisions, a sufficient independently authored holdout in access-controlled storage, agreed protocol/measures and later fixed model artifacts remain required before freeze/final comparison. The pack does not complete EVAL-01, certify OCR coverage or promote any model.

### Verification

3 November 2026, Node 24.22.2 and isolated Linux/PostgreSQL 18.6 fictional `agap_test` containers. The report itself uses no database or inference service; full repository regressions still exercise the existing guarded backend/browser fixtures.

| Check | Observed result |
| --- | --- |
| `npm run check` | **Passed, exit 0**: lint, canonical generation/drift, web/API builds, **195 domain/UI**, **563 backend/contracts** and **91 evaluation** tests, including evaluation typecheck |
| Review-pack regressions | **15 new evaluation cases passed**: complete source/answer projection, exact maximum/zero centavos and missing dates, inert source/Markdown text, holdout refusal before writes, pending worksheet incompatible with freeze approval, original development-bundle compatibility, exclusive output, altered artifacts/manifest/decisions, extra/incomplete inventories, linked directories, strict CLI and exact supplied-pack verification |
| `npm run test:e2e` | **73 Chromium tests passed, exit 0**: 71 existing journeys and two new offline review-document tests. Native source anchors tolerate subpixel browser rounding; keyboard/source navigation, 320px/1366px readability, inner-content bounds, automated accessibility, no network requests and inert injected markup passed |
| Actual visual evidence | Inspected [desktop overview](../../screenshots/evaluation-review/overview-1366.png), [mobile overview](../../screenshots/evaluation-review/overview-320.png), [desktop missing-versus-zero case](../../screenshots/evaluation-review/missing-zero-1366.png) and [mobile case](../../screenshots/evaluation-review/missing-zero-320.png); [capture metadata](../../screenshots/evaluation-review/capture.json) binds images and corpus |
| Artifact/document audit | Generated the supplied pack through the real CLI and verified its manifests, unchanged pilot hash and nested development inputs/targets/schema. Local documentation links/anchors, task/status consistency, diff and new-source whitespace checked; generated review artifacts retain LF via module-local attributes |
| Environment and tooling | Shared generated files in the copied Windows checkout differed only by line endings after comparison with HEAD; regenerated them only inside Linux verification before full checks. Shared source/working files and SQL migration history remain unchanged. `graft`/`graphify` unavailable in this shell; navigation used `rg`/Git. Temporary task-owned containers removed after verification |

No remote CI pass, actual label/interface approval, protected holdout, reviewed training release, model execution or production promotion is claimed. EVAL-01 remains In progress; reviewers still supply the actual decisions and private inputs above.

## HLT-01 staff response-history pagination — 4 November 2026

Branch/base: `feat/earl-hlt-01-staff-history-pagination` from `8bf446c785d17404bd4884e0287929e2df1bb54e`. The [contract proposal](../../../apps/api/src/modules/monitoring/README.md#staff-response-history-pagination-proposal--4-november-2026) precedes the additive shared edits. Previously, loading every response into a bounded detail projection also prevented the 101st response from committing. The staff screen now loads the newest 25 actions and appends older pages explicitly, while new paged writes no longer require the complete history.

The additive `GET /support-requests/{id}/history`, `GET /support-requests/{id}/actions` and `POST /support-requests/{id}/actions` operations use generated contract/client definitions. Existing strict legacy detail/response routes retain their schemas and 100-action bound. An action UUID resolves to an exclusive older-than version within the authorized request; appends and assignment-version gaps cannot shift older pages. Every page holds the existing disclosure lock and checks current assigned-officer access. The existing index supports these reads; no migration or dependency is added.

New retry receipts contain only version/projection/page-size metadata. Immutable history reconstructs the original response through its saved version, including legacy receipts replayed after later growth beyond 100 actions. Reusing a command key across projection formats conflicts. Writes, action history, audit and outbox remain atomic. Administrator access remains metadata-only; other officers, auditors and members gain no private-history permission.

The [staff history component](../../../src/features/monitoring/StaffResponseHistory.tsx) preserves loaded responses and an unsent draft after read failure, offers a same-cursor retry and prevents duplicate reads. Request/version/session changes dispose obsolete history; delayed completions cannot append old notes or dismiss a new view. Access denial unmounts private history, draft controls and pending command references together. Completion announces the loaded count and focuses the history heading when the paging button disappears. A separate read refreshes current details after a confirmed write/replay; a read failure does not make that write uncertain. [Frontend behavior](../../AGAP_Frontend_Spec.md#staff-response-history-pagination--4-november-2026) and [design rules](../../../design.md#staff-response-history-pagination--4-november-2026) are updated together.

### Verification

4 November 2026, Node 24.22.2, Debian 12 and isolated PostgreSQL 18 fictional `agap_test` containers. Application/database regressions use disposable records; existing local user services and records are preserved.

| Check | Observed result |
| --- | --- |
| `npm run check` | **Passed, exit 0**: lint, generated-contract drift checks, web/API builds, **201 domain/UI**, **578 backend/contracts** and **91 evaluation** tests, including evaluation typecheck |
| Monitoring HTTP/database | **19 passed**, including seven added cases: page boundaries, 125-action traversal with intervening appends, 101st response, concurrent same-key writes, exact historical legacy/paged replay, key conflicts, metadata-only cache, cursor/query validation, assignment/revocation and atomic rollback |
| History lifecycle | **Four focused UI tests passed**: draft-preserving same-cursor retry, duplicate activation suppression, delayed disposed-view success and obsolete-denial isolation |
| `npm run test:e2e` | **82 Chromium tests passed, exit 0; four existing opt-in presentation cases skipped** in the normal suite. Three new history journeys plus the three existing support journeys passed without retries. Tests exercise 125 responses, failed-page recovery, an actual successful write with deliberately lost response, same-key retry, request switching and later disclosure denial |
| Actual visual evidence | Inspected fictional API-backed [1366px desktop](../../screenshots/monitoring/history-desktop.png) and [320px mobile](../../screenshots/monitoring/history-320.png) captures of the paging control. Keyboard completion focus, 320px reflow and automated accessibility checks passed. [Capture metadata](../../screenshots/monitoring/history-capture.json) binds the image hashes |
| Scope and tooling | No applied migration, dependency, model, financial calculator, canonical fixture/token or member UI changes. `graft` and `graphify` are unavailable; navigation/review used `rg`, Git and actual screenshots |
| Evidence audit and cleanup | **230 local documentation links/anchors resolved**. Both screenshot hashes/dimensions verified; every pre-existing OpenAPI operation/schema is unchanged. Diff whitespace checked. Only the two label-verified disposable task containers were removed; existing local database/identity services remain running |

Receiving owners: Robert reviews the additive shared schemas/client/OpenAPI and staff handoff; institutional owners retain privacy/retention and operator acceptance. Benedict's narrow fresh staff-position reader, Robert's member-history pagination and longitudinal/assisted health work remain pending. Member history and legacy projections still fail explicitly above their reviewed bounds. HLT-01 remains In progress; successful fictional regressions do not establish consuming-owner agreement, a remote CI pass or production release.

## HLT-01 staff follow-up workflow — 4 November 2026

Branch/base: `feat/earl-hlt-01-follow-up-workflow` from `540fe1e53c6a5ed8cb70c8f050613483fcb94c3c`, including merged history-pagination PR #30. The [written proposal](../../../apps/api/src/modules/monitoring/README.md#staff-follow-up-workflow-proposal--4-november-2026) precedes coordinated shared contract/generator/client and controller-registration edits. Previously a staff follow-up was only a date on a response. The supplied workflow makes each dated response an actionable task with its source, current date, explicit completion and immutable rescheduling history.

The additive `004-follow-ups.sql` migration backfills each historical dated action, retaining its original date, author and timestamp. Historical open tasks indicate no recorded completion evidence. New dated responses create one task in the original response transaction; undated or subsequent responses never erase earlier commitments. Task/event evidence is append-only with forced RLS and explicit assigned-officer views. A bounded transition function holds the existing request-disclosure lock before the task lock and guards versions, dates and terminal completion. Runtime has no raw private-table read or direct write privileges. No existing migration is edited.

The owned [follow-up service](../../../apps/api/src/modules/monitoring/support-follow-ups.service.ts) uses the existing monitoring coordinator/UOW. Additive queue/detail/event/completion/reschedule operations reuse the same staff identity, CSRF and metadata-only audit/outbox patterns. Optional generator path metadata types the queue-state enum while preserving existing operations/schemas. Task versions are independent of request versions. Every read/transition checks current assignment; original command results are reconstructed from immutable events using version-only receipts. Date validation occurs inside first command execution so an exact reschedule replay still succeeds after its date passes. Task completion records staff action, not a resolved member concern, payment or loan amendment.

The owned [staff workspace](../../../src/features/monitoring/StaffFollowUps.tsx) adds a guarded Follow-ups view beside Support requests. Server filters cover all open, scheduled, due-today, overdue and completed tasks using an explicit Manila as-of date; filters precede bounded stable-ID paging. Detail shows the source response, original/current dates and bounded newest-first event history. Failed history reads retain drafts and retry their cursor. Selection/view/filter changes are blocked for unsaved or uncertain actions; duplicate writes retain their original key/version. Disposal cancels obsolete reads, and access denial clears the private workspace. Confirmed writes refresh the live queue separately from save certainty. [Frontend contracts](../../AGAP_Frontend_Spec.md#staff-follow-up-tasks--4-november-2026) and [design rules](../../../design.md#staff-follow-up-workflow--4-november-2026) are updated together.

Receiving owners: Robert reviews the additive shared contracts/generator/client/controller registration and staff integration. Institutional owners retain operator/privacy/retention acceptance. Benedict's fresh staff-position reader, Robert's member-history pagination and broader longitudinal/assisted health work remain pending. HLT-01 stays In progress; no member UI, servicing implementation, loan/accounting write, external notification, model ranking or weekly review-capacity behavior is added.

### Verification

4 November 2026, Node 24.22.2, Debian 12 and isolated PostgreSQL 18 fictional `agap_test` containers. Required checks used disposable records and preserved existing local user services/data.

| Check | Observed result |
| --- | --- |
| `npm run check` | **Passed, exit 0**: lint, canonical generation/drift, web/API builds, **206 domain/UI**, **595 backend/contracts** and **91 evaluation** tests, including evaluation typecheck |
| Follow-up HTTP/database | **17 passed** within the full suite: Manila midnight boundaries, atomic dated-response/task creation and rollback, historical backfill through the actual migration, queue states/paging, immutable source/history, completion/rescheduling, stale versions, concurrent keys, original replay after subsequent actions/calendar changes, version-only receipts, CSRF/input validation, RLS/reassignment/revocation and transactional audit/outbox rollback |
| UI lifecycle | **Five new tests passed**: server-date labels, locked draft/exact uncertain retry, history-failure draft preservation/same cursor, obsolete history denial and disposed detail reads. The existing four staff-history lifecycle cases still pass |
| `npm run test:e2e` | **85 Chromium tests passed, exit 0; four existing opt-in presentation cases skipped** in the normal suite. Three new follow-up journeys run without retries alongside six existing support journeys: actual reschedule/completion with a lost successful response, stale concurrent action/draft recovery, source/member privacy and later disclosure denial |
| Actual UI evidence | Inspected [desktop context](../../screenshots/monitoring/follow-up-desktop.png), [320px context](../../screenshots/monitoring/follow-up-320.png), [desktop form/history](../../screenshots/monitoring/follow-up-form-desktop.png) and [320px form/history](../../screenshots/monitoring/follow-up-form-320.png). Keyboard/history focus, form/view guards, contained table scrolling, page reflow and automated accessibility passed. [Capture metadata](../../screenshots/monitoring/follow-up-capture.json) binds image hashes/dimensions |
| Compatibility and scope | Every pre-existing OpenAPI operation/schema is unchanged; the new queue path is a typed enum. No dependency, applied migration, model, financial calculator, member UI or canonical fixture/token change. **239 local documentation links/anchors resolved**; screenshot hashes/dimensions and diff whitespace checked |
| Tooling and cleanup | `graft`, `graphify`, Impeccable, 21st and React Bits tooling unavailable; navigation/review used `rg`, Git, actual browser journeys and screenshots. Only the two label-verified disposable task containers were removed after collecting evidence; existing local database/identity services remain running |

Startup: apply `npm run db:migrate` using Node 24 and the existing dedicated migration configuration, restart the API, then open `/#/staff/support-requests` as the assigned officer and choose Follow-ups. The migration preserves existing responses and backfills every historical dated action; it is not automatically applied to the user's local database by these isolated verification runs. No remote CI pass, receiving-owner acceptance or institutional production release is claimed.

## HLT-01 member support-history pagination — 4 November 2026

Branch/base: `feat/earl-hlt-01-member-history-pagination` from `a0d9c7ea5ee7d6cee09ac1fa620e6998af6210c5`. The user explicitly authorizes coordinated changes to Robert's member presentation/facade and shared boundaries; the [proposal](../../../apps/api/src/modules/monitoring/README.md#member-support-history-pagination-proposal--4-november-2026) precedes those edits. Previously a member with more than 100 support requests received an explicit history-limit error. The member screen now reads the newest 25 own requests and explicitly appends older pages without depending on the bounded legacy reader.

An additive available/unavailable page contract and optional member-domain paging port register `GET /member/support-history`. Missing producers remain unavailable; injected legacy arrays never imply completeness. Existing API operations and schemas retain their exact definitions and the old member-history endpoint retains its reviewed bound. Every page uses the existing session/linkage assertion (including shared linkage/session locks) and RLS. Cursor IDs resolve only within visible member history, with generic rejection for foreign/missing cursors. SQL retains exact submission-time precision and seeks descending `(submitted_at,id)`; timestamp ties and intervening submissions do not shift older page boundaries. Status and latest published responses are live per page. No private notes, assignment reasons or staff task records enter this projection.

The additive `005-member-history-page.sql` migration creates an organization/member/submission-order index. Module-local attributes pin LF only for this new file, preserving its checksum across Windows/Linux without touching applied migration contents. The authorized [member history component](../../../src/features/member-portal/MemberSupportHistory.tsx) separates reads from the help draft/preview/sharing confirmation. It suppresses duplicate paging, preserves draft/consent after failed reads, resets to the newest page after a confirmed submission and treats any subsequent read failure independently of save certainty. Member/session changes and later denial dispose private history and form state. Old or aborted completions cannot append previous-account records. Loaded-count/end notices and completion focus distinguish partial from complete older history. [Frontend contracts](../../AGAP_Frontend_Spec.md#member-support-history-pagination--4-november-2026) and [design rules](../../../design.md#member-request-history-paging--4-november-2026) are updated together.

### Verification

4 November 2026, Node 24.22.2, Debian 12 and disposable PostgreSQL 18 fictional `agap_test` containers. Docker Desktop was started because its Linux engine was unavailable. Existing local user data was not reset or seeded.

| Check | Observed result |
| --- | --- |
| `npm run check` | **Passed, exit 0**: lint, generated contracts, web/API builds, **212 domain/UI**, **611 backend/contracts** and **91 evaluation** tests, including evaluation typecheck |
| Member-history HTTP/database | **Eight passed**: empty/24/25/26 and 125-request traversal, intervening submissions, exact timestamp ties, own-member/organization cursor checks, limit/query validation, staff/principal rejection, revocation/expiry, private-source exclusion, legacy limit compatibility, missing producer and malformed producer rejection |
| History lifecycle | **Six UI tests passed**: draft-preserving same-cursor retry/completion focus, duplicate requests/rows, unavailable versus empty, obsolete page/denial disposal and paging blocked during uncertain submission |
| `npm run test:e2e` | **88 Chromium tests passed, exit 0; four existing opt-in presentation cases skipped** in the normal suite. Three new journeys cover all 125 requests, preserved preview/consent, a lost successful POST and exact retry, post-save read outage/recovery, member switching and later disclosure denial. The 21 focused member/support journeys also passed without retries |
| UI evidence | Inspected actual API-backed fictional [desktop](../../screenshots/member-history/member-history-desktop.png) and [320px](../../screenshots/member-history/member-history-320.png) captures; [metadata](../../screenshots/member-history/capture.json) binds hashes/dimensions. Keyboard/end focus, page reflow, readable long messages and automated accessibility passed |
| Regression adaptations | Existing simulated member reads use the additive page envelope. The original support journey explicitly navigates staff queue pages because the new isolated 125-request fixture exceeds its first-page assumption; assignment/response/privacy assertions remain intact |
| Compatibility and scope | Pre-existing OpenAPI operations/schemas are unchanged. No dependency, model, financial calculator, staff financial reader, canonical fixture/token or applied migration rewrite. **248 local documentation links/anchors resolved**; screenshot hashes/dimensions and whitespace checked |
| Tooling | `graft`/`graphify` and optional specialist UI tools unavailable; navigation used `rg`/Git and actual browser screenshots |

Receiving owner: Robert reviews the shared port/contracts, registration and explicitly authorized member UI/facade integration. Fresh staff loan positions, broader longitudinal/assisted health work and institutional/privacy acceptance remain pending. HLT-01 and MOB-01 retain their existing statuses; fictional regression success is not receiving-owner approval, remote CI or production release.

Startup: apply `npm.cmd run db:migrate` using Node 24 and the existing dedicated migration configuration, restart the API, then open `/#/member/help`. Load older requests appears only when more than 25 records are available. The user's local database has not received this new index through the isolated test runs. Both label-verified disposable task containers were removed after collecting evidence; user service processes and existing data were preserved.

## Selected constraint verification handoff — 5 November 2026

Provide independent SHOW-01 workflow verification using existing EVAL-01 evidence practices for the [priority-review plan](../../AGAP_Priority_Review_Plan.md#6-demonstration-and-acceptance-matrix). Review expected routes/reasons separately from the implementation: Ana conflict/alternative/readiness, Ben confirmed shortfall/escalation, Cora clarification and an explicitly simulated source-linked AI concern. Test overlapping blockers, stable waiting-time ties, no urgency from unchecked AI, no clearance by notice acknowledgment, saved-action reload/retries and current-basis invalidation with retained history. Review server scope/revocation/eligibility and full-cohort paging expectations for the later connected phase.

Reference canonical fixtures and independent historical oracles; do not create a duplicate case registry or modify another owner's concern/decision/application module. Robert owns queue/summary/notice infrastructure, Aaron concern/evidence/financial basis, and Benedict escalation/readiness/decision rules. HLT-01 payment-help requests/follow-ups retain their separate purpose and privacy; accounting is unaffected. Predefine observed walkthrough measures and participant count without inventing time savings or community outcomes. Existing training/holdout protocols, feature status and stages remain intact. Incremental challenge verification effort is Pending beyond the historical allocation; actual independent review results and receiving-owner acceptance must be recorded when performed.
