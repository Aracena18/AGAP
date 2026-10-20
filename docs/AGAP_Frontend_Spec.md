# AGAP frontend specification

Status: implementation baseline; visual acceptance and representative staff evaluation are pending.

Production planning now follows the [product solution](AGAP_Product_Solution.md), [production architecture](AGAP_Production_Architecture.md) and [four-person delivery plan](AGAP_Delivery_Plan.md). This file describes what the existing browser implementation actually does; planned server contracts are not implemented by documenting them.

## Authority and design

The [product solution](AGAP_Product_Solution.md) governs target scope and behavior. The earlier [product freeze](AGAP_Product_Freeze.md) preserves the historical problem and independent fictional arithmetic. The root [UI/UX design system](../design.md) governs visual foundations, layouts, shared component behavior, screen blueprints, accessibility, printing, and design review. This specification governs the implemented browser architecture, contracts, calculation rules, and persistence; production changes follow the linked architecture and migration plan.

Use the design system for the Google-inspired direction and primary research references. Its baseline examples and pending refinements are distinct from accepted designs. Executable visual definitions remain in [tokens](../src/styles/tokens.css), [global styles](../src/styles/global.css), and [shared UI](../src/shared/ui/index.tsx); do not maintain parallel definitions here.

## Architecture and contracts

React + TypeScript + Vite, React Router hash routes, Context/reducer, CSS Modules and shared tokens.
One app, one lockfile, one shared CaseRecord. Feature components receive `record: CaseRecord` and use `useWorkspace()` to access `actor`, `role`, and `saveCase(record)`.
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
