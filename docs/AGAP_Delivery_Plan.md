# AGAP delivery and ownership plan

The supplied hackathon prototype includes a browser review demo and gated server-backed evidence, review, fictional lending, accounting, and support workflows. [Verification](AGAP_Verification.md) records dated checks; [Assignment.md](../Assignment.md) is the current ownership/status reference. Local startup tooling, connected lending/money workspaces, prepared recording, trial balance, assisted check-ins/corrections, and actual CPU model execution are also supplied. Institutional acceptance and complete live lending remain pending.

## Ownership boundaries

| Owner | Exclusive responsibility and implementation boundary |
| --- | --- |
| Robert | All member-phone UI and portal facade; `src/app/`, access/intake/member features, shared controls/tokens/fixtures, canonical domain types, contracts/client, platform/bootstrap/scripts, identity/member/application modules, central registration, infrastructure, configuration/dependencies, and shared documentation |
| Aaron | Evidence/comparison/product features, evidence and assessment domain rules, `packages/finance/`, API evidence/credit/AI modules, and `models/explainable/` research training |
| Benedict | Decision/loan/payment features, review/explanation domain rules, API decisions/servicing modules and payment adapters, and `models/qwen/` training/artifact tooling |
| Earl | Accounting/monitoring features and API modules, ledger/reconciliation, support/check-ins, `evaluation/synthetic/`, and `evaluation/explainable/` independent protocols/results |

Owners maintain their module migrations/tests. Robert registers routes/providers/migrations and reviews canonical contracts, clients, common UI, configuration, and dependencies. Other owners expose member-specific domain services rather than editing member screens or writing another module's tables. Work in isolated task branches/worktrees and preserve unrelated work.

## Required handoffs

| Producer → consumer | Reviewable boundary |
| --- | --- |
| Robert → all | Actor/scope, schema/client, transaction, error/version/idempotency, and registration contracts |
| Aaron → Robert/Benedict | Cleared source lifecycle, candidate/confirmed facts versus independent verification, complete/incomplete assessments, and permitted offers |
| Aaron → domain owners | One bounded AI adapter; callers retain prompts, source/output validation, confirmation, and manual fallback |
| Benedict → Earl/Robert | Current authorized decision/acceptance, durable release/payment commands, posted loan/schedule/receipt projections, and later amendment comparisons |
| Earl → Benedict | Transaction-aware balanced posting with approved mappings and source-event uniqueness |
| Earl → Robert/Benedict | Confirmed support requests/tasks, scoped responses, and position freshness; health records do not change loan terms |
| Earl → trainers | Reviewed corpus, grouped training/validation splits, and evaluation protocol; protected final labels remain evaluator-controlled |
| Trainers → Earl | Fixed artifact identities, data/config/environment hashes, preprocessing, actual logs, resource limits, and reproducible inference |
| Earl → integration | Independent comparisons, errors/uncertainty, and explicit promotion or non-promotion recommendation |

Use one shared finance engine and one inference adapter. Domain services pass the same transaction through a financial posting. Browser fixtures remain canonical in `src/demo/cases.ts`; evaluation variants and independent expected answers belong in the evaluation boundary.

## Delivery stages and acceptance

| Stage | Acceptance |
| --- | --- |
| Prototype integration | Fictional member intake → confirmed facts → checked offers → separate current-input review; source, horizon, uncertainty, and preserved history visible |
| Fictional money/support | Exact-term acceptance → separately authorized simulated movement → atomic subledger/GL → reconciliation → consented support; unknown outcomes and retries remain explicit |
| Model evaluation | Reproducible fixed artifacts; reviewed grouped data; independent baseline/tuned/checklist comparisons; no promotion based on training completion alone |
| Institutional release | Approved policies/mappings/access/privacy; completed financial components; actual processing/identity/model evidence; migration reconciliation; full identity/document/offsite restore; observed staff/member acceptance |

Current supplied behavior and pending inputs remain as recorded in [team status](../Assignment.md); this cleanup marks no work package complete. The historical estimate was four provisional 16-unit first-demo budgets (64 total), not a full-product estimate or a delivery guarantee.

Contractual amendments, member goals/product guidance, numerical institution-rubric 5C review, and their model/evaluation/UI work remain separately estimated later scope. The complete lending/accounting/operational destination is retained.

## Verification and publication

Feature integration requires `npm run check`, `npm run test:e2e`, relevant real database/permission/financial checks, and screenshots when UI changes. Preserve the independent Ana/Ben/Cora arithmetic, explicit unavailable states, stale-review guards, immutable decisions, cross-scope denial, duplicate/unknown movement handling, and atomic ledger behavior. Distinguish actual model execution from protocol doubles and measured participant effort from automated proxies.

Documentation-only changes use local link/anchor, command/configuration, consistency, and artifact-integrity checks. Historical results and remote CI are reported with dates; no local result establishes a current remote pass. The collaboration permits normal direct pushes of requested changes after checks, with no new PR unless requested. Existing PR merges, receiving-owner acceptance, and production releases retain separate authorization.

## Inputs required before live use

Obtain institution-approved product rates/fees/day-count/rounding/allocation, source alternatives/verification freshness, authority/conflict/exception rules, chart/posting/reporting/period rules, cash/bank/provider controls, member linkage/recovery, privacy/retention/holds, and reminder/amendment permissions. Reconcile existing member/loan/capital balances at cutover. Confirm actual infrastructure capacity, operating costs, accountable operators, recovery objectives, and offsite restore evidence.

The [policy register](AGAP_Policy_Clarification_Register.md) records unresolved source questions. Goals need an approved catalogue/content/suitability process; numerical 5C work needs an approved rubric and calculation trace. Missing inputs are pending, never silently supplied by fictional defaults.
