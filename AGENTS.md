# AGAP contributor contract

Read `docs/AGAP_Product_Freeze.md`, `docs/AGAP_Frontend_Spec.md`, and your task brief before editing.

- Product freeze governs scope. Frontend specification governs UX and architecture.
- `src/domain/types.ts`, `src/styles/tokens.css`, and `src/demo/cases.ts` are the executable contract, visual tokens, and fictional fixtures. Do not duplicate them.
- One integration owner controls these shared files, app state, configuration, and dependencies. Propose contract changes before editing them.
- Feature tasks own their feature directory and specifically assigned domain modules. Work in isolated worktrees and task branches. Do not modify another worker's files.
- Use integer centavos, calendar dates, deterministic calculations, and clearly unavailable values. Missing is never zero. AI never decides or calculates.
- All people, documents, offers, and policies in this prototype are fictional. Demo roles are not authentication.
- Preserve recorded decision snapshots. Later material edits require renewed review.
- UI: IBM Plex Sans, Carbon icons, shared tokens, visible labels, purposeful actions, semantic HTML, keyboard access. Backend and live AI are outside this milestone.
- Use meaningful tests for financial calculations and workflow integrity. Run `npm run check` and `npm run test:e2e` before a feature is declared integrated.
- PRs include purpose, relevant issue, verification, and screenshots for UI changes. Keep `main` runnable. Never merge a PR without the user's authorization.
- Required behavior changes update the relevant spec and tests together. GitHub issues track active work; chat is not the durable specification.
- Use graft for indexed code navigation. After code changes run `graphify update .` if available; report unavailable tooling honestly.
