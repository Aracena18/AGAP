# Connected lending journey: implementation plan

Prepared 5 November 2026 · Baseline `59351ceefeba606951147b1b65d6aee3da2b7b60` · Planning branch `codex/connected-lending-plan`

This is a proposed execution plan for the remaining connected lending journey. It incorporates the whole-system audit, preserves existing ownership and reuses delivered services. It does not implement features, record another owner's acceptance, adopt institutional policy or authorize live funds/data/deployment. [Assignment.md](../Assignment.md) remains the sole task/status tracker. The CL0–CL8 labels below are sequencing labels within existing tasks, not new task IDs or replacements for Benedict's earlier implementation phases.

The [product solution](AGAP_Product_Solution.md), [production architecture](AGAP_Production_Architecture.md), [delivery plan](AGAP_Delivery_Plan.md), [frontend specification](AGAP_Frontend_Spec.md), [design authority](../design.md) and [historical fictional oracles](AGAP_Product_Freeze.md) govern implementation. All source pointers below describe the inspected baseline and must be checked again before a later implementation starts.

## 1. Outcome and completion boundaries

Deliver one coherent journey through normal authenticated navigation:

Member application → confirmed/verified evidence as required → authoritative dated assessment and permitted offer → officer recommendation → separate authorized human decision → exact-term member acceptance → controlled disbursement → posted loan → repayment → receipt and ledger reconciliation → payment-help review and follow-up.

Define two completion gates to prevent a successful demonstration from being mistaken for operational completion:

| Gate | Required result | Limits |
| --- | --- | --- |
| **M1: connected fictional lending journey** | CL0–CL6 supply a server-backed journey using an explicitly configured fictional principal-only product, actual PostgreSQL services, actual transaction-aware GL posting and authenticated participants. Manual entry and deterministic explanations work throughout. | All records and movements are fictional. Existing simulation-only money rules remain explicit. This does not complete interest/fees, allocation variants, actual payment operations or production release. |
| **M2: approved first-product operational release** | CL7–CL8 extend the journey to the institution-approved product, required adverse financial cases, genuine controlled manual/provider evidence, security, reconciliation, recovery and responsible-user acceptance. | Applies only to the approved product, institution, execution method and supported operations. Remaining product families, goals, numerical 5C and research tasks retain their assigned scope; this is not a declaration that every AGAP feature is complete. |

A controlled real manual cash/bank workflow can be a valid first operational execution method once approved. An electronic provider is required only if selected for that release. A manual voucher never claims an API transferred funds. No feature, policy or model becomes available simply because a route or contract exists.

## 2. Baseline to reuse and integration hazards

Reuse the current identity/intake/evidence/assessment services; [DecisionsService](../apps/api/src/modules/decisions/decisions.service.ts), [DecisionStaffReads](../apps/api/src/modules/decisions/staff-read.service.ts), [ServicingService](../apps/api/src/modules/servicing/servicing.service.ts), [MoneyService](../apps/api/src/modules/servicing/money.service.ts), [LoanReads](../apps/api/src/modules/servicing/loan-reads.ts), [AccountingService](../apps/api/src/modules/accounting/accounting.service.ts), [ReconciliationService](../apps/api/src/modules/accounting/reconciliation.service.ts) and [MonitoringService](../apps/api/src/modules/monitoring/monitoring.service.ts). Extend their boundaries rather than creating duplicate calculators, ledgers, providers or browser-authoritative financial records.

The important prerequisite is **semantic compatibility**, not only endpoint registration. [Workflow contracts](../packages/contracts/src/workflow.ts) support multiple cash dates, coverage, gross/net basis, deduction treatment, monthly segments, full-horizon results and dated separate fees. The existing [decision review context](../apps/api/src/modules/decisions/context.ts) uses older fact/assessment shapes, including one cash date per fact. A cast or lossy adapter could drop the financial meaning needed for approval.

Recommended contract direction: propose a new versioned decision-basis/snapshot format that consumes the authoritative workflow assessment and immutable input references directly. Retain the older decoder for historical records. Final schema/version selection belongs to Robert and the actual consumers. Never approximate horizon totals into monthly figures, choose only the first cash date, mark unchecked sources verified or invent a file hash for a statement. Commit statement provenance from exact server-held text where appropriate.

