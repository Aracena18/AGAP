# AGAP delivery and ownership plan

**5C addendum:** 29 October 2026. Institution-rubric review/explanation packages are additional unestimated stage 2 work, with actual criteria and weights unresolved; existing demo and goal commitments remain intact.

**Goals addendum:** 29 October 2026. New goal/planner/guidance tasks are additional unestimated scope, stage 2 by default. Current first-demo slices, 16 units per owner and existing task statuses remain unchanged. An earlier fictional goal slice requires an explicit capacity re-estimate and its acceptance evidence; it is not an additional commitment inside the 64 units.

**Baseline:** 25 October 2026, Asia/Manila. Supersedes the earlier delivery instructions where they differ.

**Team:** Robert (A), Aaron (B), Benedict (C) and Earl (D). [Assignment.md](../Assignment.md) is the sole task/status tracker. This document defines scope, boundaries and acceptance; it is not another status register.

**Authorities:** [product solution](AGAP_Product_Solution.md), [architecture](AGAP_Production_Architecture.md), and [design.md](../design.md). Existing implementation and verification remain distinguishable from planned work.

## 1. Outcome and priorities

Deliver a coherent hackathon path first: member-phone application → evidence/CI and AI-assisted overlooked-expense clarification → deterministic options → accountable human decision/acceptance → controlled fictional disbursement/repayment/journal → member payment-help request and recorded staff response/follow-up. Add a separately labeled explainable-model research exhibit; contractual amendments begin in stage 2. All phone-facing implementation stays with Robert.

The complete lending destination is retained, including full servicing, accounting, financial-health follow-up and operational readiness. An omitted demo path remains assigned later work. Demo manual money movements are simulated and labeled; no real funds or production records are required. Never bypass authorization, financial posting integrity or honest uncertainty to meet presentation scope.

The first demonstration uses equal provisional budgets of **16 relative units per owner (64 total)**, as recorded in Assignment.md. This replaces 12 each/48 total after adding model training and independent evaluation; availability and delivery dates must be re-estimated. Benedict retains SRV-01 in stage 2, including its first contractual amendment; demo help requests remain available without changing terms. Budget the stated slices, their tests/review and the dependencies below; units are not hours or complete production packages. Re-estimate based on actual availability/progress without silently changing owners. The current platform/intake candidate is supplied work awaiting review, not a new implementation assignment.

## 2. Four ownership areas

Each developer owns their staff feature UI, service/domain logic, module persistence/migrations and tests. The member UI is the explicit exception: **Robert owns every member-phone screen**, while B–D supply the underlying domain services.

| Developer | Responsibility | Exclusive implementation paths |
| --- | --- | --- |
| Robert (A) — platform, member portal and integration | Shared contracts, identity and own-record member access, intake, member-portal facade/screens, notification infrastructure, wiring and operations | `src/app/`, `src/features/applications/`, `src/features/members/`, `src/features/access/`, new `src/features/member-portal/`; `src/shared/`, `src/styles/`, `src/demo/`; `src/domain/types.ts`, `format.ts`; `packages/contracts/`, `packages/api-client/`; `apps/api/src/platform/`, API bootstrap/scripts, modules `identity/`, `members/`, `applications/`, new `member-portal/`; worker bootstrap/notification infrastructure, `infra/`, root configuration/manifests/lockfile, `.github/` and shared documentation |
| Aaron (B) — evidence, credit, AI integration and explainable ML | Source/CI/issuer checks, draft confirmation, product/policy configuration, finance and offer comparison, one reusable AI adapter/expense assistance; EBM and logistic-regression research training | `src/features/evidence/`, `src/features/comparison/`, `src/features/products/`; `src/domain/evidence.ts`, `assessment.ts` and corresponding tests; `packages/finance/` implementation following Robert's 26 October extraction handoff; API modules `evidence/`, `credit/`, new `ai/`; new `models/explainable/` training/preprocessing/run cards |
| Benedict (C) — decisions, servicing and Qwen training | Conflict-aware approval/acceptance, explanations, disbursement/payment/loan lifecycle, later amendment comparisons/provider adapters; Qwen3.5-2B LoRA training and artifact handoff | `src/features/decision/`, new `src/features/loans/`, `src/features/payments/`; `src/domain/review.ts`, `explanation.ts` and corresponding tests; API modules `decisions/`, `servicing/`, with payment adapters inside `servicing/`; new `models/qwen/` training/notebooks/configs/artifact manifests |
| Earl (D) — accounting, health and evaluation | Posting/reconciliation/capital/reporting, confirmed support requests/check-ins and staff queue; independent synthetic and explainable-model benchmarks | New `src/features/accounting/`, `src/features/monitoring/`; API modules `accounting/`, `monitoring/`; new `evaluation/synthetic/` corpus/generator/manifests/evaluation runners and independently checked expectations; new `evaluation/explainable/` split/evaluation protocols and reports |

