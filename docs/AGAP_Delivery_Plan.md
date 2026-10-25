# AGAP delivery and ownership plan

**Baseline:** 25 October 2026, Asia/Manila. Supersedes the earlier delivery instructions where they differ.

**Team:** Robert (A), Aaron (B), Benedict (C) and Earl (D). [Assignment.md](../Assignment.md) is the sole task/status tracker. This document defines scope, boundaries and acceptance; it is not another status register.

**Authorities:** [product solution](AGAP_Product_Solution.md), [architecture](AGAP_Production_Architecture.md), and [design.md](../design.md). Existing implementation and verification remain distinguishable from planned work.

## 1. Outcome and priorities

Deliver a coherent hackathon path first: member-phone application → evidence/CI and AI-assisted overlooked-expense clarification → deterministic options → accountable human decision/acceptance → controlled fictional disbursement/repayment/journal → member payment-help request and authorized follow-up. All phone-facing implementation stays with Robert.

The complete lending destination is retained, including full servicing, accounting, financial-health follow-up and operational readiness. An omitted demo path remains assigned later work. Demo manual money movements are simulated and labeled; no real funds or production records are required. Never bypass authorization, financial posting integrity or honest uncertainty to meet presentation scope.

The first demonstration uses equal provisional budgets of 12 relative units per owner, as recorded in Assignment.md. Budget the stated slices, their tests/review and the dependencies below; do not treat complete production packages as twelve hours of work. Re-estimate based on actual availability/progress without silently changing owners. The current platform/intake candidate is supplied work awaiting review, not a new implementation assignment.

## 2. Four ownership areas

Each developer owns their staff feature UI, service/domain logic, module persistence/migrations and tests. The member UI is the explicit exception: **Robert owns every member-phone screen**, while B–D supply the underlying domain services.

| Developer | Responsibility | Exclusive implementation paths |
| --- | --- | --- |
| Robert (A) — platform, member portal and integration | Shared contracts, identity and own-record member access, intake, member-portal facade/screens, notification infrastructure, wiring and operations | `src/app/`, `src/features/applications/`, `src/features/members/`, `src/features/access/`, new `src/features/member-portal/`; `src/shared/`, `src/styles/`, `src/demo/`; `src/domain/types.ts`, `format.ts`; `packages/contracts/`, `packages/api-client/`; `apps/api/src/platform/`, API bootstrap/scripts, modules `identity/`, `members/`, `applications/`, new `member-portal/`; worker bootstrap/notification infrastructure, `infra/`, root configuration/manifests/lockfile, `.github/` and shared documentation |
| Aaron (B) — evidence, credit and AI | Source/CI/issuer checks, draft confirmation, product/policy configuration, finance and offer comparison, one reusable AI adapter and expense assistance | `src/features/evidence/`, `src/features/comparison/`, `src/features/products/`; `src/domain/evidence.ts`, `assessment.ts` and corresponding tests; `packages/finance/` implementation only after Robert's extraction handoff; API modules `evidence/`, `credit/`, new `ai/` |
| Benedict (C) — decisions and servicing | Conflict-aware approval/acceptance, explanations, disbursement/payment/loan lifecycle, amendment comparisons and provider adapters | `src/features/decision/`, new `src/features/loans/`, `src/features/payments/`; `src/domain/review.ts`, `explanation.ts` and corresponding tests; API modules `decisions/`, `servicing/`, with payment adapters inside `servicing/` |
| Earl (D) — accounting, health and evaluation | Posting/reconciliation/capital/reporting, confirmed support requests/check-ins and staff queue, synthetic benchmark | New `src/features/accounting/`, `src/features/monitoring/`; API modules `accounting/`, `monitoring/`; new `evaluation/synthetic/` corpus/generator/manifests/evaluation runners and independently checked expectations |

API module paths are under `apps/api/src/modules/`. New paths are proposals, not existing features. Each owner controls their module's tests and migrations; Robert alone edits the central migration discovery/order and route/provider registration. Keep existing implementation paths; no broad frontend move is required.