Existing module migrations are centrally registered at the baseline. Verify them; do not repeat the old handoff's instruction to register them as if still missing. Schema changes require new additive migrations, including explicit supported upgrade paths. Preserve existing decision/document hashes, receipts, journal history and versioned demo storage.

## 3. Ownership and required handoffs

| Owner / existing tasks | Accountable implementation boundary | Handoff needed |
| --- | --- | --- |
| **Robert — FND-03, MOB-01, SHOW-01, OPS-01** | Canonical schemas/generated client/OpenAPI, application transitions and shared registration, identity/config/dependencies, infrastructure, all member-phone UI and member facade | Reviewed contracts, real actor scopes and source-writer/transaction protocol; consuming-owner acceptance recorded against a commit/version |
| **Aaron — EVD-01, CRD-01, AI-01** | Evidence, authoritative assessment/product rules, source/currentness producers and the one AI transport | Exact saved assessment/input/source/policy/offer projections, valid product calculations and material-change guards |
| **Benedict — DEC-01, PAY-01, SRV-01, QWN-01** | Decision/authority/conflict rules, exact terms/acceptance, servicing/movement commands, staff decision/money screens, Qwen artifact handoff | Current decision/release bindings, approved financial operations, dated safe position/receipt projections and reproducible eligible model artifacts |
| **Earl — GL-01, ACC-01, HLT-01, EVAL-01** | Posting/account mappings/reconciliation/reporting, support and independent evaluation | Transaction-aware postings, independently expected reconciliations, support-purpose read requirements and genuine evaluation results |

Source/authority administration needs an explicit ownership decision during CL1: Robert supplies identity/roster primitives and shared registration, Benedict owns lending authority/conflict semantics, and the responsible institution supplies policy/approval. Administrator status alone must not confer lending or financial authority.

This document assigns no teammate a new commitment or acceptance. Before dependent integration, record the actual reviewed interface/base, outstanding changes and remaining effort in the existing owner briefs and tracker. The historic 64 relative units are not a fresh estimate for this plan. Remaining estimates stay pending until CL1 compatibility and policy decisions are resolved.

## 4. Execution phases and exit gates

### CL0 — Correct the audited safety and reliability defects

**Existing tasks:** FND-03/SHOW-01/OPS-01, EVD-01/CRD-01, DEC-01/PAY-01. **Leads:** Robert, with Aaron/Benedict in their paths. **Dependency:** reviewed audit reproductions and current checkout.

1. Fix the financial editor in [WorkflowPanel](../src/features/workflow/WorkflowPanel.tsx): retain the opening application/fact revision, preserve an unsaved draft across background refresh and surface a conflict before saving stale data. Reconcile current server values explicitly. Preserve the exact key/body/version for uncertain retries.
2. Correct [historical staff next-payment selection](../apps/api/src/modules/servicing/loan-reads.ts) to use the requested effective-date basis. Specify separately whether freshness/command metadata describes current knowledge or the historical date. Do not imply historical knowledge by an ambiguous timestamp.
3. Resolve the lockfile's body-parser/Multer advisories through supported compatible updates or a reviewed mitigation. Preserve dependency ownership; avoid an automatic framework-major upgrade. Add request-parser regressions and an advisory check with documented dispositions for exceptions.
4. Extend [startup credential checks](../apps/api/src/app.ts) to all application schemas, including decisions/servicing and inherited ownership; keep superuser/BYPASSRLS rejection.
5. Tighten [Docker context exclusions](../.dockerignore) for private documents, research/holdout/reviewer files, local worktrees/backups and unnecessary exports. Verify both context and resulting image boundaries without uploading private content.
6. Diagnose CI against the actual configured origin as well as upstream. The implementation investigation distinguishes upstream pre-job startup failure from the fork's concrete Invalid URL test failures caused by bypassing the shared test database URL fallback. Obtain a successful remote run after correction; retain the distinction between pre-job failure and an application-test failure. Local development on unaffected paths can continue while repository/account diagnostics are pending, but remote verification remains a release gate.
7. Propose accurate capability granularity; do not label whole accounting/monitoring modules complete because some routes work. Update actual flags only when the corresponding integrated checks pass.

