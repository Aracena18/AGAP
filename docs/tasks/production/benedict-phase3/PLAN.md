# DEC-01 Phase 3 — staff decision workspace and saved brief

**Prepared:** 2 November 2026, Asia/Manila. **Accountable owner:** Benedict. **Scope:** evaluation and implementation planning only. No application code, schema, route, configuration, UI or task status changes are implemented by this package.

The [product](../../../AGAP_Product_Solution.md), [architecture](../../../AGAP_Production_Architecture.md), [delivery boundaries](../../../AGAP_Delivery_Plan.md), [official Benedict brief](../03-decisions-servicing.md), [frontend specification](../../../AGAP_Frontend_Spec.md), [design.md](../../../../design.md) and [Assignment.md](../../../../Assignment.md#benedict) govern this plan. The earlier freeze supplies [independent fictional calculation oracles](../../../AGAP_Product_Freeze.md#5-the-fictional-demonstration), not current production scope. This is a technical implementation sequence under the existing design system, not another visual guide or task tracker.

## 1. Outcome and evaluated starting point

Phase 3 makes the **staff** decision path usable: inspect the current checked basis → record an accountable officer recommendation → a separate authorized reviewer prepares and reviews the exact explanation/terms → record the human decision → inspect and print the selected saved historical brief. Member acknowledgment is displayed from the domain; Robert owns its member-facing interaction.

The inspected dependency is Phase 2 commit `036bf58`, on `feat/benedict-dec-01-phase2`, following Phase 1 checkpoint `d24c74717adf10f7cedbf682f93cb40fe661c0f1`. Main remains `1776d9fdd5022e141a48ba1fda318636637e3d85`. These are inspected commits, **not an owner-agreed integration base**. Shared executable contracts are 0.2.0. The [Phase 2 handoff](../benedict-phase2/IMPLEMENTATION.md) records 27 new backend tests, 165 frontend tests, 316 platform tests and 34 browser tests passing at that checkpoint. They are historical evidence, not Phase 3 test results or connected readiness.

| Inspected implementation | Consequence for Phase 3 |
| --- | --- |
| `src/features/decision/DecisionPage.tsx` uses `CaseRecord`, `useWorkspace`, `assessCase`, browser `recordDecision` and `saveCase` | Preserve the fictional review route; build a separate staff composition. Never adapt a server application into an editable whole browser case |
| Existing default decision page already has form, template, historical brief and print CSS | Reuse its established composition and shared styles; keep demo labels/behavior truthful. It is a layout/reference baseline, not staff authorization |
| Phase 2 service exports recommendation, preview, record, saved snapshot, review basis and member operations | Reuse those services; do not create a second approval engine. Production adapters, HTTP registration and migrations remain pending |
| Generated client has `recommendOffer` and `recordDecision`; their operations are `implemented: false` | Client method existence does not establish a usable service. Default decisions capability remains `contract_only` |
| No canonical staff decision workspace/history/brief/preview APIs; `DecisionCreate` has no preview reference | Robert must review/publish these boundaries before real client integration. A checkbox alone cannot bind the Phase 2 preview |
| `saved` requires a known decision ID; repository has no public paginated history service | Add a decision-owned scoped history/read projection after contract review; do not assume history discovery is implemented |
| Phase 2 `saved` returns a full staff snapshot; only member-context document retrieval is currently exported | Provide distinct staff evidence, member-safe saved brief and authorized staff terms reads. Never cast a staff principal to member to download terms |
| `StaffProvider`, `useCommand`, one unsaved-change provider and generated transport exist | Consume them without editing shared ownership. `useResource` lives in Robert's member feature, so request a shared export or pass a resource interface; do not copy/import a member-internal hook as a new shared standard |
| Identity return-path validation accepts only current staff pages; StaffApp has no decision route | Robert owns a new route, list entry, page title and tested return-path allowlist change. An illustrative route in this plan is not registered |
| Application assignment is allowed only in draft/submitted/evidence_review/clarification | A conflict at recommended/decision-recorded state cannot be solved by blindly invoking existing assignment. Owner-approved recusal/reopen/reassignment semantics are required |
| Phase 1 final decision requires recommended state; browser UI allows a further fictional decision and follow-up save | Do not copy those controls into staff code without a real owner transition/command. Historical viewing does not reopen a case |

The original nine-phase definition was also inspected in Benedict's separate, uncommitted planning worktree. Its Phase 3 is staff decision experience/saved brief. The external source fingerprint is recorded in [source_manifest.json](source_manifest.json); this package does not copy, modify or publish that other worktree's files.

## 2. Scope and readiness judgment

**UI composition, state evaluation and tests against explicitly fictional proposed projections can start independently. Connected completion cannot proceed solely from the Phase 2 checkpoint.** It requires accepted canonical reads/preview proof, real authorized Robert/Aaron adapters, registration and a coherent version/freshness protocol.

Include the officer's compact recommendation action in Benedict's staff feature when no connected comparison handoff is available. It selects only an already checked permitted offer and reason; it does not recreate Aaron's comparison screen or calculation. Agree one recommendation entry point with Aaron/Robert so two screens do not become competing workflows.

Keep deterministic templates fully usable with inference disabled. No Colab artifact, new AI provider, ledger implementation or numeric 5C rubric is a prerequisite. Aaron owns the later 5C staff panel; QWN-03 handoff is additional scope, not an excuse to invent scores here.

Exclude member-phone screens/facade, staff-assisted acceptance, conflict self-clearance, new quorum administration, money release, loan creation, payment posting, servicing amendments and new monitoring records. Show the saved review date; retain the existing fictional follow-up feature. Connected follow-up editing remains unavailable until Earl/Robert provide an accepted command; it is not a hidden DEC-01 dependency or a local `saveCase` fallback.

## 3. Exclusive file boundaries

| Owner | Allowed work / receiving handoff | Conflict prevention |
| --- | --- | --- |
| Benedict | `src/features/decision/` staff composition/components/CSS Modules/tests; assigned decision domain modules only when needed; `apps/api/src/modules/decisions/` missing read/projection services/tests; this planning/handoff directory | Preserve default demo `DecisionPage({record})`; export the new staff entry point separately. Do not rewrite pure rule or applied migration files as part of a UI refactor |
| Robert | `src/app/`, staff intake links, `src/features/access/`, member portal, shared controls/styles/formatters, contracts/client/OpenAPI, identity return routes, platform/provider/capability/migration registration, configuration and `Assignment.md` | Benedict proposes exact needs; Robert supplies the canonical/shared patch and publishes its commit before dependent wiring |
| Aaron | Evidence/source lifecycle and navigation, comparison/credit panel, current assessment/offers, finance, one AI adapter | Consume public projections and reviewed navigation targets. No edits to his screen, sources, tables, calculator or provider client |
| Earl | Monitoring/follow-up/support, accounting, independent evaluation | Read only agreed domain projections. No new monitoring/ledger writes or copied evaluation corpus |
| Cooperative/policy owners | Effective authority/conflict/exception/expiry and disclosures | Unconfirmed settings stay unavailable; clearly labeled fictional settings do not activate real policy |

Proposed new feature files are `StaffDecisionPage.tsx`, `StaffDecisionPage.test.tsx`, `DecisionWorkspace.tsx`, `DecisionForm.tsx`, `SavedDecisionBrief.tsx` and `StaffDecisionPage.module.css` inside `src/features/decision/`. Final names follow actual component needs; avoid splitting every field into a component. Prefer colocated interaction tests. For browser coverage, propose a distinct `tests/decision-staff.spec.ts` and task-local fixture helper to Robert because browser setup/global configuration are shared; do not edit the existing common fixture/server setup unilaterally.

No new framework, dependency, state store, font, palette, icon package or top-level configuration is justified. Use existing React/TypeScript/Vite/CSS Modules, shared controls, tokens and Node 24/npm 11.9.0 toolchain. Any genuinely necessary shared change is a Robert-owned proposal first.

## 4. Contract handoff before connected work

Names below describe **proposed operations/data**, not accepted DTOs or URLs. Robert owns canonical schemas/generated client/OpenAPI. Reuse canonical `Application`, `Assessment`, `Offer`, `Scenario`, request and error types where suitable. Do not import backend persistence/test types into the browser or create an alternate public schema in a feature file.

| Proposal | Minimum reviewed contract | Producer / blocker |
| --- | --- | --- |
| Staff decision workspace | Scoped application ID/concurrency version/input version; current recommendation ID and preparer; immutable assessment/offer/policy/source references; original horizon and checked figures; permissible actions plus explicit blocking reasons, authority/conflict state and as-of/version bindings | Benedict composes from actual Robert/Aaron boundaries; server recalculates permissions at command time |
| Prepare exact preview | Normalize canonical decision fields without acknowledgment; supplied expected application version and idempotency key; response identifies preview/reserved decision, reviewer binding, basis hash, exact explanation/terms and expiry | Adapt existing Phase 2 service, including its write/audit behavior; a preview is not a successful decision |
| Record with proof | Existing decision input plus agreed server-held preview reference; expected application version, stable key and CSRF; receipt/saved decision identity | Robert must revise the public operation coherently; do not smuggle an unknown field into strict 0.2.0 `DecisionCreate` or hand-edit the generated client |
| Scoped history and selected brief | Cursor-bounded authorized summary list; stable decision ID/outcome/recorded instant; selected immutable version, stored explanation, saved checked figures/horizon/source dates, snapshot/document identity and clearly separate current-review state | Benedict implements decision-owned read service after schema agreement; absence of a selected record is not permission to substitute latest |
| Staff source inspection | Authorized original source ID/version/title/date, verification state and permitted inspect/download target | Aaron supplies the actual lifecycle/access path; no arbitrary current-source substitution, public filesystem URL or member endpoint workaround |
| Staff saved terms | Authorized staff read of the exact persisted document bytes/version/checksum; safe download headers/content type and integrity failure behavior | Benedict supplies decision-owned read; Robert registers staff endpoint/client binary handling. Current member download is not staff authorization |
| Read versus printable disclosure | Distinct staff-only evidence/details and a reviewed member-safe brief projection; provenance limitations and missing metadata explicit | Benedict projects saved data; Robert reviews schema/security. Resolve which concerns/departure/exception text is appropriate to print/share before exposing it |
| Application/review recovery | Accepted transition path after material changes, return/clarification or conflict; no arbitrary next-status patch | Robert with Aaron/Benedict. The existing service does not permit reassigning a recommended application or another decision immediately after recording |

Agree exact read consistency: application/input/policy/source/recommendation/offer bindings in one workspace must describe the same reviewed basis. A combined transaction-aware read is preferable to stitching unrelated latest HTTP responses. Loading and action availability are version-bound; stale or incomplete projections must not look ready. Frontend checks improve feedback and never replace commit-time guards.

Resolve public error codes/field paths, pagination, source-retention behavior, staff name availability, current versus historical scope and capability granularity before implementation depends on them. Phase 2 snapshots preserve reviewer ID/roles rather than an immutable reviewer display name. Do not derive a historical name from today's staff directory and present it as saved; show the saved identifier or separately labeled current directory name unless an accepted additive capture is implemented for future records.

## 5. Implementation work packages

### P3-A — confirm base, scope and contracts

1. Recheck main, Phase 2 commit, owner review log and central tracker; preserve all local worktrees/training files. Record the actual accepted base and revision before connected integration. The 47 pending Phase 0 entries are not accepted by this plan.
2. Review section 4 with Robert/Aaron. Agree one officer recommendation entry point, scoped read/action semantics, preview proof, allowed recovery transitions, source links and printable disclosure. Record unresolved decisions in owned evidence, not chat alone.
3. Identify reusable shared resource/navigation exports. Agree the new route (for example `/staff/applications/:id/decision`, **proposal only**), login-return handling and read/command capability gates with Robert.
4. Define fictional UI scenarios using canonical fixture builders/oracles where applicable. New server-projection examples remain task-local and labeled simulated; no second `src/demo/cases.ts`, institutional policy or Earl holdout copy.

**Deliverable:** accepted contract/base dependency record or explicitly pending proposals, file ownership map and scenario checklist. **Gate:** enough agreed types for the affected implementation; no guessed runtime adapter or silent scope expansion.

### P3-B — supply missing scoped read/projection services

1. In Benedict's API module, implement the accepted current-workspace/history/saved-safe-brief/staff-document projections using real producer ports and current staff unit of work. Leave missing upstreams unavailable.
2. Verify org/branch/application/role access on every list/read/download. History is read-only for authorized auditors; do not assume cashier/accountant/administrator roles grant decision access. Explicit UI hints use the same server-supported scope.
3. Reuse `saved` checksum verification and exact document storage. Project historic values from saved records; never call the current calculator or text generator to repair a missing historical field.
4. Add focused tests for scoped history pagination, selected-ID correctness, redaction, invalid references, integrity/unavailable source handling and application/source consistency under the agreed guards. Use additive migrations only if a reviewed new persistence need exists; a screen does not justify rewriting applied SQL.
5. Hand Robert service exports and canonical endpoint/client/registration requirements. Test doubles prove only the consumer candidate until actual producers are wired.

**Deliverable:** decision-owned read services and evidence. **Gate:** authorized coherent reads, member-safe disclosure and exact historical identity; shared registration remains Robert's work.

### P3-C — compose the read-only staff workspace

1. Create a separate staff entry using real `StaffProvider`/generated client boundaries or an injected view interface agreed with Robert. Keep existing demo props/route, browser storage, role controls and tests intact.
2. Follow the decision blueprint in `design.md`: current recommendation/assessment, reviewer form, preview, recorded result, selected saved brief/history and secondary review-date information. Use the shared case/header/navigation composition supplied by Robert; avoid a second global header.
3. Present principal, net proceeds, separately paid fees, term/schedule, full repayment/financing cost, monthly remaining and lowest dated balance with original horizon. Read integers in centavos directly; do not divide before passing `Money`. Guard unavailable values before rendering numeric controls. Show zero as zero and negative balances with their sign.
4. Keep missing/conflicting/stale/verification states distinct. Positive monthly remaining cannot visually hide a dated shortage. A saved decision outcome, acceptance state and release status are separate; approval is not an active loan.
5. Show preparer/reviewer identity and only the permitted conflict restriction details. A restriction offers an honest next step through the owner's accepted workflow; no local self-clear/reassign button and no claim that a role switch fixes it.

**Deliverable:** usable read-only composition with labeled simulated rendering tests where needed. **Gate:** shared appearance, no finance recomputation, no data/authority fabricated to populate a view.

### P3-D — connect recommendation and exact reviewer preview/record

1. Assigned officers submit canonical recommendation assessment/input/offer references and a required reason against the workspace application version. A confirmed receipt triggers a fresh coherent read; never infer approval from the recommendation.
2. Separate reviewers select an outcome explicitly (no new approval default), permitted offer when needed, rationale, applicable departure reason, authorized per-check exception reasons and review date. Return-for-clarification requires its human reason and remains possible with incomplete evidence when server authority allows it. Final approve/decline remain blocked by unmet prerequisites.
3. Show non-overridable or unauthorized failed checks as blocked rather than editable exception opportunities. Never use a single override-all checkbox. An unavailable validity/quorum/authority setting is not a default permission.
4. Prepare the exact preview through the accepted generated operation. Display its stored explanation and terms with **Deterministic template** origin and a clear not-recorded state. The reviewed checkbox is enabled only for the current valid preview and is never set automatically.
5. Changing outcome, offer, rationale, departure, exceptions, review date or current basis clears acknowledgment and invalidates the preview for **new attempts**. New source/input/policy/assignment/actor changes require an authoritative refresh; expiry prevents a fresh recording and offers a new preview. The server remains authoritative on time and all guards.
6. Record using the exact normalized request, expected version, CSRF token and preview proof, with the current command helper. Do not send browser actor IDs, authority, snapshots, checked totals or a whole case as the command.
7. On confirmed save, announce **Decision recorded** with its actual outcome, select the returned decision ID and load the saved brief. A brief-load failure after confirmed recording says the decision was recorded but the brief is unavailable; it must not resubmit the decision or report recording failure.
8. Treat all command stages as one feature-level pending boundary: separate preview/recommendation/record hooks must not allow overlapping commands. Preserve one pending original sender/envelope/key. Missing registration/known 501 produces unavailable, never browser fallback success.

**Deliverable:** owned form/controller candidate and interaction tests. **Gate:** exact reviewed content reaches Phase 2; no self-approval, speculative success or write without current proof.

### P3-E — complete selected history, safe brief and printing

1. List authorized decision summaries with stable ordering/pagination; explicitly select by application/decision ID. Keep current readiness separate from historical outcome. A missing/forbidden historical record shows that state, with print disabled; never silently fall back to the latest record.
2. Use immutable saved explanation/figures/source dates. Missing historical fields remain unavailable; do not regenerate old prose or backfill reviewer/source names from mutable present-day records. Retention-unavailable sources still retain permitted saved citation metadata and an honest unavailable link state.
3. Build a **member-safe printable article** distinct from staff evidence/conflict/authority notes. The backend projection must omit staff-only data; CSS hiding alone is insufficient. Preserve considered option/full costs, horizon, permitted assumptions/concerns, decision/reason, saved reviewer identity, dates and next step. Resolve approved disclosure of exceptions/departure wording explicitly.
4. Show an approved decision's exact persisted UTF-8 terms separately with its document version/checksum. The printable HTML/PDF is a view of saved content, **not the original accepted document bytes**. Print must not overwrite, regenerate or relabel the SHA-256 of the accepted document. Decline/clarification can have a printable decision brief with no acceptance document.
5. Reuse A4/16mm shared print rules and feature CSS Modules. Print only the fully loaded selected article; hide navigation/forms/staff details/follow-up and loading/old articles. Switching selection/app/session immediately disables print and clears the old printable DOM.
6. Test the generated PDF's selected identity, original amounts, `₱`/`−`, long names, multi-page schedule/source dates and absence of staff-only notes. Do not add a PDF library solely for printing. Any needed extraction tool goes through Robert; meaningful manual PDF inspection remains recorded evidence when automated extraction is unavailable.

**Deliverable:** saved/history/print view and content/privacy evidence. **Gate:** historical content remains unchanged after current inputs change, and the PDF cannot leak a hidden staff disclosure.

### P3-F — prove freshness, uncertain retry and access recovery

1. Key resource state by application, selected decision and relevant version/basis identity. Cancel superseded loads and ignore late responses even when cancellation is ignored. Clear previous private content immediately on app/session/selection changes.
2. Same-record refresh preserves unrelated unsent human text where possible, but removes new-attempt action readiness and acknowledgment until current bindings are checked. Distinguish retaining a draft from retaining stale authoritative figures. Do not preserve old ready badges during refresh.
3. Reuse the one router-level unsaved-change registry for dirty **or uncertain** state. Do not add a second `useBlocker`. Warn for Back/Forward, route changes, reload/close and sign-out; no client financial/draft payload or retry token goes into localStorage.
4. Reuse `useCommand` with an envelope/sender that captures application, normalized body, **original expected version and preview ID**, key and correct session request context. Lock edits and new attempts while saving or uncertain. Retry only by explicit action using the original sender/body/key; never auto-submit on login, timer, focus or refresh.
5. An uncertain committed decision may be retried after its preview expires or the current basis changes. Do not clear its original proof or run new-attempt preview validation before the retained retry. Current authentication/resource access still applies. For an uncertain preview command, recover that same preview attempt before starting another.
6. Confirmed 409/412/422 allows correction/refresh according to the returned code; 428 asks for a fresh record version; known 501 means no execution. Network/5xx/malformed successful response stays uncertain. 401 hides private content and requires sign-in; 403/404 removes denied content/actions rather than retaining it behind a notice. No stale CSRF/old-session write is automatically replayed after sign-in.
7. Reload loses in-memory retry details in the current shared helper. Explain that limitation. Reconcile by authorized saved history/reserved decision ID or an owner-approved command-status read before permitting a potentially duplicate new action; a racing 404 alone does not prove the original request failed. Do not promise durable retry recovery unless Robert implements it.

**Deliverable:** lifecycle/error recovery tests. **Gate:** no wrong-record display, duplicate new write after uncertainty, stale preview acknowledgment or access after revocation.

### P3-G — integrate through the owning team members

1. Robert lands accepted shared contracts, generated client/OpenAPI and resource exports first. Resolve Phase 2 authoritative adapters, migration/provider/route registration and capability honesty on a documented combined base.
2. Benedict integrates the owned UI against those generated operations; Aaron supplies real checked basis/source behavior. Robert adds staff entry/navigation/title and safe sign-in return path. No broad allowlist wildcard or UI-owned authorization shortcut.
3. Keep member screens and member acceptance writes with Robert. The Phase 2 member-facade replay-order and event-bridge gaps remain his integration dependencies; viewing acceptance status in staff does not fix them. Gate only the operations actually connected/tested; one working staff read must not enable unfinished assisted acceptance or money operations.
4. Confirm restricted/conflicted workflows stop at an honest pending state until real recusal/reopen/reassignment exists. Repeated decision controls appear only when the server exposes an accepted transition; do not patch application status from the browser.
5. Update the shared frontend spec for actual browser/API behavior through Robert. Existing design rules suffice; any rule change updates `design.md` through its owner before a competing layout is introduced. Benedict supplies exact proposed text and evidence.

**Deliverable:** focused owner PRs with named dependency commits and a connected staff slice. **Gate:** actual services/sessions, not only simulated HTTP responses, support the declared path.

### P3-H — validate and package review evidence

1. Execute the [planned acceptance matrix](acceptance_tests.csv) by layer. Use interaction tests for preview/retry/history/privacy/freshness and real DB/HTTP tests for authority, scope, concurrency and persistence. Avoid tests that merely repeat component markup or implement another finance oracle.
2. Run focused feature/projection tests, `npm run check`, then `npm run test:e2e` sequentially on a dedicated fictional `agap_test` database/isolated ports. Record exact environment, dependency commits, actual totals and failures. Do not reset another worktree's DB or replace real producers with unlabeled stubs to obtain a green result.
3. Preserve the existing fictional Ana/Ben/Cora keyboard/immutability/oracle tests; use the historical freeze and canonical fixtures rather than copying them. Add connected separate-officer/reviewer tests and a deliberate lost-successful-response test for the new staff path.
4. Capture the staff workspace at 1366×768 and 320 CSS px, relevant unavailable/conflict/exception/history states, plus real print PDF. Check keyboard/focus, 200% zoom/reflow, long schedules, status announcements and axe results against the existing design acceptance target. Keep screenshots fictional and distinguish simulated from connected evidence.
5. Record representative staff/design review separately from automation. UI passes do not establish cooperative policy acceptance or household benefit. Fix real findings; do not lower integrity rules or claim visual acceptance from screenshots alone.
6. Supply DEC-01 PR purpose, changed owned paths, contract/base dependencies, verification, screenshots/PDF and remaining gates. Robert updates `Assignment.md`; no push/merge or accepted-review entry is implied by this plan. Future merge still requires the user's authorization.

**Deliverable:** reproducible verification/handoff on the actual combined base. **Gate:** all in-scope mandatory cases pass, unresolved items are explicitly scoped unavailable, and no connected-completion claim rests only on test doubles.

## 6. Work that can proceed independently

| Work | Can Benedict advance now? | What must wait? |
| --- | --- | --- |
| Current-code evaluation, contract/error/permission proposals, test scenarios | Yes | Consuming-owner acceptance must be recorded rather than inferred |
| Read-only layout, form/brief composition and simulated lifecycle tests in owned feature | Yes, after provisional projection boundaries are explicit | Canonical generated types and actual registered operations for connection |
| Decision-owned history/redaction/document service candidates | Yes against explicit ports; shared types first where public | Real producer guards, scoped endpoints/client and combined security tests |
| Recommendation/preview/record browser connection | No on the present base alone | Robert/Aaron accepted contracts, real services and registration |
| Historical print presentation tests | Yes with labeled immutable examples | Actual staff-safe read/provenance/document endpoint before connected claim |
| Conflict resolution, reopened application or new follow-up persistence | Propose behavior only | Responsible owner commands/configuration; never local workarounds |
| Colab/Qwen, Earl ledger and numeric 5C feature completion | Not required for this phase's core template path | Their respective tasks retain their own release gates |

Provisional order is A → B contract/read boundary → C/D/E/F feature work → G connected registration → H full evidence. Components and scenarios may advance while actual producer adapters are unfinished. This is not a calendar estimate; Phase 3 remains inside DEC-01 scope and its existing capacity must be re-estimated from real progress before adding dates.

## 7. Merge sequence and collision prevention

Use a separate Phase 3 implementation branch from the eventual accepted Phase 2/shared-contract base, not this planning branch as a substitute for acceptance. If stacked, name `036bf58` and any Robert/Aaron commits explicitly; preserve the Phase 1/2 branches and do not copy/cherry-pick their shared work into competing owner patches.

1. Review/checkpoint the Phase 2 candidate and unresolved owner contracts.
2. Robert publishes the exact accepted canonical contract/client/resource changes; Aaron/Robert publish actual basis/transition guards.
3. Benedict supplies decision-owned read extensions and focused DB evidence.
4. Benedict supplies staff feature components/tests in `src/features/decision/`; use a separate spec/fixture filename to avoid editing common browser setup.
5. Robert integrates routes/entry points/identity return paths/registration/capabilities/spec on the combined base.
6. Re-run required checks and attach UI/PDF evidence; obtain user authorization before merge.

Each PR names DEC-01 and its prerequisites. One writer owns a file at a time; discuss shared changes with its named owner and never resolve another worker's branch by resetting, overwriting or broad-rebasing it. No dependency or lockfile change is expected. Recheck ownership after rebases because accepted upstream files may have moved.

## 8. Completion criteria and honest pass conditions

The phase is complete only when real scoped staff can inspect a current basis, the assigned officer can recommend, a different authorized reviewer can preview/acknowledge/record exact content, and authorized staff can retrieve/print a selected immutable safe brief through accepted registered contracts. Stale inputs, conflicts, self-review, unknown writes, forbidden reads and wrong-record responses must behave as tested. The template path must work with inference disabled.

Automated passing checks, meaningful generated-PDF inspection, required owner reviews and representative visual review are separate evidence. No plan can guarantee future tests will pass before implementation exists. This package provides explicit pass criteria and dependency controls; [VERIFICATION.md](VERIFICATION.md) reports only the documentation checks actually performed. All acceptance rows remain planned. Unavailable unrelated follow-up/5C/money operations do not block this staff slice, but missing core authorization/current-basis/preview/history/brief contracts do.
