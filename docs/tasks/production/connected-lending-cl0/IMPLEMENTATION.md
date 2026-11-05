# Connected lending CL0: safety and replay implementation

5 November 2026 · Branch `feat/connected-lending-cl0` · Baseline `59351ce` · Tasks FND-03/MOB-01/SHOW-01/OPS-01, EVD-01/CRD-01 and DEC-01/PAY-01

The user requests execution of the [connected-lending implementation plan](../../../AGAP_Connected_Lending_Implementation_Plan.md). This batch supplies its prerequisite safety corrections and the independent acceptance-replay fix ahead of CL3. [Assignment.md](../../../../Assignment.md) remains the status tracker. Existing owner responsibilities are preserved; no teammate/cooperative acceptance is invented. The [CL1 field-level compatibility proposal](../../../AGAP_Connected_Lending_Contract_Proposal.md) is supplied for actual consumer review. Canonical schemas remain 0.3.0; no new decision/money writer or production producer is enabled.

## Changes

| Audit concern | Delivered behavior / actual evidence | Remaining boundary |
| --- | --- | --- |
| A01: concurrent financial correction | An editor retains its opening basis/version and values. Explicit refresh or automatic processing refresh cannot supply it a newer save version. A conflict blocks a new save while preserving the draft; cancel/review/reopen loads the current basis. Transient read errors retain the draft; access denial clears it. Record changes remount the editor. Six real-browser scenarios cover staff/member concurrency, failed read, later denied access, application change and exact retry after a lost success. | Member/staff representative acceptance remains separate |
| A02: vulnerable dependencies | Narrow overrides use body-parser 2.4.0 and Multer 2.5.0 under existing Nest 11.2.7. Only these two package versions change; lockfile generated with pinned npm 11.9.0. Production advisory scan reports zero vulnerabilities. Malformed/trailing compressed-request regression confirms continued API operation. | Repeat advisory checks over time; no general penetration-test claim |
| A03: incomplete connected journey | Detailed sequence and field-level proposal supplied; existing services and missing producers identified. | CL1 lossless assessment/decision representation, authority/conflict/transition producers and CL2–CL8 remain incomplete. No successful connected lending journey is claimed |
| A04: CI | Origin is the user's fork, `joohhhnnnny/AGAP`. Actual failed job logs show six Invalid URL failures because two tests read an absent environment variable directly. Both now use the same resolved, guarded `ownerUrl` as their database helper, preserving custom-port overrides and the localhost/agap_test/public-test-credential checks. No tests are skipped or weakened. | Exact post-publication GitHub run must verify remotely; upstream startup failure is a different repository result |
| A05: runtime ownership guard | Decisions and servicing join all other application schemas in startup's non-owner/inherited-owner rejection. Actual DB tests exercise both API roles across all 11 schemas plus inherited ownership without INHERIT: 23 cases. | This is a configuration guard, not certification of a deployed role setup |
| A06: acceptance replay | Facade rechecks own-record access and delegates to the authoritative acceptance command without a current-decision read preflight. Actual HTTP + DecisionsService + PostgreSQL test proves original receipt replay after terms become unavailable, new-attempt rejection, one acceptance/command and denial after linkage revocation. | Default domain remains unavailable; real producer/route/client integration still required |
| A07: historical staff position | Principal, receipts, next payment and included-event recording freshness use the requested effective-date cutoff. Actual posted release/repayment test verifies earlier outstanding and later settled views. Current command/pending metadata is explicitly documented separately. | Staff financial routes remain unregistered; broader financial components unchanged |
| A08: private build inputs | Docker exclusions remove documents, private/research exports, weights/data/notebooks, worktrees/backups, credentials and local outputs. Actual Docker build/export using synthetic sentinels retains seven necessary inputs and excludes 25 private/local inputs. No real private data is supplied to that verification. | Full API/worker/scanner image and deployed storage/network acceptance remain release work |
| A09: capability metadata | Existing response schema gains additive namespaced entries for member loan reads, principal reconciliation, payment help and follow-ups. Broad unfinished modules remain contract-only. | Names indicate implemented bounded support, not caller permission, records present or operational approval |

