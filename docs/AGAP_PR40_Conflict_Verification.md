# PR #40 conflict review and verification

5 November 2026, Asia/Manila. SHOW-01/FND-03, retaining PAY-01/ACC-01/HLT-01/MOB-01 ownership. User requests renewed GitHub review and conflict repair of [PR #40](https://github.com/Aracena18/AGAP/pull/40). No PR merge is requested.

## Resolution proposal

Isolated `codex/pr40-conflicts` starts at fork main `001013067715fb6721380838fcd6d8488797abb1` and merges parent main `61fb0c5f42ba3f6b7c9f2f25300c16860aabd5d5`. Git identifies one conflict, in `apps/api/test/browser-server.ts`: connected lending adds separate authorizer/auditor/administrator session fixtures while upstream adds support-correction fixtures. Preserve both fixture sets in the private test manifest; keep its restrictive file permissions. Retain upstream support correction routes, migration, member screens and browser coverage together with CL4–CL6 lending, receipts, reconciliation and purpose-bound support reads. No new contract, product behavior, dependency, financial policy or UI rule is proposed.

Root local edits and artifacts remain untouched. Required checks and publication evidence follow only after execution. Consuming-owner acceptance and real operational release remain separate.

## Review findings

GitHub reports an open, conflicting PR with no review submissions or inline threads. Its description is an unfilled template; the CL4–CL6 implementation/handoff and actual source/tests provide the review basis. The conflict is a competing private test-manifest initializer, not a financial calculation disagreement. Resolution retains `supportCorrections` and all connected officer/reviewer/member/cashier/authorizer/auditor/administrator fixtures, with mode `0600` preserved.

Reviewed connected route composition, original settlement/retry identity, separate authorization, atomic posting, pinned reporting mappings, purpose-bound support projections, strict pilot projection and normal browser navigation. Both fictional lending modes remain exclusive/default-off. Preserved all 138 upstream API operations and 164 schemas; the combined generated API has 148 operations. All 54 previously published upstream SQL migrations retain their exact bytes. No additional runtime defect is established by this review; the only authored code resolution is the browser fixture union.

The first full check passes lint, generated parity and both builds, then reports two existing UI test timeouts (263/265 pass). The first ordinary browser run reports 137 passes, three failures and three dependent cases not run, plus four presentation-only skips. Failure evidence shows one dynamic-module import failure and two screens still loading. The initial run shared a dependency/cache directory with other work and ran under concurrent host load. A dedicated dependency copy and bounded CPU concurrency are used for the complete reruns, without changing source assertions or increasing test timeouts. This is an environment hypothesis, not a proven product defect.

Security audit passes with zero production dependency vulnerabilities. The build-context check initially fails because the host lacks Docker Buildx; the retained temporary Buildx v0.38.2 binary is reverified against its official release checksum and used through a task-only Docker configuration. The check then passes: seven required inputs retained, 25 synthetic private/local inputs excluded. User Docker configuration and project dependencies are unchanged.

`graphify update .` completes (5,368 nodes, 16,596 edges). SQL parsing remains unavailable (`tree_sitter_sql`), and export-only contracts have partial TypeScript graph extraction; application typechecking is separate from indexing. No complete SQL graph is claimed.

## Verification follow-up

The complete `npm run check` rerun passes: **265 UI/domain, 816 backend/contract and 109 evaluation tests**, with lint, generated parity, application/API builds and evaluation typecheck. No test assertion or timeout changed. All **four presentation-mode browser cases pass** separately.

The ordinary browser rerun passed the connected and pilot journeys, assisted check-ins and earlier failed layouts, then was interrupted after an operator error: a concurrent presentation launch in the same worktree rewrote `.platform-test/browser.json`, despite using separate databases and ports. Later tests therefore read sessions belonging to a different fixture database. The final complete ordinary run is sequenced after presentation shutdown. This is test orchestration evidence, not a runtime code fix or a waived failure.


## Final checked candidate

The final ordinary `npm run test:e2e` passes **143 Chromium cases**, with four presentation-only skips; all four separately enabled presentation cases pass as recorded above. The final run includes both complete fictional lending modes, member support corrections, fresh/captured support positions, assisted check-ins, retained drafts, uncertain retries, privacy and browser accessibility/reflow checks. No application code or test assertion changed between the environment-corrected runs.

Combined-candidate [phone repayment/receipt](screenshots/pr40-conflicts/posted-repayment-320.png) and [desktop repayment/receipt](screenshots/pr40-conflicts/posted-repayment-1366.png) captures were visually inspected. The connected journey also checks 320/683/820/1366px reflow and axe. These are fictional Chromium lab examples; receiving-owner and representative acceptance remain separate. Historical browser-generated evidence is restored from the merged index rather than replacing earlier records.

Full checks use task-only PostgreSQL containers on ports 55473/55474; ordinary browser fixtures use 55475/55476. Web/API ports are 5197/4133/4134 and presentation uses 5198/4135. Test runs share no developer database. Ordinary and presentation browser launches must be sequential in this worktree because their private session manifest has one path. Whitespace, authored local links, preserved API/migration checks and the resolved index pass. Publication updates the existing fork source branch normally; it does not merge the parent PR or authorize operational release.


## Source-branch publication

Normal non-force publication of checked merge `507fe4e267ae43c022c8f3ae9ca8dc368c129787` to `joohhhnnnny/AGAP:main` succeeds. GitHub reports PR #40 **OPEN, MERGEABLE / CLEAN**, unmerged, against parent `61fb0c5`. [Fork CI on the checked source](https://github.com/joohhhnnnny/AGAP/actions/runs/42050667255) is in progress at this checkpoint, not a claimed remote pass. This publication follow-up changes documentation only. The four task-only test database containers are stopped/removed after all checks; developer services and unrelated checkout edits remain untouched.


## Renewed review — 6 November 2026

The user requests another GitHub review and repair. Prior source `c116987` and checked merge `507fe4e` both subsequently pass fork CI; those results do not verify a newly combined tree. Parent main has advanced to `1570df8` with VID-01 recording/scenario analysis and UI-11 household calendars. PR #40 now has one new conflict in `src/app/StaffApp.tsx`; GitHub still has no review submissions or inline threads.

Isolated `codex/pr40-recheck` starts at fork `c116987` and merges parent `1570df8`. Proposed resolution retains both staff navigation/route sets: connected lending and loan operations plus the fictional analysis queue/application analysis. Preserve role, record-mode, pilot exclusivity, normal identity, preview-provider and existing authority boundaries. Put navigation and routes on separate lines to reduce repeated conflicts in this shared shell. No new contract, calculation, policy, dependency or UI rule is proposed. Preserve canonical fixtures, historical snapshots, migrations and unrelated local work. Full check/browser results and source publication are recorded only after execution; PR merge remains unrequested.
