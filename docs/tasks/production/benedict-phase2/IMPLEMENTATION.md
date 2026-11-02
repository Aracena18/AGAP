# DEC-01 Phase 2 — implementation evidence and integration handoff

**Date:** 2 November 2026, Asia/Manila. **Owner:** Benedict. **Branch:** `feat/benedict-dec-01-phase2`. **Worktree:** `.worktrees/benedict-dec-01-phase2`. **Dependency checkpoint:** `d24c74717adf10f7cedbf682f93cb40fe661c0f1`, containing Benedict's preserved Phase 1, Phase 0 review packet and Phase 2 plan. Its parent integration base is `1776d9fdd5022e141a48ba1fda318636637e3d85`.

The user authorized implementation. The owned persistence/service candidate is implemented; **connected Phase 2 integration remains pending**. This document is evidence for Robert's central tracker, not a second status register or a claim of accepted production controls. The earlier [plan](PLAN.md), [planning verification](VERIFICATION.md), [acceptance matrix](acceptance_tests.csv) and frozen source manifests remain historical planning evidence. Their `planned` labels have not been rewritten into claims of integrated execution.

## Delivered implementation

The [backend specification](../../../../apps/api/src/modules/decisions/BACKEND.md) defines actual behavior, storage, guards, errors and registration requirements. New files are confined to Benedict's decision module and this handoff:

| File | Concrete contribution |
| --- | --- |
| `backend-contracts.ts` | Explicit unavailable defaults, proposed producer transaction ports, scoped member guard and exact-preview shapes |
| `decisions.repository.ts` | Scoped persistence, immutable snapshot/integrity reads, safe member projection and exact-document retrieval |
| `decisions.service.ts` | Recommendation, reviewer preview/record, saved brief, non-authorizing release basis and own-member acknowledgment; exports canonical member port subset |
| `decision-documents.ts` | Deterministic reviewed explanation/UTF-8 terms from supplied figures; no financial calculation or model dependency |
| `decision-errors.ts` | Sanitized conversion into existing platform error types |
| `migrations/001` through `004` | Owned schema, references/checksums, immutable history, FORCE RLS, bounded member functions, local document scope and expiry-safe projection |
| `backend.test-fixture.ts` / `backend.test.ts` | Explicit fictional owner adapters plus real PostgreSQL/runtime-role, rollback, replay, privacy and race tests |

The existing 87 Phase 1 rule tests and rule implementation remain unchanged. There is no duplicated calculator, ledger or provider client. Authority/conflict configuration is captured from proposed authoritative producer inputs; no fake operational configuration service is substituted.

The plain-text document is committed inside PostgreSQL with its decision, rather than an external staged PDF. This fulfills atomic exact-content publication for this bounded artifact without exposing files from a rolled-back transaction. A later external renderer remains separately scoped. Member policy-check notes are sanitized while staff snapshots preserve the original checked result.

## Verification

Verification uses Node 24.12.0 and the repository's npm 11.9.0, with dedicated Compose project `agap-benedict-phase2` and fictional PostgreSQL 18 database `agap_test` on port 55444. No partner records, cloud model weights or real member data are loaded.

The database and browser suites ran sequentially because their existing fixtures reset the dedicated database. Final command outcomes:

- Focused backend suite: **27 tests passed**, using real staff/member coordinators and runtime database role, with explicitly fictional upstream owner adapters.
- `npm run check`: **passed** — lint, canonical generated-contract drift check, frontend/API builds, **165 frontend tests** and **316 platform tests** (including the 87 Phase 1 and 27 new backend cases).
- `npm run test:e2e`: **34 tests passed** with Playwright 1.64.1, Chromium headless shell revision 1248 and isolated web/API ports 5187/4114. These verify the existing browser paths; they are not new connected decision-endpoint tests.
- Shared-file isolation, both new documents' local Markdown links and scoped text whitespace: **passed**. All **31 Phase 0** and **27 Phase 2 planning** source hashes still match. Existing rule files, official brief and frozen review evidence remain unchanged.

