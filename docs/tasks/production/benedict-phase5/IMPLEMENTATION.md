# PAY-01 Phase 5 — implementation evidence and receiving-owner handoff

**Date:** 2 November 2026, Asia/Manila. **Owner:** Benedict. **Branch:** `feat/benedict-pay-01-phase5`. **Worktree:** `.worktrees/benedict-pay-01-phase5`. **Prerequisite commit:** `b4f86ae`, the local verified Phase 4 checkpoint and preserved Phase 5 plan. Main remains `1776d9f`. No consuming-owner acceptance or production readiness is inferred.

The user authorized the [implementation plan](PLAN.md). The isolated principal-only simulation candidate is implemented across owned servicing/decision/staff-feature boundaries. **The application is not yet wired to this money path.** Current task status remains exclusively in [Assignment.md](../../../../Assignment.md); this record provides evidence for Robert, not another active tracker.

## Delivered implementation

| Owned boundary | Concrete result |
| --- | --- |
| `money-context.ts` / `money-rules.ts` | Strict private v2 envelope; explicitly versioned zero-interest/fee fixture policy; current financial authority, immutable request binding, exact schedule and settlement checks |
| `money.repository.ts` / `money.service.ts` | Append-only v2 commands, separate repayment preparation/authorization/submission/observation, adoption of actual stored Phase 4 release, atomic real-GL finalization and once-only replay |
| `loan-reads.ts` | Dated safe staff workspace/receipts, canonical own-member loan projection, complete scoped servicing inventory and enforced snapshot/isolation requirement |
| Decision-owned `release-guard.ts` | Canonical transaction-aware stored release preflight adapter without a nested coordinator, new submission or change to historical decision reads |
| Servicing migrations 004–007 | Paired posted GL/allocation/receipt/lifecycle evidence, principal conservation, immutable rows, money event/movement/schedule uniqueness, recording metadata, safe views/member reads and header/evidence completeness |
| `money.test.ts` / `loan-reads.test.ts` | **34 new actual PostgreSQL/runtime-role cases** with the real accounting service and independent checker; upstream configuration/source adapters remain explicitly fictional |
| Staff loans/payment feature | Safe unavailable-by-default gateway, current/pending/posted states, exact uncertain retry, session-scope cache clearing, selected saved receipt printing and **11 meaningful UI tests** |
| Feature-local preview/browser check | Labeled simulated desktop/narrow states, keyboard/axe/reflow/print evidence; no new app route or runtime provider |

The detailed behavior/security/migration contract is in [MONEY.md](../../../../apps/api/src/modules/servicing/MONEY.md). Shared schemas/client/OpenAPI, app/platform/worker wiring, accounting/monitoring code, configuration/dependencies, canonical fixtures/tokens, central tracker, model files and cooperative documents are unchanged. Only minimal owned Phase 4 helpers/repository/error exports/test setup are extended; Phase 4 migrations 001–003 and earlier decision snapshots remain untouched.

`postings` is an immutable linked business-event/allocation/lifecycle/result record. Its unique release event consumes the first-release identity by linkage; it does not mutate the original pending origination or delete its claim. V2 has its own explicit recorded revisions. Current status must use the v2/loan read, while legacy Phase 4 reads preserve their original historical evidence.

## Financial path and limits

The actual test path is recorded fictional settlement → current separately authorized finalization → actual `AccountingService.post` → servicing event/allocation/loan lifecycle/result plus audit/outbox in one real transaction. One scheduled principal repayment adds its unique journal/receipt and settles the supported fixture loan. Concurrent requests, changed HTTP keys and lost-response replays cannot create another debt effect. Period locking occurs before application/loan/command locks.

The supported product explicitly has principal equal to delivered cash, zero interest/fees/grace and an exact supplied schedule. This is not an adopted cooperative product or a substitute for Ana's interest-bearing oracle. Withheld fees and unsupported new amounts are refused; an already-known excess/mismatch stays intact as unposted conflict evidence. Pending/unknown events never reduce debt or manufacture a receipt. Changed household inputs do not re-underwrite or rewrite an already posted contract's ordinary collection.

