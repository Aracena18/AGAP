# AGAP team assignments

**Updated:** 25 October 2026, Asia/Manila.

**Documentation publication:** the user authorized publishing this coordinated plan directly to `main`, superseding the documentation PR workflow for this update. It includes model-training plan `19674ea` and the earlier AI/mobile plan. Platform/application code remains on its separate candidate branch; direct documentation publication does not integrate those features or freeze the foundation contract.

This is the sole active task/status tracker. It supersedes the 20–21 October task instructions where they differ; GitHub issues and existing PR descriptions are historical references, not an alternative backlog. Each owner starts here, then reads the current linked brief and delivery plan. The documentation revision does not implement the new features.

The [product solution](docs/AGAP_Product_Solution.md) governs scope; the [architecture](docs/AGAP_Production_Architecture.md) governs technical boundaries; the [delivery plan](docs/AGAP_Delivery_Plan.md) defines exclusive paths, slices and acceptance. [design.md](design.md) is the only UI/UX authority. Robert's existing foundation remains a review candidate, not an agreed integration base.

## Team ownership

| Person | Role | Exclusive responsibility | Current task brief |
| --- | --- | --- | --- |
| Robert | A — platform, member portal and integration | All member-phone screens and member-portal facade; member identity/access; shared contracts/client, intake, wiring, infrastructure and integration | [Robert](docs/tasks/production/01-platform.md) |
| Aaron | B — evidence, credit, AI integration and explainable ML | Evidence/CI/issuer verification; deterministic assessment; one reusable AI adapter; EBM and logistic-regression research training | [Aaron](docs/tasks/production/02-evidence-credit.md) |
| Benedict | C — decisions, servicing and Qwen training | Qwen3.5-2B LoRA training/artifact handoff; separate human approval, acceptance, disbursement, repayments and later authorized amendments | [Benedict](docs/tasks/production/03-decisions-servicing.md) |
| Earl | D — accounting, health and independent evaluation | Ledger/reconciliation/capital/reports; check-ins/support queue; synthetic corpus/splits and independent Qwen/EBM/baseline evaluation | [Earl](docs/tasks/production/04-accounting-monitoring.md) |

**All phone-facing work is reserved for Robert.** B–D provide domain APIs and staff screens; they do not implement member-portal screens or write through another module's tables. Robert alone edits canonical schemas, generated clients, routing/module/migration registration, common UI/tokens, configuration/dependencies and canonical demo fixtures. The [exclusive path table](docs/AGAP_Delivery_Plan.md#2-four-ownership-areas) resolves the boundaries below. Each module owner owns its migrations/tests; the central migration registry remains Robert's.

## First-demonstration workload

Equal provisional budgets of **16 relative units per owner** assume equal availability and include domain tests, boundary review and correction effort. They estimate the **remaining first-demonstration slices**, not complete production packages or hours. FND-01/FND-02 work already supplied is not counted as future work; their review and new integration are included in Robert's capacity. Re-estimate using owner reports and update scope/dependencies together rather than silently transferring ownership.

| Owner | First-demonstration slices | Relative units |
| --- | --- | --- |
| Robert | MOB-01 member portal **5**; FND-03 member/model contracts **5**; SHOW-01 integration/release evidence **6** | **16** |
| Aaron | EVD-01 evidence/verification **3**; CRD-01 affordability **5**; AI-01 shared inference/expense assistance **4**; XAI-01 EBM/baseline training **4** | **16** |
| Benedict | DEC-01 decisions/acceptance **4**; PAY-01 minimum money path **5**; QWN-01 Qwen LoRA training/handoff **7** | **16** |
| Earl | GL-01 ledger **5**; HLT-01 support queue **3**; ACC-01 minimum reconciliation **2**; EVAL-01 corpus/independent model evaluation **6** | **16** |

This expands the previous estimate from 48 to **64 total relative units**; it does not fit training into unchanged capacity or guarantee delivery by the event. SRV-01, including the first contractual hardship amendment, moves to **stage 2 under Benedict** to make room for Qwen. The first demo retains payment-help submission, staff response and follow-up without changed loan terms. If capacity is lower, keep uncompleted slices visibly planned; do not waive financial controls. Full servicing/accounting breadth, additional providers/channels, production operations and institutional deployment remain assigned for stage 2. OPS-01 groundwork remains In progress; its full remaining scope is not hidden inside a demo completion claim. PLN-01/PLN-02 documentation work is outside the demonstration capacity estimate. The units do not guarantee equal actual hours or a completion date.

