# AGAP frontend implementation plan

> Historical implementation plan. Subsequent user direction expands the target to a complete lending product and authorizes production planning now. Use the current [product solution](../../AGAP_Product_Solution.md), [production architecture](../../AGAP_Production_Architecture.md) and [delivery plan](../../AGAP_Delivery_Plan.md) for new work. The prototype-only backend gate below is retained as history, not a current restriction.

Spec: `docs/AGAP_Product_Freeze.md` and `docs/AGAP_Frontend_Spec.md`.
Goal: a complete fictional browser loan-review workflow; reviewed UI precedes any backend build.
Stack: React, TypeScript, Vite, React Router, CSS Modules, Context/reducer; npm.

## Ownership and sequence

1. Integration lead: repository, docs, contracts, fixtures, tokens, shell, storage, CI. Shared changes flow through this owner.
2. Visual proof: Evidence and Comparison layouts using shared fixtures and components. Capture screenshots; user acceptance remains pending until explicitly given.
3. Independent workers in isolated worktrees:
   - Evidence: `src/features/evidence`, `src/domain/evidence.ts` and its tests.
   - Comparison: `src/features/comparison`, `src/domain/assessment.ts` and its tests.
   - Decision: `src/features/decision`, `src/domain/review.ts`, `src/domain/explanation.ts` and their tests.
4. Integration: Applications, routing, browser persistence, regression tests, accessibility, screenshots and documentation.
5. Private GitHub repository, issues and reviewable PR; do not merge without authorization.

## Global requirements

Use shared types/tokens/fixtures. Integer centavos; calendar dates; end-of-day balances. Only fictional data. Missing is not zero. One source-linked case record; immutable recorded snapshots; explicit human decisions. No backend or live AI.
Native semantic controls; self-hosted Google Sans; Google Material Symbols Rounded; concise copy. The user's Google-inspired visual direction supersedes the initial IBM-based choices. Review primary screens at 1366×768 and reflow at 320 CSS px.

## Acceptance

Ana: ₱2,000 monthly remaining, −₱2,000 requested minimum, ₱1,000 alternative minimum, ₱11,000 closing, ₱36,000 total repayments, ₱6,000 financing cost.
Ben: −₱4,000 monthly remaining regardless of repayment date. Cora: incomplete.
Correction propagation; payroll debts counted once; required rationale/exceptions; stale review after edits; original print preserved; refresh/reset and storage recovery; no AI dependency.
Run lint, TypeScript/build, Vitest, Playwright, automated accessibility plus manual keyboard/print/viewport checks.

## Progress and implementation decisions

- Foundation complete: shared contracts, fictional fixtures, tokens, browser repository, documentation and CI.
- Evidence, comparison, recommendation, decision, print and follow-up are integrated on `feat/frontend-workspace`.
- Private GitHub repository: https://github.com/Aracena18/AGAP. Active review/evaluation/backend-gate issues: #1, #2 and #3.
- Readable financial diagrams use local scrolling on small screens; dated movements and policy details use progressive disclosure.
- GitHub issues will be the active task tracker once the private repository exists.
- User authorized isolated parallel feature work. Shared contracts are established before dispatch.
- Implement the full authorized frontend; distinguish implementation screenshots from user acceptance. Backend remains gated on user acceptance.
- Scope of visual acceptance: pending. Scope of real staff evaluation: pending; automated tests do not replace it.
