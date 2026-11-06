# AGAP

**Financial health lending for cooperatives.**

AGAP connects loan applications, source-linked evidence, household cash flow, human review, and payment support. It helps staff see whether repayments fit a member's everyday needs, including irregular expenses and the dates when cash is actually available.

This repository is the APRU hackathon prototype. All demonstration records and money movements are fictional. It includes a browser review demo, authenticated member and staff workspaces, and a gated server-backed lifecycle pilot. A recorded CPU compatibility experiment executed the model; operational model serving, independent acceptance, and institutional deployment remain incomplete; see [verification and limitations](docs/AGAP_Verification.md).

## What the prototype demonstrates

| Capability | Implemented behavior |
| --- | --- |
| Member access | Own-record applications, document/fact confirmation screens, loan views, reminder preferences, consented support, linked corrections, and member-confirmed assisted check-ins |
| Evidence and affordability | Source-linked corrections, explicit missing information, dated household cash flow, irregular expenses, full contractual costs, and preserved assessment history |
| Accountable review | Priority queues, human checking of AI concerns, escalation, separate preparation/approval, and renewed review after material changes |
| Fictional lending lifecycle | Gated approval, exact-term member acceptance, principal-only simulated disbursement/repayment, atomic general-ledger posting, and reconciliation |
| Financial-health support | Member-confirmed requests, assignment, staff responses, follow-up tasks, and a distinction between submitted and current posted loan positions |
| AI and evaluation | Qwen extraction/review adapters, verified artifact import, actual offline CPU execution, dataset preparation, and evaluation tools; human confirmation and deterministic calculations retain authority |

The evidence workflow and both alternative server lending modes default off. `CONNECTED_LENDING_ENABLED` and `FICTIONAL_PILOT_ENABLED` are mutually exclusive. Their additional services, configuration, and accepted inputs are described in the [setup guide](docs/AGAP_Platform_Foundation.md) and [pilot guide](infra/azure/pilot/README.md). The default local setup below supports intake, support, and the fictional browser review demo. Unconfigured capabilities display unavailable states.

## Run locally

Requirements: **Node.js 24**, **npm 11.9.0**, Docker with **Compose 2.24.4+**, and a browser. Open Docker Desktop first. Initial dependency/container downloads require network access.

```sh
npm ci
npm run local:dev -- --init-env --migrate --seed
```

The foreground helper preserves an existing `.env`, checks configured ports, starts database/identity dependencies, runs the explicitly requested migration/fictional seed, and supervises the API and frontend. Keep the terminal open; Ctrl+C stops only its application processes. Later starts normally need only `npm run local:dev`. Use `npm run local:doctor` for read-only diagnostics. In Windows PowerShell, use `npm.cmd`.

Open the URL printed after **AGAP is ready** (default [local application](http://127.0.0.1:5174/)). Use `/#/member` for the seeded `member`, `/#/staff` for staff intake, or `/#/applications` for the browser review cases. Staff accounts include `officer`, `auditor`, and `administrator`; those seeded application accounts use the public development password `Fictional-training-123!`. Complete authenticator enrollment when requested. Existing identity databases are preserved.

See the [setup guide](docs/AGAP_Platform_Foundation.md#local-development-workflow--6-november-2026) for manual startup, Windows reserved ports, migrations, and feature configuration. Workers, scanning/OCR, inference, and institutional policy retain separate prerequisites.

## Two-minute member-to-officer demonstration

The [prepared walkthrough](docs/AGAP_Demo_Walkthrough.md) shows a member application, stored supporting documents, saved clarification answers, requested/alternative payment dates, narrative 5C findings, and an officer recommendation that persists back to the member. Preparation uses fictional records and named immutable takes. The recording path supports explicitly enabled local email/password sign-in; privileged actions retain their MFA requirements.

The take uses authored findings and deterministic what-if calculations, not live model inference or final loan approval. The separate unprepared analysis preview includes scripted risk percentages and 5C ratings; these are illustrative code outputs, not validated probabilities or an institution-approved scorecard. Prepared recording findings assign no numerical score.

## Review-demo walkthrough

1. Sign in to the review workspace and open **Ana**. Inspect the income conflict, select the current payslip, and save the correction with a reason.
2. Compare monthly remaining money with the lowest dated cash balance. Ana's requested schedule creates a timing shortfall; the permitted after-payday schedule avoids it in the modeled period.
3. Confirm period coverage, inspect the source-linked simulated AI concern, recommend an offer, and review the priority/escalation summary. **Demo tools** switches between the fictional people Mara and Luis; it grants no server authority.
4. Check concerns, investigate assigned escalations, and record the separate human review. Print the preserved member brief.
5. Change a material fact or selected offer. The earlier decision remains available and the case requires renewed review.
6. Open **Ben** to see why changing a payment date cannot fix an overall shortfall. Open **Cora** to see an incomplete assessment that requires clarification.

**Reset demo** restores the three browser fixtures. This walkthrough uses browser-persisted fictional cases; the separately configured server pilot uses server records and normal identity controls.

## Architecture

React, TypeScript, and Vite serve the web application. A NestJS modular monolith and PostgreSQL own server records, with Keycloak sessions, private document storage, and a separate worker. Shared finance code calculates integer-centavo amounts and calendar-date cash flow. Model output is an untrusted draft: it cannot verify authenticity, calculate lending results, approve loans, or post money.

| Source | Purpose |
| --- | --- |
| `src/` | Landing page, member/staff workspaces, browser demo, shared controls, and fictional fixtures |
| `apps/api/`, `apps/worker/` | Authorized domain services and background processing |
| `packages/contracts/`, `packages/api-client/` | Runtime schemas, generated OpenAPI, and typed client |
| `packages/finance/` | Shared deterministic financial calculations |
| `models/`, `evaluation/` | Model artifacts/tools, dataset preparation, and independent evaluation protocols |
| `infra/` | Local services, identity configuration, recovery tools, and deployment preparation |

## Verification

```sh
npm run test:db
# Required by platform tests; this is the dedicated fictional test database.
export AGAP_TEST_DATABASE_URL=postgresql://agap_owner:development-owner@127.0.0.1:55433/agap_test
npm run check
npx playwright install chromium
npm run test:e2e -- --workers=1 --trace off
```

Run database and browser suites sequentially: they reset the dedicated `agap_test` database. The [verification record](docs/AGAP_Verification.md) separates dated local results, model test doubles, actual identity walkthroughs, and outstanding release evidence.

## Documentation and screenshots

- [Product and feature boundaries](docs/AGAP_Product_Solution.md)
- [Architecture and financial invariants](docs/AGAP_Production_Architecture.md)
- [Frontend behavior](docs/AGAP_Frontend_Spec.md) and [design system](design.md)
- [Model training and evaluation](docs/AGAP_Model_Training_Plan.md)
- [Policy questions](docs/AGAP_Policy_Clarification_Register.md) and [historical calculation oracles](docs/AGAP_Product_Freeze.md#5-the-fictional-demonstration)
- [Team responsibilities](Assignment.md) and [contributor instructions](AGENTS.md)

Screenshots: [landing](docs/screenshots/local-startup-2026-11-04/landing.png), [member application at 320px](docs/screenshots/pr26-integration/member-320.png), [financial workspace](docs/screenshots/experiment-f-pilot/financial-desktop.png), and [review queue at 320px](docs/screenshots/experiment-f-pilot/queue-320.png). [Fictional printable member brief](docs/screenshots/ana-member-brief.pdf).

Typography and icons are bundled locally. See [third-party notices](THIRD_PARTY_NOTICES.md).
