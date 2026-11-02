# DEC-01 Phase 3 — staff feature and read-service candidate

Implemented on Benedict's isolated `feat/benedict-dec-01-phase3` branch, based on Phase 2 `036bf5893af943654b6d0e37f83d44037c62f8b4` and planning checkpoint `165c86a`. This extends the [Phase 2 service specification](BACKEND.md) within existing ownership. The [implementation evidence](../../../../../docs/tasks/production/benedict-phase3/IMPLEMENTATION.md) distinguishes actual checks from pending shared integration. Canonical contract remains 0.2.0; consuming-owner acceptance is not fabricated.

## Implemented read boundary

`DecisionStaffReads` accepts the existing staff unit of work, Phase 2 producer ports and repository. Missing ports default unavailable. It writes no application/evidence/decision records and calls no model or financial calculator.

- `workspace(actor, applicationId)` loads one producer-guarded basis, then reads current pointers under the same decision advisory-lock order used by commands. It returns supplied checked figures, recommendation and actor-specific action hints. Hints call the existing Phase 1 recommendation/decision guards with discarded probe candidates; probes never persist approvals, exceptions, previews or acknowledgments. The actual write repeats every guard and requires real human input.
- `history(actor, applicationId, {cursor?, limit?})` returns scoped summaries/acceptance state, ordered by immutable `(recorded_at DESC, id DESC)`. Limit defaults to 20 and is bounded at 50. An unknown/unscoped cursor is rejected; a selected missing record never becomes the latest record.
- `brief(actor, applicationId, decisionId)` uses checksum-verified saved snapshots and a strict member-safe projection. Stored explanation/origin, considered offer/figures, horizon, review date, identifiers and permitted source reference metadata are preserved. It omits raw source excerpts, conflict references, authority grants and internal policy detail. Original reviewer/source display names and original source dates were not captured by these snapshots, so the view shows saved identifiers and explicitly labeled fact effective dates instead of invented metadata.
- `document(actor, applicationId, decisionId)` authorizes staff directly, reads exact persisted document bytes, and verifies their checksum against both document and snapshot. It never impersonates a member. Missing nonapproval documents are not created for printing.

All reads require officer/reviewer/auditor role plus scoped producer authorization and the real staff coordinator. Administrator/cashier alone is insufficient. Current pointer access uses additive migration `005-staff-current-read.sql`; PUBLIC execution is revoked, member context is denied, and explicit organization/branch/role predicates apply even with a privileged definer. A runtime-role test uses a non-superuser, non-BYPASSRLS definer. No raw stream SELECT grant is added to runtime.

Register migrations 001–005 together before enabling the candidate. The existing 001-only bootstrap limitation documented in Phase 2 remains; no earlier applied migration is rewritten. Migration discovery/provider/route/capability registration remains Robert's work.

## Consumer proposals and frontend entry

`staff-views.ts` contains module-local, strict presentation schema proposals composed from canonical types. They are not approved new HTTP DTOs. `src/features/decision/staff-gateway.ts` defines the explicit browser consumer interface. The browser imports only pure presentation/preview schemas and type declarations, never repositories, Node crypto, test DB helpers or full snapshots. Robert must move/approve the public shapes through the canonical package and generate the actual client before connection; the feature does not call invented endpoint URLs.

Default `StaffDecisionPage({applicationId, gateway?})` consumes the existing real `StaffProvider`. Missing gateway returns honest unavailable. `StaffDecisionWorkspace` is the injectable view/controller wrapper for composition tests and explicitly fictional previews; passing a session object is not authentication. Application/staff/CSRF changes remount the controller so old drafts and pending attempts cannot cross identity/resource boundaries. Standard staff/demo/member routes are unchanged.

The UI displays supplied centavos through shared `Money`, preserves unavailable/zero/negative distinctions, shows full considered costs/schedule/horizon and keeps human recommendation, decision and acceptance separate. Existing tokens, controls, typography, semantic fieldsets and A4 rules govern appearance. No shared component or style definition changes.

Assigned-officer recommendation uses only the accepted assessment/input/offer references and human reason. Reviewer outcome starts unselected. Authority/conflict/exception constraints are reflected by the server hints; disabled controls do not enforce permission. Incomplete evidence can support authorized clarification; unavailable final outcomes and unsupported exceptions remain blocked.

A preview is a distinct idempotent write. It shows the exact server explanation and terms, origin, and not-recorded state. Relevant edits/refresh clear it and the reviewed acknowledgment. The server proof, normalized request, original application version, CSRF and key are sent on record. Expiry blocks a new recording. Confirmed 4xx/known-501 nonexecution clears old proof; network/5xx/malformed successful response retains the original attempt as uncertain.

One existing `useCommand` instance serializes all feature commands. The retained envelope/sender binds original application/body/version/proof/key. Uncertainty locks edits and new commands and exposes only explicit same-submission retry, including after preview expiry or later server basis changes. No automatic write retry or localStorage persistence is added. Reload loses the shared helper's in-memory retry context; the UI explains this and directs reconciliation before a different submission. It does not claim durable recovery from an arbitrary 404.

Confirmed decision success selects the returned saved ID. A subsequent brief-read failure remains a read failure and cannot resubmit the decision. Selected/app/version/gateway changes hide old read/print content immediately; canceled/late responses are discarded. Same-record refresh preserves unsent human text while clearing authoritative figures/readiness/proof. 401/403 scoped denials hide private content; a selected historical 404 shows unavailable without substitution. Existing router unsaved-change handling covers dirty or uncertain state.

## Saved brief and print behavior

`SavedDecisionBrief` renders only the strict safe saved projection. It never calls the current calculator or explanation builder. A historical result is distinct from current review readiness. Original authority/conflict/policy notes are not shipped to this printable article; hiding staff disclosures with CSS is not the privacy boundary.

Printing uses selected saved content, A4/16mm shared rules, repeated table headings and readable multipage layout. Forms/navigation/current workspace/terms-inspection controls are excluded. The printed PDF is a view of saved content, not byte-identical accepted UTF-8 terms; it neither changes the saved checksum nor replaces that artifact. Approval, decline and clarification can have briefs; only actual approval documents can be inspected through the separate staff document port.

Original source inspection and captured historical display-name metadata remain unavailable where the producer/snapshot does not supply them. Connected conflict recusal/reassignment/reopening and follow-up editing remain unavailable without their owner commands. No money, numeric 5C, monitoring record, member screen or staff-assisted acceptance is added.

## Review-only visual harness

`src/features/decision/staff-preview.html` / `staff-preview.tsx` are explicitly labeled development-only simulations, not app routes or production build entries. They consume task-local gateway examples translated from canonical fictional fixtures using the existing engine. They never access cooperative data or pretend to implement production producers. The actual application gateway defaults unavailable.

With the normal dev server on port 5188, run `npx tsx src/features/decision/browser-check.ts`. It uses existing Playwright/axe and the system `pdftotext`/`pdfinfo` tools, writes labeled screenshots/PDF/check evidence to the Phase 3 documentation directory, and accepts localhost only. The checks exercise rendering/keyboard/reflow/accessibility/print, not real staff authorization or connected endpoints. Do not deploy the development harness as a staff screen.
