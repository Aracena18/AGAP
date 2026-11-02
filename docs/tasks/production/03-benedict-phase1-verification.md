# Benedict DEC-01 Phase 1 — verification and handoff

**Date:** 1 November 2026, Asia/Manila. **Branch:** `feat/benedict-dec-01-phase1`. **Base:** `1776d9fdd5022e141a48ba1fda318636637e3d85`.

Phase 1 supplies a standalone decision-rule/immutable-basis implementation candidate. It does not integrate DEC-01 endpoints, a database service, actual authentication or runtime AI. [Assignment.md](../../../Assignment.md#benedict) remains the sole status tracker; this handoff records evidence, not a new task status or institutional approval.

## Owned changes

- [context.ts](../../../apps/api/src/modules/decisions/context.ts): module-local composed schemas for checked review context, authority/conflict proposals, exact source/document bindings and immutable candidates; canonical 0.2.0 schemas/types are reused.
- [rules.ts](../../../apps/api/src/modules/decisions/rules.ts): pure recommendation, human reviewer decision, material-change classification and exact-version member-acceptance preparation, with recursive freezing and deterministic snapshot hashes.
- [rules.test.ts](../../../apps/api/src/modules/decisions/rules.test.ts): independent fictional unit cases; no copied Ana/Ben/Cora baseline or partner member records.
- [module specification](../../../apps/api/src/modules/decisions/README.md): transition rules, trusted caller boundary, cooperative gaps, limitations and receiving-owner proposals.
- Owner brief and this verification record: scoped progress/handoff documentation only.

## Implemented behavior

Assigned officers prepare current checked recommendations. Reviewers need a different user identity, actual scoped role, explicit conflict clearance, effective configured outcome authority and current input/recommendation references. Multi-role self-review remains prohibited after reassignment. Approval limits have no guessed default, multi-approver finalization fails closed, and every failed overridable check requires individual exception authority and its own reason. Critical unknown/unresolved facts cannot be overridden into readiness.

Otherwise authorized reviewers can return an incomplete case for clarification without an assessment/recommendation or approved terms. Authority and conflict clearance are still required; missing evidence does not create financial authority. Reviewer departures from a current recommendation need a reason. Explanations are supplied reviewed template/manual text, bound to the exact basis and reviewer; no model is called.

Snapshots retain source/fact versions, checksums, verification status, checked figures, offers, horizon, policy/authority configuration, recommendation, reviewer, rationale, exceptions and reviewed explanation. Material changes, replacement recommendations or restricted/unavailable participant clearance indicate renewed review/hold while unreleased. Released contracts remain preserved and referred to a later authorized workflow. The change classifier does not implement full release authorization.

Member acknowledgment requires the correct linked member, current application/decision, an approved unchanged basis and the exact published document ID/checksum. Expiry is inclusive on Asia/Manila calendar dates; own recording instants normalize to UTC. Explicit no-expiry differs from unavailable validity policy. Acceptance never releases a loan or changes a balance.

## Verification environment and results

Node `24.12.0`, repository-pinned npm `11.9.0`, existing lockfile/dependencies; no dependency/configuration change. A separate temporary Compose project `agap-benedict-phase1` supplies guarded fictional `agap_test` on port `55443`. Browser verification uses web `5186` / API `4113`. Platform and browser suites run sequentially because both reset fictional fixtures.

| Check | Result |
| --- | --- |
| Decision-rule tests | 87 cases included in the passing final platform suite; focused runs also passed during implementation |
| `npm run typecheck:platform` | Passed |
| `npm run check` | Passed: lint, generated-contract consistency, frontend build, API build, 165 frontend tests and 289 platform tests |
| `npm run test:e2e` | Passed: all 34 Chromium browser tests, 37.6 seconds |
| Documentation links / whitespace / ownership diff | Passed: 21 local links, no whitespace issues; owned module/brief/verification paths only |

The generic full platform suite includes the new decision rules; it does not authenticate them through new routes or persist their snapshots. Existing database/session tests remain regression evidence for the platform, not newly implemented decision-service authorization. No UI changed, so no new feature screenshot is claimed. Existing canonical demo helpers/screens and calculations are unchanged.

The first browser attempt could not launch because the matching Playwright Chromium executable was absent. It produced 18 launch failures and 16 unrun tests, not assertion evidence about the feature. The required headless browser/FFmpeg were then installed in `/tmp/agap-phase1-playwright`; the complete rerun passed all 34 tests. The existing manual-hash-navigation warning appeared during browser regression tests; the frontend specification already records that limitation. No router change was made in this task.

To reproduce with the same toolchain, select Node 24.12.0 and npm 11.9.0, start a dedicated fictional test database as described in the platform guide, and set `AGAP_TEST_DATABASE_URL` to that localhost `agap_test` instance before running the commands. The verification environment used `AGAP_E2E_WEB_PORT=5186`, `AGAP_E2E_API_PORT=4113` and `PLAYWRIGHT_BROWSERS_PATH=/tmp/agap-phase1-playwright` for `npm run test:e2e`. Browser installation is a test-environment prerequisite, not a project dependency/schema change. The task-owned temporary test container is removed after verification; recreate it before rerunning DB/browser checks.

`graft` and `graphify` were unavailable during implementation. Searches used `rg`; no graph update is claimed. Only owned module/docs paths changed. Robert's shared types/contracts/client/registration, fixtures, tokens, application state and dependency files remain unchanged. Cooperative originals, the populated workbook and Colab/training files remain untouched. No push or merge was performed.

## Next-phase receiving-owner work

1. Robert reviews the module-local authority/conflict/source/document/snapshot proposals and agrees canonical interfaces plus actual persistence/registration boundaries. Current financial/decision capabilities remain unavailable.
2. Aaron supplies authorized current checked assessment/offer/source/fact projections, including readiness/version guarantees. Source appearance/extraction is not authentication or independent verification. Original source access/retention remains with its owner.
3. Benedict implements Phase 2 under a real staff/member unit of work: fresh identity and version locks, append-only persistence, atomic audit/outbox/idempotency, immutable document publication and exact member scope. Passed pure tests do not replace runtime-role/RLS/concurrency tests.
4. Cooperative policy owners confirm operative versions/applicability, ordinary-loan limits/quorum, conflicts/recusal, exception powers, expiry and acknowledgment. No membership/capital percentage, restructuring threshold or workbook formula was adopted as a general Phase 1 policy.
5. Earl reviews the eventual release/posting boundary for PAY-01. This phase adds no accounting writes, loan balances or payment commands and does not complete the money path.