API module paths are under `apps/api/src/modules/`. Member-portal paths and `packages/finance` now exist in Robert's candidate; other new domain/model/evaluation paths remain planned. Each owner controls their module's tests and migrations; Robert alone edits the central migration discovery/order and route/provider registration. Keep existing implementation paths; no broad frontend move is required.

Domain-specific AI prompts, result validation and confirmation rules stay in their owning module: Aaron for evidence/expenses, Benedict for decision explanations, Earl for health summaries. They call Aaron's one reusable provider adapter through the reviewed port. Robert connects the member UI to those services and owns common contracts/configuration. No owner creates a second provider client or calculator.

The member-portal facade owns member access/orchestration, not copies of evidence, balances, journals or health records. It calls B–D public services with server-established member context. B–D do not edit `member-portal/` paths or the member screens. Notification facts come from servicing/monitoring; Robert owns preferences/access and delivery infrastructure. First-demo delivery is an in-portal due notice; external channel simulations are visibly labeled.

Model training is distinct from runtime integration: Benedict alone writes `models/qwen/`; Aaron alone writes `models/explainable/` and the existing planned application `ai/` adapter; Earl owns the two `evaluation/` subdirectories. No shared top-level model/evaluation configuration or dependencies are added without Robert. Training consumes Earl’s approved manifests through reviewed file interfaces; trainers do not edit holdout labels or evaluation runners. EBM results have no operational API or connection to member assessments. Details and release checks are in the [model training plan](AGAP_Model_Training_Plan.md).

Robert owns the canonical demo fixtures/types. Earl's evaluation corpus references those fixtures and historical oracles without copying a second baseline registry. New synthetic variants and their independent expected answers live only in the evaluation boundary; candidate shared manifest schemas still go through Robert.

## 3. Contract-first foundation and handoffs

The [platform guide](AGAP_Platform_Foundation.md) now records the supplied FND-01/FND-02 plus member-intake/portal candidate on `feat/robert-member-platform`. Contract 0.2.0, its shared member-domain ports and the base remain subject to consuming-owner review. Financial endpoints are contract-only; default member domain projections are unavailable. [26 October evidence](AGAP_Robert_Member_Verification.md) separates real persistence/authentication from simulated domain rendering.

Robert supplies the 0.2.0 FND-03 candidate for review: separate member principal/linkage and own-record permissions; source-linked AI drafts and explicit confirmation; irregular-cost inputs/horizon; member support requests and approved amendment reads; reminder preferences/read models. FND-03 includes source/model artifact/provenance candidate schemas; runtime promotion/configuration remains dependent on the actual AI/training/evaluation artifacts. PLN-01/PLN-02 change documentation only, not schemas, generated clients, migrations or executable versions.

