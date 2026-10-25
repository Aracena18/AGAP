# AGAP frontend specification

Status: main contains the fictional browser baseline. Staff intake below describes the separate platform candidate, not code integrated into main. Visual acceptance and representative staff evaluation remain pending.

**25 October planning revision:** the [product solution](AGAP_Product_Solution.md) and [planned design blueprints](../design.md#10-planned-member-and-support-workflows-25-october-2026) now include a Robert-owned member portal, AI-assisted irregular-expense clarification and member payment-help access. None of these changes the implemented routes, one-cycle arithmetic, demo data or staff-only permissions described below. Proposed member identity/ports are in the [architecture](AGAP_Production_Architecture.md#proposed-next-revision--not-in-executable-contract-010); executable contract 0.1.0 remains a candidate without these additions.

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
Demo policies: nonnegative monthly remaining (`monthly-capacity`) and nonnegative daily cash balance (`cash-timing`). Available offers remain explicit; failed policy checks require reviewer exceptions for an approval. Critical evidence gaps cannot be overridden into a complete assessment.
Evidence changes and recommendation changes increase case version. A recommendation carries its resulting case version. Decisions preserve their referenced version; recording a decision and recording follow-up notes do not revise its evidence.
Recommendation and evidence editing are officer actions. Final decisions are reviewer actions. These browser checks demonstrate workflow, not security.

## Verification and production migration boundary

Independent arithmetic oracles are in the product freeze. Test them alongside double deductions, unavailable offers, missing evidence, required reasons, stale versions, immutable print content, persistence/recovery, keyboard interaction and print output.
Frontend explanation uses a deterministic template and is labeled as such. No fake AI requests or browser API keys.
Use the [design acceptance checklist](../design.md#acceptance-checklist) for visual and interaction review. User acceptance and representative staff evaluation must be recorded separately from automated tests. Documentation-only changes require reference and consistency checks; feature integration still requires the contributor contract's application checks.
The user's subsequent direction authorizes production architecture and backend planning before frontend acceptance. The target includes a server-owned repository, scoped identity, command/version validation, disbursement, repayments, accounting and health reviews. Retain this fictional workflow while A introduces canonical API contracts and server adapters. Production commands replace whole-record `saveCase` writes; the existing browser role checks/storage are not reused as security or ledger controls. UI acceptance, meaningful financial/workflow tests and operational deployment evidence remain required for their respective release gates.


## Server-backed staff intake candidate (21 October 2026)

This section describes the separate foundation branch, with source/evidence linked in the [platform guide](AGAP_Platform_Foundation.md). Main does not yet supply these staff routes, API commands or backend dependencies.

`Root` lazily selects `DemoRoot` for fictional review routes or `StaffApp` for `/#/staff/*`. The demo retains its existing repository, fixtures, role switcher and calculations. Staff routes never use that role switcher or `saveCase`; `StaffProvider` obtains the real session and the generated API client validates server projections. No identity token or staff record is written to localStorage.

Staff members may list authorized members/applications. Officers create members with a versioned notice acknowledgment, correct contact details, and prepare draft applications. The UI converts peso input through the existing `parsePesoInput`; the server accepts only positive safe integer centavos and independently validates requests. It does not calculate an affordability result or approve a loan. Administrator access lists scoped staff and revokes another account with a reason and recent MFA. Assignment and application-correction APIs are implemented; their UI is pending.

`useCommand` retains the original request, sender and idempotency key after network/server/response-validation uncertainty. It blocks overlapping submissions and keeps editable inputs locked until the same submission is resolved. A confirmed validation/precondition failure allows correction; cancel/reload obtains the current projection. An uncertain result is never displayed as a confirmed failure or success. Navigation warns about unsaved values or loss of uncertain retry details. Reloading loses in-memory retry details; staff should resolve the submission before leaving and inspect server records after an interruption.

Members/application lists use scoped cursor pagination, with unavailable phone values labeled “Not provided.” Form errors focus the error summary; permission-denied operations remain enforced on the server even if UI controls are absent. Draft success text is a record-save confirmation, not loan approval. UI/interaction authority remains [design.md](../design.md).

Verification includes actual PostgreSQL roles/RLS, concurrent version/idempotency tests, OIDC signed-token protocol tests, browser persistence, a deliberately lost successful response, auditor access, revocation, 320px reflow and automated accessibility. Exact results/limits are in [Robert's verification](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md).