**Exit evidence:** regression proves both explicit refresh and automatic polling cannot overwrite a concurrent correction; historical payment remains visible at the earlier date; malformed/compressed requests do not terminate the API; runtime ownership cases are rejected; private material is absent from build context; dependency findings are corrected or explicitly assessed; current local checks pass. Successful remote checks are required before M1 acceptance/publication as an integrated milestone. Audit A06 acceptance replay is completed in CL3; A03 spans CL1–CL6.

### CL1 — Agree contracts, first-product configuration and authoritative producers

**Existing tasks:** FND-03, EVD-01, CRD-01, DEC-01, PAY-01, GL-01, ACC-01. **Lead:** Robert; all consuming owners. **Dependency:** baseline reviewed; safety fixes may proceed alongside contract review.

Prepare the shared contract proposal before canonical edits. It must settle:

| Boundary | Required proposal |
| --- | --- |
| Evidence/credit → decision | Lossless versioned assessment/input envelope: horizon, all dated occurrences, fee dates, actual/minimum checks, mandatory versus explicitly overridable rules, engine/config versions, exact source/text/fact revisions, confirmation and verification semantics, and stale/unavailable reasons |
| Authority/conflicts → decision/release | Server-established scoped roster, current role/activity, limits/quorum/exception permissions and expiry, declarations/recusal/reassignment, real reviewing actor and supporting policy references |
| Application → domain commands | Permitted transitions through producer-owned operations on the caller transaction; aggregate version versus material-input version; recommendation changes versus workflow-only metadata |
| Decision → member | Safe decision/terms/document projection, exact saved bytes/checksum, acceptance eligibility, current input/recommendation/participant bindings, and replay receipt semantics |
| Servicing → accounting | Approved component/event/mapping versions, posting-period order, business-event identities, allocations, receipts and one atomic commit |
| Servicing → member/monitoring/reporting | Dated positions and freshness, current/effective schedules, safe receipts, pending/unposted states, narrow support-purpose authorization and complete reporting inventories |
| Commands → HTTP/UI | Canonical request/response DTOs, preview proof, optimistic versions, stable errors, transport idempotency, durable business uniqueness and safe downloadable documents |

Implement real [DecisionBackendPorts](../apps/api/src/modules/decisions/backend-contracts.ts), [ServicingBackendPorts](../apps/api/src/modules/servicing/backend-contracts.ts) and [MoneyPorts](../apps/api/src/modules/servicing/money.service.ts) through owner-approved producers. Test-only context tables/drivers must not become production adapters or request-body sources.

Publish one lock protocol and verify every participating writer. Preserve accounting-period locking before servicing application/loan/command locks; explicitly resolve how earlier source/config/identity guards interact with existing application-row locks. Do not assume composing independently passing modules is deadlock-safe. Cover evidence edits, policy changes, participant revocation and competing decision/payment commands under actual database concurrency.

For M1, define one new fictional integration scenario within the existing fixture ownership and frozen-oracle policy, with an explicitly supported principal-only product. Do not change Ana's interest-bearing historical offer to make the money service accept it. For M2, record the actual first approved product and execution method; unresolved applicable questions in the [policy clarification register](AGAP_Policy_Clarification_Register.md) remain configuration blockers. At minimum resolve relevant document/eligibility, rate/fee/allocation, capacity and authority questions. Re-loan, amendment, capital-linked and numerical 5C questions apply when those features/products are selected; they do not block unrelated fictional work.

**Exit evidence:** accepted field-level proposal and compatibility matrix; old snapshots still decode unchanged; multi-date and beyond-cycle cases retain all meaning; genuine owner review recorded; source/authority/version races fail safely; configuration is versioned and unavailable when incomplete. No endpoint is enabled using a lossy compatibility cast.