Domain-specific AI prompts, result validation and confirmation rules stay in their owning module: Aaron for evidence/expenses, Benedict for decision explanations, Earl for health summaries. They call Aaron's one reusable provider adapter through the reviewed port. Robert connects the member UI to those services and owns common contracts/configuration. No owner creates a second provider client or calculator.

The member-portal facade owns member access/orchestration, not copies of evidence, balances, journals or health records. It calls B–D public services with server-established member context. B–D do not edit `member-portal/` paths or the member screens. Notification facts come from servicing/monitoring; Robert owns preferences/access and delivery infrastructure. First-demo delivery is an in-portal due notice; external channel simulations are visibly labeled.

Robert owns the canonical demo fixtures/types. Earl's evaluation corpus references those fixtures and historical oracles without copying a second baseline registry. New synthetic variants and their independent expected answers live only in the evaluation boundary; candidate shared manifest schemas still go through Robert.

## 3. Contract-first foundation and handoffs

The [platform guide](AGAP_Platform_Foundation.md) records supplied FND-01/FND-02 code and candidate contract 0.1.0. It remains subject to consuming-owner review; its financial endpoints are contract-only. The documentation branch does not freeze that contract or make its commit an accepted integration base.

Robert proposes the next canonical revision under FND-03: separate member principal/linkage and own-record permissions; source-linked AI drafts and explicit confirmation; irregular-cost inputs/horizon; member support requests and approved amendment reads; reminder preferences/read models. PLN-01 changes documentation only, not schemas, generated clients, migrations or executable versions.

Required handoffs:

| Producer → consumer | Boundary and acceptance |
| --- | --- |
| Robert → all | Reviewed actor/schema/client/transaction/error/version/idempotency contracts, registered routes/migrations and agreed base |
| Aaron → Robert/Benedict | Cleared source lifecycle, candidate versus accepted fact/verification projections, complete/incomplete checked assessments and permitted offers |
| Aaron → Benedict/Earl | One bounded AI adapter; callers retain domain prompts, source/output validation and human confirmation; manual/template fallback |
| Earl → Benedict | Real transaction-aware posting service and approved fictional mappings before any shown money path |
| Benedict → Robert/Earl | Dated posted loan position, schedule/receipt/status freshness and versioned amendment comparisons |
| Earl → Robert/Benedict | Confirmed support-request/task projections; health concerns do not amend contracts or write servicing/accounting tables |
| Earl → all | Held-out synthetic sources/ground truth and independent expected results; owners contribute evidence from their own modules |

One financial transaction updates servicing and accounting together. A module never writes another owner's tables. UI absence, candidate interfaces and synthetic issuer responses are not production controls.

## 4. Delivery stages

| Stage | Parallel work | Exit evidence |
| --- | --- | --- |
| 0 — current plan and contracts | Robert publishes the coordinated docs, preserves existing statuses and proposes member interfaces; B–D review their ports and build pure domain rules/independent examples within owned paths | Current tracker/briefs agree; owners record contract/base agreement before dependent integration |
| 1a — first vertical slices | Robert builds member access/portal shell; Aaron evidence, AI drafts and checked regular/irregular scenarios; Benedict decisions/conflicts/acceptance; Earl posting foundation and synthetic cases | Member-owned draft → confirmed facts → assessed option → separate reviewer path; sources, horizon and uncertainty visible |
| 1b — money and support | Benedict integrates controlled manual fictional disbursement/repayment with Earl's ledger/reconciliation; Earl provides support queue; Robert integrates own-loan notices/help; Benedict completes one authorized date amendment | No self-approval, duplicate posting or silent amendment; member confirms/accepts; original decisions/schedules preserved |
| 1c — evaluation/presentation | Earl compares AI with annual-expense checklist/plain form; owners supply module evidence; Robert integrates and packages screenshots/walkthrough | Faithful source-linked drafts, independent arithmetic, usable handoff and accurate implemented/planned labels; relevant feature checks pass |
| 2 — complete product/readiness | Each existing owner completes the retained scope below; Robert completes identity/offsite recovery, integration and deployment evidence | Full product acceptance plus institutional rules, security/restore, cutover/reconciliation and observed workflow evaluation |

