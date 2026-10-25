# AGAP contributor contract

Read `Assignment.md`, `docs/AGAP_Product_Solution.md`, `docs/AGAP_Production_Architecture.md`, `docs/AGAP_Delivery_Plan.md`, `design.md`, `docs/AGAP_Frontend_Spec.md`, and your task brief before editing. Use `docs/AGAP_Product_Freeze.md` for the historical baseline and independent fictional calculation oracles.

- Product solution governs target scope and required behavior; production architecture and delivery plan govern technical boundaries and four-person ownership. The earlier product freeze's prototype-only scope/backend-planning gate is superseded. `design.md` governs appearance, layout, components, and interaction. Frontend specification describes the implemented browser contracts, calculations, and persistence until their planned migration is implemented.
- `src/domain/types.ts`, `src/styles/tokens.css`, and `src/demo/cases.ts` are the executable contract, visual tokens, and fictional fixtures. Do not duplicate them.
- Robert is the integration owner and controls these shared files, app state, configuration, dependencies, and the central `Assignment.md` tracker. Propose contract changes before editing them. Named owners and active task status are recorded in `Assignment.md`.
- Feature tasks own their feature directory and specifically assigned domain modules. Work in isolated worktrees and task branches. Do not modify another worker's files.
- Use integer centavos, calendar dates, deterministic calculations, and clearly unavailable values. Missing is never zero. AI never decides or calculates.
- All development and presentation fixtures are fictional. Current browser code remains a fictional demo; real records require the separately implemented and evaluated production controls. Demo roles are not authentication.
- Preserve recorded decision snapshots. Later material edits require renewed review.
- UI: follow `design.md` and its Google-inspired direction; consume shared tokens and controls. Distinguish implemented examples, planned production features, pending refinements, and accepted designs. Production/backend planning is authorized now; a written architecture does not implement or certify those controls.
- Use meaningful tests for financial calculations and workflow integrity. Run `npm run check` and `npm run test:e2e` before a feature is declared integrated.
- PRs include purpose, the relevant task ID from `Assignment.md`, verification, and screenshots for UI changes. GitHub issues are not required for task tracking. Keep `main` runnable. Never merge a PR without the user's authorization.
- Required behavior changes update the relevant spec and tests together. UI/UX rule changes update `design.md`; do not create a competing design guide in a task brief. Documentation-only changes require link and consistency checks rather than unrelated application test runs. `Assignment.md` tracks active work, supported by owner briefs and PR evidence; chat is not the durable specification.
- Use graft for indexed code navigation. After code changes run `graphify update .` if available; report unavailable tooling honestly.