### CL2 — Connect staff recommendation, human decision and review readiness

**Existing tasks:** DEC-01, EVD-01/CRD-01, FND-03/SHOW-01; existing PRV-01 scope. **Leads:** Benedict/Aaron; Robert registers shared operations/navigation. **Dependency:** CL1 accepted producer/snapshot interfaces.

1. Reuse [decision services and persistence](../apps/api/src/modules/decisions/decisions.service.ts), adapting current-input guards to the accepted lossless basis. Read saved assessment results; do not recalculate historical results in a screen or explanation.
2. Implement scoped officer recommendations and separate reviewer actions, including policy-required quorum/limits, declared conflicts, reassignment, expiry and visible authorized exceptions. Preserve the fictional demo's strict financial blockers; exceptions cannot fill missing evidence or bypass mandatory rules. Production override eligibility requires its own explicit approved policy. Keep return-for-clarification available without inventing complete evidence. Missing authority/conflict clearance remains unavailable.
3. Publish reviewed workspace/history/document and decision-preview operations through the [operation register](../packages/contracts/src/operations.ts). The existing record method also requires a preview ID: add an explicit canonical proof envelope rather than dropping preview validation to fit the older DTO.
4. Present exact proposed explanation/terms, then record the reviewed immutable content. Bind preview to actor, request, application/material versions and expiry. Technical preview lifetime and policy-approved decision/offer validity are different controls. A preview is not an approval. Deterministic/manual explanation remains usable without AI.
5. Connect the staff application record to its decision workspace and saved history. Keep fictional browser routes recognizable as their own mode; they cannot act on server applications.
6. Persist server evidence-currentness confirmations, source-linked concern checks and any required escalation/disposition against current versions. Reuse agreed PRV semantics through the domain boundaries. Missing AI availability permits explicit human/checklist review; absence of an AI run is never recorded as a completed AI check. Notice acknowledgment never resolves an escalation.
7. Where the server priority queue is delivered, rank/filter the authorized complete cohort before paging, with a defined snapshot/cursor refresh rule and original waiting-time tie break. Do not sort one loaded page and call it the global queue. Broader queue UI may remain planned while an individually authorized case can be reviewed, but readiness/escalation safeguards required for that case cannot be bypassed.

**Exit evidence:** an assigned officer recommends an actual saved offer; a different authorized reviewer previews and records it; self-approval, restricted conflicts, stale inputs, expired proof, missing quorum and unauthorized exceptions fail; earlier decisions/concerns remain intact after edits/reload; documented live navigation and responsive screens work.

### CL3 — Connect exact-term member acceptance and pending origination

**Existing tasks:** DEC-01/PAY-01, MOB-01/FND-03. **Leads:** Benedict; Robert owns facade/member screens. **Dependency:** CL2 saved approval and exact document.

1. Wire actual member decision/document/acceptance operations through the existing own-member principal and safe projections. Staff-only source excerpts, conflicts, authority grants and notes remain private.
2. Correct [member acceptance ordering](../apps/api/src/modules/member-portal/member-portal.service.ts): authenticate/recheck current own-resource access, then allow the domain to resolve an identical committed retry before new-command current-term checks. Changed/expired terms still block a new acceptance. Never remove ownership or revocation checks to obtain replay.
3. Show the exact offer, full costs, schedule, document version/checksum and explanation before explicit acknowledgment. After a successful replay, perform a separate current read instead of treating a cached receipt as current workspace state.
4. Persist one acceptance business identity; distinguish it from approval and from release. Create one pending origination bound to the accepted snapshot/configuration through the existing service. The member cannot select staff, establish authority or mark funds received.
5. Supply any required narrow member-event bridge through reviewed infrastructure; do not grant a member transaction general staff audit/outbox access or nest a staff unit of work.

**Exit evidence:** member sees only their own exact terms; another member is denied; different document/offer/input versions fail; lost-success retry returns the original receipt after a material change; revoked access still fails; a new key does not duplicate acceptance/origination. No loan is active before posted release.

### CL4 — Connect controlled disbursement and atomic posting

