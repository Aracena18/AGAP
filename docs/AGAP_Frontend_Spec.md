# AGAP frontend specification

Status, 26 October: this checkout supplies the fictional browser review baseline and the server-backed staff/member intake candidate. Visual acceptance and representative staff/member evaluation remain pending. [Current evidence](AGAP_Robert_Member_Verification.md) separates real session/intake behavior, simulated domain rendering and unavailable production domain services.

The [product solution](AGAP_Product_Solution.md) and [design](../design.md#10-planned-member-and-support-workflows-25-october-2026) govern the member portal and retained support workflows. Executable contract 0.2.0 is a review candidate containing the [member proposal](AGAP_Member_Contract_Proposal.md); it is not an agreed integration base. AI/evidence/financial domain services remain unimplemented.

**Model-training revision:** Benedict owns Qwen LoRA training; Aaron owns offline EBM/logistic training and the shared inference adapter; Earl independently evaluates both. No trained model, research score, route or calculation is added to this frontend by the [training plan](AGAP_Model_Training_Plan.md). First contractual amendments remain stage 2; the planned first demo supports requests and staff response.

Production planning now follows the [product solution](AGAP_Product_Solution.md), [production architecture](AGAP_Production_Architecture.md) and [four-person delivery plan](AGAP_Delivery_Plan.md). This file describes the fictional review routes and the separate staff intake interface. The [platform foundation](AGAP_Platform_Foundation.md) specifies the implemented server commands; financial server modules remain contract-only.

## Authority and design

The [product solution](AGAP_Product_Solution.md) governs target scope and behavior. The earlier [product freeze](AGAP_Product_Freeze.md) preserves the historical problem and independent fictional arithmetic. The root [UI/UX design system](../design.md) governs visual foundations, layouts, shared component behavior, screen blueprints, accessibility, printing, and design review. This specification governs the implemented browser architecture, contracts, calculation rules, and persistence; production changes follow the linked architecture and migration plan.

Use the design system for the Google-inspired direction and primary research references. Its baseline examples and pending refinements are distinct from accepted designs. Executable visual definitions remain in [tokens](../src/styles/tokens.css), [global styles](../src/styles/global.css), and [shared UI](../src/shared/ui/index.tsx); do not maintain parallel definitions here.

## Architecture and contracts

React + TypeScript + Vite, React Router hash routes, Context/reducer, CSS Modules and shared tokens.
For fictional review routes: one lockfile and one shared CaseRecord. Review feature components receive `record: CaseRecord` and use `useWorkspace()` to access `actor`, `role`, and `saveCase(record)`.
Canonical contracts: `src/domain/types.ts`.

- `assessCase(record): AssessmentResult` — complete/incomplete discriminated result.
- `validateEvidence(record): EvidenceIssue[]` — pure shared evidence-input validation; `EvidenceIssue` is `{ factId, message }` in `src/domain/evidence.ts`.
- `applyCorrection(record, input, actor, at): CaseRecord` — evidence validation and immutable correction.
- `makeRecommendation(record, offerId, note, actor, at): CaseRecord`.
- `validateDecision(record, input): DecisionValidation`.
- `recordDecision(record, input, actor, at): CaseRecord` — snapshot, template, reviewer enforcement.
- `recordFollowUp(record, reviewDate, note, actor, at): CaseRecord`.
- `buildExplanation(snapshot): ExplanationDraft`.

`CaseRepository` exposes list/load/save/reset asynchronously. Browser storage is versioned, structurally validated, and falls back to a visible memory-only mode on failure. Do not erase incompatible persisted data automatically.
Domain modules do not import React, browser storage or feature components. Screens never calculate authoritative money figures.

Calendar rules: explicit first cycle 2026-11-01 through 2026-11-30; group movements by calendar date and calculate end-of-day balances. No intraday or future-cycle guarantee.
Monthly remaining excludes opening cash and purchase-reserved proceeds. Already-deducted obligations appear in evidence but do not reduce take-home pay twice.
Offer total repayment is sum of all scheduled payments; financing cost is repayment + separately paid fees − net received. Fees withheld from proceeds are already reflected in net received.
Evidence readiness and the single assessment engine in `packages/finance/src/assessment.ts` use the same validator for every included cash-flow fact and its referenced source, regardless of `critical`. Referenced sources must be unique, readable and correctly dated; document-supported values require a document/worksheet, and member-reported values require a statement. Unused sources do not block readiness. Readiness excludes offer/cost/policy checks and does not establish authenticity. `src/domain/assessment.ts` remains a compatibility re-export. Fresh assessments use `cash-flow-v2`; historical decision snapshots retain their stored calculation versions and figures.
Demo policies: nonnegative monthly remaining (`monthly-capacity`) and nonnegative daily cash balance (`cash-timing`). Available offers remain explicit; failed policy checks require reviewer exceptions for an approval. Critical evidence gaps cannot be overridden into a complete assessment.
Evidence changes and recommendation changes increase case version. A recommendation carries its resulting case version. Decisions preserve their referenced version; recording a decision and recording follow-up notes do not revise its evidence.
Recommendation and evidence editing are officer actions. Final decisions are reviewer actions. These browser checks demonstrate workflow, not security.

## Verification and production migration boundary

Independent arithmetic oracles are in the product freeze. Test them alongside double deductions, unavailable offers, missing evidence, required reasons, stale versions, immutable print content, persistence/recovery, keyboard interaction and print output.
Frontend explanation uses a deterministic template and is labeled as such. No fake AI requests or browser API keys.
Use the [design acceptance checklist](../design.md#acceptance-checklist) for visual and interaction review. User acceptance and representative staff evaluation must be recorded separately from automated tests. Documentation-only changes require reference and consistency checks; feature integration still requires the contributor contract's application checks.
The user's subsequent direction authorizes production architecture and backend planning before frontend acceptance. The target includes a server-owned repository, scoped identity, command/version validation, disbursement, repayments, accounting and health reviews. Retain this fictional workflow while A introduces canonical API contracts and server adapters. Production commands replace whole-record `saveCase` writes; the existing browser role checks/storage are not reused as security or ledger controls. UI acceptance, meaningful financial/workflow tests and operational deployment evidence remain required for their respective release gates.


## Server-backed staff intake candidate (21 October 2026)

This section describes the supplied foundation candidate, with current source/setup in the [platform guide](AGAP_Platform_Foundation.md) and historical checks retained separately.

`Root` lazily selects `DemoRoot` for fictional review routes or `StaffApp` for `/#/staff/*`. The demo retains its existing repository, fixtures, role switcher and calculations. Staff routes never use that role switcher or `saveCase`; `StaffProvider` obtains the real session and the generated API client validates server projections. No identity token or staff record is written to localStorage.

Staff members may list authorized members/applications. Officers create members with a versioned notice acknowledgment, correct contact details, and prepare draft applications. The UI converts peso input through the existing `parsePesoInput`; the server accepts only positive safe integer centavos and independently validates requests. It does not calculate an affordability result or approve a loan. Administrator access lists scoped staff and revokes another account with a reason and recent MFA. The UI corrects assigned drafts and lets a fresh-MFA administrator assign submitted requests to an active same-branch officer with a reason. These intake operations do not approve a loan.

`useCommand` retains the original request, sender and idempotency key after network/server/response-validation uncertainty. It blocks overlapping submissions and keeps editable inputs locked until the same submission is resolved. A confirmed validation/precondition failure allows correction; cancel/reload obtains the current projection. An uncertain result is never displayed as a confirmed failure or success. Navigation warns about unsaved values or loss of uncertain retry details. Reloading loses in-memory retry details; staff should resolve the submission before leaving and inspect server records after an interruption.

Members/application lists use scoped cursor pagination, with unavailable phone values labeled “Not provided.” Form errors focus the error summary; permission-denied operations remain enforced on the server even if UI controls are absent. Draft success text is a record-save confirmation, not loan approval. UI/interaction authority remains [design.md](../design.md).

Verification includes actual PostgreSQL roles/RLS, concurrent version/idempotency tests, OIDC signed-token protocol tests, browser persistence, a deliberately lost successful response, auditor access, revocation, 320px reflow and automated accessibility. Exact results/limits are in [Robert's verification](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md).

## Server-backed member candidate — 26 October 2026

`Root` lazily selects `MemberApp` for `/#/member/*`, `StaffApp` for staff and the unchanged fictional demo for review routes. `createHashRouter` supplies one aggregated unsaved-change blocker for router navigation and browser Back/Forward; tab close/reload and sign-out also warn. Successful saves permit the intended next navigation. Manually replacing a hash outside router history cannot provide the same blocker guarantee. Requests retain their original sender/body/idempotency key after uncertain writes; known `501 module_not_available` is a confirmed non-execution and is not displayed as an uncertain save.

MemberProvider uses the generated client and a separate opaque HttpOnly cookie. It holds no identity/financial payload in localStorage and clears the private view on 401, expiry or sign-out. Verified linkage, own-record authorization, revocation and CSRF are enforced by the server. No demo role switch authenticates a member.

Implemented persistence: own application create/edit/read/list/submit and reminder preferences. Drafts use exact integer centavos and calendar dates; submitted requests cannot be edited by the member or assigned to a chosen officer. Read resources hide obsolete record/version results immediately and discard late responses; same-record refresh can preserve unsent input.

Portal domain connections: relevant document/camera upload; cleared-source download; source-linked model/template/simulated draft confirmation/correction/not-applicable with unknown amount/date; permitted checked costs/horizon; recorded human decision and complete immutable-term acceptance; posted loan/schedule/receipts/freshness; sharing preview and support status/response. These screens delegate through candidate ports. Defaults show unavailable and never fabricate an upload, approval, loan, payment-help success or repayment pause. Browser rendering tests use explicitly simulated responses; they do not implement B–D services.

In-account reminders use servicing's next-payment/date and posted-through/as-of fields. Preferences do not recalculate or amend terms. Help requires confirmed sharing/current notice; contractual amendments remain stage 2. No EBM score, trained inference, physical-verification claim or automatic financial decision is supplied.

## UI cleanup and authenticated review entry — 26 October

The current UI revision requires a real staff session for `/applications/*` review-demo routes. Signed-out users see Sign in to review and a validated internal return route. StaffProvider is shared across staff/demo navigation; member identity/cookies remain separate. Root gating, 401 handling, expiry and sign-out hide authenticated screens, including browser Back. This changes access to the fictional demo; its browser repository, simulation roles and financial rules remain unchanged.

All workspaces use the shared workspace/account header. Actual account menus replace decorative fictional avatars; Sign out invokes the appropriate server endpoint with the existing CSRF token. Menu navigation supports arrows/Home/End/Escape, outside dismissal and focus restoration. Demo role/reset controls move into Demo tools. Copy, case/evidence grouping and retained financial details follow design.md section 13.

3 November UI-04 refinement: a selected menu action restores trigger focus, including after a cancelled unsaved-change sign-out warning. The member payment-help form focuses the sharing heading on Review request and restores the message field on Edit message. Editing and reopening the preview clear the sharing acknowledgement; the browser requires fresh confirmation before sending. Message/contact values, uncertain retries, the existing support command and unavailable defaults are preserved. Long request-history messages and staff responses wrap inside their card without truncating the stored text. No financial calculation, API schema or stored record format changes.

Staff login accepts optional `assurance=mfa` and an internal `returnTo` for supported staff/review routes, including source fragments. OAuth state stores the validated route and requested signed assurance. Local password-only preview is opt-in and loopback-development-only, using a separate client; sensitive staff commands still require fresh MFA. Step-up returns to the saved page without automatically resubmitting an action. The member flow, cookie separation, canonical session JSON schemas and contract 0.2.0 are unchanged.


### Follow-up card refinements

The source sidebar now separates title, Type/Date metadata, a complete excerpt, linked-field context and the qualification that verification is separate. Assignment and revocation share an action-panel stylesheet: compact header/target, distinct MFA navigation, aligned fields and Cancel/primary footer. Page-header filler copy is removed from staff Applications/Staff access. These are presentation changes only: commands, reasons, expected versions, uncertain retries, MFA links, financial inputs and preserved source text are unchanged. Design.md section 13 remains the visual authority.

## Planned member-goal guidance boundary (29 October 2026)

Review the [FND-04 field-level proposal](AGAP_Goal_Guidance_Contract_Proposal.md) before shared contract/client or portal work. It proposes own-record projections, current-basis/review checks and safe unavailable states without changing implemented browser contracts.

The [goal-guidance product scope](AGAP_Product_Solution.md#member-goals-savings-and-cooperative-product-guidance) and [planned blueprint](../design.md#11-planned-goals-savings-and-product-guidance-29-october-2026) add voluntary savings goals and reviewed cooperative-product suggestions as future work. No goal route, financial function, schema, model capability or persistence format is implemented by this revision. Robert's FND-04/MOB-02 proposals must consume Aaron's checked CRD-02 results and Earl's GOL-01 records/review state through the shared client after contract agreement. QWN-02/EVAL-02 supply separate guidance release evidence through the same AI adapter; EBM remains offline. Preserve the existing one-cycle calculations, fixtures, demo-role limitations and recorded snapshots. Future goal UI must distinguish incomplete/infeasible/conditional scenarios, member choice, AI draft, suitability review and actual transactions, with manual/template fallback and explicit horizon. New acceptance tests are specified in the product, delivery, training and owner documents; application tests are required when implementation changes.

## Planned 5C-review boundary (29 October 2026)

Review the [FND-05 field-level proposal](AGAP_5C_Review_Contract_Proposal.md) before canonical scoring/review/handoff work. Proposed rubric-score units and traces are separate from existing money schemas; no numeric policy or staff UI is implemented by the proposal.

The [5C product extension](AGAP_Product_Solution.md#ai-assisted-5c-review-and-explainable-handoff) and [planned blueprint](../design.md#12-planned-5c-review-explanations-and-handoff-29-october-2026) add proposed staff rubric findings, deterministic per-category scores, explanations and a saved handoff. FND-05/CRD-03/QWN-03/EVAL-03 change no executable types, routes, calculator, policy, fixtures, model or storage in this documentation revision. Numeric criteria/weights remain an institutional configuration dependency; unconfigured results are unavailable. Keep score, evidence coverage, probability, money, source verification and human decision distinct. AI drafts and discretionary findings require the defined confirmation/review; the backend calculates scores and invalidates stale pending results. Preserve historical decisions, capacity shortages and incomplete states, with the existing officer/reviewer separation and template/manual path.

## Planned policy-source refinement — 2 November 2026

The [product amendment](AGAP_Product_Solution.md#supplied-policy-and-cash-flow-sources--2-november-2026), [source register](AGAP_Policy_Clarification_Register.md) and [design rules](../design.md#14-planned-policy-and-cash-flow-review-refinement) add review/acceptance inputs to existing tasks. They change no executable contract 0.2.0, browser schema, cash-flow-v2 arithmetic, source validation, API or persistence. Existing canonical fixtures and saved calculation versions remain intact.

Before an affected implementation change, review how product/policy version, conditional evidence applicability, amount period/gross-net basis and deduction inclusion fit current shared interfaces. Proposed additions go through Robert and consuming owners; do not silently reinterpret an existing field or zero/boolean into an unknown state. Preserve incomplete results when required facts or institutional rules are unresolved. Independently check rate units, supported frequency/result selection, duplicate business/household/debt costs, cost/fee timing and final-centavo conservation as applicable; source-workbook findings are not presumed AGAP defects. Production rule activation and new UI behavior remain planned until implemented and verified through the existing owner gates.
