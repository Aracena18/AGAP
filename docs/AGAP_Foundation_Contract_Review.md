# Foundation contract review and integration handoff

The 30 October review below is dated evidence. The [2 November integration record](#2-november-2026--pr-18-integration) supersedes its current-state and next-step statements where later merged work is available.

30 October 2026, Asia/Manila. Robert's technical review for FND-03 and SHOW-01, based on main `266379ac293572de91a603a72c1a01750a1c3101`. Review branch: `codex/foundation-contract-handoff`. The [task register](../Assignment.md) remains the sole status tracker. This review does not record Aaron/Benedict/Earl acceptance, freeze contract 0.2.0, approve institutional rules or authorize a merge.

## Scope and proposed integration changes

Review the supplied [member contract proposal](AGAP_Member_Contract_Proposal.md), canonical [schemas](../packages/contracts/src/schemas.ts), [ports](../packages/contracts/src/ports.ts), [operations](../packages/contracts/src/operations.ts) and [member facade](../apps/api/src/modules/member-portal/member-portal.service.ts) against the four owned boundaries. Existing member access and unavailable-domain behavior remain the starting point; no replacement schema or calculator is proposed.

The supplied GL-01 [module handoff](../apps/api/src/modules/accounting/README.md) requests central migration registration, and EVAL-01 [tooling](../evaluation/synthetic/README.md) requests root check registration. Robert owns both shared boundaries. This branch proposes:

1. Register the existing three accounting migrations after platform migrations in the one checksum-checked migrator. Preserve their source and order, and exercise installation on a fresh isolated test instance, replay and changed-checksum rejection on the guarded fictional database.
2. Add the evaluation-local typecheck and tests to `npm run check`, which the current CI workflow already invokes. Preserve Earl's corpus/schemas/runner and independent review/holdout requirements.
3. Leave financial HTTP operations and capability flags unavailable. `AccountingService` already implements `PostingPort`, but no controlled PAY-01 orchestrator exists to consume it; do not add an unused provider, endpoint, fictional balances or accounting configuration.

No executable API contract/version, generated client, module-owned migration, financial formula, model, fixture or member screen changes are proposed here. These are testable registration changes for review, not completion of the dependent product packages.

## Reviewed boundaries and remaining receiving-owner inputs

| Boundary | Supplied evidence and technical finding | Required receiving-owner input |
| --- | --- | --- |
| Identity and intake — Robert | Separate member actor/session/unit of work; own-record application commands and server-established linkage; [recorded DB/OIDC/browser evidence](AGAP_Robert_Member_Verification.md) | Representative member/staff review and explicit agreed contract/base record remain pending |
| Evidence and credit — Aaron | `MemberDomainPorts` carries source upload/download/confirmation and checked options. The facade validates source/version/provenance, checked output shape and member ownership; defaults remain explicitly unavailable. PR #17 supplies a fictional-browser validation slice, not these server services | Confirm source lifecycle/access, draft/confirmation meanings, expense horizon, engine/config versions, expected versions and durable domain deduplication on the supplied member transaction |
| Decisions and servicing — Benedict | Ports carry recorded decisions/terms, acceptance, posted loan/receipt views; member and staff transactions remain distinct | Confirm current approved snapshots/authority, acceptance invalidation/retry rules, posted-position freshness and controlled payment orchestration; no service or Qwen artifact is inferred from a port |
| Posting — Earl and Benedict | Existing `AccountingService.post(tx, request)` is compatible with `PostingPort`; the caller owns commit. Module tests exercise source-event replay, reversals, permissions and concurrency | Agree period-before-loan/command locking, permanent event identity, transaction-wide subledger/journal atomicity and permitted account/rule/period configuration; do not substitute a member transaction for a staff posting transaction |
| Evaluation — Earl, Aaron and Benedict | `eval-01-* /v1` files reuse canonical money/date/source/model schemas, while corpus and predictions remain offline evaluation-local proposals. Supplied pilot is a development preview, not a reviewed training release | Independently review labels/task formats, reserve a private holdout, bind actual review evidence to hashes and agree baseline/regression criteria before freeze/training; Robert's check registration is not label or release approval |
| Model provenance — all | Canonical model/source provenance is supplied; no operational EBM path, Qwen weights, hosting or promotion evidence is supplied by this review | Benedict supplies reproducible artifacts, Earl independent evaluation, Aaron the single inference adapter, and Robert compatible runtime wiring after the separate release review |

Financial amounts remain integer centavos; missing is not zero. Confirmation, source verification, AI findings, checked calculations, officer recommendations and reviewer decisions retain different meanings. A passing schema or test does not establish document authenticity, a correct institutional policy or repayment probability.

## Review record to complete

| Reviewer | Requested decision and evidence | Current evidence |
| --- | --- | --- |
| Robert | Record technical compatibility, registration changes, exact checks and remaining gaps | Technical review in this branch; observed verification recorded below |
| Aaron | Accept or request changes to evidence/credit/model inputs, confirmations and domain retry/authorization responsibilities; give reviewed commit/version and reason | No acceptance recorded |
| Benedict | Accept or request changes to decision/servicing and model-loader boundaries; agree posting lock/event/transaction contract with Earl | No acceptance recorded |
| Earl | Accept or request changes to posting/support/evaluation contracts and manifests; record independent label/holdout/protocol decisions separately | Module handoffs supplied; no cross-owner acceptance or training-release review recorded |

Record actual reviewer, date, task/contract/base version, accepted scope, requested changes and remaining dependencies in the relevant brief/PR before the central tracker treats the contract as agreed. Do not prefill signatures, acceptance, split counts, final labels or model results. Review work in this chat is not another person's approval, and no messages have been sent to teammates.

## Verification

Observed on Linux with Node 24.14.0 and a fresh PostgreSQL 18 test instance under Compose project `agap-foundation-handoff-tests`, localhost port 55436, database `agap_test`, using only the public fictional test credentials. Browser servers use 5186/4116. The running development/identity preview and shared test database are not reset or reused.

| Check | Observed result |
| --- | --- |
| Default migration regression | [Two real database tests](../apps/api/test/migration-registration.test.ts) pass: ledger installation without a module registration shim, replay preserving applied history, empty operator configuration/direct-write restrictions, and changed ledger checksum rejection/restoration |
| Root `npm run check` | Passed lint, generated-contract drift, web/API builds, **165 domain/UI**, **132 backend/contracts** and **46 evaluation** tests, including the 42 supplied GL-01 tests and the two new migration regressions; evaluation typecheck passed |
| Browser regression | `npm run test:e2e` passed **34 Chromium tests**, including current evidence-readiness cases, identity/access, correction/retry, preserved snapshots, keyboard, accessibility and 320px behavior |
| EVAL-01 development handoff | Existing CLI preview, validate and bundle verification passed for **12 development cases**; corpus SHA-256 `792a4a0aaccd786b910429e2ccc429c21b0b3eb7c1de5bb20ca8f71d49a7af1f`. Output is in ignored `node_modules/.cache/agap-foundation-review/preview-v1`; training/validation counts are zero and review/holdout commitments are null |
| Documentation and task audit | Six Markdown documents, 125 local links/fragments and five pinned Git targets checked; 35 task IDs with unchanged owners/dependencies/stages/budgets and no prerequisite cycle. Four partial-progress statuses updated only from the supplied merged evidence |
| Preservation | Module-owned code/migrations, evaluation corpus/runner, canonical schemas/client, financial fixtures/oracles, design and dependency lockfile unchanged against the review base; no new operational capability flag or model artifact |
| Graph update | `graphify update .` completed: **1,443 nodes / 3,680 edges**. It reported missing optional SQL parsing for 15 SQL files and partial extraction of the contracts barrel; source/DB tests remain required |
| Whitespace | `git diff --check` passed |

The missing-ledger failure was reproduced before registration. An exploratory second-database test then encountered the historical cluster-wide worker-role bootstrap; the final regression uses the guarded test database and does not edit applied migrations or drop shared roles. One full-check attempt hit an unchanged dropdown test's five-second timeout; its focused three tests and the subsequent unmodified full check passed. No timeout/permission/control was weakened. The existing browser warning about deliberate manual hash navigation remains within the previously documented limitation.

These are local technical checks, separate from remote CI and actual owner/institution/member acceptance. No real-member data, model execution, financial-health outcome, private holdout review, tuned-model promotion or live financial transaction is claimed. No UI changed in this branch, so new UI screenshots are not applicable.

## Next integration steps

1. Obtain actual consuming-owner feedback and resolve contract changes through Robert's canonical boundary; FND-03 remains a review candidate until that evidence exists.
2. Integrate available domain services through the existing portal and shared registration, retaining honest unavailable states for missing services. PAY-01 must implement the real posting transaction before any accounting HTTP/capability promotion.
3. After the core contract review, propose FND-04 goal/consent/planner/guidance and FND-05 rubric/finding/score/trace/handoff interfaces under their existing stage 2 estimates. Actual rubric weights and approved product/advice inputs remain institutional dependencies; this review does not activate them.

See the [platform guide](AGAP_Platform_Foundation.md), [current owner brief](tasks/production/01-platform.md), [delivery boundaries](AGAP_Delivery_Plan.md) and [model evaluation plan](AGAP_Model_Training_Plan.md).

## 2 November 2026 — PR 18 integration

The user explicitly requests pulling current repository changes, resolving PR conflicts and merging the new changes. Integration branch `codex/pr18-integration` combines PR #18 head `f60a5fb57a0e300a34b693e271e7c01e4ef0e434` with main `68152890f84a31ae47d907f460b88732ebdc064d`, including merged PRs #19–#23. The integration merge preserves both histories without rewriting or force-pushing.

Conflicts in Assignment.md and Robert's production brief retain the newer policy-source checkpoint, FND-04/FND-05 proposal review states, ACC-01 principal comparison and EVAL-01 paired-comparison handoffs alongside the dated foundation review. Other owners' supplied files, canonical API 0.2.0, fixtures, financial calculations and lockfile are unchanged against current main. Task IDs, owners, stages, dependencies, statuses and provisional budgets remain unchanged by this conflict resolution.

PR #23 also supplies decision/servicing services, staff views and Qwen preparation/handoff/verification tools. Those deliveries supersede the 30 October statements that no PAY-01 orchestrator or model tooling exists. Their recorded producer-acceptance, registration, configured-policy, runtime and model-evaluation limitations remain applicable; this PR registers only the three existing accounting migrations and evaluation checks. It does not register decision/servicing gateways or migrations, enable financial capabilities, freeze goal/5C proposals, fabricate receiving-owner agreement or promote a model. The already-published owner verification remains dated evidence; task-wide integration is separate from code publication.

Verification uses Linux, Node 24.14.0/npm 11.9.0, an offline clean lockfile installation and a fresh PostgreSQL 18 instance in Compose project `agap-pr18-integration`, guarded fictional database `agap_test`, loopback port 55437. Browser servers use dedicated web/API ports 5197/4127. The user's original main worktree and untracked documents/artifacts are preserved while preparing the PR.

| Check | Observed result on the combined revision |
| --- | --- |
| `npm ci --offline --no-audit --no-fund` | Clean install passed using the unchanged lockfile |
| `npm run check` | Passed lint, generated contract/client drift, frontend/API builds, **193 frontend**, **493 backend/contract** and **76 evaluation** tests, plus evaluation typecheck; both ledger migration regressions passed |
| `npm run test:e2e` | **34 Chromium tests passed**, 44.0 seconds; no skipped test or weakened timeout/control |
| Documentation and preservation | Six changed Markdown documents, **146 local links/fragments**, **35 task records** checked; IDs, owners, stages, dependencies and statuses unchanged from main; canonical and module-owned source preservation checked |
| `graphify update .` | Completed: **2,592 nodes / 7,302 edges**; optional SQL parser absent for 27 SQL files and contracts-barrel partial-extraction warning retained |
| Whitespace and conflicts | PR delta passes `git diff --check`; no unresolved merge entries or conflict markers remain |

Local checks remain distinct from remote CI, which must be inspected on the published PR revision. Existing deliberate-manual-hash-navigation browser warnings remain within the documented router limitation. No UI is changed by this PR's conflict resolution, so additional UI screenshots are not applicable. Existing module/browser screenshots stay intact.

## Production baseline and database registration — 2 November 2026

The user requests the full production product in successive steps. This technical step starts from main `df5dd8c7178a51286fbc08c7851d4d63bc0ade7c` on isolated branch `codex/production-readiness-baseline`. The [central sequence](../Assignment.md#production-completion-sequence--2-november-2026) orders the existing packages through institutional release; Assignment.md remains the sole task/status tracker. The user has not supplied or confirmed a first production product or approved policy version. No fictional policy, source-document wording or request for clarification is treated as institutional approval. Unaffected technical work continues.

### Finding and bounded implementation

The default migrator registered platform/accounting only. The merged decision/servicing tests temporarily appended their own directories, so a passing module suite did not prove that a normal installation had decision history, accepted terms or posted payment storage. The added regression first reproduced absent tables and missing applied-migration entries on a fresh isolated database.

Robert's shared registry now includes all five existing decision and seven existing servicing migrations after platform/accounting. Final decision migration 005 supplies the current staff read; final servicing migration 007 requires a complete initial money revision before commit. The regression verifies protected raw history and safe projection/deferred-constraint installation through the normal migrator, replay preserving the full applied history, and changed-checksum refusal for accounting, decisions and servicing. Module-owned SQL and source, canonical contracts/client/fixtures, financial calculations, dependencies and application routes/providers/capability flags are unchanged.

After installation, existing platform/accounting migration history was compared with its saved pre-update record: all **14 existing name/checksum/applied-at records** were identical, and **12 decision/servicing migrations** were added. This records the tested schema-upgrade history; it is not evidence of a live-data cutover or an upgrade from a separately activated partial decision schema. Existing consumer limitations, including decision acceptance replay ordering and reporting snapshot isolation, remain pending integration work.

QWN-01, DEC-01 and PAY-01 move to In progress based on the supplied PR #23 module/model evidence, not on newly invented owner acceptance. All other statuses, IDs, owners, prerequisites, stages and budgets remain unchanged. No feature is marked Integrated by registering its storage.

### Verification and next boundary

Verification runs on Linux/Node 24.14.0 with the unchanged lockfile and Compose project `agap-production-baseline`, guarded fictional PostgreSQL 18 database `agap_test` on loopback port 55438. The task-owned database is separate from the user's development/identity databases. The original main checkout, worktrees and untracked files are preserved. Results are recorded after completion; no production database, actual funds or model is accessed by this step.

Verification completed on 3 November 2026, Asia/Manila, after the work began on 2 November:

| Check | Observed result |
| --- | --- |
| Clean dependency install | `npm ci --offline --no-audit --no-fund` passed with unchanged dependencies/lockfile |
| Regression before fix | Three expected failures: absent decision/payment storage and missing final decision/servicing migration records; the existing ledger checks passed |
| Focused registration checks after fix | All **five** real-database tests passed, including full-history replay and checksum rejection/restoration for all three modules |
| Upgrade history | **14** earlier migration records retained identical names/checksums/applied-at values; **12** decision/servicing migrations added |
| `npm run check` | Passed lint, generated-contract/client consistency, web/API builds, **193 frontend**, **496 backend/contract**, **76 evaluation** tests and evaluation typecheck |
| Fresh-install browser check | Recreated only the task-owned ephemeral DB; normal browser-server setup installed **26 total migrations**, including all **12** new module files, without a module-test registration shim; `npm run test:e2e` passed **34 Chromium tests** in 45.3 seconds on web/API 5198/4128 |
| Documentation and ownership | **Three** Markdown files, **95** local links/fragments and **35** task records checked; only the three evidence-backed status changes; all IDs/owners/scope/stages/prerequisites preserved. Module source/SQL, canonical schemas/client/fixtures, financial code, lockfile and UI/design unchanged |
| Graph and whitespace | `graphify update .` completed: **2,598 nodes / 7,309 edges**; missing optional SQL parser for 27 SQL files and contracts-barrel partial-extraction warning retained. `git diff --check` passed |

The full local checks and fresh-install checks are distinct from remote CI, institutional acceptance and production deployment. Existing deliberate manual-hash navigation warnings remain within the recorded browser limitation. No operating data, real payment, model inference or live policy activation is claimed.

The next implementation boundary is EVD-01/CRD-01 server evidence and assessment under Aaron, with Robert coordinating shared contracts and member connections. The [existing review inputs](#reviewed-boundaries-and-remaining-receiving-owner-inputs) and current owner handoffs must be accepted by the actual owners before dependent activation. No new UI is changed here; screenshots are not applicable. Main merge and deployment are separate later actions.

## Direct publication workflow — 3 November 2026

After the tested database setup change was prepared as draft PR #24, the user requests direct pushes of the AGAP work in this collaboration and no new PRs unless requested. This supersedes the earlier publication restriction for the current change and subsequent requested work; the contributor contract, central tracker and delivery workflow record it. Isolated implementation branches, required checks, owned paths, accepted interfaces and institutional production-release gates remain in force.

The directly published implementation is `1f7ddf021ead7d2578f771e86523c7fa25109b49`, based on main `df5dd8c7178a51286fbc08c7851d4d63bc0ade7c`. The registration code and its five database regressions are identical to the fully checked revision above. The subsequent change records publication policy in Markdown only; link/consistency and whitespace checks apply, without repeating unrelated application tests. No module-owned source, migration SQL, dependency, UI, financial formula or fixture is changed by the workflow update.

Publish using a normal fast-forward/non-force push, preserving unrelated untracked local documents/artifacts and task branches. Draft PR #24 is superseded and closed; the implementation is not sent through a PR merge operation. Local test evidence remains separate from the existing remote-CI startup limitation. This publication completes the bounded shared database setup change; business-domain integration and full production completion remain pending.
