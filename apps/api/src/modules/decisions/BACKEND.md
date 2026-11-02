# DEC-01 Phase 2 — decision backend candidate

**Owner:** Benedict. **Implemented:** 2 November 2026. This specifies the owned persistence/service candidate built on the [Phase 1 rules](README.md), following the [Phase 2 plan](../../../../../docs/tasks/production/benedict-phase2/PLAN.md). The [implementation evidence and owner handoff](../../../../../docs/tasks/production/benedict-phase2/IMPLEMENTATION.md) distinguish executed tests from pending connected integration. Canonical contracts remain 0.2.0; module-local proposals are not new public endpoints.

## Service boundary

`DecisionsService` uses the existing staff `UnitOfWork`, command cache, canonical serializer, audit/outbox and Phase 1 rule functions. Member operations use the supplied `MemberTransactionContext`, existing member command store and portal event helper. There is no nested staff transaction, second idempotency store, finance calculator, AI client or ledger.

| Export | Behavior |
| --- | --- |
| `recommend` | Assigned, cleared officer records the current checked assessment/offer recommendation; increments owner application version atomically |
| `preview` | Separate authorized reviewer prepares an immutable, expiring explanation/terms preview for one normalized request and material basis |
| `record` | Rechecks current basis, exact reviewer preview, request, aggregate version, authority and conflicts; records approve/decline/clarification and immutable history |
| `saved` | Authorized officer/reviewer/auditor reads the original saved staff snapshot, with checksum verification |
| `reviewBasis` | Officer/reviewer reads current-pointer, acceptance and material-change information; always returns `releaseAuthorized: false` |
| `memberDecision` | Own-member safe projection; changed basis, restricted participants, returned workflow or expired unaccepted approval becomes unavailable |
| `memberAccept` | Own-member acknowledgment of exact current approved document, once; current access precedes command replay, new attempts check version/validity |
| `memberDocument` | Own-member historical approved UTF-8 document, with checksum verification |
| `decisionMemberPorts` | Exports only canonical member `decision`/`accept` implementations for Robert's later facade registration |

Staff methods open their own staff unit of work; member methods require the caller's real member unit of work. Input normalization uses canonical schemas plus the Phase 1 local proposal schemas. Missing integration uses `unavailableDecisionPorts` and returns 501 without writing a decision. Nothing in this module registers itself in the application.

## Required owner ports

`backend-contracts.ts` defines **consumer proposals**, not an accepted replacement for shared contracts:

- `authorizeStaff` / `authorizeMember`: check current organization, branch or linked-member resource access before any cached response. Identity/link revocation remains checked by the existing coordinator through commit.
- `loadStaffBasis`: supply the complete authorized Phase 1 basis, excluding the recommendation. The service reads its own persisted recommendation. Validate actor scope, original assessed horizon, exact source/fact versions, current assessment/input/policy/offers, conflict declarations and authority applicability. Protect all relevant bindings through commit using the producer-approved shared writer/guard protocol.
- `loadMemberGuard`: return only scoped application/version/status, input version, material hash, current recommendation ID and participating preparer/reviewer clearance. Protect these bindings through commit; do not disclose staff snapshots to the member runtime role. A recommendation ID must come from the real current stream/producer agreement, never the browser.
- `transitionStaff` / `transitionMember`: use the supplied transaction to perform authorized owner application status/revision/history changes with the expected version. Preserve assessment-input versions for workflow-only changes according to the agreed owner rule. Return the actual next aggregate version. Member transitions must also provide any agreed narrow durable event bridge; they must not open a staff coordinator or grant staff outbox access.

The module serializes its own stream with an organization/application advisory lock and a guarded pointer revision. This does **not** guard another module's mutable evidence, configuration or applications. Every corresponding writer must honor the agreed producer lock/guard protocol. Test-only owner adapters lock fictional application/basis records to exercise this requirement; they are not production implementations.

## Persistence and exact-content review

The four ordered, module-qualified SQL migrations create the `decisions` schema:

1. `001-decision-records.sql`: scoped stream, immutable recommendations/previews/records/documents/acceptances, constrained references/checksums, bounded functions, staff views and FORCE RLS.
2. `002-document-member-scope.sql`: local document member scope and deferred document/member binding. This fixes a restrictive policy that otherwise required runtime SELECT access to private records; no such broad grant is added.
3. `003-snapshot-shape.sql`: explicit required JSON keys/type/header checks, including SQL NULL-safe validation and final-decision recommendation presence.
4. `004-member-validity-projection.sql`: bounded acceptance eligibility using the inclusive Asia/Manila expiry date, without returning authority configuration.

These are a bootstrap candidate sequence, tested together in an isolated fictional database. Robert must register and run **all four before enabling any decision writer**. Migration 002 backfills a new scope field and is not an upgrade path for an already active 001-only installation with immutable document rows. No such integrated installation is claimed. Applied files are checksum-protected; corrections are additive.

