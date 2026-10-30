# Foundation contract review and integration handoff

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
