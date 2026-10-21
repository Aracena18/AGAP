# AGAP

**Financial health loan review.** A staff workspace for checking evidence, examining repayment timing and full costs, and recording an accountable human decision.

This frontend uses fictional people, records, offers and policies. Demo roles illustrate a workflow; they are not authentication. Browser storage is local to this browser. The review demo has no backend, payment, core-system or live AI connections. A separate server-backed staff intake workspace is now implemented as Robert's review candidate; see the [platform setup guide](docs/AGAP_Platform_Foundation.md).

The target product now includes full lending operations: evidence and credit review, decisions, controlled disbursement, repayments, accounting and financial-health follow-up. Start with the [feature priorities](docs/AGAP_Product_Solution.md), [production architecture](docs/AGAP_Production_Architecture.md) and [four-person delivery plan](docs/AGAP_Delivery_Plan.md). The [platform handoff](docs/AGAP_Robert_Verification.md) records what has been implemented and tested; financial modules and live readiness remain pending.

The [UI/UX design system](design.md) defines the user's Google-inspired visual direction, screen layouts, shared patterns, and interaction rules. It distinguishes the implemented baseline from pending refinements and acceptance.

## Start locally

Use Node 24 and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To use the verification port:

```sh
npm run dev -- --port 5174 --strictPort
```

For the staff workspace, follow the [database, Keycloak and API setup](docs/AGAP_Platform_Foundation.md#run-the-local-staff-workspace). Its URL is `/#/staff`; demo roles do not grant staff access.

## Shared source of truth

| Question | Authority |
| --- | --- |
| What problem, scope and key features are we building? | [Product solution and priorities](docs/AGAP_Product_Solution.md) |
| What is the production architecture? | [Production architecture](docs/AGAP_Production_Architecture.md) |
| Where are the original demonstration arithmetic and historical scope? | [Earlier product freeze](docs/AGAP_Product_Freeze.md) |
| How should the interface look and behave? | [UI/UX design system](design.md) |
| How should the frontend architecture, contracts, and persistence work? | [Frontend specification](docs/AGAP_Frontend_Spec.md) |
| How do four people work without conflicting edits? | [Named team assignments](Assignment.md), [delivery and ownership plan](docs/AGAP_Delivery_Plan.md), and [production owner briefs](docs/tasks/production/) |
| How was the existing browser implementation divided? | [Historical frontend plan](docs/superpowers/plans/2026-10-20-agap-frontend.md) and [earlier task briefs](docs/tasks/) |
| How should contributors work? | [AGENTS.md](AGENTS.md) |
| What is the shared data contract? | [Domain/demo types](src/domain/types.ts); [production schemas](packages/contracts/src/schemas.ts), [ports](packages/contracts/src/ports.ts) and [generated OpenAPI](packages/contracts/openapi.json) |
| What visual values and controls are implemented? | [Design tokens](src/styles/tokens.css), [global styles](src/styles/global.css), and [shared UI](src/shared/ui/index.tsx) |
| What fictional evidence and offers are implemented? | [Fictional fixtures](src/demo/cases.ts) |
| What is currently assigned or awaiting review? | [Assignment.md](Assignment.md) tracks tasks, owners, dependencies and progress; [pull requests](https://github.com/Aracena18/AGAP/pulls) provide implementation/review evidence |

Historical partner briefs and the earlier product freeze remain for context and independent fictional arithmetic. Their prototype-only scope and backend-planning gate are superseded by the product solution; previously recorded implementation/verification evidence remains historical evidence, not proof of new production capabilities.

## Architecture

- `src/app`: routing, isolated demo state and staff shell.
- `apps/api`: Nest/PostgreSQL identity, member/application intake and platform adapters.
- `apps/worker`: worker bootstrap with explicit module-handler registration.
- `packages/contracts` and `packages/api-client`: validated production commands and generated client.
- `infra`: fictional local database/identity, test database and encrypted restore drill.
- `src/features`: application list, evidence, repayment comparison, decision.
- `src/domain`: pure calculations, evidence and decision rules, template explanations.
- `src/shared/ui` and `src/styles`: shared controls and visual tokens.
- `src/demo`: fictional fixtures, validated/versioned browser repository.

Fictional review features share one `CaseRecord`. Screens call domain functions and save through the repository boundary; they do not maintain independent financial totals. Money is integer centavos and dates are calendar dates. Recorded decisions preserve their original evidence and explanation.

## Verification

```sh
npm run test:db
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, generated-contract validation, web/API builds, existing domain/UI tests and real PostgreSQL platform tests. Browser tests exercise the fictional review demo and server-backed staff intake, including lost responses, revocation and accessibility. Run DB/browser tests sequentially against the dedicated fictional test database. Build output is in `dist/` and `dist-api/`; static hosting supports only the review demo, while staff intake requires the API/identity/database. The [platform guide](docs/AGAP_Platform_Foundation.md#verify-and-recover) describes ports, test isolation and the restore drill.

## Demo walkthrough

1. Open Ana. Inspect the income conflict, select the current payslip, and save the correction with a reason.
2. Compare monthly remaining money with the lowest dated cash balance. Compare the requested schedule with the permitted after-payday schedule and inspect full cost.
3. Recommend an option with a reason. Switch the labeled demo role to Reviewer.
4. Review the template explanation and record a decision. Print the preserved member brief.
5. Return to Officer and change a fact: the previous decision stays available and the case requires renewed review.
6. Open Ben to demonstrate that a payment-date change cannot fix an overall shortfall. Open Cora to return an incomplete review for clarification.

Use **Reset demo** to restore all three original cases. If saved data cannot be loaded, the app preserves it until explicit reset and explains its memory-only fallback.

## Review status

The existing browser implementation and automated verification are tracked in the [draft delivery PR](https://github.com/Aracena18/AGAP/pull/4). The verification record reports passing local checks and a [GitHub Actions startup issue](https://github.com/Aracena18/AGAP/issues/5); check live remote status before making a current CI claim. Visual acceptance and representative staff evaluation remain separate, pending activities. Production planning is authorized now under the linked product/architecture/delivery baseline; live readiness requires the additional implementation and evidence specified there.

Typography and icons are locally bundled. See [third-party notices](THIRD_PARTY_NOTICES.md).

Robert's foundation has separate [verification and critique](docs/AGAP_Robert_Verification.md), [setup/integration instructions](docs/AGAP_Platform_Foundation.md) and [restore evidence](docs/AGAP_Robert_Restore_Drill.json).

## Screenshots and printable example

[Evidence](docs/screenshots/evidence.png) · [Repayment comparison](docs/screenshots/comparison.png) · [Decision](docs/screenshots/decision.png) · [Fictional member brief](docs/screenshots/ana-member-brief.pdf). These show implementation, with team visual acceptance still pending.

Staff implementation: [Members](docs/screenshots/platform/staff-members.png) · [Applications](docs/screenshots/platform/staff-applications.png) · [Staff access](docs/screenshots/platform/staff-access.png).
