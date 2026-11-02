# DEC-01 Phase 3 — implementation evidence and owner handoff

**Date:** 2 November 2026, Asia/Manila. **Owner:** Benedict. **Branch/worktree:** `feat/benedict-dec-01-phase3`, `.worktrees/benedict-dec-01-phase3`. **Dependency:** Phase 3 plan `165c86a`, containing Phase 2 `036bf5893af943654b6d0e37f83d44037c62f8b4`. Main remains `1776d9fdd5022e141a48ba1fda318636637e3d85`.

The user authorized implementation of the [plan](PLAN.md). The owned staff UI and read-service candidate are implemented. **Connected Phase 3 completion remains pending shared contracts, authoritative producer adapters and registration.** This document is evidence for Robert's central tracker, not a task-status replacement or owner acceptance. Existing planning source manifests/acceptance rows remain historical, unchanged records.

## Delivered work

| Owned file/boundary | Result |
| --- | --- |
| `apps/api/src/modules/decisions/staff-read.service.ts` | Authorized coherent workspace, bounded history, safe saved brief and exact staff document reads |
| `staff-views.ts` and additive migration `005-staff-current-read.sql` | Strict presentation proposals and narrow current-pointer read without creating a stream; canonical registration remains pending |
| `staff-read.test.ts` | Real PostgreSQL/runtime-role read/privacy/history/access tests with explicitly fictional upstream owner adapters |
| `src/features/decision/StaffDecisionPage.tsx` and `DecisionForm.tsx` | Separate staff composition, officer recommendation, reviewer preview/proof/acknowledgment, serialized commands, uncertainty/access/freshness recovery |
| `SavedDecisionBrief.tsx` and feature CSS Module | Selected immutable safe brief, exact terms inspection, scoped history, responsive/A4 printing |
| `staff-gateway.ts` | Explicit consumer interface with unavailable defaults; no invented endpoint or generated client edit |
| `StaffDecisionPage.test.tsx` | Meaningful interaction/privacy/late-response/retry/error recovery cases |
| Development-only preview, task-local UI fixture and `browser-check.ts` | Labeled simulated review harness and reproducible screenshot/accessibility/PDF evidence without shared test/configuration changes |
| [Module specification](../../../../apps/api/src/modules/decisions/STAFF.md) | Actual behavior, limits, integration contract proposals and verification instructions |

Default fictional `DecisionPage`, its browser repository and Ana/Ben/Cora tests are unchanged. Existing Phase 1/2 source/migration files are unchanged. No new calculator, AI client, dependency, canonical fixture registry or localStorage financial draft is introduced. Action hints use discarded pure-rule probes, not persisted decisions or automatically granted exceptions.

## Verification environment and results

Node 24.12.0, npm 11.9.0, repository-locked dependencies; dedicated Compose project `agap-benedict-phase3`, fictional PostgreSQL 18 database `agap_test` on port 55445. No partner/member records or model artifacts are used. Database suites run sequentially; the visual simulation uses no database.

- New staff read suite: **11 tests passed**. Includes actual runtime role, scoped auditor reads, safe immutable projection, cursor/selected-ID rejection, exact document checksum, unavailable defaults, no read-created stream/audit effects, stale-figure suppression, member denial and a non-superuser/non-BYPASSRLS function owner.
- New staff UI suite: **17 tests passed**, including source/app/selection freshness, same-request recovery after expiry, invalid response/conflict handling and field-error focus.
- `npm run check`: **passed** — lint, generated-contract drift check, frontend/API builds, **182 frontend tests** and **327 platform tests**. The 17 UI and 11 read cases above are included in these totals.
- `npm run test:e2e`: **34 tests passed**, sequentially after the database suite, using isolated web/API ports 5189/4115. These are existing app-path regressions, not connected new decision-route tests.
- Development-only browser check: **10 check groups passed**, using Playwright 1.64.1/Chromium headless revision 1248, axe with WCAG 2/2.1/2.2 AA tags, 1366px/320px/effective-200%-zoom viewports and actual A4 PDF extraction. No page errors or axe violations were reported in checked states. Printed schedule spans two pages with repeated headings; peso/minus glyphs and absence of internal notes/forms were verified. PDF pages and narrow UI were also visually inspected. Final typecheck/lint/build and visual checks passed after the print-only refinements and review-fixture scenarios.
- Source/ownership/document consistency and whitespace: **passed**. All 31 Phase 0, 27 Phase 2 planning and 47 Phase 3 planning source fingerprints remain unchanged; only new owned files/artifacts are added. Local links/anchors, changed-path scope and staged whitespace were checked.

An initial revoked-user test expected 403; the existing coordinator correctly returns 401 `access_changed`, so the test now preserves that platform contract. The PDF extraction assertion was adjusted to normalize line wrapping rather than altering saved/printed text. No security rule or shared implementation was weakened to obtain passing tests.