Records retain canonical snapshot text, generated JSON, SHA-256, original source/assessment/offer/authority/conflict provenance, reviewer roles, request and reviewed explanation. Reads verify stored integrity without recalculating finance or regenerating old prose. Historical records reject ordinary updates/deletes, including accidental owner changes; only bounded stream pointers advance. The full staff snapshot remains private to authorized staff views.

A preview binds reviewer, application/version, normalized human request, material hash, explanation, reserved decision/document IDs, exact terms text and expiry. The 15-minute default is a bounded technical preview lifetime, not an invented approval-validity policy. Recording requires the preview ID and literal canonical `explanationReviewed: true`. The provisional validation performed when preparing a preview is not an approval or a recorded acknowledgment. Changed request/basis/reviewer or an expired preview requires a new review.

`decision-documents.ts` uses deterministic template text and the shared formatter on **already supplied checked figures**. No model is required. Full reviewed explanation must fit the canonical 2,000-character `Text` limit; oversized content is rejected, never silently truncated. The exact UTF-8 terms include the explanation, supplied principal/fees/schedule and assessed horizon, within 64 KiB.

**Concrete document-storage choice:** this candidate stores exact generated plain-text bytes in PostgreSQL in the same transaction as the decision. Authorized visibility occurs after commit. Rollback therefore cannot publish an orphan document; external staging/object storage and PDF rendering are unnecessary for this bounded format. The snapshot includes the document checksum, while the document does not embed the snapshot checksum, avoiding a circular hash. A later external publisher needs its separately reviewed staging/retention controls and cannot silently regenerate accepted terms.

## Member privacy, acceptance and retries

Runtime has no raw SELECT grant on staff records/documents/acceptances, no direct acceptance INSERT and no historical UPDATE/DELETE. Staff projections explicitly reject member context; bounded SECURITY DEFINER functions use a fixed `pg_catalog` search path, explicit organization/member checks and revoked PUBLIC execution. Tests include a non-superuser, non-BYPASSRLS function/view owner under FORCE RLS.

The member projection contains only canonical explanation/terms fields. It omits source excerpts, conflict references, authority grants and raw staff policy-check detail; checks retain their status/identifier with safe generic detail. The staff snapshot preserves the original detail. Reviewer rationale is intentionally part of the reviewed member explanation; its suitability remains a human review responsibility.

Acceptance checks the scoped current decision, approved outcome, application status/version, exact document/version/checksum, current input/material/recommendation and participant clearance, recorded time and explicit saved validity. The bounded SQL function checks exact saved terms and Manila expiry without granting the member full snapshot access. This implements the Phase 1 acceptance invariants through a narrow database projection rather than sending the whole staff candidate through the member runtime role. SQL/pure-rule behavior must remain aligned when those invariants change.

Acceptances retain server time and verified member/link provenance, with unique `(organization, decision, member)` business identity and immutable document/decision references. Checksum/snapshot hash and Manila day resolve from those immutable references; there is no second copy that can drift. A new transport key after a recorded acknowledgment returns a conflict rather than a second business event.

Commands bind normalized body, application, expected version and, for decisions, preview proof. Current identity/resource access is checked **before replay**. Identical committed retries return the saved result before stale aggregate, changed basis or expired preview/approval checks for new attempts. A rollback removes command claim, decision/document/acceptance, pointer/status effects and events together. Revoked identities/links cannot replay cached results.

Staff effects use existing `platform.audit_events` and `platform.outbox`. Member effects use existing `portal.commands` and `portal.events`. General staff audit/outbox INSERT remains denied to member context. A portal-event-to-staff-outbox bridge is **not implemented here**; Robert must supply the accepted narrow integration if required before connected activation.

## Errors and incomplete integration

Canonical errors pass through. Local schema errors map to 422; stale versions to 412; access failures to 403; state/idempotency/duplicate acknowledgment conflicts to 409; unknown storage/integrity failures to sanitized 503. HTTP `If-Match` parsing/428 behavior remains the existing platform/controller responsibility. Raw SQL errors, snapshots and document content are not logged by this module. Public preview/read/document routes and exact new error codes require Robert's review.

Robert must address current member-facade ordering before registration: its present acceptance preflight reads current approved terms **before** calling the domain command. That can reject an otherwise valid replay after material changes. Route through the domain's authorized replay boundary first; retain all current-term checks for new commands. Do not simply bypass authentication or own-record access.

No endpoint/provider/migration/capability/client registration, staff/member screen, authority/conflict administration, external AI inference, loan, release or accounting operation is activated by this candidate. Real Robert/Aaron adapters, contract/security review and cooperative settings remain prerequisites. See the [implementation record](../../../../../docs/tasks/production/benedict-phase2/IMPLEMENTATION.md) for actual verification and the remaining handoff.