## Task register

Stages: **0 — documentation/contracts and review; 1 — first hackathon demonstration; 2 — complete product and live-readiness evidence.** A stage 1 slice can be reviewed while the complete package remains unfinished. The status describes evidenced package progress, not a claim that every stage is delivered.

| Task ID | Owner | Stage | Deliverable | Prerequisites | Owned boundary | Status | Evidence / branch / blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLN-01 | Robert | 0 | Coordinated product/architecture/assignment documentation | User-approved plan; foundation handoff | Shared documentation | Integrated | Published directly to `main` by user instruction; [historical documentation verification](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Plan_Revision_Verification.md); no application features |
| PLN-02 | Robert | 0 | Coordinated model-training plan, architecture and balanced assignments | User-requested Qwen/Benedict and explainable/Aaron ownership; PLN-01 | Shared documentation | Integrated | Published directly to `main`; [publication verification](docs/AGAP_Direct_Publication_Verification.md); [historical revision verification](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Model_Training_Revision_Verification.md) |
| FND-01 | Robert | 0 | Shared contracts/client and backend transaction foundation | Architecture baseline | Platform/contracts | Ready for review | [PR #10](https://github.com/Aracena18/AGAP/pull/10), `4b03c6b`; 0.1.0 candidate |
| FND-02 | Robert | 0 | Staff identity, scoped access and member/application intake | FND-01 | Platform/intake | Ready for review | [Verification](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md); staff intake, real DB and Keycloak tests |
| FND-03 | Robert | 0 → 1 | Member identity linkage/access, model provenance and next shared contract revision | FND-01; FND-02 | Platform/member access/shared model contracts | Not started | Planned; 0.1.0 remains a review candidate |
| MOB-01 | Robert | 1 → 2 | All member-phone UI and member-portal API facade | FND-03; EVD-01, CRD-01, DEC-01, PAY-01 and HLT-01 for their respective screens | Member portal only | Not started | Reserved exclusively for Robert |
| EVD-01 | Aaron | 1 → 2 | Source files, CI/issuer checks, corrections and fact history | FND-01 for server integration | Evidence | Not started | No implementation evidence reported |
| CRD-01 | Aaron | 1 → 2 | Products/offers and deterministic regular/irregular cash-flow assessment | FND-01; EVD-01 for source-linked integration | Credit/finance | Not started | No implementation evidence reported |
| AI-01 | Aaron | 1 → 2 | One reusable inference adapter; extraction, clarification and expense discovery | FND-03; EVD-01 for approved source access; QWN-01 only for tuned artifact | AI adapter/evidence | Not started | Qwen baseline/tuned candidates planned; runtime not selected |
| QWN-01 | Benedict | 1 → 2 | Qwen3.5-2B LoRA training, reproducible artifact and handoff | EVAL-01 train/validation split handoff; FND-03 for runtime integration only | `models/qwen/` | Not started | Free cloud GPU subject to availability; no training run or weights yet |
| XAI-01 | Aaron | 1 → 2 | Train EBM and logistic-regression comparison for emergency-funds research | Dataset terms/codebook; EVAL-01 split/protocol review | `models/explainable/` | Not started | Offline research only; public data access/mapping not yet verified |
| DEC-01 | Benedict | 1 → 2 | Accountable recommendation, approval, acceptance and saved brief | FND-01; EVD-01; CRD-01 | Decisions | Not started | No implementation evidence reported |
| GL-01 | Earl | 1 → 2 | Transactional posting, accounts and accounting periods | FND-01 for server integration | Accounting | Not started | No implementation evidence reported |
| PAY-01 | Benedict | 1 → 2 | Controlled disbursement, repayment and receipt path | FND-02; DEC-01; CRD-01; GL-01 | Servicing/payments | Not started | No implementation evidence reported |
| HLT-01 | Earl | 1 → 2 | Confirmed check-ins, support requests and staff action queue | FND-01; PAY-01 for dated posted loan positions | Monitoring | Not started | No implementation evidence reported |
| ACC-01 | Earl | 1 → 2 | Reconciliation, capital, reports and accounting adjustments | GL-01; PAY-01 | Accounting | Not started | No implementation evidence reported |
| SRV-01 | Benedict | 2 | Authorized hardship amendments and remaining loan lifecycle | PAY-01; ACC-01 posting contracts; HLT-01 for support handoff | Servicing | Not started | No implementation evidence reported |
| EVAL-01 | Earl | 1 → 2 | Synthetic corpus/splits and independent Qwen/EBM/baseline evaluation | Product hypothesis; FND-01 for API-integrated runs | `evaluation/synthetic/` and `evaluation/explainable/` | Not started | Data/protocol handoff first; final evaluation consumes QWN-01/XAI-01 artifacts without a prerequisite cycle |
| OPS-01 | Robert | 2; groundwork ongoing | Full identity/offsite restore, migration and operating evidence | FND-02; integrated PAY-01 and ACC-01 | Platform/operations | In progress | [Local encrypted restore](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Restore_Drill.json) passed; identity/offsite/cutover pending |
| SHOW-01 | Robert | 1 → 2 | Integrated demonstration and model/release evidence packaging | MOB-01; EVD-01; CRD-01; AI-01; DEC-01; GL-01; PAY-01; HLT-01; ACC-01; QWN-01; XAI-01; EVAL-01 | Integration/shared wiring | Not started | Each owner contributes evidence within their owned area |

Statuses: **Not started → In progress → Ready for review → Integrated**. Use **Blocked** with a specific dependency. A published draft PR is not integration or production approval. Preserve earlier verification as dated evidence; no task is marked implemented because a document describes it.

## Acceptance and next actions

These task-level checks supplement the owned slices in the delivery plan and each brief; they do not duplicate status tracking.

| Task ID | Acceptance boundary | Next action |
| --- | --- | --- |
| PLN-01 | Product, design, architecture and all briefs agree; no conflicting owners | Use this published plan; feature integration still requires its own evidence and authorization |
| PLN-02 | Model owners, exclusive paths, training/evaluation boundaries, stages and budgets agree | Start the assigned future tasks using this published plan; training remains Not started |
| FND-01 | Executable contracts and platform evidence reviewed by all consuming owners | Record Aaron/Benedict/Earl interface agreement and accepted base |
| FND-02 | Scoped runtime-role access, revocation and staff intake reviewed | Complete staff/UI review; member access belongs to FND-03 |
| FND-03 | Own-record access, separate member principal, domain/model provenance ports and proposed contracts reviewed | Propose member linkage, artifact/provenance, draft confirmation, support and reminder interfaces |
| MOB-01 | Phone apply/upload/status/loan/reminder/help journey uses domain services and denies other-member access | Define portal screens in design.md and integrate after FND-03 |
| EVD-01 | Quarantine/download controls, separate provenance/verification, corrections and stale-review guards | Review source/fact/verification interfaces; implement the first evidence slice |
| CRD-01 | Independent oracles, explicit horizon, confirmed dated irregular costs and no double count | Specify checked irregular-cost inputs; preserve original one-cycle oracles |
| AI-01 | Single adapter; provenance/version validation, confirmed drafts, bounded inputs and manual fallback | Review Benedict’s artifact envelope; integrate pretrained baseline before eligible tuned artifact |
| QWN-01 | Reproducible LoRA artifact/run card; untouched holdout; baseline comparison and honest release result | Agree task/labels and train/validation manifest with Earl; run pretrained baseline, then a small GPU smoke test |
| XAI-01 | EBM versus logistic regression; codebook/weights/missingness/leakage review; calibrated held-out evidence and research-only explanations | Verify Findex access and target mapping; publish feature list/split protocol before training |
| DEC-01 | No preparer self-approval; conflict restrictions; current-input checks; immutable decisions | Review approval/conflict contracts; implement recommendation and reviewer path |
| GL-01 | Balanced immutable journals, source-event uniqueness and period-lock tests | Publish and test the minimal transactional posting service for Benedict |
| PAY-01 | Atomic subledger/GL update, separate authorization, duplicate and unknown-outcome controls | Implement one controlled fictional money path using Earl’s posting port |
| HLT-01 | Current repayment can coexist with strain; request/ledger separation; missing remains unknown | Specify support-request/response read models for Robert and Benedict |
| ACC-01 | Demo receipt/subledger/GL reconciliation; later capital, reports and close acceptance retained | Implement minimal reconciliation; retain complete accounting backlog |
| SRV-01 | Stage 2 cost comparison, human approval, member acceptance and preserved original schedule | After PAY-01/HLT-01, specify a permitted amendment; demo help requests do not promise amended terms |
| EVAL-01 | Frozen grouped splits, independent truth, pretrained/tuned/checklist and EBM/logistic comparisons with uncertainty | Hand off training/validation data and research split protocol first; reserve holdout for final evaluation |
| OPS-01 | Full recovery and reconciled financial cutover evidenced before live use | Retain existing drill evidence and complete remaining recovery dependencies |
| SHOW-01 | Connected fictional journey; honest capability labels; observed usability and relevant checks | Coordinate contract reviews, then integrate completed slices without unauthorized merges |

## Robert

Start with review of the existing FND-01/FND-02 candidate, then FND-03 and MOB-01. Implement all member-phone application, document submission/confirmation, status, loan, reminder-preference and payment-help UI yourself. The member facade delegates to B–D services; it does not copy financial rules. Own shared contract proposals, model-artifact/provenance review and inference integration. Package Earl’s evaluation and both trainers’ release evidence. Keep EBM outputs outside member/lending APIs. Keep existing OPS-01 evidence and its pending production obligations intact. [Current brief](docs/tasks/production/01-platform.md).

## Aaron

Own XAI-01: train the EBM and logistic-regression baseline in `models/explainable/` as offline research. Review your candidate interfaces; start EVD-01 and CRD-01 pure rules/tests, then AI-01 against the new reviewed ports. Extraction and expense suggestions are drafts; member confirmation, issuer verification and financial calculation are separate. Own one reusable inference adapter; Benedict owns Qwen training and supplies its artifact, not another application provider client. C/D own their domain prompts/validation and consume the adapter. EBM associations never become member credit/health scores or approval inputs. No member-portal UI. [Current brief](docs/tasks/production/02-evidence-credit.md).

## Benedict

Own QWN-01 in `models/qwen/`: baseline, LoRA training on Earl’s frozen training/validation corpus, reproducible artifact/model card and handoff to Aaron. Start DEC-01 authority/conflict/current-version rules, then PAY-01 only against the real GL-01 posting service. Supply dated loan positions to the portal and monitoring. SRV-01, including its first hardship amendment, is retained for stage 2 with approval/member acceptance and preserved history. No ledger-table writes or member-portal UI. [Current brief](docs/tasks/production/03-decisions-servicing.md).

## Earl

Start GL-01 and independent synthetic case design in parallel with interface review. Deliver HLT-01 support requests/check-ins, ACC-01 minimum reconciliation and expanded EVAL-01: generate/own synthetic corpus/splits, independently evaluate pretrained versus tuned Qwen/checklist/plain form, and review/evaluate Aaron’s EBM versus logistic regression in `evaluation/explainable/`. Hand off data/protocol before trainer completion; final reports follow returned artifacts. Confirmed support observations do not change the loan ledger. Retain capital, reporting, close and complete reconciliation duties for stage 2. No loan-table writes or member-portal UI. [Current brief](docs/tasks/production/04-accounting-monitoring.md).

## Working in parallel

1. Read this tracker, the current product/architecture/delivery/design documents and your updated brief before editing. Earlier branch copies and historical GitHub work cards do not override this revision.
2. Use an isolated worktree/task branch from the **owner-agreed** foundation commit. The documentation branch is based on candidate `b4aa1d2` for review; that does not freeze the integration base or authorize a merge.
3. Keep exact owned paths. Write proposed schema/wiring changes in your brief/PR; Robert lands reviewed canonical changes before dependent integration. Do not create duplicate calculators, provider adapters or fixture registries to avoid a dependency.
4. Robert maintains this tracker; each other owner records progress/handoff evidence only in their own brief/PR for Robert to incorporate. Every task has one accountable owner even when adjacent owners review it.
5. Handoffs record task ID, branch/base commit, contract version, changed owned paths, verification, remaining dependencies and the receiving module. No live issuer/payment/AI integration is implied by a synthetic adapter.
6. Feature integration requires `npm run check`, `npm run test:e2e` and relevant financial/DB checks, with UI screenshots and design updates. Documentation-only changes use link, ownership and consistency checks. Local passes and remote CI results are distinct.
7. Keep main runnable. The user authorized direct publication of PLN-01/PLN-02 documentation to main, replacing their separate PR process. Feature work keeps isolated branches, required checks and explicit merge authorization. Preserve existing issue/PR descriptions and historical branch evidence.

## Shared foundation and dependencies

| Item | Owner | Current state | Next step |
| --- | --- | --- | --- |
| Canonical contract | Robert | **0.1.0 candidate**, executable schemas/client supplied | Record consuming-owner agreement before freezing; FND-03 extensions remain proposed |
| Integration base | Robert | Pending owner agreement | [PR #10](https://github.com/Aracena18/AGAP/pull/10), implementation `4b03c6b`, handoff `b4aa1d2`, based on `875b405`; record the actual reviewed base |
| Evidence/AI/irregular-cost interface | Robert, accountable; Aaron reviews | Current evidence/assessment port exists; new drafts/confirmation/horizon fields proposed | FND-03 with EVD-01/CRD-01/AI-01; no executable contract changes in PLN-01 or PLN-02 |
| Transactional posting interface | Robert, accountable; Earl/Benedict review | Candidate port/DTO supplied | GL-01 implements posting; PAY-01 uses the same transaction |
| Loan-position/support/amendment interface | Robert, accountable; Benedict/Earl review | Loan-position candidate supplied; member support/amendment extensions proposed | HLT-01 receives requests; SRV-01 alone changes terms after authorization/acceptance |
| Member access and reminders | Robert | Planned, distinct from staff intake | FND-03 linkage/access; MOB-01 portal; domain dates/positions from B–D |
| Model artifact/inference interface | Robert, accountable; Benedict/Aaron/Earl review | Proposed only; one existing planned AI adapter | FND-03 provenance/runtime envelope; QWN-01 supplies trained artifact; AI-01 integrates eligible artifact |
| Explainable research | Aaron | Planned; separate from product runtime | XAI-01 EBM/logistic training; EVAL-01 independent review; no member score or lending endpoint |
| Synthetic/model evaluation | Earl | Planned | Own generated corpus, grouped splits and independent expected results; evaluate returned artifacts without sharing holdout for tuning |
| Institutional rules | Relevant cooperative roles; affected owner records dependencies | Unconfirmed | Evidence alternatives, approval/conflict rules, support options, accounting, retention and external processing need confirmation before live activation |

## Progress updates

| Date | Update |
| --- | --- |
| 20 October 2026 | Assigned Robert, Aaron, Benedict and Earl to the four workstreams and adopted this file as the task tracker. Production tasks have not been marked started or completed. |
| 21 October 2026 | Robert implemented the foundation/intake review candidate in an isolated worktree, tested it, recorded critique/improvements and a successful encrypted restore drill. FND-01/FND-02 await review; OPS-01 remains in progress. Other owners' tasks and merge authorization are unchanged. |
| 25 October 2026 | PLN-01 updates the target plan for Robert-owned phone access, AI-assisted irregular-expense discovery, accountable approval and payment help. Existing foundation/operations statuses are preserved. New tasks and 12-unit first-demo budgets are planning assignments, not implementation evidence. |
| 25 October 2026 — model revision | PLN-02 assigns QWN-01 to Benedict and XAI-01 (EBM plus logistic baseline) to Aaron; Earl owns independent evaluation and Robert model contracts/integration. Current budgets are 16 each (64 total); SRV-01 moves to stage 2. Earlier statuses and 12-unit allocation remain historical evidence, not the current workload. |
| 25 October 2026 — direct publication | User requested a direct push instead of documentation PRs. PLN-01/PLN-02 are published on main with the current assignments; feature code stays on its candidate branch. FND-01/FND-02 remain Ready for review, OPS-01 In progress, and model training Not started. |
