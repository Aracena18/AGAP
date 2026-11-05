# Connected lending code handoff — CL4–CL6

5 November 2026 · Branch `feat/connected-lending-cl4` · Base `6649ffc` (includes the user's root ignore cleanup). This is the user-authorized coordinated code contribution; deployment on the teammate's laptop is outside this task. All records, principal-only products and movements exercised here are fictional. No named teammate, accountant, institution or human evaluator acceptance is invented.

## Code delivered in the candidate

| Phase | Implemented connection |
| --- | --- |
| CL4 / PAY-01, GL-01, FND-03 | Normal staff lending queue and loan route; safe canonical command/workspace DTOs and generated client; accepted origination → exact release preparation → separate fresh-MFA authorization → committed intent → durable server-produced fictional settlement → atomic real test ledger/subledger posting |
| CL5 / PAY-01, ACC-01, MOB-01 | Captured exact scheduled repayment requests; separate authorization and original settlement identity; one allocation/receipt/journal; actual member refresh; selected immutable receipt printing; independent servicing/ledger reconciliation with pinned original pending-command mappings |
| CL6 / HLT-01, SHOW-01 | Explicitly shared payment-help request, current support assignment, separate captured/fresh posted position, private staff notes/member-safe response and preserved existing follow-up/history controls |

The shared factory retains the fictional/non-production default-off `CONNECTED_LENDING_ENABLED` boundary and separate staff/member authenticated units of work. A new financial operation never consumes browser authority, actor, observation verification, provider identity or a claimed posted total. Financial requests and original versions/keys are preserved across uncertain retries. The SQL adapter performs no real payment; movement evidence commits independently before domain processing/finalization, and unknown outcomes retain the original permanent movement identity.

The actual accounting service posts on the same caller transaction as subledger/command/receipt/audit changes. Existing period and financial lock ordering, immutable terms/schedules and component limits remain. Unposted settlement is reported as a discrepancy until posted. Reporting obtains its own repeatable snapshot and cannot execute a lending action. Support reads require the actual current request/member/branch/loan purpose and do not grant a cashier role or change contract/eligibility. The captured submission position is never replaced by the fresh position.

## Additive migrations and configuration contract

- [Servicing008](../../../../apps/api/src/modules/servicing/migrations/008-connected-movement-intake.sql) adds immutable SQL movement/evidence/action-note history and a scoped safe lending queue. Original command bodies and their hashes stay unchanged.
- [Monitoring006](../../../../apps/api/src/modules/monitoring/migrations/006-fresh-support-position.sql) supplies the narrow assigned-purpose fresh position; its owner requires the normal migration-owner privileges across the involved modules. Runtime receives no raw servicing read grants for support officers.
- Existing migration-directory registration already discovers both files in order. Apply additive migrations before enabling the code. Do not edit earlier integrated migrations or reset developer records.
- Supply an explicit fictional principal-only configuration, actual scoped officer/reviewer/cashier/financial-authorizer/auditor accounts, real actor MFA claims where required, posting rules/accounts/periods and independently declared reconciliation mappings. Missing mappings intentionally produce unavailable results. Automatic presentation sessions do not grant these roles or fresh MFA.
- No dependency, model weight, research corpus, experiment selection or inference-runtime change is included. Existing root ignore rules and unrelated research files are preserved.

## Observed verification

| Check | Observed result |
| --- | --- |
| Lint, frontend production build, platform typecheck, evaluation typecheck | Passed locally |
| UI/domain suite | 252 passed |
| Evaluation-tooling suite | 91 passed; this is tool verification, not model performance |
| First combined backend suite | 684 passed, three existing non-superuser-owner fixtures failed because their test-only owner lacked execute permission for the newly referenced purpose-policy helper |
| Corrected fixture/HTTP rerun | All 63 cases passed across the affected backend, money, loan-read and connected HTTP suites; assertions/financial rules were retained |
| Dedicated recovery suite | Seven actual PostgreSQL cases passed: unknown/restart/original-status recovery; lost response and rollback before observation commit; rollback after actual ledger posting; route/member privacy; exact repayment and independent journal-balance expectations; non-superuser FORCE RLS |
| Dedicated support checks | Five new actual DB cases plus 19 existing monitoring cases passed; four new UI cases plus nine existing monitoring UI cases passed, including current assignment, privacy and true non-superuser ownership |
| Complete connected browser scenario | Passed in 43.6s (49.1s including setup); actual normal routes and separate officer, reviewer, member, cashier, authorizer, administrator and auditor sessions; no mocked financial response |
| Financial expectation | Release 100000 centavos; repayment 50000; principal 50000; exactly two journals and one repayment receipt; matched independent two-event reconciliation |
| Captured versus fresh support | Captured 100000 and fresh 50000 coexist; member sees shared response and not the private staff note; help does not amend terms |
| Responsive evidence | 320/820/683 zoom-equivalent/1366px reflow and axe checks passed in the connected browser scenario; phone/desktop receipt captures visually inspected |

New [phone](../connected-lending-cl4/screenshots/posted-release-320.png), [tablet](../connected-lending-cl4/screenshots/posted-release-820.png), [zoom-equivalent](../connected-lending-cl4/screenshots/posted-release-683.png) and [desktop](../connected-lending-cl4/screenshots/posted-release-1366.png) captures show the posted repayment and selected receipt (the historical `posted-release` filenames cover the final loan screen). These are Chromium lab results, not physical-device or representative-user acceptance.

## Outstanding integration gate — accurately recorded

The complete final `npm run check` rerun, full ordinary `npm run test:e2e`, separate four-case presentation run and new-source remote CI have **not** all completed after the final fixture updates. The next full browser-suite launch was **not executed**: automatic approval review failed because its service reached its usage limit, with a stated reset of **6 November 2026 01:03 Asia/Manila**. This was a review-service failure, not a determination that the command was unsafe. No approval bypass or fabricated passing result is recorded. Static and already-authorized targeted checks continued.

The candidate remains uncommitted in its isolated worktree. The newer-upstream gate below must also be resolved before integration. Main remains the previously verified CL3 plus user's ignore cleanup. No CL4–CL6 commit, main integration, push, PR or deployment is claimed at this checkpoint. Complete the remaining required checks before declaring it integrated or pushing as a verified milestone.

## New upstream integration gate discovered during final handoff

The locally recorded `origin/main` has advanced to **cf90fba5141913031e04161cdc8f4b8f2fe6f6d5**, while local main/candidate base is **6649ffc**. Read-only comparison finds 354 changed paths, including the published PR38 conflict repair, the separate pilot lending lifecycle, structured guidance, priority review, bounded reporting, trial balance and current support positions. This is not a fresh network verification; it records the available Git reference inspected on 5 November 2026. Newer upstream work must be preserved.

Do **not** push this older candidate directly over upstream or assume fast-forward integration. Reconcile against the new upstream before final validation. In particular:

- Retain the upstream rule selecting exactly one fictional lending mode and its unified material lock. The candidate's connected-mode extension must not overwrite pilot configuration/readiness or app-factory registration.
- Reuse/extend the upstream current support-position API/UI where equivalent; do not publish a duplicate competing support implementation. Preserve correction and assisted-check-in/history workflows.
- Preserve new bounded/paged servicing and ledger inventory contracts when incorporating the candidate's original-component mapping lookup. Do not replace current reporting with an older unbounded projection.
- Reconcile canonical schemas, query-aware client generator, navigation, migrations and current decision codecs together. Earlier published migrations remain unchanged; candidate migration numbering/names can be selected before publication rather than altering upstream history.
- Keep newly delivered identity recovery, guidance, Qwen release restrictions, pitch evidence and all other teammate contributions. Do not infer model acceptance from this lending work.

No merge or overwrite was attempted after this discovery. The candidate's successful checks describe base 6649ffc plus this work; they are not checks of a combined cf90fba tree. Approval-service availability (or manually initiated Git/check commands) is required to complete that integration safely.

## Manual completion commands on this machine

Use Node24 and the locked dependencies. The following commands are instructions, not an assertion that they were executed. The standard test-database script uses the separate fictional `agap_test` database; never point test fixtures at the development database.

```bash
cd /home/johnbenedict/CODECOWD/WEB/AGAP/.worktrees/connected-lending-cl4
npm run test:db
npm run check
npm run test:e2e
AGAP_E2E_PRESENTATION=1 npm run test:e2e -- tests/presentation-mode.spec.ts
```

After successful checks, inspect the isolated branch diff and restore only browser-generated historical captures (not unrelated edits), retain the new CL4 evidence, then checkpoint this isolated branch, merge the newer upstream while preserving both implementations, resolve conflicts and rerun required checks before integrating main normally. Root main's ignored private files must not be staged. On another laptop the corresponding repository/worktree paths differ; the code and standard project scripts are the handoff, not this machine's service state.

Real institution-approved interest/fees/allocation variants, actual payment execution, Qwen serving/evaluation, production deployment/security/restore and institutional release remain the separate CL7–CL8 inputs and gates. They are not implemented by assuming zeros, inventing policy or treating prototype tests as approval.
