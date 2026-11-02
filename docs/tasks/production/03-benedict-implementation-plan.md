# Benedict — phased implementation plan

**Prepared:** 1 November 2026, Asia/Manila. **Purpose:** advance decisions and servicing while the user-reported Colab training run continues. This is a documentation proposal, not implemented functionality, an accepted interface revision, a new status tracker or a delivery-date commitment.

Planning base: `1776d9fdd5022e141a48ba1fda318636637e3d85` (`main` at inspection). Review and record the actual accepted base again before implementation. The user reports that training is running; no notebook, logs or artifact was inspected for this plan. Training completion and release eligibility remain separate evidence.

The [assignment tracker](../../../Assignment.md#benedict), [official owner brief](03-decisions-servicing.md), [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery plan](../../AGAP_Delivery_Plan.md), [frontend specification](../../AGAP_Frontend_Spec.md) and [design system](../../../design.md) remain authoritative. This document sequences their requirements; it does not introduce a competing design guide. The root-level `03-decisions-servicing.md` is an older local copy; use the official brief in this directory.

## 1. Scope and priorities

| Task | Benedict's outcome | Delivery boundary |
| --- | --- | --- |
| DEC-01 | Officer recommendation, separate reviewer decision, conflicts/exception controls, immutable explanation and member acceptance | First-demo slice: 4 relative units |
| PAY-01 | Controlled fictional manual disbursement, repayment, receipt and posted position through Earl's actual posting service | First-demo slice: 5 relative units |
| QWN-01 | Reproducible baseline/LoRA artifact and independent evaluation handoff | First-demo slice: 7 relative units; user reports training in progress |
| SRV-01 | Authorized amendments and retained servicing lifecycle | Stage 2, separately estimated |
| QWN-03 | Grounded 5C findings/explanations and decision-handoff integration | Additional stage 2 scope; estimate pending |
| QWN-02 | Goal/budget explanation adaptation and artifact handoff | Additional stage 2 scope; estimate pending |

The 16-unit allocation is an existing relative estimate, not 16 hours or days. Do not absorb SRV-01/QWN-02/QWN-03 into it. Re-estimate with actual progress and owner availability before committing a calendar schedule. Dataset preparation supports the training work; it does not complete independent evaluation.

**Immediate implementation order:** agree interfaces → decision rules → decision service → staff decision/acceptance path → servicing records and command rules → atomic manual money path → integration evidence. Maintain the Colab artifact/evaluation handoff as a parallel workstream. DEC-01 and PAY-01 must remain usable through a deterministic explanation when inference is unavailable.

## 2. Current repository findings

| Existing material | Reuse or review action |
| --- | --- |
| `src/domain/review.ts`, `explanation.ts`, their tests and `src/features/decision/` | Existing fictional browser behavior and layout are the baseline. Browser roles and whole-record `saveCase` writes do not provide production authorization or persistence |
| `packages/contracts/src/` and `packages/api-client/` | Executable contract 0.2.0 and generated client exist; consuming-owner agreement is still required. Propose gaps rather than creating competing DTOs |
| `apps/api/src/platform/commands.ts`, database coordinators, identity and member command helpers | Reuse actor checks, concurrency, idempotency, transaction/audit/outbox patterns |
| `apps/api/src/app.ts` and operation registry | Decision/servicing capabilities remain contract-only; relevant operations currently return unavailable. Exporting a service alone will not connect a route |
| `apps/api/src/modules/accounting/` | Earl's posting and principal-reconciliation implementations exist on this base. Review them instead of rebuilding accounting. Their README still requires registration, policy/mapping review and actual PAY-01 integration |
| `apps/api/src/platform/migrate.ts` | Current migration registry lists platform migrations. Robert must register accepted module migrations; their presence in Git does not mean they run |
| `packages/finance/src/assessment.ts` | One existing finance engine; Aaron owns further finance work. Consume checked results instead of duplicating the calculator |
| Member portal | Robert has the screens/facade and separate member principal. Supply authorized domain implementations/projections; preserve unavailable states until connected |

Repository comments and older planning status paragraphs can lag supplied candidates. Use executable files plus owner verification for readiness, and keep `Assignment.md` as the only task-status register. No consuming-owner agreement or production certification is inferred from a merge.

## 3. Implementation boundaries

### Ownership and configuration

- Benedict: `apps/api/src/modules/decisions/`, `apps/api/src/modules/servicing/`, `src/features/decision/`, planned staff `src/features/loans/` and `src/features/payments/`, assigned `src/domain/review.ts` / `explanation.ts` and tests, `models/qwen/`, and owned migrations/tests.
- Robert: shared contracts/client/OpenAPI, application context/state, routes/providers/capability/migration registration, dependencies/configuration, shared controls/tokens and canonical demo fixtures. Request changes through a concrete proposal.
- Aaron: evidence/fact/verification lifecycle, offers/schedules, financial and 5C arithmetic, staff 5C credit panel and one reusable AI adapter.
- Earl: GL/accounting, reconciliation, support-request/goal records, canonical accepted corpora/splits and independent evaluation. Use public services/read projections; do not write his tables.

Retain the repository's Node 24 / npm configuration, lockfile, TypeScript, React/Vite/CSS Modules, NestJS backend, PostgreSQL, Keycloak sessions and existing test tools. No new framework, ORM, state store, queue, payment SDK or styling package is needed to start. Any demonstrated dependency need goes to Robert before installation.

Use integer centavos, safe integer bounds and calendar dates. Distinguish due/effective/as-of dates from UTC recorded instants. Missing is unavailable, never zero. Authoritative calculations and configured score arithmetic remain outside AI. A policy exception cannot fabricate missing evidence.

### Existing interface coverage and proposals

| Available candidate | Gap to resolve with the receiving owner |
| --- | --- |
| Recommendation, decision and acceptance request schemas/routes | Authorized decision workspace/history/brief reads; explicit conflict declarations and restrictions; acceptance-document publication/version lifecycle |
| `AssessmentPort` | Current immutable assessment/offer retrieval and atomic freshness checks for a decision; do not rerun/reimplement credit inside decision code |
| `ReleaseAuthorizationPort` | Exact loan/decision/acceptance/expiry bindings and when to recheck before submission/posting; no repeated release |
| Financial command schemas and disbursement/payment creation routes | Explicit authorizer/submission/confirmation/status-recovery commands and read permissions; supported methods and allowed transitions |
| `PostingPort` and Earl's period-lock helper | Accepted rule/account mappings, runtime roles, registration, rollback behavior and lock ordering for real servicing tables |
| `LoanPositionPort`, member decision/accept/loans ports | Schedule/receipt publication, member-specific authorization and reconciliation evidence inventories with consistent snapshot/completeness semantics |
| Proposed FND-05 / CRD-03 | Later 5C accepted/candidate findings, criterion trace and saved handoff; no numerical rubric assumed |

Existing staff command routes are under `/api/v1`: `POST /applications/{id}/recommendations`, `/decisions`, `/acceptances`, `POST /disbursements`, `POST /payments`, and `GET /loans/{id}/position`. Additional endpoints/fields above are **proposals**, not existing API promises. Robert owns their canonical registration and generation.

## Phase 0 — agree the integration basis

**Can start while training runs:** yes. **Dependency:** read/review access to current owner candidates.

1. Create an isolated implementation worktree/task branch from the actual owner-agreed base. Preserve the user's untracked training material, cooperative documents and root notes. Use separate focused branches for DEC-01 and PAY-01 when practical; record their dependency order.
2. Review 0.2.0 schemas/ports and the gaps above with Robert. Record accepted version/base and unresolved proposals in Benedict's handoff evidence. Do not edit shared contracts or enable routes locally as a shortcut.
3. Agree with Aaron how a decision obtains the current checked assessment, selected offer, input/policy/source versions and permitted exception checks. Define the concurrency guard that prevents a source change between validation and commit.
4. Review Earl's `AccountingService.post`, `lockPostingPeriod` and reconciliation proposal. Agree fictional posting mappings, permitted movement components and the source-event identity shared across servicing/GL.
5. Record a permission/transition matrix using existing server roles: officer, reviewer, cashier, financial authorizer and scoped reader. Multi-role users still cannot prepare and authorize the same controlled action. An administrator has no implicit financial authority.
6. Identify unresolved institutional rules: approval limits/conflicts/exceptions/expiry, approved acceptance wording, product/fee/allocation rules and manual settlement evidence. Use explicitly labeled reviewed fictional rules for development; do not describe them as cooperative policy.

**Deliverables:** interface proposal, accepted-base note, permission/transition matrix, dependency list and a scenario/test checklist.

**Exit gate:** each integration boundary has a named producer, reviewed input/output, authorization and version semantics. Pure domain work may proceed against labeled doubles before all services exist; connected workflow claims must wait.

## Phase 1 — implement decision rules and immutable review basis (DEC-01)

**Can start while training runs:** yes, after the boundary review. **Dependency:** agreed domain inputs; real credit service not required for pure-rule tests.

1. Review existing `review.ts` and its tests to retain the established recommendation/decision/clarification behavior. Introduce backend-oriented rules in decision-owned code rather than extending browser `DemoActor` into a server security model.
2. Define recommendation prerequisites: assigned/authorized preparer, current complete checked assessment, permitted selected offer and required rationale. Return-for-clarification remains possible with incomplete information; missing critical evidence cannot be overridden into readiness.
3. Define reviewer rules: different person from the preparer, required role/scope/limits, resolved applicable conflicts, current recommendation/assessment, explicit reason and authorized exceptions. Preserve a departure reason when the decision differs from the recommendation.
4. Define a saved decision basis: source/fact versions, original authorized evidence references/checksums, checked assessment and horizon, offer/product/policy versions, preparer/reviewer identities, rationale, exceptions and explanation origin. No browser-provided financial total or identity becomes authoritative.
5. Specify invalidation precisely. Material input/offer/policy changes require renewed assessment/review and hold unreleased loans. Assignment-only or reminder changes do not silently rewrite assessment inputs. Existing snapshots remain inspectable.
6. Define acceptance of an exact approved decision/document version, not a general checkbox. Acceptance does not authorize money movement. Decide how stale, declined, returned, expired and superseded decisions are handled.
7. Write meaningful tests for self-approval, multi-role self-approval, stale recommendation/input, missing rationale, conflicts, unauthorized exceptions, non-overridable gaps, clarification with incomplete data and immutable historical snapshots.

**Deliverables:** decision-owned rules, tests, a state-transition specification and snapshot proposal.

**Exit gate:** rules reject unsupported transitions without depending on Qwen, the browser role selector or a live provider. Test doubles are labeled and cannot substantiate production access checks.

## Phase 2 — implement server decision persistence and acceptance (DEC-01)

**Can start while training runs:** yes. **Dependencies:** accepted shared interfaces and accessible platform/credit projections.

1. Add decision-owned append-only migrations for recommendations, decisions/snapshots, approval/conflict records and acceptance/document references, with foreign/version bindings and organization/branch controls. Request any new source/application read/write boundary through its owner.
2. Build public application services on the existing unit of work. Establish the actor server-side, recheck authorization in the transaction and use current authoritative source/assessment versions. Never accept an actor or scope from request JSON.
3. Reuse shared `If-Match` parsing and idempotent-command handling. Preserve the same body/key on uncertain retries. Return the existing 428/412/409 semantics for missing/stale/conflicting commands.
4. Commit recommendation/decision/acceptance, revision effects and audit/outbox atomically. Coordinate any application-status update through Robert's owned boundary, not direct writes to his tables.
5. Store the immutable reviewed explanation/basis at decision time. Later printing reads that saved version; it does not call the current calculator or regenerate a different explanation.
6. Supply member decision reads and acceptance through the existing **member transaction/context**. Check own-record scope and exact current document/decision version; do not cast a member into staff or open a nested staff transaction. Propose narrow access grants through Robert if needed.
7. Implement the release-authorization boundary from approved/current/accepted/unexpired terms and conflict/authority restrictions. Define pending loan creation in servicing; an approved or accepted decision alone is not an active loan.
8. Give Robert the exported services and registration/migration/client changes required. Keep unavailable capabilities until actual registration and integration checks pass.
9. Test actual database runtime roles/RLS, revoked identities, cross-branch/member access, concurrent review/source change, duplicate acceptance/decision, rollback and attempted snapshot alteration. Do not rely only on privileged test connections.

**Deliverables:** persistent decision/acceptance service, owned migrations, DB/authorization tests and Robert's registration handoff.

**Exit gate:** a real authorized staff path records one immutable decision; only the correct member or separately approved staff-assisted process can acknowledge its exact document. Assisted acceptance must preserve who actually acknowledged; an officer cannot silently impersonate the member.

## Phase 3 — complete the staff decision experience and saved brief (DEC-01)

**Can start while training runs:** UI composition/test cases now; connected behavior after Phase 2.

1. Retain the existing decision layout: recommendation and assessment → outcome/offer → rationale → applicable departure/exception fields → review date → explanation preview/acknowledgment → record action → saved brief/history. Keep follow-up secondary.
2. Preserve the fictional review route while preparing the server-backed staff composition inside Benedict's feature ownership. Robert wires staff navigation, application state and routes. Production screens consume generated client projections rather than whole-record `saveCase`.
3. Reuse `Button`, `Badge`, `Notice`, guarded `Money` presentation, shared formatters and CSS tokens. Continue Google Sans, Material symbols, white surfaces, blue actions and the existing spacing/responsive behavior. Do not create a local palette or component system.
4. Show complete, incomplete, stale, forbidden, conflict, exception-required, saving, unavailable and uncertain-result states. A missing figure renders Unavailable; do not send null to a numeric-only money component. “Decision recorded” must not imply approval.
5. Reuse the existing command/unsaved-change behavior where appropriate. An uncertain write retains its exact sender/body/key and blocks a different submission until resolved. A known 501 unavailable result is not reported as success.
6. Keep the deterministic template operational. Relevant form changes clear the explanation-reviewed acknowledgment. Source links must open the authorized original version; member-visible text excludes staff-only notes.
7. Print the selected saved historical brief, including relevant source dates, assessed horizon, selected offer/full costs, rationale, reviewer, exceptions and next step. Preserve the existing A4/print rules and verify actual PDF content.
8. Test keyboard/focus/error recovery, 320px reflow, 200% zoom, wide tables, accessible state messages and historical printing. Capture 1366×768 and narrow-screen screenshots and obtain separate representative review.

**Deliverables:** usable staff decision workspace, saved/printable brief, UI tests/screenshots and Robert's portal handoff.

**Exit gate:** the full decision path works with inference disabled. The real staff identity authorizes actions; a hidden/disabled button is not the only access control.

## Phase 4 — build the servicing records and durable command foundation (PAY-01)

**Can start while training runs:** proposals and pure rules now; DB implementation after accepted ports. **Dependencies:** DEC-01 release basis and Earl/Robert lock/registration agreement.

1. Define servicing-owned loan, immutable schedule-version, financial-command, business-event, allocation, receipt and manual-confirmation records. Link every loan to the exact approved/accepted decision basis. Reuse Aaron's contractual schedule; do not generate another schedule calculator.
2. Specify pending release → active only after the confirmed posted release. Enforce one first principal release per loan with database-backed uniqueness and transaction guards; multi-tranche lending requires later explicit scope.
3. Implement the existing command states with an allowed-transition table: prepared, authorized, submitted, confirmed, failed, unknown and confirmed_unposted. Do not accept arbitrary state patches from a browser.
4. Separate preparer and financial authorizer identities and permissions. Decide permitted manual evidence/confirmation and recheck release prerequisites immediately before the consequential step. Record amount, currency, effective date, reason and instrument reference without account credentials.
5. Use three distinct identities: HTTP request idempotency, durable logical command/provider key and permanent financial business-event identity. A different request key must not bypass first-release or event uniqueness.
6. Define crash recovery and status queries before any money path. A timeout/ambiguous outcome is unknown; it does not authorize a new transfer. Preserve confirmed-but-unposted movements as durable reconciliation work.
7. Test stale terms, absent acceptance, forbidden authorizers, same-person preparation/authorization, concurrent first releases, conflicting event identities, duplicate notifications and restart/retry behavior.

**Deliverables:** servicing schema/migrations, command rules/services, release guards, recovery specification and tests.

**Exit gate:** the durable command lifecycle is demonstrable with a clearly labeled fictional manual adapter. No bank/provider integration or actual transfer is claimed.

## Phase 5 — implement one atomic manual money path and reconciliation (PAY-01)

**Can start while training runs:** once upstream services/mappings are ready. **Dependencies:** reviewed DEC-01/credit basis, Earl's actual posting implementation, registered migrations and explicit fictional mappings.

1. Select the exact fictional demonstration offer and supported posting components with Aaron/Earl/Robert. Earl's current candidate covers principal movements; it does not establish interest/fee recognition. If the demonstrated offer needs additional components, obtain the matching reviewed posting implementation or explicitly narrow the demonstration. Do not claim an interest-bearing payment was fully processed through principal-only mappings.
2. Prepare and separately authorize a fictional manual release. Record simulated settlement explicitly. Production manual confirmation will require actual movement evidence; neither a voucher nor a simulated confirmation electronically transfers money.
3. For a confirmed movement, acquire locks in the agreed order: identity authorization → accounting period → affected loans sorted by ID → command/business-event locks. Use Earl's reviewed pre-lock boundary, not independent ad hoc locking.
4. In the **same transaction/context**, claim the servicing event, apply subledger/schedule/allocation effects, call `PostingPort.post`, store receipt/journal references, update command state and write audit/outbox. Only the platform coordinator commits. A provisional journal receipt is not success before commit.
5. Process one repayment with the approved allocation rule. Preserve explicit principal/interest/fee/unapplied components. A journal replay must not reapply servicing effects. Reject unsupported allocation cases visibly; do not silently drop fees, excess or residuals.
6. Record manual settlement evidence durably, separate from posting, so a later accounting failure cannot erase the known movement. For future external providers, use a durable authenticated inbox and reconcile unknown outcomes; never make irreversible provider calls inside a transaction/outbox handler that can blindly retry them.
7. Publish authorized loan position, schedule and receipt projections with effective/as-of dates, posted-through instant and pending movements. Pending or confirmed_unposted commands do not appear as fully posted success. Robert consumes the member projections; Earl consumes staff reporting/support projections.
8. Supply Earl the proposed reconciliation inventories: complete scoped events, explicit allocations, receipts, command states and journal/rule links. Agree consistent snapshot/cutoff and completeness semantics with Robert. A matching snapshot string alone is not evidence of consistent reads; inventories must also expose unmatched/orphan records.
9. Reuse Earl's checker to demonstrate agreement and discrepancies, including offsetting event errors. Earl owns report/evidence-reader implementation. Reconciliation does not repair records or initiate a payment retry.
10. Build the staff release/payment/receipt views in owned feature directories using existing design patterns. Show confirmation status and posting status distinctly, with recoverable unknown/error states. Robert adds routes and member display wiring.
11. Test rollback after the servicing update, posting failure, closed period, accounting-role denial, concurrent duplicate release/payment, lost successful HTTP response, recovery without re-transfer, first-release uniqueness, orphan evidence and member isolation. Test real servicing tables with Earl's service, not only his disposable test harness.

**Deliverables:** one integrated fictional release → repayment → receipt, dated posted read models, command recovery path and actual servicing-to-GL reconciliation evidence.

**Exit gate:** successful posted events have one consistent servicing/receipt/journal linkage; retries cause no duplicate effects. An accounting failure cannot produce a false fully posted success or lose a confirmed movement.

## Phase 6 — finish the model artifact handoff in parallel (QWN-01)

**Can start while other phases proceed:** yes. Preserve the current run; this plan does not request restarting training.

1. While Colab runs, retain the actual model/processor revisions, environment versions, dataset/split hashes, seed, LoRA settings, actual GPU/precision/memory and run logs. Save resumable checkpoints/weights outside Git in the approved artifact location. Do not infer measured resource use from the subscription balance.
2. Check that the task/output format and dataset used by the current run match the reviewed training plan. Record unreviewed labels, absent baseline or split/review gaps honestly; an exploratory completed run is not automatically eligible for release.
3. Preserve Earl's independent holdout. Capture the pretrained baseline under matching development settings; if not previously recorded, record it separately before claiming improvement. Do not use final holdout errors for checkpoint/prompt selection.
4. Package base/processor/adapter checksums, prompt/schema/version, preprocessing, supported input/output limits, environment, configuration, logs, license/provenance and reproducible inference instructions in `models/qwen/`.
5. Return the candidate artifact to Earl for independent base/tuned/checklist comparison. Record unsupported values, source errors, missing-data behavior, correction burden, latency and memory, including failures or no improvement.
6. Hand an eligible artifact to Aaron/Robert for their single adapter and runtime registration. Validate domain explanations against authorized supplied sources/checked numbers and retain deterministic fallback. Colab is an offline training environment, not an assumed always-on production inference server.

**Deliverables:** reproducible run/model card and artifact/evaluation handoff. **Exit gate:** recorded independent release result; do not mark QWN-01 complete merely because the notebook finished. Model delay does not prevent completing the template-based DEC-01/PAY-01 services.

## Phase 7 — verify and hand off the first demonstration

**Dependencies:** relevant path integration from Phases 2–5; separate model eligibility evidence if a tuned model is shown.

1. Run focused domain/DB/source/permission tests first. Then use the existing guarded fictional test database and run `npm run check` followed by `npm run test:e2e` sequentially. Platform/browser suites reset their shared test DB; do not run them concurrently against the same instance. Separate worktrees need distinct test Compose/ports when used simultaneously.
2. Ask Robert to validate registered migrations, routes, generated schemas/client and honest capability flags. Keep canonical demo fixtures and historical arithmetic unchanged; reference existing Ana/Ben/Cora/oracles rather than copying another fixture registry.
3. Demonstrate current recommendation → separate reviewer → saved decision → exact member acceptance → authorized simulated release → posted repayment → receipt/reconciliation. Include incomplete data, stale input, forbidden actor, unknown result and AI-unavailable recovery, not just the success path.
4. Check existing one-cycle arithmetic and snapshot history against the independent [historical oracles](../../AGAP_Product_Freeze.md#5-the-fictional-demonstration). Full-term servicing must use Aaron's explicit schedules; the demo's one-month household cash projection is not a full-term forecast.
5. Record screenshots, actual test results, source/base/interface versions and limitations in Benedict's handoff evidence. Include task ID, purpose, owned paths, verification, dependencies and receiving owners in each PR.
6. Run `graphify update .` after code changes if available. `graft` and `graphify` were unavailable during this planning inspection; report the actual implementation-time result rather than claiming indexed verification.
7. Robert updates `Assignment.md` from evidence. No PR merge is implied; obtain the user's authorization before merging. Representative staff/member review, security/operations and live readiness are separate gates.

**Deliverables:** DEC-01/PAY-01 review evidence and integration handoff; separate model evidence if available. **Exit gate:** required checks pass, known limitations are visible and the integrated path has no unsupported money/approval claims.

## Phase 8 — implement amendments and retained servicing (SRV-01, stage 2)

**Start after:** PAY-01/HLT-01 and relevant ACC-01 boundaries, plus institution-approved amendment rules and a separate capacity estimate.

1. Consume Earl's confirmed support request and a current posted loan position. A request or reported strain does not itself stop interest, waive fees, change dates or imply delinquency.
2. Define one permitted amendment first. Calculate old/new dates, instalments, term, fees and total cost from approved rules with Aaron; servicing owns amendment lifecycle and versioned effective schedules. Do not fork the finance engine.
3. Bind the proposal to the current loan/schedule/position versions; preserve its calculation basis and validity. Require a distinct authorized approval and exact member acceptance before effectiveness.
4. Retain the old schedule and decision snapshots; apply the accepted amendment at the defined effective date. Recalculate only what the approved rules permit. Changed balances/terms invalidate pending proposals.
5. Return comparison/status projections to Robert and follow-up references to Earl through their ports. Preserve rejected, expired, superseded and pending proposals without changing original obligations.
6. Add partial/early/late payment behavior, unapplied excess, linked reversal/refund, restructure, settlement and write-off/recovery incrementally with Earl's approved journal mappings and reconciliation evidence. His existing full-journal reversal capability does not by itself reverse the servicing subledger.
7. Test old/new schedule comparison, pending/rejected acceptance, stale-position races, effective dates, linked corrections and historical statements. Broader provider-backed money movement gets its own idempotency, inbox/authentication and recovery checks before activation.

**Deliverables:** first controlled amendment plus separately reviewed lifecycle increments. **Exit gate:** no changed contract without permitted calculation, authorized approval, member acceptance and preserved history.

## Phase 9 — implement the later Qwen extensions independently

These are additional stage 2 packages, not prerequisites for the earlier template-based decision/payment path. QWN-02 and QWN-03 each consume QWN-01 and their own accepted development-data handoff; neither requires completing the other. Re-estimate before advancing either into an earlier demonstration.

### QWN-03 — 5C findings, explanations and decision handoff

1. Agree FND-05 with Robert, checked CRD-03 projections with Aaron and reviewed EVAL-03 examples/splits with Earl. The five headings are confirmed; institution-approved numeric criteria/weights/applicability are still separate prerequisites for scores.
2. Adapt the same Qwen pipeline to source-linked criterion findings and focused questions. Source assertion, member confirmation, independent verification and accepted discretionary rating remain distinct. Never use the model's own invented scores/rationales as gold labels.
3. Explain only supplied checked score/criterion traces. When rubric/evidence is missing, preserve unavailable/clarification; do not fabricate percentages or repayment probabilities. Keep dated capacity shortages/full costs visible regardless of other C results.
4. In Benedict's decision handoff, retain authorized source/member-answer versions, draft versus accepted findings, per-C score or unavailable state, missing matters, actual rubric/trace and officer recommendation. Aaron owns the staff 5C panel; Benedict extends the reviewed decision explanation/handoff, not a competing credit panel.
5. Use the same separate reviewer and material-change guards. Test stale rubric/source changes, unsupported reasons/factors, missing history, inapplicable collateral and malicious source instructions. Regress every enabled Qwen capability through independent EVAL-03 before promotion.

**Deliverables:** bounded candidate artifact, evaluated explanation behavior and versioned decision handoff. Numeric score arithmetic remains Aaron's deterministic responsibility; final loan decisions remain authorized human actions.

### QWN-02 — goal/budget explanations

1. Receive EVAL-02 development manifests and the agreed FND-04/CRD-02/GOL-01 context. Earl retains holdout, goal/content records and suitability-review workflow; Aaron retains planning/catalogue/calculations; Robert retains member UI.
2. Adapt explanations from confirmed facts, checked planning results and approved content/product references. Preserve the exact horizon, protected essentials, supplied amounts, risks/liquidity/fees and review status.
3. Test missing/no surplus, stale/absent products, invented returns, forced savings and suitability-review requirements. Keep unavailable/manual/checklist behavior usable.
4. Return reproducible artifacts and regression evidence to Earl; Aaron/Robert wire only an independently eligible capability. No model draft executes a deposit, investment, transfer or contract change.

**Deliverables:** separately evaluated guidance artifact and inference handoff, not a second planner, catalogue, provider client or member interface.

## 4. Practical starting sequence while Colab runs

| Work session | Concrete progress | Boundary |
| --- | --- | --- |
| First | Review current decision rules/tests and 0.2.0 contracts; write the permission/transition and interface-gap matrices | Can begin immediately without the model |
| Next | Implement/test the pure DEC-01 rules, saved-basis shape and deterministic explanation behavior | Use clearly labeled fictional inputs; preserve existing fixtures |
| Next | Implement decision persistence, authorization and acceptance once the ports are accepted | Real runtime-role and concurrency checks, not demo roles |
| Next | Connect the staff decision workspace and saved/printable brief | Robert owns route/state/client registration and member UI |
| Alongside | Review Earl's posting/reconciliation evidence and prepare PAY-01 event/command/schema proposals | Does not require training completion |
| When dependencies arrive | Implement the atomic release/repayment/receipt path and owner handoffs | Requires actual posting/credit integration and accepted mappings |
| Whenever training finishes | Preserve/package the artifact and arrange independent evaluation | A successful notebook run alone is not model promotion |

These sessions specify order, not hours or guaranteed dates. Start with DEC-01, keep model logging/checkpoint protection in parallel, and defer additional servicing/guidance/5C implementation to separately estimated stage 2 scope unless the team explicitly re-estimates an earlier slice.

## 5. Planning verification

This plan was checked against the tracked owner brief, product/architecture/delivery/frontend/design documents, executable 0.2.0 schemas/operations/ports, existing decision helpers/UI, platform transaction/idempotency/migration code and Earl's posting/reconciliation README. No application code, dependencies, contracts, fixtures, migrations, original cooperative documents or training files were changed. The current run was not interrupted or inspected. Documentation verification uses local-link, task/ownership/dependency and diff checks; application tests are reserved for the subsequent implementation.
