# CL2: connected staff review and decision candidate

5 November 2026 · Isolated branch `feat/connected-lending-cl2` · Baseline `bd0ebea` (CL1 source `c23071a`)

The user authorizes sequential CL1–CL8 implementation. CL1 passes local checks and [exact source CI](https://github.com/joohhhnnnny/AGAP/actions/runs/41991864161). This is the CL2 implementation brief under existing DEC-01, EVD-01/CRD-01, FND-03/SHOW-01 and PRV-01 boundaries. [Assignment.md](../../../../Assignment.md) remains the status tracker. Actual receiving-owner and institutional acceptance remain separate; none is invented here.

## Contract and behavior selected before implementation

1. Keep the canonical 0.4.0 connected-lending candidate and historical codecs. Move the existing safe staff workspace/history/brief and preview presentation schemas into the canonical registry with compatibility re-exports. Publish staff workspace, history, saved brief/document, recommendation and preview/record operations. The record body is an explicit `{previewId, decision}` envelope; retain the exact actor/request/basis/expiry proof.
2. Introduce an explicit, default-off `CONNECTED_LENDING_ENABLED` setting requiring the evidence workflow, fictional records and a non-production environment. Shared registration must use the guarded staff/member coordinators for every participating writer, including identity revocation. Reconciliation retains its separate repeatable snapshot. No authentication/MFA bypass or real movement mode is added.
3. Add `connected-review/v2` integration metadata and a versioned private review-readiness proof, preserving v1 decoding and byte/hash identity. New consequential recommendations/decisions require an actual assigned-officer confirmation covering the complete saved assessment, sources and all checked scenarios. Manual review is explicit; absence of a model run is never recorded as an AI check. Return-for-clarification can use an actual saved incomplete assessment without inventing complete figures.
4. Record immutable self-conflict declarations, source-linked manual concerns, officer checks, escalation assignment/reassignment, separate reviewer dispositions and full-basis currentness confirmations. New concern citations must match exact currently supplied source text/version through the evidence owner's producer. Correcting/dismissing a concern cannot clear mandatory financial checks or independently verify a source.
5. Bind review commands to the displayed full evidence-basis hash and optimistic application version. Maintain a monotonic review-stream revision for material review events; changes stale earlier proofs even if old financial values are restored. Keep source/policy/current-role guards through commit. Preserve old events and decision snapshots.
6. Confirmed/corrected concerns need a different eligible active scoped reviewer, explicit current conflict clearance and a recorded disposition. Assignment creates a durable own-recipient in-account notice on the same transaction. Acknowledgment is separate, does not resolve the concern and does not change financial-readiness revision. Reassignment requires a new disposition tied to that exact assignment/basis. Reviewer absence stays visibly unassigned.
7. Extend narrow member/release currentness with the new persisted readiness revision/confirmation binding before a later phase activates those connections. Use new additive migrations; never edit the integrated CL1 migrations or reinterpret old snapshot bytes.
8. Connect normal staff application navigation and the existing decision feature to the actual generated client. Provide review-readiness/source/concern controls and reviewer notices with the existing shared tokens/controls. Refresh must preserve unsaved decision text and invalidate obsolete previews. Denied access clears private content; uncertain retries retain the original request/key/version.

This M1 candidate uses one explicitly fictional principal-only product, separate authenticated participants and mandatory financial checks. Multi-approver operational policy, actual payments and contractual amendments remain later gates. The broader global priority queue is not claimed implemented by an individual review page or a notice list.

## Proposed canonical operation surface

| Operation | Path / behavior |
| --- | --- |
| `getStaffDecisionWorkspace` | GET `/applications/{id}/decision-workspace`; existing safe workspace |
| `listStaffDecisions` | GET `/applications/{id}/decisions`; immutable bounded history |
| `getStaffDecisionBrief` | GET `/applications/{id}/decisions/{decisionId}`; safe saved brief |
| `downloadStaffDecisionDocument` | GET `/applications/{id}/decisions/{decisionId}/document`; exact stored bytes/checksum |
| `previewDecision` | POST `/applications/{id}/decision-previews`; versioned/idempotent exact preview |
| Existing `recommendOffer` / `recordDecision` | Actual scoped commands; record requires the proof envelope |
| `getDecisionReview` / `listDecisionReviewEvents` | GET current readiness and immutable bounded review history |
| Conflict/currentness/concern/check/assignment/disposition commands | Separate versioned/idempotent actor-scoped operations, never a generic client authority packet |
| `listDecisionNotices` / `acknowledgeDecisionNotice` | Own-recipient bounded in-account notices; acknowledgment alone cannot establish readiness |

These names/fields are an AI technical implementation proposal within the user's authorized scope, not another person's sign-off. The exact canonical schema and register become the executable reference when implemented. The financial workflow still uses deterministic calculations and an explicit human decision; no model decides, calculates or establishes authority.

## Verification required

Actual runtime-role HTTP/PostgreSQL tests must cover normal recommendations/preview/record, self-approval/COI/limits, missing/expired/changed proof, genuine incomplete-assessment clarification, currentness confirmation, exact citations, stale review/assignment, notice acknowledgment versus disposition, participant revocation, material edits and immutable history. Verify the full browser path from normal staff navigation with actual services, narrow/tablet/desktop/zoom, keyboard and inspected captures. Run required full checks and remote CI before declaring this phase technically delivered. No completed test or owner acceptance is prefilled.


## Detailed readiness and recusal protocol

Use an immutable review-event stream with a monotonic revision. Concerns require a current exact-source check, and confirmed/corrected findings require an assignment-bound reviewer disposition. A full-assessment manual confirmation must occur after required reviews; it covers all supplied scenarios without clearing any failed financial rule. Source/policy/configuration/assessment changes require a new basis confirmation. Commit the revision, confirmation identity and actual participating reviewer IDs into new private decision snapshots so revocation/restriction of any relied-on reviewer also holds an unreleased loan.

Self-conflict declarations are distinct from evidence confirmation and do not fabricate a financial input change. An existing restriction cannot be overridden by the same person's later clear declaration, including after an input revision. Preserve it and use a different eligible participant. Provide a separately authorized, fresh-MFA administrative preparation-reassignment path before a recorded decision; it changes workflow ownership only, invalidates preparation readiness and grants no lending/financial authority. Broader independent conflict-resolution policy remains unavailable until genuinely specified.

No acknowledgment increments financial-readiness revision or resolves an escalation. Review writes preserve original command replay before current-basis checks for a new attempt, after current actor/resource access. An already recorded approval and any pending/posted money retain immutable identities; a new material concern cannot silently rewrite terms or manufacture another origination. Actual contractual amendment/remediation remains the later controlled servicing scope.


A newly completed source arrival must stale a previously saved assessment/review packet even if no fact amount has changed. The first fictional connected review requires every supplied source in its packet to remain inspectable and free of a recorded mismatch, matching the existing narrow acceptance/release guard. It does not silently ignore a new document or claim that a quarantined/retired source was reviewed. These conservative M1 constraints do not define the institution's operational document/retention policy. Incomplete saved assessments remain usable for a human clarification return.


## Implemented and locally verified

The canonical operation register, generated OpenAPI/client, controller, guarded application factory and normal staff navigation now supply the proposed staff surface. Member facade/terms transport is deliberately the next CL3 connection; public money commands remain unavailable. `CONNECTED_LENDING_ENABLED` defaults false and rejects production, real records or a disabled evidence workflow. Administrators do not acquire lending authority. The separate repeatable-read reconciliation coordinator is retained.

New `009-review-readiness.sql` is additive; no integrated migration was changed. It supplies immutable review history/notices and natural acknowledgment identity, monotonic readiness, actual participant/assignment binding and the narrow member/release currentness extension. Historical snapshots/documents stay unchanged. Exact current-source quotations are checked through the evidence producer. Any recorded restriction cannot be self-cleared across input revisions. Preparation reassignment requires fresh administrative MFA before a recorded decision; it changes ownership without granting financial authority. A complete source arriving without an input-counter change stales the saved assessment. Actual incomplete saved assessments still support an authorized clarification return with no approval document.

A preview now also verifies the current rendered explanation/terms against its stored bytes, catching changed displayed names, and is expired at the exact expiry instant. The generated-client adapter verifies downloaded UTF-8 document bytes against the saved SHA256. Drafts retain opening application/basis versions across refresh; changed drafts cannot silently bind to newer evidence. Source review and consequential decision editors cannot issue competing writes. Unknown results retain the original request, proof, version and key.

### Verification evidence

Node 24.12.0 and locked npm 11.9.0 dependencies. Actual isolated PostgreSQL 18 projects `agap-connected-cl1` (55439, final full check) and `agap-connected-cl2` (55441, browser/service checks), public fictional credentials only. Development records were not reset. No private evaluation cases, mapping, model weights or research artifacts were opened or altered.

- Final `npm run check`: **242 app/domain, 674 platform/backend/contract and 91 evaluation-tooling tests passed**, with lint, generated-contract parity, browser/API builds and evaluation typecheck. Full backend tests use actual runtime roles and PostgreSQL; the producer suite includes the non-superuser FORCE-RLS owner case.
- Final ordinary `npm run test:e2e`: **99 passed**, four presentation-only cases intentionally skipped there. The separate guarded presentation run passes **all four cases**. A prior invocation used a non-existent test selector, ran no tests and was corrected; it is not counted as verification.
- The actual two-session browser test traverses normal staff navigation, explicit conflict declarations, exact source concern, officer check, separate reviewer assignment, acknowledgment remaining unresolved, separate disposition, full-basis manual confirmation, recommendation, exact preview/approval, same-body/key recovery after lost successful review and recording responses, reload and checksum-verified saved terms. It uses real services and no mocked financial response.
- Additional actual service/HTTP regressions cover stale versions, actor attribution, restricted self-clearance, review rechecks invalidating old resolution, acknowledgment business deduplication, incomplete assessment clarification, fresh-MFA reassignment, source arrival/retirement, role revocation, new post-approval concern holding release, immutable history, member privacy and committed acceptance replay. Existing pure rules retain exception/authority/quorum/expiry coverage.
- Saved-decision captures at [320px](screenshots/saved-decision-320.png), [820px](screenshots/saved-decision-820.png), [683px zoom-equivalent](screenshots/saved-decision-683.png) and [1366px](screenshots/saved-decision-1366.png) pass overflow and axe checks. Desktop and phone captures were visually inspected. The post-approval notice was corrected to explain the recorded decision and separate acceptance/release rather than suggesting missing evidence. These are Chromium lab results, not physical-device or representative-user acceptance.
- Browser-generated historical evidence/CL1 captures were restored from the clean baseline; new CL2 captures remain separate. `git diff --check` and changed-document link checks precede publication.
- `graft` and `graphify` are unavailable in PATH and the tool catalog; navigation used `rg`. No graph update is claimed.

The review is AI-assisted engineering verification. No named consuming-owner, financial manager, cooperative, independent human reviewer or production authority has signed off. Broader priority queue, member acceptance connection, disbursement, repayment and support integration remain their sequential CL3–CL6 scope. CL7–CL8 still require actual operating policy, identity/scanner/model/deployment/recovery inputs and institutional release evidence. This candidate does not authorize live funds or real records.