The following evidence is **fictional UI simulation**, not registered decision-API evidence:

- [Desktop workspace](screenshots/simulated-workspace-1366.png), [320px workspace](screenshots/simulated-workspace-320.png).
- [Desktop saved view](screenshots/simulated-saved-1366.png), [320px saved view](screenshots/simulated-saved-320.png).
- [Incomplete](screenshots/simulated-incomplete-320.png), [restricted](screenshots/simulated-restricted-320.png), [unavailable](screenshots/simulated-unavailable-320.png), [stale](screenshots/simulated-stale-320.png) and [uncertain submission](screenshots/simulated-uncertain-320.png) states.
- [Saved A4 PDF](screenshots/simulated-saved-brief.pdf), [negative-balance PDF](screenshots/simulated-timing-brief.pdf), [browser check result](screenshots/browser-check.json).

PDF checks verify original full costs, selected record identity, peso/minus glyphs, A4 content and absence of forms/internal notes. Visual inspection supplements extraction. The 683×384 viewport models the CSS viewport available at 200% desktop zoom; it is not an observed physical-browser zoom action. Automated accessibility and screenshots do not establish representative staff/design acceptance.

## Planned-case evidence and remaining layers

Component evidence covers relevant portions of P3-T01/02/05/06/10/12–25/27/29/30/32/33; database evidence covers relevant portions of P3-T03/04/07–11/27–30/32/34/35. The inherited 87 Phase 1 cases and 27 Phase 2 backend cases retain pure-rule/real-runtime evidence with fictional upstream adapters. Visual/PDF checks cover P3-T06/13/29–31/37 at the simulated presentation layer. These are **layer-specific results**, not all 38 complete integrated cases.

Actual producer/source-policy races and versioned source inspection, registered staff routes/return paths, real two-person browser authorization, lost-response recovery through the real API, shared canonical preview/client behavior, combined integration and representative acceptance remain pending (particularly connected portions of P3-T03/04/07–11/18/25/26/34–38). No current staff data adapter or simulated UI fixture is registered as a production provider. No hidden member acceptance, loan or follow-up completion is inferred from this feature.

## Concrete receiving-owner handoff

1. **Robert with Benedict/Aaron:** record accepted base/version and approve the proposed presentation/preview/history/document boundaries in the module spec. Existing 0.2.0 schemas/client remain unchanged; Phase 0 sign-offs are still pending.
2. **Robert:** publish canonical workspace/history/safe-brief/staff-document schemas/operations and the preview reference in the record request; regenerate client/OpenAPI. Implement the browser gateway using that generated client, existing CSRF/version/idempotency options and strict validation. Replace local consumer presentation imports with accepted canonical exports at that integration step.
3. **Aaron with Robert:** supply actual current evidence/assessment/offer/source-policy guards and coherent read basis. The fixture adapters prove the consumer requirements only. Expose authorized original source versions/metadata through Aaron's boundary; the current saved schema cannot invent original source titles/dates.
4. **Robert:** register all decision migrations 001–005, real producer/services and staff endpoints/capabilities, with runtime table-ownership checks/grants reviewed for the new schema. Do not expose a partial capability as completed assisted acceptance or servicing. Keep Phase 2's bootstrap/registration constraints explicit.
5. **Robert:** wire the exported default staff page, actual application entry/navigation/title and exact safe login-return path in owned app/access files. Do not use the development preview/session fixture as an authentication shortcut. Agree one recommendation entry point with Aaron.
6. **Robert/Benedict/cooperative owners:** confirm printable disclosure and recusal/reopen/reassignment semantics. Unsupported progressed-state reassignment, further decisions and follow-up editing stay unavailable. Robert owns member-facade replay/event bridging; Earl retains follow-up/accounting and Aaron retains numeric 5C/AI panels.
7. **Benedict with Robert/Aaron:** execute actual connected HTTP/browser tests on the combined base, then focused/full checks, representative review and fresh screenshots/PDF. Robert updates [Assignment.md](../../../../Assignment.md) from that evidence; a local candidate is not DEC-01 integration.

Suggested shared frontend-spec addition for Robert to apply **only when connected**: distinguish the new staff decision page from the fictional review page; document exact preview proof/acknowledgment, current versus historical reads, retained uncertain command envelopes, selected-safe print content, source metadata limitations and the accepted route/capabilities. Existing `design.md` rules already govern this composition; no competing design guide is introduced.

## Ownership and cleanup

All new code is confined to Benedict's decision API/feature paths. No shared contract/client/app/access/member-portal/platform/configuration/dependency/tracker/design/token/canonical-fixture/model/cooperative file is changed. The common browser fixture/configuration and existing suites remain intact. `graft` and `graphify` are unavailable; `rg`/direct reads were used and no graph refresh is claimed.

The dedicated preview server and Phase 3 test Compose project are stopped after verification. No other developer's database/worktree is reset. No external message, push, PR publication or merge is performed.