**Existing tasks:** PAY-01, GL-01, FND-03/SHOW-01. **Leads:** Benedict/Earl; Robert integrates transport/UI. **Dependency:** CL3 accepted origination, CL1 financial mappings/authority and CL0 safeguards.

1. Reuse the stored release guard, durable preparation/authorization/submission intent, observations and MoneyService finalization. The preparer and authorizer must be distinct, with current scoped authority and required fresh MFA.
2. Register reviewed public command/workspace DTOs and staff navigation. Adapt the existing [loan gateway](../src/features/loans/loan-gateway.ts); never expose private command bodies or trust an HTTP `verified` flag, actor, authority packet or posted total.
3. M1 uses a server-established fictional movement adapter, enabled only in the explicitly guarded fictional environment. M2 adds approved trusted manual intake or an authenticated durable provider inbox/dispatcher. Record external instrument/evidence references, effective/received times and actual verification without claiming the application executed a manual transfer.
4. Commit intent before any external action; do not hold a database transaction during provider/file I/O. Unknown outcomes require status/reconciliation of the original movement and permanent business identity, never a replacement transfer under a new key.
5. Preserve known movement observations independently of subsequent posting success. A closed period, changed product or posting failure must leave previously committed settlement evidence recoverable as unposted. Durable intake must survive restart before domain processing.
6. Finalization commits the subledger effect, actual GL journal, final command result, applicable voucher/receipt and audit/outbox effects in the same caller transaction. Preserve period-before-loan/command lock order. Notifications are subsequent deduplicated delivery.

**Exit evidence:** one accepted approval produces one posted release and one real balanced test journal; pre-posting views remain pending; concurrent/new-key retries cannot release twice; failures after the GL call roll back every new financial effect; earlier confirmed movement evidence survives; restarts/unknown outcomes never trigger automatic second submission.

### CL5 — Connect repayment, receipts, statements and reconciliation

**Existing tasks:** PAY-01, GL-01/ACC-01, MOB-01. **Leads:** Benedict/Earl; Robert member integration. **Dependency:** CL4 posted release.

1. For M1, wire exactly the currently supported scheduled principal repayment with scoped cashier preparation, separate authorization, trusted fictional settlement and atomic finalization. Explicitly reject unsupported components/amounts; zero interest/fees are valid only for the configured fictional product.
2. Drive balances, arrears, next payments, schedules and selected immutable receipt printing from posted events. Apply the corrected historical cutoff. Pending or unknown movements do not reduce debt; an unavailable position is not zero.
3. Refresh the own-member loan view from actual services following commit. Keep contractual schedule, value date, posting time and pending facts distinct. A transport retry confirms the original command; a separate read supplies current state.
4. Reuse the actual independent ledger/servicing inventory comparison and saved reconciliation runs. Enumerate both inventories independently, including orphan/missing events; use one authorized repeatable snapshot. A successful report never repairs postings or retries a transfer.
5. Retain fail-unavailable behavior at current inventory limits. Add coherent complete paging/batching for the target operational volume before M2; aggregate reports cannot claim complete matching when only a page was loaded.

**Exit evidence:** posted repayment creates one allocation, receipt and balanced journal; member and staff balances agree; payment/receipt/source-event deduplication survives new keys and restart; deliberately missing, duplicate, mismatched and orphan evidence produces discrepancies; closed-period races fail atomically; saved reports retain their original basis.

### CL6 — Connect financial-health follow-up and demonstrate the complete path

**Existing tasks:** HLT-01, PAY-01/SRV-01 boundaries, MOB-01/SHOW-01. **Leads:** Earl/Benedict; Robert member/navigation integration. **Dependency:** CL3–CL5 integrated projections.

