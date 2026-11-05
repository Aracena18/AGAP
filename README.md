# AGAP

**Financial health lending.** AGAP's target connects member-phone applications, source-linked evidence, overlooked-expense clarification, affordable repayment scenarios, accountable human decisions and ongoing support.

This checkout includes the fictional review demo and a server-backed staff/member application-to-acceptance candidate. The connected-lending extension adds guarded fictional disbursement, scheduled principal repayment, receipts, independent reconciliation and purpose-scoped support views; its verification/integration status is recorded in [the connected-lending handoff](docs/tasks/production/connected-lending-cl6/HANDOFF.md). Server workspaces use actual sessions and PostgreSQL; browser demo roles do not grant authority. Real financial operations and trained-model activation retain their separate release gates. See the [platform setup guide](docs/AGAP_Platform_Foundation.md).

The target product now includes full lending operations: evidence and credit review, decisions, controlled disbursement, repayments, accounting and financial-health follow-up. Start with the [feature priorities](docs/AGAP_Product_Solution.md), [production architecture](docs/AGAP_Production_Architecture.md) and [four-person delivery plan](docs/AGAP_Delivery_Plan.md). The [platform handoff](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md) records what has been implemented and tested; financial modules and live readiness remain pending.

The **25 October plan** adds a Robert-owned responsive member portal, member-confirmed AI document/expense suggestions, conflict-aware separate approval and payment-help requests. The candidate now supplies own-record application drafts/submission, member access, reminders and the portal facade/screens. Evidence, checked offers, decisions, loans and payment-help records still require their domain owners; default responses explicitly say unavailable. AI reads/clarifies/explains; independent source checks verify claims, tested code calculates and authorized people decide. The overlooked-expense mechanism is a research hypothesis to validate with the cooperative.

Start team work from [Assignment.md](Assignment.md) and its current owner briefs. It is the sole task/status tracker and records four provisional **16-unit** first-demonstration budgets (64 total, expanded from 48 for model training/evaluation). Robert owns all member-phone UI/access and integration; Aaron evidence/credit/reusable inference plus EBM/logistic training; Benedict Qwen3.5-2B LoRA training plus decisions/servicing; Earl accounting/health plus independent corpus/model evaluation. Benedict’s first contractual hardship amendment moves to stage 2; demo payment-help requests still receive staff review. Existing GitHub work cards and earlier branch instructions do not override the current documents. Complete production duties remain assigned beyond the first demo.

The [UI/UX design system](design.md) defines the user's Google-inspired visual direction, screen layouts, shared patterns, and interaction rules. It distinguishes the implemented baseline from pending refinements and acceptance.

## Start locally

Use Node 24, npm and the local API/database/identity setup below. The web server alone cannot authenticate a review or staff account.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To use the verification port:

```sh
npm run dev -- --port 5174 --strictPort
```