First-demonstration budgets cover the acceptance slices below. They do not remove stage 2 work, certify a live release or imply the event date guarantees completion.

## 5. Work packages and acceptance

Status and next action live only in [Assignment.md](../Assignment.md). A task has one accountable owner; other developers contribute/review only their own boundary. Acceptance below includes the integrity requirements in each updated owner brief.

| ID | Owner | First-demonstration slice | Relative units | Retained later work |
| --- | --- | --- | --- | --- |
| PLN-01 | Robert | Coordinated documentation and draft PR; no feature implementation | — | Future changes follow the same sources of truth |
| FND-01 | Robert | Review the supplied platform/contracts candidate | Already supplied; review in A budget | Freeze only with consuming-owner evidence |
| FND-02 | Robert | Review supplied staff identity/intake | Already supplied; review in A budget | Remaining staff UX refinements stay with Robert |
| FND-03 | Robert | Member identity linkage/own-record scopes and next contract proposals | 4 | Access recovery, broader administration and production enrollment |
| MOB-01 | Robert | Responsive apply/upload/confirm/status/loan/in-portal-reminder/help path | 5 | Broader member self-service and external notification channels |
| EVD-01 | Aaron | Controlled fictional uploads, source facts, recorded CI/issuer check and corrections | 3 | Additional evidence alternatives, lifecycle/retention and authorized issuer integrations |
| CRD-01 | Aaron | Explicit permitted PHP offers; costs and dated regular/confirmed-irregular cash flow with visible horizon | 5 | Approved product variants, seasonal/full-term projections with explicit inputs and edge cases |
| AI-01 | Aaron | One bounded adapter; source extraction, one focused clarification and irregular-cost suggestions | 4 | Additional formats/languages and domain drafting after measured evaluation |
| DEC-01 | Benedict | Separate preparer/reviewer, conflict restriction/reassignment, current snapshot and member acceptance | 4 | Full configured quorum/limits/exception and expiry combinations |
| GL-01 | Earl | Minimal approved fictional chart, balanced posting, uniqueness and period guards | 5 | Complete chart/posting-rule versions and close/adjustment breadth |
| PAY-01 | Benedict | Controlled fictional manual disbursement → repayment → receipt using the real posting service | 5 | Provider-backed release, allocation variants, refunds/reversals and reconciliation exceptions |
| HLT-01 | Earl | Confirmed check-in/help request, dated position, staff assignment/action and unavailable answers | 3 | Follow-up histories, review scheduling and longitudinal outcome reporting |
| ACC-01 | Earl | Receipt/loan-subledger/GL reconciliation for the shown money path | 2 | Share capital, complete cash/bank reconciliation, reports, period close and adjustments |
| SRV-01 | Benedict | One policy-permitted fictional due-date amendment, compared/approved/accepted with history | 3 | Other temporary arrangements, amount/term restructuring, settlement, refund, write-off/recovery |
| EVAL-01 | Earl | Small held-out verifiable synthetic corpus and comparison with checklist/plain form | 2 | Broader data quality/language evaluation and separately authorized member outcome study |
| OPS-01 | Robert | Preserve and use supplied local operating evidence; no live release implied | Stage 2; groundwork ongoing | Complete identity/offsite recovery, keys, monitoring, opening data and cutover reconciliation |
| SHOW-01 | Robert | Contract-review coordination, integrated fictional journey and accurate evidence packaging | 3 | Repeat integration/regression and institutional release evidence as scope expands |