30 October technical handoff: [Robert's review](AGAP_Foundation_Contract_Review.md) records the supplied GL-01 posting implementation and EVAL-01 development tools, registers accounting migrations and adds the evaluation-local checks to the existing root/CI check path. This does not implement PAY-01, accept a training release, freeze the contract or record another owner's approval. Source/migration/corpus/evaluation ownership and existing budgets remain intact; the central tracker records partial progress from the merged evidence.

Required handoffs:

| Producer → consumer | Boundary and acceptance |
| --- | --- |
| Robert → all | Reviewed actor/schema/client/transaction/error/version/idempotency contracts, registered routes/migrations and agreed base |
| Aaron → Robert/Benedict | Cleared source lifecycle, candidate versus accepted fact/verification projections, complete/incomplete checked assessments and permitted offers |
| Aaron → Benedict/Earl | One bounded AI adapter; callers retain domain prompts, source/output validation and human confirmation; manual/template fallback |
| Earl → Benedict | Real transaction-aware posting service and approved fictional mappings before any shown money path |
| Benedict → Robert/Earl | Dated posted loan position, schedule/receipt/status freshness and versioned amendment comparisons |
| Earl → Robert/Benedict | Confirmed support-request/task projections; health concerns do not amend contracts or write servicing/accounting tables |
| Earl → Benedict/Aaron | Frozen training/validation corpus references and research split/protocol handoff first; holdout labels stay out of tuning, with final evaluation after artifacts return |
| Benedict → Aaron/Robert | Qwen base revision, LoRA artifact checksum/config/license, input/output limits and reproducible run/model card; no second application provider client |
| Aaron → Earl | EBM/logistic artifacts, feature/target mappings, preprocessing and training logs; offline research only |
| Earl → all | Independent Qwen/checklist and EBM/logistic reports, errors/uncertainty and release recommendation; owners contribute module evidence |

One financial transaction updates servicing and accounting together. A module never writes another owner's tables. UI absence, candidate interfaces and synthetic issuer responses are not production controls.

## 4. Delivery stages

| Stage | Parallel work | Exit evidence |
| --- | --- | --- |
| 0 — current plan and contracts | Robert publishes the coordinated docs, preserves existing statuses and proposes member interfaces; B–D review ports; Earl freezes corpus/splits and independent labels; Aaron verifies public-research data terms/codebook; Benedict prepares Qwen baseline/smoke test | Current tracker/briefs agree; owners record contract/base agreement before dependent integration |
| 1a — first vertical slices | Robert builds member access/portal shell; Aaron evidence, AI drafts and checked regular/irregular scenarios; Benedict decisions/conflicts/acceptance; Earl posting foundation and corpus; Benedict also starts QWN-01 LoRA; Aaron starts XAI-01 CPU training | Member-owned draft → confirmed facts → assessed option → separate reviewer path; sources, horizon and uncertainty visible |
| 1b — money and support | Benedict integrates controlled manual fictional disbursement/repayment with Earl's ledger/reconciliation; Earl provides support queue; Robert integrates own-loan notices/help; Benedict retains amendments for stage 2 | No self-approval, duplicate posting or promised automatic relief; original terms and decisions preserved |
| 1c — evaluation/presentation | Earl independently compares pretrained/tuned Qwen/checklist/plain form and EBM/logistic artifacts; owners supply module evidence; Robert integrates eligible inference and packages screenshots/walkthrough | Recorded model metrics/errors/resource limits; truthful release or rejection; separate research exhibit; relevant feature checks pass |
| 2 — complete product/readiness | Each existing owner completes the retained scope below; Robert completes identity/offsite recovery, integration and deployment evidence | Full product acceptance plus institutional rules, security/restore, cutover/reconciliation and observed workflow evaluation |

First-demonstration budgets cover the acceptance slices below. They do not remove stage 2 work, certify a live release or imply the event date guarantees completion.

## 5. Work packages and acceptance

Status and next action live only in [Assignment.md](../Assignment.md). A task has one accountable owner; other developers contribute/review only their own boundary. Acceptance below includes the integrity requirements in each updated owner brief.

| ID | Owner | First-demonstration slice | Relative units | Retained later work |
| --- | --- | --- | --- | --- |
| PLN-01 | Robert | Coordinated documentation and draft PR; no feature implementation | — | Future changes follow the same sources of truth |
| PLN-02 | Robert | Model-training architecture/assignments and draft PR; documentation only | — | Future model changes follow reviewed contracts/evaluation |
| FND-01 | Robert | Review the supplied platform/contracts candidate | Already supplied; review in A budget | Freeze only with consuming-owner evidence |
| FND-02 | Robert | Review supplied staff identity/intake | Already supplied; review in A budget | Remaining staff UX refinements stay with Robert |
| FND-03 | Robert | Member identity/own-record scopes; model artifact/provenance and next contract proposals | 5 | Access recovery, broader administration and production enrollment |
| MOB-01 | Robert | Responsive apply/upload/confirm/status/loan/in-portal-reminder/help path | 5 | Broader member self-service and external notification channels |
| EVD-01 | Aaron | Controlled fictional uploads, source facts, recorded CI/issuer check and corrections | 3 | Additional evidence alternatives, lifecycle/retention and authorized issuer integrations |
| CRD-01 | Aaron | Explicit permitted PHP offers; costs and dated regular/confirmed-irregular cash flow with visible horizon | 5 | Approved product variants, seasonal/full-term projections with explicit inputs and edge cases |
| AI-01 | Aaron | One bounded inference adapter; source extraction, one focused clarification and irregular-cost suggestions | 4 | Additional formats/languages and domain drafting after measured evaluation |
| QWN-01 | Benedict | Pretrained baseline, Qwen3.5-2B LoRA run, reproducible artifact/model card and handoff | 7 | Broader languages/formats or retraining only after measured need and capacity review |
| XAI-01 | Aaron | CPU EBM and logistic-regression baseline for reported emergency-fund difficulty; offline research | 4 | Cooperative-relevant validation requires a separate data/target/deployment proposal |
| DEC-01 | Benedict | Separate preparer/reviewer, conflict restriction/reassignment, current snapshot and member acceptance | 4 | Full configured quorum/limits/exception and expiry combinations |
| GL-01 | Earl | Minimal approved fictional chart, balanced posting, uniqueness and period guards | 5 | Complete chart/posting-rule versions and close/adjustment breadth |
| PAY-01 | Benedict | Controlled fictional manual disbursement → repayment → receipt using the real posting service | 5 | Provider-backed release, allocation variants, refunds/reversals and reconciliation exceptions |
| HLT-01 | Earl | Confirmed check-in/help request, dated position, staff assignment/action and unavailable answers | 3 | Follow-up histories, review scheduling and longitudinal outcome reporting |
| ACC-01 | Earl | Receipt/loan-subledger/GL reconciliation for the shown money path | 2 | Share capital, complete cash/bank reconciliation, reports, period close and adjustments |
| SRV-01 | Benedict | No contractual amendment in first-demo scope; help requests receive recorded staff response | Stage 2 | First permitted due-date amendment with cost comparison/approval/acceptance/history; other arrangements, restructure, settlement, refund, write-off/recovery |
| EVAL-01 | Earl | Owned corpus/grouped splits, pretrained/tuned Qwen/checklist and independent EBM/logistic evaluation | 6 | Broader data quality/language evaluation and separately authorized member outcome study |
| OPS-01 | Robert | Preserve and use supplied local operating evidence; no live release implied | Stage 2; groundwork ongoing | Complete identity/offsite recovery, keys, monitoring, opening data and cutover reconciliation |
| SHOW-01 | Robert | Contract review; model runtime/artifact wiring; fallback/release checks; integrated journey and model evidence packaging | 6 | Repeat integration/regression and institutional release evidence as scope expands |

Owner briefs: [Robert](tasks/production/01-platform.md), [Aaron](tasks/production/02-evidence-credit.md), [Benedict](tasks/production/03-decisions-servicing.md), [Earl](tasks/production/04-accounting-monitoring.md). Updated briefs explicitly supersede their earlier task directions; progress remains in the central tracker and dated handoff evidence.

### Additional goal-guidance packages

The [product scope](AGAP_Product_Solution.md#member-goals-savings-and-cooperative-product-guidance) and [model extension](AGAP_Model_Training_Plan.md#6-goal-guidance-training-extension-29-october-2026) govern these packages. They reuse the exclusive paths above and do not add another model family, provider client, calculator or deposit/investment execution service. PLN-03 is documentation only; all feature packages start Not started in Assignment.md. They are not prerequisites for the existing SHOW-01 core journey.

| ID | Accountable owner | Existing owned boundary | Dependencies and acceptance |
| --- | --- | --- | --- |
| PLN-03 | Robert | Shared documentation | Coordinated goal scope, contracts, training, design, owner handoffs and documentation verification; no feature-status changes |
| FND-04 | Robert | Contracts/client/platform and shared registration | After FND-03; reviewed goal/consent/catalogue/planning/advice-review ports, own-record scopes, versions and proposed release envelope; executable 0.2.0 unchanged until implemented |
| CRD-02 | Aaron | credit/products and the single finance package after extraction handoff | FND-04, CRD-01 and EVD-01; independent dated contribution/rounding/horizon/fee/liquidity and allocation tests; incomplete/infeasible/conditional results and approved catalogue filtering |
| GOL-01 | Earl | monitoring records, staff UI and domain prompts | FND-04, CRD-02, HLT-01 and AI-01; confirmed voluntary goals, reviewed content, checked drafts, authorized suitability review, member choice and stale/review history; no ledger/servicing writes |
| QWN-02 | Benedict | models/qwen training/artifact handoff | QWN-01 and EVAL-02 training/validation data handoff; guidance adaptation and extraction regression through the existing pipeline; independent promotion gate, no autonomous financial authority |
| EVAL-02 | Earl | evaluation/synthetic and independent protocol/reports | FND-04 and reviewed goal/content protocol; frozen data first, final artifact evaluation later; planner/template baseline, unsafe advice/source failures, comprehension and corrections; no QWN-02 completion prerequisite for data handoff |
| MOB-02 | Robert | member-portal UI/facade and shared client wiring | FND-04, CRD-02 and GOL-01; member-only goal/plan/review/progress/withdrawal flow, explicit unavailable/stale states and no transfer/purchase authority |

First build one no-return goal scenario with explicit contribution dates and sufficient dated household inputs, retaining the current one-cycle oracles. Test zero contribution dates, already-met target, integer-centavo remainder, protected essentials, duplicated reserves, simultaneous allocations, no surplus, missing/variable income, uncertain fees, restricted share capital and expired/absent products. Then evaluate reviewed cooperative-product considerations with liquidity/loss/preferences and mandatory investment suitability review. A fixed amount or target date cannot be silently altered to make a goal appear achievable. Changing input/catalogue versions invalidates pending guidance without rewriting historic decisions or plans.

Robert requests CRD-02/GOL-01 projections rather than copying their rules. Aaron supplies the catalogue and checked runs; Earl owns the goal/content/advice review, using the single AI adapter; Benedict trains on Earl's approved manifests without editing corpus/holdout; Earl independently scores returned artifacts. All member-phone screens remain Robert's. Additional budgets and scheduling remain Pending until owners re-estimate; existing 64-unit arithmetic is the baseline for the earlier demonstration only. Institutionally approved products, advisory permissions, content, disclosures, privacy/retention and risk/fee/return rules are unresolved inputs for live product guidance, not fictional facts promoted into policy.

### Additional 5C-review packages

The user requests institution-practice-based 5C assessment with analysis, explanations and staff handoff. [Product meaning](AGAP_Product_Solution.md#ai-assisted-5c-review-and-explainable-handoff), [architecture](AGAP_Production_Architecture.md#institution-rubric-5c-assessment-and-proposed-fnd-05-boundary), [model gate](AGAP_Model_Training_Plan.md#7-institution-rubric-5c-analysis-and-explanation-extension-29-october-2026) and [design](../design.md#12-planned-5c-review-explanations-and-handoff-29-october-2026) govern this additional unestimated stage 2 scope. Existing goal packages, ownership and first-demo budgets remain intact. No numerical weights are supplied by this document and no current model probability is validated.

| ID | Accountable owner | Existing owned boundary | Dependencies and acceptance |
| --- | --- | --- | --- |
| PLN-04 | Robert | Shared documentation | Coordinated rubric semantics, criteria/source/weight dependencies, explainability and ownership; documentation only |
| FND-05 | Robert | Shared contracts/client/registration | FND-03; reviewed rubric provenance/configuration, accepted findings, score/coverage/review/trace and handoff-version ports; candidate 0.2.0 unchanged |
| CRD-03 | Aaron | credit/evidence/products staff views and rules | FND-05, EVD-01 and CRD-01; approved versioned rubric, deterministic fixed-point scores/trace, missing/applicability guards and preserved cash-flow checks |
| QWN-03 | Benedict | models/qwen and decision explanation/handoff | QWN-01 and EVAL-03 training/validation handoff; source-grounded criterion findings/explanations and saved handoff through the same adapter, extraction regression and independent gate |
| EVAL-03 | Earl | evaluation/synthetic and independent protocol/reports | FND-05 and reviewed rubric/source protocol; data handoff first, independent rule/expert/checklist comparison and final artifact scoring later |

Robert requests domain projections, Aaron owns the 5C staff panel and rule trace, Benedict owns reviewed explanations/handoff integration, and Earl supplies independent data/expectations and evaluation. Actual institutional criteria/weights/applicability are unresolved dependencies before numeric activation. Public educational framework sources are not adopted policy; fictional test rubrics must be labeled. Evaluate unknown evidence and missing history without adverse character inference, inapplicable collateral, denominator/rounding, source/rubric changes, faithful explanations, critical capacity gaps and human overrides. All new feature tasks start Not started; estimates are Pending beyond the current 64-unit demonstration. An earlier fictional slice requires explicit owner capacity re-estimate and its evidence. No new member-scoring API, predictive-credit model or second AI provider is introduced.

## 6. Conflict-prevention and verification

- Use isolated worktrees/task branches based on the actual owner-agreed foundation commit. Do not reuse, reset or overwrite another worker's branch. Candidate PR #10 remains unmerged unless the user authorizes it.
- Only Robert edits shared contracts/client, configuration/dependencies, route/provider/migration registration, tokens and canonical demo data. Workers submit proposed interface/wiring changes in their own brief/PR, with task ID and dependencies.
- Robert's 26 October candidate performs the one-time finance extraction/re-export handoff: `packages/finance/src/assessment.ts` is the original function with import changes only, and `src/domain/assessment.ts` re-exports it. Aaron owns subsequent finance implementation; no parallel calculator is allowed.
- B–D retain staff/domain ownership while Robert alone builds member-portal screens and facade. Aaron's shared AI adapter has no decision/payment/posting authority; domain callers validate drafts and preserve confirmation provenance.
- Every module owns its append-only migrations/tests. Central registration is Robert's; no worker alters another owner's applied migration or table. Adjacent owners review transaction and permission boundaries.
- Feature integration requires `npm run check`, `npm run test:e2e`, relevant backend/DB/financial tests and UI screenshots. Documentation-only changes use link, task/dependency, ownership and consistency checks. An AI test must distinguish the real provider from a labeled stub/template.
- Preserve Ana/Ben/Cora and the historical arithmetic. New source/expense tests cover missing/conflicting data, confirmation, beyond-cycle dates, double counting, independent verification, self-approval/conflict restrictions, posted-money integrity and unchanged contracts while help is pending.
- QWN-01 belongs to Benedict, XAI-01 EBM/logistic training to Aaron, and independent corpus/splits/evaluation to Earl. Robert owns runtime registration and shared contracts. Do not add EBM outputs to member screens, assessments or approval; the research exhibit is separate.
- Compare pretrained and fine-tuned Qwen with a checklist/plain form on held-out synthetic cases; compare EBM with logistic regression under the reviewed survey protocol. Report corrections, missed expenses, unsupported claims, latency and user/staff effort. Synthetic technical results are not borrower-outcome evidence.
- Keep local verification distinct from remote CI. The [recorded remote startup issue](AGAP_Verification.md) remains unresolved unless new evidence establishes otherwise. No unrelated account/hosting/billing changes are authorized by this documentation update.
- Keep `Assignment.md` as the sole status tracker. The direct-main publication exception applied to the 25 October PLN-01/PLN-02 update only; PLN-03/PLN-04 are separate documentation additions under review and do not authorize a main push or merge. Preserve existing issues, PR descriptions and candidate feature branches; merging requires the user’s authorization.

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
| Applicable 5C rubric provenance, criteria/weights/applicability/missingness and rating review | Cooperative credit/policy owners with Aaron, Benedict, Earl and Robert | FND-05, CRD-03, QWN-03 and EVAL-03; rubric scores remain unavailable until configured, and no probability is claimed |
| Goal/planning assumptions, approved savings/investment catalogue, advice authority, suitability/disclosures and reviewed education | Cooperative product/privacy/responsible advisory roles with Aaron/Earl and Robert integration | FND-04, CRD-02, GOL-01, QWN-02, EVAL-02 and MOB-02; no live product guidance until confirmed |
| Presenter format, time limit and any final-round-specific rubric | Team/organizer materials | Presentation sequence and evidence packaging |

No guaranteed completion date, production certification or free hosted operating budget follows from this plan. The four-person split reduces conflicting edits; its workload and live readiness still depend on implementation and verified institutional inputs.

## 8. User-requested UI refinement

UI-01 is Robert's requested navigation/account/local-preview refinement within platform, member and integration work; the provisional four-person capacity estimates are unchanged, not actual-hours claims. The user explicitly authorized presentation-only changes in Aaron's evidence screen for the seven annotations. Aaron retains evidence/domain ownership; no financial/evidence rules or fixtures are reassigned. Work is isolated on `codex/ui-review-cleanup` over the current member-platform candidate. Design.md section 11 and the authentication proposal govern the revision; Assignment.md records its status. Existing uncommitted notes and historical evidence remain untouched.