1. Supply a narrow fresh staff-position projection for an authorized assigned support reviewer. Authorize the support purpose/current assignment through reviewed ports; do not turn an officer into a cashier, disclose another member's loan or grant raw servicing-table access.
2. Keep the captured submission-time position preserved and separately labeled from the fresh view. Reported strain, declined answers and missing information remain distinct from posted repayment facts and credit eligibility.
3. Reuse confirmed sharing, support/action history pagination and follow-up completion/rescheduling. Generate in-account due notices only from the effective schedule and posted position, respecting preferences. External delivery needs its separate configured provider and evidence.
4. Update capability flags only for demonstrated sub-capabilities. Update the [frontend specification](AGAP_Frontend_Spec.md) for the implemented behavior; any new UI rule goes into [design.md](../design.md), not a competing style guide.
5. Demonstrate the complete M1 path from a new server application through evidence, assessment, recommendation, separate approval, acceptance, release, repayment, receipt, reconciliation and payment-help/follow-up. Include page reloads, fresh sessions and process restart.

**M1 exit evidence:** an executable end-to-end scenario through normal routes, actual database persistence and actual test GL; permissions and adverse-path matrix below; required local checks plus successful remote CI; inspected 320px/tablet/desktop/200%-zoom screenshots; honest simulated-movement and unavailable-model labels. No browser storage or fabricated API response supplies operational facts.

### CL7 — Complete the selected product's financial and servicing breadth

**Existing tasks:** CRD-01, DEC-01/PAY-01/SRV-01, GL-01/ACC-01. **Leads:** Aaron/Benedict/Earl; institution approves financial rules. **Dependency:** accepted product/policy/component specification; implementation can begin alongside earlier integration after contracts are agreed.

1. Implement the approved schedule/rate/day-count/rounding method, fee/insurance treatment, net proceeds, accrual/recognition, grace/holiday and penalty rules for the selected product. Reuse the finance package and independent oracles. Do not silently extend principal-only commands to interest-bearing loans.
2. Extend versioned financial command/component/GL contracts and posting constraints together. The current command/context formats contain literal simulation-only assumptions: introduce reviewed versioned real-execution modes and trusted intake/configuration guards before any real operation, while retaining historical simulation decoders. Merely removing the UI label or flipping a configuration flag is insufficient. Support required partial/late/early payments, allocation order, excess/unapplied funds, settlement, reversals and refunds, with actual dates and final-centavo conservation. Explain unsupported cases explicitly until delivered.
3. Preserve original and effective schedules. For supported hardship amendments, calculate checked old/new costs/dates, require separate authorization and member acceptance, retain the original terms and apply only from the approved effective date. A help request alone changes nothing.
4. Complete approved account mappings and required bank/cash reconciliation, period controls, capital-related operations and reports for the institution's supported release. Resolve opening balances and migration/cutover differences; an empty demo ledger is not opening reconciliation.
5. Obtain receiving-owner/accountant/policy acceptance for the actual supported operations and configuration. Keep broader product families and unresolved reloan/write-off/recovery capabilities explicitly scoped and scheduled under their existing assignments.

**Exit evidence:** independently expected schedule/allocation/accounting results for the selected product; no missing component converted to zero; controlled duplicate/reversal/refund and closed-period cases; preserved contractual history; reconciled servicing/GL/cash-bank/capital where applicable; signed institutional interpretation for activated rules. M1 alone cannot satisfy this gate.

### CL8 — Verify deployment, model capability and operational release

**Existing tasks:** OPS-01/SHOW-01; EVD-01/AI-01/QWN-01/EVAL-01; all product owners. **Lead:** Robert coordinates; actual responsible institution accepts release. **Dependency:** feature gates and approved operating configuration.