For server-backed intake, follow the [database, Keycloak and API setup](docs/AGAP_Platform_Foundation.md#run-the-local-staff-workspace). Open `/#/member` for the fictional `member` identity or `/#/staff` for staff. Both use the public localhost training password in that guide and provider enrollment where requested. Demo roles grant neither staff nor member access. Existing Keycloak realms are not overwritten by the new import.

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
| Which models do we train, and how? | [Model training/evaluation plan](docs/AGAP_Model_Training_Plan.md); Qwen is the runtime candidate, EBM/logistic are offline research |
| How was this direct publication checked? | [Historical documentation publication](docs/AGAP_Direct_Publication_Verification.md); current application evidence is [here](docs/AGAP_Robert_Member_Verification.md) |
| How was the earlier model/assignment revision checked? | [Historical model revision verification](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Model_Training_Revision_Verification.md); documentation only |
| How was the earlier updated plan checked? | [25 October documentation verification](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Plan_Revision_Verification.md); no application features changed |

Historical partner briefs and the earlier product freeze remain for context and independent fictional arithmetic. Their prototype-only scope and backend-planning gate are superseded by the product solution; previously recorded implementation/verification evidence remains historical evidence, not proof of new production capabilities.

## Architecture

- `src/app`: routing and fictional demo state.
- `apps/api`, `apps/worker`, `packages/contracts`, `packages/api-client` and `infra`: candidate server/session/intake boundary; financial domains remain contract-only.
- `packages/finance`: the original deterministic assessment engine, extracted once with a compatibility re-export; Aaron owns subsequent finance changes.
- `src/features`: application list, evidence, repayment comparison, decision.
- `src/domain`: pure calculations, evidence and decision rules, template explanations.
- `src/shared/ui` and `src/styles`: shared controls and visual tokens.
- `src/demo`: fictional fixtures, validated/versioned browser repository.

Fictional review features share one `CaseRecord`. Screens call domain functions and save through the repository boundary; they do not maintain independent financial totals. Money is integer centavos and dates are calendar dates. Recorded decisions preserve their original evidence and explanation.

Robert's member-portal feature/API facade is supplied in this candidate. Planned additions retain exclusive owners: Aaron's reusable AI module, Benedict’s `models/qwen/`, Aaron’s `models/explainable/`, and Earl’s `evaluation/synthetic/` and `evaluation/explainable/` benchmarks. The [training plan](docs/AGAP_Model_Training_Plan.md) defines data and release gates; no trained model is supplied by this documentation. EBM/logistic research stays outside lending/member APIs. Member services use own-record authorization and domain ports; they do not copy staff roles, financial calculations or ledgers. Executable contract 0.2.0 is a review candidate; consuming owners must review its member-domain/provenance ports before dependent integration. No trained model is connected.

## Verification

```sh
npm run test:db
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, generated-contract drift checks, web/API builds, domain/UI tests and real PostgreSQL platform tests. Run it before browser tests because both reset the dedicated fictional `agap_test` database. Browser tests cover real intake plus explicitly simulated domain-port rendering. Build outputs are `dist/` and `dist-api/`. See [exact evidence and limits](docs/AGAP_Robert_Member_Verification.md) and the [recovery guide](docs/AGAP_Platform_Foundation.md#verify-and-recover).

## Demo walkthrough

1. Open Ana. Inspect the income conflict, select the current payslip, and save the correction with a reason.
2. Compare monthly remaining money with the lowest dated cash balance. Compare the requested schedule with the permitted after-payday schedule and inspect full cost.
3. Recommend an option with a reason. Switch the labeled demo role to Reviewer.
4. Review the template explanation and record a decision. Print the preserved member brief.
5. Return to Officer and change a fact: the previous decision stays available and the case requires renewed review.
6. Open Ben to demonstrate that a payment-date change cannot fix an overall shortfall. Open Cora to return an incomplete review for clarification.

Use **Reset demo** to restore all three original cases. If saved data cannot be loaded, the app preserves it until explicit reset and explains its memory-only fallback.

## Review status

The existing browser implementation and automated verification are tracked in the [frontend delivery PR](https://github.com/Aracena18/AGAP/pull/4). The verification record reports passing local checks and a [GitHub Actions startup issue](https://github.com/Aracena18/AGAP/issues/5); check live remote status before making a current CI claim. Visual acceptance and representative staff evaluation remain separate, pending activities. Production planning is authorized now under the linked product/architecture/delivery baseline; live readiness requires the additional implementation and evidence specified there.

Typography and icons are locally bundled. See [third-party notices](THIRD_PARTY_NOTICES.md).

Robert's foundation has separate [verification and critique](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md), [setup/integration instructions](docs/AGAP_Platform_Foundation.md) and [restore evidence](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Restore_Drill.json).

## Screenshots and printable example

[Evidence](docs/screenshots/evidence.png) · [Repayment comparison](docs/screenshots/comparison.png) · [Decision](docs/screenshots/decision.png) · [Fictional member brief](docs/screenshots/ana-member-brief.pdf). These show implementation, with team visual acceptance still pending.

Staff implementation: [Members](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/screenshots/platform/staff-members.png) · [Applications](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/screenshots/platform/staff-applications.png) · [Staff access](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/screenshots/platform/staff-access.png).

## Shared local administrator preview

The seeded account is `administrator` / `Fictional-training-123!`. To use password-only staff access on the fictional localhost preview, set `LOCAL_PREVIEW_PASSWORD_ONLY=true` in the private `.env`, run `npm run preview:setup`, then start the API/web servers. This optional setting defaults to false and is rejected outside loopback development. The setup updates only the fictional preview client and pending administrator OTP enrollment; it does not reset databases or delete credentials.

Open `/#/applications`, sign in and use the account menu to Sign out. Workspace navigation also offers Member portal and Staff workspace. Sensitive staff actions still require an authenticator through explicit step-up; member sign-in is unchanged. See the [platform guide](docs/AGAP_Platform_Foundation.md#shared-local-administrator-preview) for setup/verification.