No actual cash/bank/provider transfer, external dispatcher/inbox, general accrual/fee allocation, refund/reversal, amendment, production policy or model inference is supplied. A simulated-settlement UI request contains no trusted financial amount or verification flag. A future registered adapter must establish its own authorized server-side intake; default gateways/ports remain unavailable.

## Executed checks

Node **24.12.0**, npm **11.9.0**, existing locked dependencies. Dedicated Compose project `agap-benedict-phase5`, PostgreSQL 18 fictional `agap_test` on localhost **55447**. The new worktree needed its existing locked packages installed; offline cache lacked a tarball, so authorized `npm ci` fetched it without changing manifests/lockfile. Localhost database/browser commands used approved execution outside the restricted sandbox. No approval-review rejection occurred.

| Check | Result |
| --- | --- |
| Focused backend/read/reconciliation suites | Passed; all **34 new cases** included in the final full platform result |
| Focused staff UI suite | Passed; all **11 new cases** included in the final frontend result |
| Final `npm run check` | **Passed**: lint, generated canonical contract/client consistency, frontend/API builds, **193 frontend tests**, **491 platform/backend/contract tests** |
| `npm run test:e2e` | **34 passed**, 39.4 seconds, isolated web/API **5193/4117**; existing registered app-path regression evidence |
| New UI visual/browser/PDF script | **8 check groups passed**: 1366px/320px axe and reflow for pending/posted states, two effective 200% desktop viewports, keyboard submission and actual A4 PDF content/privacy |
| Preservation and docs | Planning sources compared with prerequisite commit; original applied migrations and shared owner paths unchanged; local links/anchors, whitespace and owned changed paths checked |

The application browser suite resets the fictional database and ran after the database suite. The visual fixture has no database and is not a live financial call. Final UI tests additionally cover scope changes and simulated intake; their normal-app routes are still unavailable. Browser evidence is presentation-only, while the financial database tests use the actual GL. These two layers do not establish a connected new financial browser route.

Actual new integrity checks include concurrent finalization, rollback after the actual GL call and before coordinator commit, permanent-event journal replay, period close serialization on the actual servicing path, source-change release holds, household-independent collection, distinct multi-role self-authorization denial, real session revocation behavior inherited from the coordinator, unknown/excess intake preservation, withheld-fee refusal, invalid account/role/MFA, safe own-member linkage/revocation and raw-table denial. Non-superuser/non-BYPASSRLS function-owner cases pass for both financial finalization and the member projection.

The actual independent reconciliation checker sees all scoped journals through a **fictional Earl evidence-reader adapter over real accounting tables**, in the same real serializable snapshot as the servicing reader. Tests establish a matching posted path, per-event offsetting errors, orphan journals, known-unposted discrepancy, refusal of READ COMMITTED and snapshot stability while another transaction posts a journal. The unknown-recording-time negative test uses an explicitly labeled proxy solely to test unavailable handling; it is not snapshot/authentication evidence.

Initial verification found a SQL CASE expression needing explicit parentheses, readonly-to-versioned parsing, and instant comparisons that needed epoch comparison rather than ISO lexical comparison. The visual checker needed an explicit browser context for axe. These were corrected without weakening financial rules, shared controls or configurations. The earlier manual-hash router warning remains the existing documented app limitation. No representative design acceptance or outcome improvement is claimed.

## UI evidence

- [Pending desktop](screenshots/simulated-pending-1366.png), [pending 320px](screenshots/simulated-pending-320.png).
- [Posted desktop/receipt](screenshots/simulated-posted-1366.png), [posted 320px](screenshots/simulated-posted-320.png).
- [Saved fictional receipt PDF](screenshots/simulated-posted-receipt.pdf), [browser-check record](screenshots/browser-check.json).

Desktop/narrow screenshots and the rendered PDF were visually inspected. The PDF retains the fictional label, peso amount, exact selected receipt/loan/journal/event identifiers and saved remaining principal, while forms/actions are absent. Effective 200% testing uses the corresponding reduced CSS viewport, not an observed physical-browser zoom gesture. Automated accessibility/screenshots do not replace representative staff review. Printable shared background refinements remain a visual-review consideration, not a financial correctness claim.

