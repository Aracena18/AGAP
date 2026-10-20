# AGAP

**Financial health loan review.** A staff workspace for checking evidence, examining repayment timing and full costs, and recording an accountable human decision.

This frontend uses fictional people, records, offers and policies. Demo roles illustrate a workflow; they are not authentication. Browser storage is local to this browser. There are no backend, payment, core-system, or live AI connections.

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

## Shared source of truth

| Question | Authority |
| --- | --- |
| What problem and scope are we building? | [Product freeze](docs/AGAP_Product_Freeze.md) |
| How should the UI and architecture work? | [Frontend specification](docs/AGAP_Frontend_Spec.md) |
| How is implementation divided? | [Delivery plan](docs/superpowers/plans/2026-10-20-agap-frontend.md) and [task briefs](docs/tasks/) |
| How should contributors work? | [AGENTS.md](AGENTS.md) |
| What is the shared data contract? | [Domain types](src/domain/types.ts) |
| What values and visual rules are implemented? | [Design tokens](src/styles/tokens.css) and [fictional fixtures](src/demo/cases.ts) |
| What is currently assigned or awaiting review? | [GitHub issues](https://github.com/Aracena18/AGAP/issues) and [pull requests](https://github.com/Aracena18/AGAP/pulls) |

Historical partner briefs remain in the repository for context; the product freeze supersedes their earlier product direction.

## Architecture

- `src/app`: routing, shared Context/reducer state, demo roles.
- `src/features`: application list, evidence, repayment comparison, decision.
- `src/domain`: pure calculations, evidence and decision rules, template explanations.
- `src/shared/ui` and `src/styles`: shared controls and visual tokens.
- `src/demo`: fictional fixtures, validated/versioned browser repository.

Features share one `CaseRecord`. Screens call domain functions and save through the repository boundary; they do not maintain independent financial totals. Money is integer centavos and dates are calendar dates. Recorded decisions preserve their original evidence and explanation.

## Verification

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, TypeScript, production build, and unit/interaction tests. Browser tests exercise the connected demo and accessibility checks. CI repeats these checks for branches and pull requests. Build output is in `dist/`; hash routing supports static hosting.

## Demo walkthrough

1. Open Ana. Inspect the income conflict, select the current payslip, and save the correction with a reason.
2. Compare monthly remaining money with the lowest dated cash balance. Compare the requested schedule with the permitted after-payday schedule and inspect full cost.
3. Recommend an option with a reason. Switch the labeled demo role to Reviewer.
4. Review the template explanation and record a decision. Print the preserved member brief.
5. Return to Officer and change a fact: the previous decision stays available and the case requires renewed review.
6. Open Ben to demonstrate that a payment-date change cannot fix an overall shortfall. Open Cora to return an incomplete review for clarification.

Use **Reset demo** to restore all three original cases. If saved data cannot be loaded, the app preserves it until explicit reset and explains its memory-only fallback.

## Review status

Implementation and automated verification are tracked in the delivery PR. Visual acceptance and representative staff evaluation remain separate, pending activities. Backend planning starts only after the frontend workflow is accepted.

Typography and icons are locally bundled. See [third-party notices](THIRD_PARTY_NOTICES.md).

## Screenshots and printable example

[Evidence](docs/screenshots/evidence.png) · [Repayment comparison](docs/screenshots/comparison.png) · [Decision](docs/screenshots/decision.png) · [Fictional member brief](docs/screenshots/ana-member-brief.pdf). These show implementation, with team visual acceptance still pending.
