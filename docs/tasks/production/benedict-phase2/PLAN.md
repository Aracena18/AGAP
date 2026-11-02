# DEC-01 Phase 2 — decision backend implementation plan

**Prepared:** 2 November 2026, Asia/Manila. **Owner:** Benedict. **Purpose:** persist the existing Phase 1 decision rules through authorized server commands, immutable review records and exact-version member acceptance. This is a plan, not a running service, accepted contract revision, new task-status register or permission to merge.

The [assignment tracker](../../../../Assignment.md#benedict), [official brief](../03-decisions-servicing.md), [product](../../../AGAP_Product_Solution.md), [architecture](../../../AGAP_Production_Architecture.md), [delivery plan](../../../AGAP_Delivery_Plan.md), [platform guide](../../../AGAP_Platform_Foundation.md), [frontend specification](../../../AGAP_Frontend_Spec.md) and [design.md](../../../../design.md) govern scope. [Phase 0](../benedict-phase0/README.md) contains interface proposals; [Phase 1](../../../../apps/api/src/modules/decisions/README.md) supplies pure rules and snapshot candidates. This plan sequences that work without defining another design system, calculator, ledger or AI adapter.

## 1. Outcome and scope

The target is a real server path: assigned officer recommendation → separate reviewer decision → immutable saved basis/explanation/terms → authorized member acknowledgment of that exact version. The backend must preserve historic decisions, reject stale/unauthorized commands and retain recoverable retry behavior.

Phase 2 implements persistence, service authorization, scoped read projections, exact document publication/acceptance bindings and the decision-side approved/accepted basis needed by later servicing. It does not implement staff/member screens, disbursement, payment posting, loan balances, amendments, a numeric 5C rubric, goal guidance or inference transport. Those remain their existing tasks/phases. Existing UI and current fictional demo behavior remain intact.

**No dependency on a finished Colab run or Earl's ledger:** use the existing deterministic/manual explanation path. Aaron's authoritative evidence/assessment interfaces and Robert's platform/contract decisions are necessary for connected activation; Earl's posting/reconciliation service is a later PAY-01 dependency. His review can identify downstream requirements without blocking an otherwise complete decision-only slice on accounting implementation.

## 2. Current basis and entry gates

Inspected `main`: `1776d9fdd5022e141a48ba1fda318636637e3d85`; shared executable contract 0.2.0. Phase 1 and Phase 0 files exist as **uncommitted local work** on `feat/benedict-dec-01-phase1`. They are not contained in that Git commit. A new branch from `main` alone will not contain them. Preserve and review/checkpoint those owned changes before branching or rebasing dependent implementation; do not copy them into a second rules engine or reset another worktree.

The inspected Phase 0 review log has no completed owner sign-offs. Its base is inspected, not owner-agreed. Recheck current files and acceptance evidence before implementation; [source_manifest.json](source_manifest.json) identifies this plan's reviewed inputs, not an agreed future base.

| Gate | Required before affected integration | Existing Phase 0 references |
| --- | --- | --- |
| Accepted foundation | Robert/Benedict record actual base, canonical contract version, actor/transaction/error semantics and Phase 1 compatibility | IF-01/02/06/07 |
| Current review basis | Aaron/Robert/Benedict agree authorized source/fact/assessment/offer reads, original horizon and an in-transaction freshness guard | IF-02/03/04 |
| Authority/conflicts | Resolve responsible record owner, case/product/action applicability, approved configuration, declaration/restriction history, limits, quorum, exceptions and validity | IF-05 |
| Review proof/document | Agree how a reviewer acknowledges the exact preview, how immutable terms bytes are published and how hashes avoid circular references | IF-06 |
| Member writes/events | Agree narrow member decision/acceptance access, replay ordering and atomic member-safe audit/outbox emission | IF-01/02/07 |
| Live institutional settings | Cooperative confirms operative versions, authority/conflict/exception/expiry and acknowledgment settings; fictional config stays labeled | IF-05/06/07 |

Pure repository/service candidates can proceed against explicit fictional adapters while a producer is unfinished. Such candidates remain unconnected and cannot establish real evidence, authorization, integration or operational policy. Never turn a pending interface into a guessed shared contract to keep coding.

## 3. File and merge ownership

| Path / responsibility | Owner and implementation rule |
| --- | --- |
| `apps/api/src/modules/decisions/` | Benedict: rules, service, persistence, member adapter, projections, module errors, document/basis lifecycle, owned migrations/tests and local specification |
| `docs/tasks/production/` Benedict brief/plans | Benedict handoff evidence; keep status in the central tracker. Avoid concurrent edits to the same brief across stacked PRs |
| `packages/contracts/`, OpenAPI and `packages/api-client/` | Robert: canonical schemas/ports/routes and generated outputs. Benedict supplies a concrete proposal; no hand-edited generated client |
| `apps/api/src/app.ts`, shared dependency/provider/capability registration | Robert. Benedict exports public services and supplies registration instructions |
| `apps/api/src/platform/` and central migration registry | Robert. Reuse existing coordinators/idempotency and propose required owner-safe helpers |
| `apps/api/src/modules/applications/` | Robert: application read/lock/status/revision boundary. Benedict cannot directly update `applications.applications` or its history |
| Evidence/credit modules and `packages/finance/` | Aaron: source/fact/verification lifecycle, current checked assessments/offers/schedules, financial calculations and readiness |
| `apps/api/src/modules/accounting/`, monitoring/support and evaluation directories | Earl. Phase 2 does not change these files/tables or introduce a posting dependency |
| Staff decision feature / all member-phone screens | Benedict later owns the assigned staff feature; Robert owns member UI/facade and shared route/state wiring. No screen implementation in this backend phase |
| `design.md`, tokens/shared controls, canonical fixtures/types, dependencies/configuration and `Assignment.md` | Existing shared ownership remains Robert's; proposals precede changes. No new styling or top-level configuration is needed for this phase |

Proposed decision-owned files, with names finalized during implementation: `decisions.service.ts`, `decisions.repository.ts`, `member-decisions.adapter.ts`, `decision-projections.ts`, `decision-errors.ts`, `document-publication.ts`, module `migrations/` and focused service/database/permission/concurrency tests. Reuse `rules.ts` and `context.ts`; adapt their agreed inputs once rather than creating parallel validators. Keep public DTO definitions in the accepted shared package, with module-only persistence shapes local.

## 4. Proposed persistence model

These are logical decision-owned records, not migration SQL or approved canonical names. Agree the record/permission boundaries before creating files. Use composite organization/application/member bindings and existing canonical IDs, centavos, versions, dates and UTC instants.

| Logical record | Stored basis and invariants |
| --- | --- |
| Decision stream / current pointers | Organization/branch/application/member, aggregate revision, current recommendation/decision/document/acceptance references. Historical rows remain immutable; guarded pointer changes are audited |
| Recommendations | Exact assessment/input/offer version, preparer, reason, material-basis hash and recorded instant. Replacement creates a new row rather than rewriting the earlier recommendation |
| Decisions / snapshots | Explicit human outcome, reviewer, recommendation and checked-basis references, rationale/departure/exceptions, snapshot format/serialization version, canonical JSON and SHA-256. No runtime update/delete of saved content |
| Approval/conflict history | Approved authority/configuration and declaration/restriction/resolution references, applicability/version/actor/date. Own only records agreed to belong to decisions; do not replicate identity membership or invent a conflict resolver |
| Review artifacts / document versions | Reviewer-visible normalized request/basis/explanation binding; immutable terms bytes reference, document version/checksum, publication state, expiry and authorized disclosure. Exact published bytes and the decision snapshot are distinct artifacts |
| Acceptances | Organization/member/link, exact decision/document/checksum and snapshot reference, literal acknowledgment plus recorded instant/Manila date and provenance. At most one effective acknowledgment per member/exact approved terms version |
| Decision events | Use the accepted platform/member-safe audit/outbox boundary. Do not create another queue or duplicate shared idempotency tables |

Persist immutable historical basis data as needed to reproduce the reviewed result without fetching mutable current values. Preserve exact authorized source/file versions and confirmation/verification status; retain originals under the source owner's approved access/retention rules. A snapshot is not justification to copy every personal file permanently. Historical reads do not recalculate finance, regenerate AI prose or overwrite an old checksum with a new one.

Use append-only module migrations with explicit constraints, indexes and runtime grants. Applied migrations are checksum-protected and never edited. Runtime roles must not be table owners, superusers or BYPASSRLS. Enforce organization/branch/member scope with RLS and application permissions; protect immutable rows and references with database controls. If narrow module write functions are required, scope/revoke/grant them explicitly and review them with Robert; do not introduce an unrestricted SECURITY DEFINER escape hatch.

## 5. Work packages in implementation order

### P2-A — agree contracts and checkpoint dependencies

1. Resolve the affected entry gates and record accepted base/version/owners. Separate Phase 2 prerequisites from later PAY-01/5C/goal work so accounting or model extensions do not become accidental gates.
2. Review the Phase 1 local proposals with Robert/Aaron. Agree exact data producers, source/version semantics, authority/conflict ownership and error mapping. Update one owned adapter/rule set after agreement; do not export the whole `ReviewContext` as a browser request.
3. Specify staff workspace/history/brief reads, current assessment/basis access, exact preview proof, document publication/download and member acceptance. New names/fields remain proposals until Robert publishes them.
4. Define expected-version resources for each request: application aggregate version is not assessment-input version, document UUID or decision pointer. Existing `DecisionCreate` contains a reviewed boolean but does not by itself bind a person to a particular server preview.
5. Checkpoint Phase 1 as a separate reviewed change; create the Phase 2 task branch from the actual accepted dependency commit(s). Record stacked PR dependencies explicitly if prerequisites are not yet merged. Do not silently claim a local uncommitted file is part of the foundation commit.

**Deliverable:** bounded interface/permission/preview/event proposal with accepted or explicitly pending entries. **Gate:** no connected command implementation invents a missing producer or alters a shared file.

### P2-B — implement owned migrations and repository

1. Add decision-owned migration files in dependency order for the agreed records. Reference existing application/member/identity keys without changing their tables or applied migrations.
2. Enforce scoped record relationships, current-pointer/revision consistency, immutable history, constrained human outcomes, hash/document references and logical acceptance uniqueness. Unknown values stay explicit; SQL defaults do not supply unapproved authority or acceptance.
3. Implement repository methods taking the supplied staff/member transaction. Do not open a new connection, begin/commit another transaction or use migration credentials from runtime code.
4. Add scoped immutable-history reads, current pointer loads/locks and typed safe-number/date conversion. Keep mutation of module pointers/revisions separate from changes to immutable record content.
5. Test as actual non-owner runtime roles: insert only through intended paths; reject cross-organization/branch/member access, update/delete of immutable rows and altered references. Privileged fixture setup is not authorization evidence.
6. Submit migration registration to Robert. An isolated module test may temporarily register its own directory in memory using the existing runner, following Earl's candidate pattern; do not fork the migration system or commit a platform registry edit.

**Deliverable:** decision-owned persistence candidate and real PostgreSQL integrity/permission tests. **Gate:** migrations are append-only and repeatable; operations preserve history and owner boundaries.

### P2-C — implement recommendation service and current-basis guard

1. Build the public service on the existing `UnitOfWork`; establish actor/IDs/time on the server and parse the existing request schema. The platform rechecks current session/membership through commit.
2. After scoped resource access, claim/replay the command with a canonical hash that binds operation, application ID, normalized request and expected version. Use the existing command helper; do not make another cache/idempotency implementation.
3. For a new attempt, use Robert's application boundary and Aaron's evidence/credit boundary to obtain current assignment/input/policy/offer/source/fact bindings and the original checked horizon within the agreed concurrency protocol.
4. Call `prepareRecommendation`, persist its candidate, then change application status/revision/history through Robert's service on the same transaction. Preserve assessment-input version when only recommendation/workflow metadata changes, according to the agreed rule.
5. Append audit/outbox and saved command result atomically. Concurrent or repeated keys must produce one recommendation effect; changed request under the same key is a conflict.
6. Test current versus stale input, incomplete assessment, unavailable offer, wrong assignment, conflict restriction and rollback after each write boundary. Use explicit test doubles only for unimplemented producers; label those tests as service-contract candidates.

**Deliverable:** persistent recommendation service. **Gate:** real owner-provided basis/guard required before enabling the connected route.

### P2-D — implement reviewed preview, terms and decision recording

1. Produce a staff-only review artifact from authorized checked inputs and the normalized human decision request: outcome/offer, rationale, departure, exceptions, next review date and explanation. Use deterministic/manual text initially. Slow rendering and any future AI calls stay outside long-held command transactions.
2. Bind the actual preview to the actor, application, request content, material basis hash, terms version/checksum, explanation version/origin and validity. Agree a server-held artifact reference or equivalently reviewed proof with Robert. A browser `explanationReviewed: true` alone cannot identify what was reviewed. Edits to the request or basis require a new review artifact.
3. Stage exact immutable document bytes privately and compute their checksum before they are referenced by approval. Avoid a circular hash: the terms document must not require embedding the final decision-snapshot hash when that snapshot itself contains the document checksum. Version the two artifacts and their linkage explicitly.
4. On a new decision command, recheck actor, expected aggregate/current pointer, current source/assessment/offer/policy/authority/conflict bindings and the preview proof under the agreed transaction. Invoke `prepareDecision`; reject self-review, unsupported quorum, unauthorized exceptions and stale review. Clarification remains available to an otherwise authorized reviewer with incomplete evidence.
5. Persist the immutable snapshot, exact document metadata and current-decision pointer, then use Robert's application transition/revision boundary and the accepted audit/outbox helper in the same commit. Creation of an approved decision does not create a loan or move money.
6. Publish the staged document reference only after successful DB commit/authorized publication. Filesystem/object storage is not part of the PostgreSQL transaction: retain an unexposed staged/orphan state and an authorized retention/cleanup path on rollback. A staged file is not a published/accepted contract.
7. Expose scoped history/brief/document reads through agreed projections. Check stored integrity and return saved content; never repair a mismatch by rehashing a changed record or regenerating an old explanation.
8. Test exact preview/request mismatches, stale basis, source-version races, malformed/duplicate exception inputs, failed publication/commit, immutable history and repeat/lost-response behavior.

**Deliverable:** durable human decision and exact saved review/terms artifacts. **Gate:** a reviewer acknowledgment demonstrably binds the saved content; the document publication lifecycle does not expose a rolled-back approval.

### P2-E — implement direct member acceptance safely

1. Supply decision reads and `accept` through `MemberDomainPorts` using the existing member transaction/context. Do not create staff branches, cast the member into a staff actor or start a nested staff unit of work.
2. Recheck own-member linkage/resource access on every call. Then use the existing member command primitive with an operation/resource/body/version-bound request hash so a committed identical retry can replay its original receipt.
3. **Agree replay ordering with Robert:** the current facade checks current approved terms before delegating acceptance. A previously committed retry must not be falsely rejected solely because its aggregate version, expiry or current terms changed afterward. Current authentication/revocation and scoped access still apply before replay; replays never grant new access. New commands must perform every current-state check.
4. For a new acknowledgment, load/guard current decision/application/source/basis and the published terms bytes/version/checksum. Call `prepareMemberAcceptance`; record server time, linked member, original document/snapshot and acknowledgment. Expiry is evaluated on the agreed Asia/Manila calendar basis.
5. Enforce logical uniqueness beyond transport keys: another key/link cannot create a second effective acknowledgment of the same member/terms. Agree whether such a request returns the existing permitted reference or a stable already-recorded conflict; never create a second business event.
6. Commit acceptance, any agreed owner revision/current-pointer effect, member-safe audit/outbox event and idempotent result atomically. Current `platform.audit_events/outbox` are staff-only in member context; do not call staff `recordEvent` with a fake actor or broaden general grants. Robert must provide an accepted narrow member-safe event boundary or durable portal-event bridge on the same transaction. Use existing infrastructure, not a second queue.
7. Provide only member-safe decision/explanation/terms fields. The existing member explanation has canonical size/schema limits; compose a reviewed compatible summary rather than silently truncating full terms or leaking staff notes. The saved complete brief remains a separately authorized artifact.
8. Keep staff-assisted acceptance unavailable until actual member provenance/permissions are separately specified; a staff signature is not the member's acknowledgment.

**Deliverable:** persisted own-record acknowledgment of exact approved terms. **Gate:** no extra staff/ledger access, duplicate acceptance, stale new acknowledgment or false rejection of a committed identical retry.

### P2-F — publish the decision-side release basis and errors

1. Expose an agreed read/guard for current approved/accepted/unexpired decision terms and unresolved review holds, using authorized transaction context. Treat it as a decision-side basis, not a complete servicing authorization.
2. The current `ReleaseAuthorizationPort` takes loan/command IDs. Until PAY-01 supplies the actual loan-to-decision mapping and command/separation/first-release guards, do not fake a loan, create a second loan registry or return unconditional success. Full release authorization remains its later integration.
3. Centralize mapping from `DecisionRuleError`/schema/storage errors to the existing API error envelope. Preserve generic authorization/not-found behavior; 428 missing precondition, 412 stale aggregate version and 409 incompatible state/idempotency conflict retain their meanings. Exact new public codes are agreed with Robert.
4. Log IDs/stable codes/correlation references only. Never log snapshot bodies, source excerpts, credentials, acknowledgment contents or raw database/provider exceptions.

**Deliverable:** scoped decision projections/release-basis handoff and recoverable typed errors. **Gate:** this read cannot independently approve a transfer or hide an unavailable servicing module.

### P2-G — verify, integrate and hand off

1. Complete the [acceptance test matrix](acceptance_tests.csv). Retain the 87 Phase 1 rule cases as the prior baseline; rerun their actual current count rather than hard-coding a future total. Existing Phase 1 results are not DB/endpoint authorization proof.
2. Run targeted repository/service, real runtime-role/RLS and two-connection concurrency tests. Include actual Robert/Aaron projections for connected acceptance; passing only fake producer tests leaves the affected slice a candidate.
3. Run `npm run check`, then `npm run test:e2e` sequentially against a dedicated guarded fictional `agap_test` database. Use isolated Compose/project/ports when other worktrees are active; do not reset another developer's database. Record actual Node/npm/browser versions and any environment-only failures/remediation.
4. Robert applies accepted migration/provider/route/client/capability registration through the integration PR. Keep each unavailable operation honest until its implementation path passes. Review whether the module-level capability can accurately describe a partial slice before switching it.
5. Preserve centralized theme and current routes. This backend phase supplies data/errors/freshness for existing screen patterns; later Phase 3 handles staff decision UI. UI changes in any integration PR require the relevant design/spec update and screenshots through the proper owner.
6. Update the owned module specification/verification with task ID, actual dependency base and contract versions, migration list, command/read coverage, test outputs, privacy/retention limitations and receiving owners. Robert updates `Assignment.md` from evidence; no parallel status tracker.
7. Use `graft` if available and run `graphify update .` after code changes if available; record actual availability honestly. Obtain user authorization before any merge. A passing demo is not institutional/operational release certification.

**Deliverable:** review-ready decision backend slice and separately evidenced connected integration. **Gate:** authorization, history, exact-content review, transaction atomicity and retries work under real runtime boundaries.

## 6. Concurrency and replay rules that must be agreed

- Existing coordinators start `BEGIN` and lock current identity; that does not by itself prevent source/application/policy races. Agree a protocol shared by all writers of affected bindings, including application/current-decision pointer locks and owner-provided source/policy guards. Revalidate applicable versions before commit. A matching hash, delayed outbox invalidation or isolation-level label is not sufficient proof.
- Benedict accesses another owner's records only through its accepted transaction-aware public boundary. Robert/Aaron agree the application/evidence/credit lock/guard order; do not improvise cross-module SQL locks. Publishing a new immutable policy and rebinding an application must have explicit material-change semantics.
- Staff command replay occurs after current identity/resource authorization but before applying new-attempt stale-version or business-validity rules. The hashed request must include the resource and original expected version. Failed transactions must not leave an incomplete committed command claim.
- Member replay follows the same principle with member linkage, its own command store and no staff-context escalation. Do not replay another member/link's result or bypass revocation using a cached response.
- Phase 2 does not acquire accounting period/loan/financial-command locks. PAY-01 later obeys the established financial lock order and integrates these decision checks without introducing a conflicting lock cycle.

## 7. Merge sequence and conflict prevention

| Sequence | Change / owner | Merge-conflict control |
| --- | --- | --- |
| 1 | Review/checkpoint Phase 1 and scoped Phase 0 agreements / Benedict with consuming owners | Preserve local work; record actual commits. A branch label is not a dependency commit |
| 2 | Required canonical ports/schema/error/preview/member-event boundary / Robert, reviewed by Aaron/Benedict | One writer for shared files; generate client/OpenAPI together. Publish exact accepted revision, not an invented version in this plan |
| 3 | Authoritative source/assessment guards and application-state helpers / Aaron and Robert in their own paths | Explicit producer PRs/base dependencies; consumers do not write their tables or helpers |
| 4 | Decision-owned migrations/repository and service adapters / Benedict | Focused DEC-01 PRs under `modules/decisions/`; no platform registration or unrelated UI/model changes |
| 5 | Member/document integration and real race/permission evidence / respective owners | Benedict exports domain services; Robert changes facade/shared wiring. Review replay ordering and event grants together |
| 6 | Migration/provider/route/capability registration and combined checks / Robert with Benedict | Re-run relevant checks on the actual combined base; keep unavailable defaults for unfinished operations |

Some producer PRs can develop in parallel after a written interface agreement; merge order still follows dependencies. If a prerequisite is unmerged, a stacked PR names its parent/base and is rebased only by its owner after the prerequisite lands. Do not cherry-pick another owner's shared-file edits into Benedict's branch or resolve their contract changes unilaterally.

Keep migrations additive with module-qualified identity. Avoid shared dependency/lockfile edits. Keep a single owner of brief/status edits within each handoff; use this plan and focused verification files to reduce collisions. Rebase only the owned task branch after preserving its work; never reset shared/main or another worker's worktree. All merges retain the user's authorization requirement.

## 8. Work that can progress before producer implementation

Benedict can prepare repository/migration designs, module-local persistence candidates, service adapters against the agreed types, deterministic document/preview tests and DB integrity tests using labeled fictional records. Mocked evidence/authority inputs may demonstrate a contract candidate; they do not prove connected readiness. Separate these from the tests that require real current-assessment/source/app-state/member-event services.

Blocking activation gaps stay explicit: current-basis concurrency guards, approved authority/conflict applicability, exact preview proof/publication and member-safe event/replay behavior. Do not block DEC-01 on unrelated accounting implementation, a trained model, numeric 5C work, all stage 2 amendments or new UI design. Do not silently bypass its actual prerequisites either.

## 9. Definition of Phase 2 completion

The accepted slice has persistent recommendation and approve/decline/clarification paths; exact historical snapshots/explanations/terms; own-member exact-version acceptance; current authorization/version/source/authority checks; runtime-role isolation; idempotent retry/uniqueness; atomic status/revision/audit/event effects; and passing focused/full tests on the agreed integrated base. Missing cooperative settings prevent the affected operational decision path instead of supplying defaults. No loan, money transfer or accounting result is claimed by this phase.

This plan changes documentation only. Planning verification and exact inspected-source fingerprints are in [VERIFICATION.md](VERIFICATION.md) and [source_manifest.json](source_manifest.json). It does not update the frozen Phase 0 source inventory or fabricate reviewer acceptance.
