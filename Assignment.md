# AGAP team responsibilities and status

**Submission reference: 6 November 2026, Asia/Manila.** This is the compact ownership/status reference. Implementation and historical test evidence are summarized in [verification](docs/AGAP_Verification.md); target capabilities are defined in the [product solution](docs/AGAP_Product_Solution.md).

## Ownership

| Contributor | Responsibilities |
| --- | --- |
| Robert | Platform, identity, all member-facing screens/facade, shared contracts/client, routing, common controls/tokens, configuration, infrastructure, and integration |
| Aaron | Evidence and independent source checks, credit/policy/affordability, shared finance implementation, one reusable AI adapter, and offline EBM/logistic research |
| Benedict | Human decisions, member acceptance, servicing/payment lifecycle, Qwen training, and artifact handoff |
| Earl | Accounting/reconciliation, member support and follow-up, synthetic corpus preparation, and independent model evaluation |

Each module owner maintains its migrations and tests. Robert owns shared contract changes and central route/provider/migration registration. All member-phone UI belongs to Robert; other owners expose domain services through reviewed ports. Detailed boundaries and handoffs are in the [delivery plan](docs/AGAP_Delivery_Plan.md).

## Current status

| Work | Recorded state | Remaining acceptance |
| --- | --- | --- |
| Platform/member access | Authenticated intake, own-record access, portal screens, and local identity checks supplied | Institutional enrollment/recovery policy, consuming-owner acceptance, and complete operational recovery |
| Evidence/credit/AI adapter | Server evidence/fact workflow, shared dated assessments, history, and manual fallback supplied | Approved institutional rules; actual scanner/OCR/model execution and independent acceptance |
| Decisions/servicing | Approval, exact-term acceptance, and principal-only simulated money path connected behind the fictional pilot gate | Receiving-owner review, broader servicing components, and live operating controls |
| Accounting | Atomic journals, bounded reconciliation, immutable trial balances, and pilot integration supplied | Approved account mappings, nonprincipal/reversal treatment, capital, reporting/close, and institutional review |
| Support/health | Confirmed requests, linked corrections, member-confirmed assisted check-ins, scoped responses/tasks/history, and safe current-position reads supplied | Representative-user/privacy acceptance and remaining health-review scope |
| Priority review | Browser demo and gated server queue, concern checking, escalation, and in-app notices supplied | Institutional authority/materiality rules and representative workflow evaluation |
| Qwen | Experiment D evidence, F import/service candidate, and actual offline CPU compatibility execution supplied | Actual compatible-GPU inference, reproducibility gaps, independent evaluation, and promotion decision |
| Explainable research | EBM/logistic training/evaluation protocol documented | Verified survey/codebook mapping, fixed artifacts, and measured independent results |
| Evaluation | Synthetic development packs, integrity/scoring tools, and normalized EBM/logistic export evaluator supplied | Actual label review, protected holdout, approved release, and final model comparisons |
| Deployment/recovery | Local application checks, deployment preparation, and public Vercel frontend supplied | Hosted API/identity connection, GPU quota/eligibility, fresh credit evidence before future allocation, deployed processing, full identity/offsite restore, and institutional release |

These states describe supplied candidates, not completed work packages or a production release. Historical work remains in progress where review or external evidence is missing. Publication alone records no independent acceptance.

## Latest integrated demonstration

The current checkout also includes local startup diagnostics/supervision, connected staff review/member acceptance and money workspaces, and a prepared two-minute recording with actual persisted officer recommendation/member refresh. Its local password-only option records actual single-factor assurance and preserves privileged MFA. Scripted preview ratings and authored recording findings are not validated predictive results. The student-credit CPU model experiment completed and its temporary resource group was removed; operational serving and independent model acceptance remain pending.

**OPS-01 / SHOW-01 — 6 November 2026:** the user requested Vercel deployment and completed account verification. GitHub `main` revision `9930fe4` deployed successfully to [agap-eight.vercel.app](https://agap-eight.vercel.app/) in project `aracena18s-projects/agap`. The public landing is also verified at [www.agap.software](https://www.agap.software/), with both custom domains valid and the root redirecting to `www`; member/staff workflows still require a hosted API and identity service. [Deployment evidence](docs/AGAP_Verification.md#vercel-frontend-deployment--6-november-2026) records the deployment identity, checks, screenshot and remaining boundaries. No application behavior, other-owner source, model promotion or institutional acceptance changes.

## Planned extensions

Contractual hardship amendments, member goals/savings guidance, institution-rubric numerical 5C assessment, external reminder channels, and complete production lending/accounting remain planned. Their additional effort is unestimated; the historical four-person, 64-unit first-demonstration estimate is not a completion commitment or an allowance for those extensions.

## Contribution workflow

Use isolated task branches/worktrees and preserve unrelated work. Coordinate shared contracts and consuming-module changes before integration. Keep one finance engine, one inference adapter, immutable historical records, and explicit unavailable values.

Feature integration requires the checks in [AGENTS.md](AGENTS.md), relevant module tests, and screenshots when UI changes. Documentation-only work requires link, consistency, and artifact-integrity checks. The standing collaboration workflow permits normal direct pushes of checked, requested work to `main`; create a PR only when requested. Existing PR merges and production releases retain their separate authorization requirements.