Owner briefs: [Robert](tasks/production/01-platform.md), [Aaron](tasks/production/02-evidence-credit.md), [Benedict](tasks/production/03-decisions-servicing.md), [Earl](tasks/production/04-accounting-monitoring.md). Updated briefs explicitly supersede their earlier task directions; progress remains in the central tracker and dated handoff evidence.

## 6. Conflict-prevention and verification

- Use isolated worktrees/task branches based on the actual owner-agreed foundation commit. Do not reuse, reset or overwrite another worker's branch. Candidate PR #10 remains unmerged unless the user authorizes it.
- Only Robert edits shared contracts/client, configuration/dependencies, route/provider/migration registration, tokens and canonical demo data. Workers submit proposed interface/wiring changes in their own brief/PR, with task ID and dependencies.
- Robert performs the one-time finance extraction/re-export handoff. Aaron then owns the single package implementation; no parallel calculator is allowed.
- B–D retain staff/domain ownership while Robert alone builds member-portal screens and facade. Aaron's shared AI adapter has no decision/payment/posting authority; domain callers validate drafts and preserve confirmation provenance.
- Every module owns its append-only migrations/tests. Central registration is Robert's; no worker alters another owner's applied migration or table. Adjacent owners review transaction and permission boundaries.
- Feature integration requires `npm run check`, `npm run test:e2e`, relevant backend/DB/financial tests and UI screenshots. Documentation-only changes use link, task/dependency, ownership and consistency checks. An AI test must distinguish the real provider from a labeled stub/template.
- Preserve Ana/Ben/Cora and the historical arithmetic. New source/expense tests cover missing/conflicting data, confirmation, beyond-cycle dates, double counting, independent verification, self-approval/conflict restrictions, posted-money integrity and unchanged contracts while help is pending.
- Compare AI with a checklist/plain form on held-out synthetic cases. Report corrections, missed expenses, unsupported claims, latency and user/staff effort. Synthetic technical results are not borrower-outcome evidence.
- Keep local verification distinct from remote CI. The [recorded remote startup issue](AGAP_Verification.md) remains unresolved unless new evidence establishes otherwise. No unrelated account/hosting/billing changes are authorized by this documentation update.
- Keep `Assignment.md` as the sole status tracker. Existing GitHub issues and PR descriptions remain unchanged; publish PLN-01 in a new draft PR stacked on #10. Never merge without the user's authorization.

## 7. Inputs that must be settled before live deployment

These do not prevent architecture or fictional development, but cannot be replaced by invented live defaults:

| Input | Responsible institutional/team role | Affected work |
| --- | --- | --- |
| Exact loan products, rates, fees, grace/day-count/rounding and payment allocation | Cooperative product owner and accountant | Credit, disclosures, servicing and GL posting |
| Evidence alternatives, CI/issuer practice, conflict declarations/recusal, authority limits, quorum and exceptions | Cooperative credit/approval officers | Evidence, decisions and access scopes |
| Chart, interest recognition, provisions, reporting and period/capital rules, including current applicable requirements | Cooperative accountant/responsible officer | Accounting, financial reports and capital |
| Cash/bank operating controls, electronic provider access/fees and reconciliation | Cashier/treasury and payment provider | Disbursement, repayments, refunds and incident handling |
| Existing member/loan/capital data and cutover balances | Cooperative data/finance owners | Migration and opening reconciliation |
| Member account linkage/recovery, support eligibility, amendment approvals and reminder delivery | Cooperative identity/credit/servicing owners | Member access, support workflow, notifications and contract changes |
| Privacy purposes, retention/holds and any external credit/AI processing | Institution's responsible privacy role | Documents, evidence, history and external adapters |
| Actual hosting hardware, operator, backups, capacity and recovery objectives | Team A plus institution's operator | Deployment feasibility and ongoing cost |
| Presenter format, time limit and any final-round-specific rubric | Team/organizer materials | Presentation sequence and evidence packaging |

No guaranteed completion date, production certification or free hosted operating budget follows from this plan. The four-person split reduces conflicting edits; its workload and live readiness still depend on implementation and verified institutional inputs.