Reproduce the fictional preview with the existing dev server on port 5192 and `node --import tsx src/features/loans/browser-check.ts` under Node 24, installed matching Playwright browser and `pdftotext`. It accepts localhost only and writes labeled UI artifacts. Normal build entries/routes are unchanged.

## Planned acceptance coverage and remaining integration

The original [45-case matrix](acceptance_tests.csv), [source manifest](source_manifest.json), [plan](PLAN.md) and [planning verification](VERIFICATION.md) remain frozen historical planning records. Their planned labels have not been converted into unsupported integrated passes.

- P5-A: G1 is concretely closed by local checkpoint `b4f86ae` and the isolated branch. Fixture/component/permission/snapshot proposals are executable, but named receiving-owner acceptance remains pending.
- P5-B/C/D: actual owned rule/storage/GL/replay/rollback/concurrency/receipt behavior is implemented and tested for the supported fixture. Real upstream producer races and institutional configuration remain separate evidence.
- P5-E/G: actual dated reads, safe real-member DB context and servicing inventory/checker behavior are implemented. The reporting test coordinator establishes serializable isolation before the existing unit of work begins; the production coordinator remains unchanged and its ordinary READ COMMITTED reporting call is refused.
- P5-F: owned UI and simulated presentation checks are implemented. Actual canonical generated gateway, registered staff route, real two-person financial browser journey, manual intake and member-facade integration remain pending.
- P5-H: relevant owned/full checks passed, with screenshots and durable handoff. Combined real-producer/registered HTTP tests and representative review are not complete. Phase 5 is an implementation candidate, not integrated PAY-01 or production certification.

## Concrete receiving-owner handoff

1. **Robert/Aaron/Benedict:** accept the exact actor/source/application/decision/acceptance/component/financial producer contracts and guard order. Test adapters and permissive fixture settings must never be registered as operational producers. Current default ports/gateway fail unavailable.
2. **Robert:** review/publicize safe v2 command/workspace/receipt operations via canonical contracts/client/OpenAPI. Do not expose raw private snapshots, headers, authority or SQL parameters. Register the stored release preflight and actual producers; retain the separate pre-dispatch versus settlement/posting semantics.
3. **Robert with Earl/Benedict:** register platform → accounting 001–003 → servicing 001–007 in order. Review schema/view/function owners/grants/startup ownership checks before enabling consumers. Deploy the updated Phase 4 repository's staff-view reads with migration 006. No applied SQL migration was rewritten.
4. **Earl/Aaron/Benedict:** review fixture/product/account mappings; add other financial treatments only through matching approved component/posting/reconciliation rules. The existing independent checker remains principal-only. No interest-bearing full-money-path claim is supported by this slice.
5. **Robert/Earl:** provide the accepted operational reporting snapshot coordinator, all-branch scope policy and independently complete ledger reader/report. Reuse the servicing inventory. The unchanged READ COMMITTED platform coordinator is not sufficient for a repeatable report; no nested BEGIN or late isolation change is implemented.
6. **Robert:** connect the owned staff page/gateway/navigation/login-return path and canonical own-member `loanMemberPorts`; keep all member-phone UI/facade ownership. Real user permissions, confirmation intake and generated response validation must govern operations; the preview is not authentication.
7. **Benedict with receiving owners:** run connected HTTP/real-producer/financial browser tests and new screenshots on the accepted combined base; observe representative staff. Robert then updates Assignment.md and relevant shared specs from evidence. Real provider/inbox/worker fencing, corrections and broader SRV-01 remain separately gated.

`graft` and `graphify` were unavailable; navigation used `rg` and direct reads, with no graph-update claim. The task-owned preview server and fictional database are stopped after verification. Phase 5 edits remain uncommitted for review. Only the prerequisite checkpoint was committed locally; no push, PR, merge, external message or other-owner file edit occurred.