Reproduction uses the existing [platform test setup](../../../AGAP_Platform_Foundation.md) with an isolated test database. The backend suite temporarily registers the decision migration directory in its own test process; production registration remains unchanged. With the dedicated Compose database running and `AGAP_TEST_DATABASE_URL` pointing to its guarded `agap_test` database, run:

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/decisions/backend.test.ts
npm run check
AGAP_E2E_WEB_PORT=5187 AGAP_E2E_API_PORT=4114 npm run test:e2e
```

Use Node 24/npm 11.9.0 and an installed Playwright Chromium browser. This run used `PLAYWRIGHT_BROWSERS_PATH=/tmp/agap-phase2-playwright`. The dedicated `agap-benedict-phase2` Compose project is stopped after verification; no other developer's database is reset or stopped.

The database suite proves recommendation deduplication, changed-key conflict, exact reviewer preview binding, current identity/own-member access, actual multi-role self-review denial, immutable history, safe projections, exact historical document retrieval, rollback of all owned/owner-simulated effects, once-only acceptance and replay after later changes. Two real connections test both source-change-first and decision-guard-first ordering. A non-superuser, non-BYPASSRLS function/view owner verifies FORCE RLS behavior. Calendar tests cover validity through the configured Manila day and refusal on the following day while preserving the historical document.

Initial database tests exposed a document RLS policy subquery requiring SELECT access to private snapshots. Additive migration 002 fixes this using a local member scope field and deferred binding check. Runtime raw snapshot access remains denied. The four migrations must be applied as a bootstrap sequence before enabling writers; no active 001-only installation is supported or claimed.

These tests **do not prove Aaron's real source/policy concurrency protocol, Robert's actual application transition/history or the real facade's replay ordering**. The labeled test adapters operate on isolated fictional fixture records to make the consumer requirements executable. They are not imported or registered by application startup.

## Relationship to the planned acceptance matrix

The candidate supplies direct database/service evidence for persistence/immutability, scoped writes, assigned recommendation, exact reviewed content, self-review denial, deterministic document publication, historical preservation, own-member acknowledgment, uniqueness and transaction rollback (P2-T01/02/04/08/09/13/14/15/17/18/21). It exercises proposed versions of source races, member validity/replay/events and release-basis behavior (P2-T06/07/11/16/19/20/22/23). The inherited 87-case pure-rule suite additionally covers malformed/stale/incomplete basis, financial-policy exceptions and authority/conflict gates (P2-T03/05/10/12).

These are **partial layer-specific results**, not full completion of the planned HTTP/integrated cases. Corrupt-document operations are prevented by persistence checks and immutability; malicious privileged bypass/recovery is not certified. Actual endpoint/log/precondition behavior, real producer adapters, portal-event bridging and combined registered-route acceptance (P2-T24/25 and connected portions of the other cases) require the owner integration base.

## Receiving-owner integration checklist

1. **Robert with Benedict/Aaron:** record the accepted base, actor/transaction/lock ordering, authority/conflict owner and canonical contract revision. The 47 Phase 0 review entries remain pending; the UI-centralization meeting was not technical acceptance of every proposed port.
2. **Aaron with Robert:** supply current authorized source/fact/assessment/offer/policy projections and original horizon, guarded against every material writer through the supplied transaction. Missing basis remains unavailable. The test basis table and fixture adapters must never be registered as production services.
3. **Robert:** supply authorized application transition/revision/history methods and narrow member event bridging. Review migration/definer ownership/grants and register all four decision migrations before enabling writers. No shared migration registry was edited on this branch.
4. **Robert with Benedict:** agree the server-held preview proof and public snapshot/document/read interfaces; update canonical schema/client/OpenAPI together. The current 0.2.0 decision request lacks a preview artifact ID, so the extra service argument is a local proposal, not an already-supported public request.
5. **Robert:** fix current member-facade acceptance preflight ordering so authorized committed retries reach the domain replay boundary before new-attempt current-state checks. Preserve current authentication, link revocation and own-record checks. Register `decisionMemberPorts` and authorized historical document access only after those semantics are tested end to end.
6. **Benedict with Robert:** wire the actual upstream adapters and execute connected stale/source/policy/conflict/revocation races and rollback tests. Re-run full required checks on that combined base before enabling the relevant capability or declaring DEC-01 integrated.
7. **Cooperative/policy owners:** confirm effective authority, conflict applicability, limits/quorum/exceptions, expiry and acknowledgment disclosures. Fictional fixture settings do not activate institutional policy; unsupported multi-approver approval remains blocked.
8. **Robert:** update [Assignment.md](../../../../Assignment.md) from reviewed evidence. Its existing task status is untouched here. No push, PR publication or merge is performed by this implementation.

Later PAY-01 consumes the non-authorizing decision basis with actual loan/command mapping and Earl's posting boundary. `releaseAuthorized` stays false here. Model training, staff UI, member screens, numeric 5C scoring and servicing are separate tasks and do not become implemented through these backend files.

## Ownership and presentation

Main and other workers' files remain unchanged. No edits target shared contracts/client, platform/application/member-facade code, app registration, dependencies/configuration, centralized design/tokens/fixtures, central tracker, model notebooks or cooperative materials. No UI changes require screenshots in this backend-only candidate; future screens continue to follow [design.md](../../../../design.md) and the [frontend specification](../../../AGAP_Frontend_Spec.md).

`graft` and `graphify` are **unavailable** in the implementation environment. Repository navigation used `rg` and direct file reads; no indexed-navigation or graph-refresh execution is claimed.