1. In staging, prove real identity/MFA/linkage/recovery/revocation, least privilege, same-origin cookie/CSRF forwarding, private storage and bounded 10 MiB document forwarding. Test actual maintained scanner, native/OCR extraction, quarantine failures, worker lease recovery and restart persistence.
2. Verify resource/volume limits, monitoring, job lag/unposted exceptions, incident/runbook ownership and reconciliation alerts. Keep unknown outcomes actionable. Generic outbox delivery requires explicitly registered reviewed consumers; never acknowledge unsupported event kinds or replay money through ordinary notification retries.
3. Restore a consistent database + original/derived documents + identity/signing material + recovery keys/secrets into an isolated environment. Verify hashes/history, sign-in, positions and reconciliation against institution-approved RPO/RTO and cutover. Demonstrate rollback with compatible additive migrations.
4. Execute the actual configured Qwen service/worker path on fictional inputs before enabling its capability. Bind artifact/base/prompt/schema/dataset/runtime hashes, record raw failures and measured limits, and obtain genuine independent evaluation of grounding/semantics/instruction resistance. No model performs authoritative calculations or decisions.
5. Preserve current D/E research artifacts and selection evidence. The present adapter permits only its pinned pretrained baseline; any chosen tuned artifact needs a separately reviewed compatible release. This lending-integration plan neither selects a new experiment nor authorizes retraining. Manual/checklist/template fallback allows financial workflow development to proceed; an AI-enabled milestone additionally requires actual inference acceptance.
6. Complete institutional product/authority/accounting/privacy/retention, hosting/quota/budget, operator and representative member/staff acceptance. Recheck remote CI and deploy only the reviewed tested image/configuration. Provisioning costs, credentials and real records follow actual release authorization, not this planning document.

**M2 exit evidence:** supported financial operations and configuration accepted; current security findings resolved/assessed; successful local/remote/deployed checks; observed user workflow; full recovery/cutover proof; approved release/rollback decision. The model capability stays unavailable unless its own execution/evaluation gate passes; any larger milestone requiring AI or separate research evidence retains those prerequisites.

## 5. Required acceptance matrix

Expected monetary results must be specified independently before using the production engine to verify them. Keep all records fictional until the institutional release. Scope access tests use actual non-owner runtime roles, not just privileged fixture connections.

| Check | Phase | Required observable result |
| --- | --- | --- |
| Concurrent fact edits plus explicit refresh | CL0 | Stale editor preserves its draft and cannot silently overwrite the newer confirmed amount |
| Concurrent edit during processing poll | CL0 | Same protection without a user refresh action; original uncertain retry details remain stable |
| Parser/advisory regression and credential ownership | CL0 | Invalid/compressed bodies do not crash the API; every application-schema owner/inherited-owner case is rejected |
| Multi-date/irregular facts and fee dates | CL1 | All occurrences, coverage, deduction semantics and full-versus-horizon results survive the decision snapshot losslessly |
| Currentness/config/source/revocation race | CL1–CL4 | A conflicting writer cannot commit stale approval or release between validation and commit; no deadlock-based duplicate effects |
| Self-approval, missing quorum, conflicts and limits | CL2 | Unauthorized lending action rejected by server and database-backed boundaries |
| Preview changed, expired or used by another actor | CL2 | Requires a new exact-content review; no silently regenerated approved terms |
| Return/decline versus missing evidence | CL2 | Permitted human workflow follows reviewed semantics; incomplete figures remain unavailable |
| Escalation notice acknowledged but unresolved | CL2 | Required disposition still blocks readiness; old resolutions cannot revive after restoring old values |
| Own-member terms/document privacy | CL3 | Correct exact bytes/checksum visible; other-member access and private staff material denied |
| Lost successful acceptance followed by changed terms | CL3 | Same authorized retry returns its committed receipt; new acceptance checks current terms |
| Revocation before retry | CL2–CL6 | Cached response cannot bypass current principal/resource authorization |
| New-key acceptance/origination/release duplicates | CL3–CL4 | Permanent business identities prevent another acceptance, pending origination or disbursement |
| Preparer attempts financial authorization | CL4–CL5 | Rejected even when the actor holds both roles generally |
| Unknown/late/contradictory movement | CL4–CL5 | Durable original evidence and review hold; no automatic replacement transfer or debt reduction |
| Failure after GL posting call | CL4–CL5 | Entire new posting/subledger/receipt/status transaction rolls back; earlier observation remains recoverable |
| Committed retry after accounting period closes | CL4–CL5 | Authorized replay returns original result; a new posting remains subject to the period guard |
| Historical as-of date before later repayment | CL0/CL5 | Principal, receipts and next payment use the documented consistent effective-date basis |
| Independently missing/orphan/mismatched journals | CL5 | Reconciliation detects differences from both complete inventories; no silent repair |
| Partial inventory / report limit | CL5/CL7 | Unavailable/incomplete result until coherent full enumeration is supplied; never a false match |
| Shared concern versus fresh/old loan positions | CL6 | Captured and fresh facts remain distinct; private notes and unauthorized loans stay undisclosed |
| Payment help without amendment | CL6 | Due dates, interest, fees and loan terms unchanged |
| Approved product edges | CL7 | Partial/late/early/excess, fees/accrual, residual centavos, reversal/refund and amendment history agree with independent expectations |
| Navigation, reload, retry, session and restart | CL6–CL8 | Full journey persists through real services; current scope and saved history remain correct |
| Responsive and accessible consequential actions | CL6–CL8 | 320px/tablet/desktop/200% zoom, keyboard/focus/dialog/print and representative physical-device/browser checks pass |
| Scanner/OCR/model outage and injection | CL8 | Safe quarantine/manual fallback; unsupported model output never becomes confirmed fact or a financial action |
| Full restore and opening reconciliation | CL8 | Consistent identity/files/keys/database recovery with verified financial history and accepted cutover |

