# PR #38 conflict audit and integration verification

5 November 2026, Asia/Manila. SHOW-01/FND-03, with existing DEC-01/PAY-01/EVD-01/MOB-01/HLT-01 boundaries retained. User requests audit and conflict repair of [PR #38](https://github.com/Aracena18/AGAP/pull/38); merging that PR is not requested.

## Compatibility proposal before resolution

Isolated `codex/pr38-conflicts` starts at fork head `6649ffc4dec3294e352238187ed01644dd7f9ebe` and merges parent main `64b3cea6a68cfd4cf1d8fe3f2d85a833bd8042a0`. Git reports 27 conflicted files. Preserve both connected-lending CL0–CL3 and the parent pilot, response guidance, assisted check-ins, reporting and authentication recovery. No receiving-owner approval or production release is inferred.

Retain the PR's additive 0.4.0 contract with both sets of operations and regenerate OpenAPI/model schemas. Preserve both lossless dated-decision representations and their immutable hashes; do not convert historical snapshots. Keep the extraction corpus at its frozen 0.3.0 identity. Combine editor draft/concurrency safeguards with current guidance versions. Use one organization material lock and consistent acquisition before identity/aggregate locks across both fictional lending paths, workers and operators; reporting keeps its separate repeatable-read coordinator. Keep feature switches default-off and select exactly one fictional lending mode per deployment. Pilot and connected workflows have different authority/review producers for the same decision stream, so simultaneous activation is rejected rather than routing a decision through the wrong producer.

Existing task ownership, institutional gates, fictional records and later scope remain unchanged. Required verification: generated parity, lint/build/typechecks, financial/workflow/database suites, ordinary and separate presentation browser suites, relevant screenshot inspection, whitespace/link checks and graph update. Results below are pending until actually run. Root checkout modifications and artifacts remain untouched.

## Audit findings and results

- Resolved all 27 content conflicts, retaining current parent and fork functionality. GitHub supplied no existing review submissions/threads. The PR description was still its empty template, so branch code, owner briefs and tests supplied the review evidence.
- Unified the two organization material fences and their acquisition order. Real PostgreSQL regression checks prove both staff/member coordinators exclude the worker/operator lock and release it after commit. Connected-only transaction markers remain distinct from pilot authority. The concurrency waiter test now checks the actual statement rather than an obsolete hardcoded lock name.
- Preserved both dated decision/snapshot representations, source bindings, immutable hashes and exact preview/document parity. A regression rejects a context that mixes both representations. Both ordinary and pilot decision/readiness checks remain enforced.
- Retained current response-guidance/focus behavior and opening-version financial drafts through refreshes, transient failure, stale evidence and uncertain retries. Private access denial clears both facts and drafts using the existing canonical recovery message. Preserved current check-in, reporting and sign-in integrations.
- Rejected simultaneous connected/pilot activation before constructing services; either mode remains default-off and separately usable. Preserved the frozen extraction corpus identity. Canonical API 0.4.0 includes both operation sets; generated OpenAPI/model schemas match their sources.

`npm run check` passes: **255 app/domain, 791 platform/backend/contract and 109 evaluation tests**, lint, generated parity, application/API builds and evaluation typecheck. A subsequent lint/application build also passes after the final recovery-copy alignment. The first full check had one stale test-observer failure after the lock statement changed; the corrected full rerun passes. No failed calculation or financial workflow was waived.

`npm run security:check` passes with zero production dependency vulnerabilities. `npm run test:build-context` passes: seven required inputs retained and 25 synthetic private/local inputs excluded. The host initially lacked Docker Buildx; a temporary Docker configuration uses official `docker/buildx` v0.38.2 with the release checksum verified. No repository dependency or user Docker configuration changed.

**Final ordinary `npm run test:e2e` passes 137 Chromium cases**, with four presentation-only skips; the separately enabled presentation run passes **all four cases**. The initial ordinary run passed 135 cases with four presentation skips and two access-denial text mismatches; private content was correctly absent in both failure snapshots. The final suite uses the unified existing message. No privacy assertion was removed.

Fresh combined candidate captures: [staff phone](screenshots/pr38-conflicts/staff-decision-320.png), [staff desktop](screenshots/pr38-conflicts/staff-decision-1366.png), [member phone](screenshots/pr38-conflicts/member-acceptance-320.png), [member desktop](screenshots/pr38-conflicts/member-acceptance-1366.png). Phone staff/member and desktop member captures were visually inspected; automated browser checks also cover 320/683/820/1366px and axe. Historical screenshot artifacts are restored after test generation. These are fictional Chromium lab examples, not physical-device or representative-user acceptance.

Verification uses isolated PostgreSQL 18 containers: ports 55443/55444 for full checks and 55445/55446 for browser checks, web 5193, APIs 4123/4124. Existing development data and worker checkouts remain untouched. The host's automatic Docker network pool was exhausted; a dedicated test network uses an explicit private subnet.

`graphify update .` updates the graph. Its SQL parser is unavailable (`tree_sitter_sql`); the TypeScript parser also reports partial extraction of the export-only `packages/contracts/src/index.ts`, whose TypeScript build passes. No complete SQL indexing is claimed. Changed authored Markdown local targets and whitespace pass. Remote CI remains separate from these local results; the publication follow-up below records its actual state.


## Latest parent documentation and publication

After verification, parent main advanced to `7decaa0c6ed6891f3aa39d0b557254df879868bf` with the pitch assessment and exact source copies only. The checked code resolution is merge commit `df8293d`; the follow-up merge retains all six documentation changes without runtime changes. Both the assessment/source files and their original bytes are preserved. Source-branch publication updates this existing PR only; no parent PR merge or production release is performed. At this pre-publication checkpoint remote CI had not run on the repair; publication evidence follows below.


Normal non-force fork `main` publication of `c036d1878cbc675189816558ed125d19a7ca1f4d` succeeded. GitHub reports PR #38 **open, unmerged, MERGEABLE / CLEAN** against parent `7decaa0`; [fork CI](https://github.com/joohhhnnnny/AGAP/actions/runs/42034346814) is in progress, not yet a passing remote result. This evidence follow-up changes documentation only. The four task-only PostgreSQL containers and dedicated network were removed. The original checkout's unrelated edits/artifacts remain untouched.