The editor keeps an immutable opening view while surrounding evidence can refresh. Its retry remains the original `useCommand` attempt, including body/key/version. A changed surrounding view must not prevent resolution of an already committed uncertain save. The new denial handling clears retained private editor content on 401/403/404; it does not treat denied access like a transient network failure. An application key prevents state carrying into another record. Current financial rules, source verification semantics and immutable histories are unchanged.

The dependency overrides are temporary compatible resolutions for the upstream advisories, rather than a forced Nest major upgrade. `npm run security:check` and `npm run test:build-context` now run in the verification workflow. No scanner/GPU/cloud or paid resource is provisioned. The model manifest, weights, D/E selection and raw research inputs remain unchanged.

## Actual verification

Local environment: Node 24.12.0, Linux, PostgreSQL 18, dedicated Compose project `agap-connected-cl0` on localhost 55461, browser ports 5207/4147, fictional fixtures only. The lockfile is regenerated with the repository's npm 11.9.0. The additional CI-default reproduction uses a separate project `agap-cl0-ci-default` on verified-free localhost 55433 and removes `AGAP_TEST_DATABASE_URL` from the test process environment; it never reuses a developer database.

| Check | Observed result |
| --- | --- |
| `npm run check` with isolated custom database URL | Passed lint, canonical generation drift, frontend/API build, 226 app/domain, 637 actual platform/backend and 91 evaluation-tooling tests |
| `npm run test:e2e` after final UI safety changes | 97 passed, four presentation-only cases intentionally skipped in normal mode |
| Presentation-specific suite with guarded fictional mode | All four passed separately |
| Production dependency audit | Zero reported vulnerabilities |
| Synthetic actual Docker context/export | Seven required inputs retained; 25 private/local inputs excluded |
| Financial conflict states at 320px/1366px | Actual member/staff screenshot captures inspected; page-overflow and automated accessibility assertions pass |
| Default database URL CI regression | Passed the entire required check: 226 app/domain, 637 platform/backend and 91 evaluation-tooling tests with the environment override absent |
| Contracts/models/migrations | No canonical contract-version/schema change, no historical migration edit, no model/financial-fixture rewrite; generation check passes |
| Documentation | New/updated local links, audit-to-phase trace, ownership, scope and whitespace checked |
| Optional code graph tools | `graft` and `graphify` unavailable on PATH; used rg-based text navigation instead; no successful graph refresh claimed |

Screenshots show fictional records in the actual API/database browser harness:

- [Staff conflict, 320px](screenshots/staff-conflict-320.png)
- [Staff conflict, 1366px](screenshots/staff-conflict-1366.png)
- [Member conflict, 320px](screenshots/member-conflict-320.png)
- [Member conflict, 1366px](screenshots/member-conflict-1366.png)

The existing suite regenerates three earlier evidence screenshots; those tracked images are restored to their original bytes rather than silently replacing historical evidence. New captures are stored only in this task's screenshot directory. Original user research exports remain untouched and are not staged.

## CI diagnosis and publication boundary

The earlier whole-system audit inspected [upstream's exact-commit run](https://github.com/Aracena18/AGAP/actions/runs/41946645966), which reports startup failure and zero jobs. That does not describe this checkout's origin fork. [The fork's baseline run](https://github.com/joohhhnnnny/AGAP/actions/runs/41947484683) started verification and failed six servicing tests with `Invalid URL`, input `undefined`. Its Actions workflow is active, repository Actions are enabled, and no workflow/billing/permission setting needs changing for this failure. The recovery/snapshot test helpers now use the existing validated database URL fallback. Upstream's separate pre-job problem is not claimed fixed.

Normal direct publication to the configured origin main is authorized by the contributor contract once required local checks pass. Publication does not complete M1/M2 or supply institutional/consuming-owner acceptance. The actual resulting GitHub run remains the source for remote verification; do not infer a remote pass from local success.

## Next implementation boundary

Continue CL1 from the field-level proposal: reconcile multi-date WorkflowAssessment and old decision snapshots without a lossy adapter, supply actual source/authority/conflict/transition producers and agree writer/lock/version semantics. Preserve old codecs/bytes/hashes. Only then register the reviewed staff decision and servicing operations and connect the member journey. Missing product/authority configuration remains unavailable; no fictional threshold becomes institutional policy. This batch is prerequisite progress, not completion of the full lending system.