## 6. Delivery, verification and rollout discipline

Audit traceability: A01 editor concurrency → CL0; A02 dependencies → CL0; A03 connected journey → CL1–CL6, with operational breadth in CL7–CL8; A04 remote CI → CL0 and release verification; A05 ownership guard → CL0; A06 acceptance replay → CL3; A07 historical position → CL0/CL5; A08 build context → CL0/CL8; A09 capability metadata → CL1/CL6. Full model/deployment and institutional gaps are addressed in CL8 without treating them as completed by core financial integration.

Use small owner-scoped branches/worktrees: first defect corrections, then the compatibility proposal/producers, decision integration, member acceptance, release, repayment/reconciliation and support walkthrough. Integrate a batch only after its contracts, relevant tests and receiving-owner evidence are reviewable. Do not assign a larger batch to another owner's paths by implication.

Each implementation batch updates the relevant specification and tests together; new UI rules update the canonical design. Before declaring a feature integrated, run `npm run check` and `npm run test:e2e`, plus relevant actual database/financial/security/worker tests. Use Node 24 and locked dependencies, isolated fictional test databases and ports. Run presentation-specific browser tests with their guarded configuration. Run relevant Python tests only when model tooling changes; distinguish simulated adapters from actual GPU evaluation. Inspect screenshots rather than relying on overflow assertions alone. Use graft for navigation and graphify after code changes when available; record unavailable tooling honestly.

Documentation-only planning uses local-link, ownership, dependency and consistency checks; it does not require another application test run. This plan makes no application edits, so no new application test result is claimed here.

After each accepted batch, Robert records the actual base, contracts, delivered slice, checks, owner decisions and remaining effort in [Assignment.md](../Assignment.md). Existing direct-main publication authorization applies to requested checked work; preserve unrelated local files, use non-force pushes and create no new PR unless requested. Publication is distinct from consuming-owner review and institutional release.

Default new connections to unavailable until configured and verified. Introduce granular, server-controlled capability switches through the shared owner. Deploy backward-compatible additive schema before enabling corresponding code; retain old decoders/snapshots and previous image/configuration. On uncertain movement or reconciliation failure, disable the affected new writes, preserve evidence and reconcile the original business event. Do not downgrade history, clear idempotency records, delete observations or resubmit funds to make rollback appear successful.

## 7. First implementation batch to start after this plan

Begin with **CL0 financial-editor concurrency correction**, using the audited automatic-poll and explicit-refresh scenarios as regressions. Bind the editor to its opening version and preserve user input on a conflict; coordinate Robert/Aaron ownership. In parallel organizational terms, Robert can prepare dependency/credential/build/CI corrections and Benedict can prepare the historical position fix. This is a proposed work division, not evidence that anyone has accepted or begun it.

Next complete the **CL1 compatibility proposal**, especially the authoritative multi-date assessment → immutable decision snapshot boundary. Only after that review should the team register decision/payment endpoints. Keep model experiments and stage-two goal/5C work on their existing tracks while these dependencies are resolved.
