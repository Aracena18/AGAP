# AGAP team assignments

**Updated:** 25 October 2026, Asia/Manila.

**Documentation revision:** `docs/agap-ai-mobile-plan`, based on foundation handoff `b4aa1d2`. This is a review branch, not a merged plan or accepted code-integration base.

This is the sole active task/status tracker. It supersedes the 20–21 October task instructions where they differ; GitHub issues and existing PR descriptions are historical references, not an alternative backlog. Each owner starts here, then reads the current linked brief and delivery plan. The documentation revision does not implement the new features.

The [product solution](docs/AGAP_Product_Solution.md) governs scope; the [architecture](docs/AGAP_Production_Architecture.md) governs technical boundaries; the [delivery plan](docs/AGAP_Delivery_Plan.md) defines exclusive paths, slices and acceptance. [design.md](design.md) is the only UI/UX authority. Robert's existing foundation remains a review candidate, not an agreed integration base.

## Team ownership

| Person | Role | Exclusive responsibility | Current task brief |
| --- | --- | --- | --- |
| Robert | A — platform, member portal and integration | All member-phone screens and member-portal facade; member identity/access; shared contracts/client, intake, wiring, infrastructure and integration | [Robert](docs/tasks/production/01-platform.md) |
| Aaron | B — evidence, credit and reusable AI | Evidence/CI/issuer verification; products/offers and deterministic assessment; one reusable AI adapter, extraction and overlooked-expense assistance | [Aaron](docs/tasks/production/02-evidence-credit.md) |
| Benedict | C — decisions and servicing | Separate human approval, conflicts/exceptions, explanations, acceptance, disbursement, repayments and authorized amendments | [Benedict](docs/tasks/production/03-decisions-servicing.md) |
| Earl | D — accounting, health and evaluation | Ledger/reconciliation/capital/reports; check-ins/support queue; verifiable synthetic corpus and comparative evaluation | [Earl](docs/tasks/production/04-accounting-monitoring.md) |

**All phone-facing work is reserved for Robert.** B–D provide domain APIs and staff screens; they do not implement member-portal screens or write through another module's tables. Robert alone edits canonical schemas, generated clients, routing/module/migration registration, common UI/tokens, configuration/dependencies and canonical demo fixtures. The [exclusive path table](docs/AGAP_Delivery_Plan.md#2-four-ownership-areas) resolves the boundaries below. Each module owner owns its migrations/tests; the central migration registry remains Robert's.

## First-demonstration workload

Equal provisional budgets assume equal availability and include domain tests, boundary review and correction effort. They estimate the **remaining first-demonstration slices**, not complete production packages or hours. FND-01/FND-02 work already supplied is not counted as future work; their review and new integration are included in Robert's capacity. Re-estimate using owner reports and update scope/dependencies together rather than silently transferring ownership.

| Owner | First-demonstration slices | Relative units |
| --- | --- | --- |
| Robert | MOB-01 member portal **5**; FND-03 member access/shared contracts **4**; SHOW-01 integration **3** | **12** |
| Aaron | EVD-01 evidence/verification **3**; CRD-01 affordability **5**; AI-01 extraction/expense assistance **4** | **12** |
| Benedict | DEC-01 decisions/acceptance **4**; PAY-01 minimum money path **5**; SRV-01 hardship amendment **3** | **12** |
| Earl | GL-01 ledger **5**; HLT-01 support queue **3**; ACC-01 minimum reconciliation **2**; EVAL-01 synthetic evaluation **2** | **12** |

Full servicing/accounting breadth, additional providers/channels, production operations and institutional deployment remain assigned for stage 2. OPS-01 groundwork remains In progress; its full remaining scope is not hidden inside a demo completion claim. PLN-01 is this documentation change, outside the demonstration capacity estimate. The units do not guarantee equal actual hours or a completion date.

## Task register

Stages: **0 — documentation/contracts and review; 1 — first hackathon demonstration; 2 — complete product and live-readiness evidence.** A stage 1 slice can be reviewed while the complete package remains unfinished. The status describes evidenced package progress, not a claim that every stage is delivered.

| Task ID | Owner | Stage | Deliverable | Prerequisites | Owned boundary | Status | Evidence / branch / blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLN-01 | Robert | 0 | Coordinated product/architecture/assignment documentation | User-approved plan; foundation handoff | Shared documentation | Ready for review | `docs/agap-ai-mobile-plan`; [documentation verification](docs/AGAP_Plan_Revision_Verification.md); no application features |
| FND-01 | Robert | 0 | Shared contracts/client and backend transaction foundation | Architecture baseline | Platform/contracts | Ready for review | [PR #10](https://github.com/Aracena18/AGAP/pull/10), `4b03c6b`; 0.1.0 candidate |
| FND-02 | Robert | 0 | Staff identity, scoped access and member/application intake | FND-01 | Platform/intake | Ready for review | [Verification](docs/AGAP_Robert_Verification.md); staff intake, real DB and Keycloak tests |
| FND-03 | Robert | 0 → 1 | Member identity linkage/access and next shared contract revision | FND-01; FND-02 | Platform/member access | Not started | Planned; 0.1.0 remains a review candidate |
| MOB-01 | Robert | 1 → 2 | All member-phone UI and member-portal API facade | FND-03; EVD-01, CRD-01, DEC-01, PAY-01 and HLT-01 for their respective screens | Member portal only | Not started | Reserved exclusively for Robert |
| EVD-01 | Aaron | 1 → 2 | Source files, CI/issuer checks, corrections and fact history | FND-01 for server integration | Evidence | Not started | No implementation evidence reported |
| CRD-01 | Aaron | 1 → 2 | Products/offers and deterministic regular/irregular cash-flow assessment | FND-01; EVD-01 for source-linked integration | Credit/finance | Not started | No implementation evidence reported |
| AI-01 | Aaron | 1 → 2 | One reusable AI adapter; extraction, clarification and expense discovery | FND-03; EVD-01 for approved source access | AI adapter/evidence | Not started | Planned; no live provider selected |
| DEC-01 | Benedict | 1 → 2 | Accountable recommendation, approval, acceptance and saved brief | FND-01; EVD-01; CRD-01 | Decisions | Not started | No implementation evidence reported |
| GL-01 | Earl | 1 → 2 | Transactional posting, accounts and accounting periods | FND-01 for server integration | Accounting | Not started | No implementation evidence reported |
| PAY-01 | Benedict | 1 → 2 | Controlled disbursement, repayment and receipt path | FND-02; DEC-01; CRD-01; GL-01 | Servicing/payments | Not started | No implementation evidence reported |
| HLT-01 | Earl | 1 → 2 | Confirmed check-ins, support requests and staff action queue | FND-01; PAY-01 for dated posted loan positions | Monitoring | Not started | No implementation evidence reported |
| ACC-01 | Earl | 1 → 2 | Reconciliation, capital, reports and accounting adjustments | GL-01; PAY-01 | Accounting | Not started | No implementation evidence reported |
| SRV-01 | Benedict | 1 → 2 | Authorized hardship amendments and remaining loan lifecycle | PAY-01; ACC-01 posting contracts; HLT-01 for support handoff | Servicing | Not started | No implementation evidence reported |
| EVAL-01 | Earl | 1 → 2 | Verifiable synthetic corpus and comparative evaluation | Product hypothesis; FND-01 for API-integrated runs | Synthetic evaluation | Not started | Planned; no measured AI/member-impact result |
| OPS-01 | Robert | 2; groundwork ongoing | Full identity/offsite restore, migration and operating evidence | FND-02; integrated PAY-01 and ACC-01 | Platform/operations | In progress | [Local encrypted restore](docs/AGAP_Robert_Restore_Drill.json) passed; identity/offsite/cutover pending |
| SHOW-01 | Robert | 1 → 2 | Integrated demonstration and evidence packaging | MOB-01; EVD-01; CRD-01; AI-01; DEC-01; GL-01; PAY-01; HLT-01; ACC-01; SRV-01; EVAL-01 | Integration/shared wiring | Not started | Each owner contributes evidence within their owned area |

Statuses: **Not started → In progress → Ready for review → Integrated**. Use **Blocked** with a specific dependency. A published draft PR is not integration or production approval. Preserve earlier verification as dated evidence; no task is marked implemented because a document describes it.

## Acceptance and next actions

These task-level checks supplement the owned slices in the delivery plan and each brief; they do not duplicate status tracking.

| Task ID | Acceptance boundary | Next action |
| --- | --- | --- |
| PLN-01 | Product, design, architecture and all briefs agree; no conflicting owners | Review the coordinated documentation; any merge needs separate user authorization |
| FND-01 | Executable contracts and platform evidence reviewed by all consuming owners | Record Aaron/Benedict/Earl interface agreement and accepted base |
| FND-02 | Scoped runtime-role access, revocation and staff intake reviewed | Complete staff/UI review; member access belongs to FND-03 |
| FND-03 | Own-record access, separate member principal, domain ports and proposed contracts reviewed | Propose member linkage, draft confirmation, support and reminder interfaces |
| MOB-01 | Phone apply/upload/status/loan/reminder/help journey uses domain services and denies other-member access | Define portal screens in design.md and integrate after FND-03 |
| EVD-01 | Quarantine/download controls, separate provenance/verification, corrections and stale-review guards | Review source/fact/verification interfaces; implement the first evidence slice |
| CRD-01 | Independent oracles, explicit horizon, confirmed dated irregular costs and no double count | Specify checked irregular-cost inputs; preserve original one-cycle oracles |
| AI-01 | Source-linked drafts, explicit confirmation, untrusted-output checks and manual/template fallback | Propose bounded AI port; test extraction against held-out synthetic sources |
| DEC-01 | No preparer self-approval; conflict restrictions; current-input checks; immutable decisions | Review approval/conflict contracts; implement recommendation and reviewer path |
| GL-01 | Balanced immutable journals, source-event uniqueness and period-lock tests | Publish and test the minimal transactional posting service for Benedict |
| PAY-01 | Atomic subledger/GL update, separate authorization, duplicate and unknown-outcome controls | Implement one controlled fictional money path using Earl’s posting port |
| HLT-01 | Current repayment can coexist with strain; request/ledger separation; missing remains unknown | Specify support-request/response read models for Robert and Benedict |
| ACC-01 | Demo receipt/subledger/GL reconciliation; later capital, reports and close acceptance retained | Implement minimal reconciliation; retain complete accounting backlog |
| SRV-01 | Cost comparison, human approval, member acceptance and preserved original schedule | Specify one permitted fictional hardship amendment; retain refund/settlement/recovery paths |
| EVAL-01 | Held-out source/ground-truth cases, independent arithmetic and checklist/form comparisons | Define benchmark manifest referencing canonical cases; add independent synthetic variants |
| OPS-01 | Full recovery and reconciled financial cutover evidenced before live use | Retain existing drill evidence and complete remaining recovery dependencies |
| SHOW-01 | Connected fictional journey; honest capability labels; observed usability and relevant checks | Coordinate contract reviews, then integrate completed slices without unauthorized merges |

## Robert

Start with review of the existing FND-01/FND-02 candidate, then FND-03 and MOB-01. Implement all member-phone application, document submission/confirmation, status, loan, reminder-preference and payment-help UI yourself. The member facade delegates to B–D services; it does not copy financial rules. Own shared contract proposals and integration. Keep existing OPS-01 evidence and its pending production obligations intact. [Current brief](docs/tasks/production/01-platform.md).

## Aaron

Review your candidate interfaces; start EVD-01 and CRD-01 pure rules/tests, then AI-01 against the new reviewed ports. Extraction and expense suggestions are drafts; member confirmation, issuer verification and financial calculation are separate. Own one reusable provider adapter; C/D own their domain prompts/validation and consume it. No member-portal UI. [Current brief](docs/tasks/production/02-evidence-credit.md).

## Benedict

Start DEC-01 authority/conflict/current-version rules, then PAY-01 only against the real GL-01 posting service. Supply loan positions and checked amendment options to the portal and monitoring. Deliver the first SRV-01 hardship amendment with explicit approval/member acceptance and retained history; complete remaining lifecycle paths in stage 2. No ledger-table writes or member-portal UI. [Current brief](docs/tasks/production/03-decisions-servicing.md).

## Earl

Start GL-01 and independent synthetic case design in parallel with interface review. Deliver HLT-01 support requests/check-ins, ACC-01 minimum reconciliation and EVAL-01 comparison against an expense checklist/plain form. Confirmed support observations do not change the loan ledger. Retain capital, reporting, close and complete reconciliation duties for stage 2. No loan-table writes or member-portal UI. [Current brief](docs/tasks/production/04-accounting-monitoring.md).

## Working in parallel

1. Read this tracker, the current product/architecture/delivery/design documents and your updated brief before editing. Earlier branch copies and historical GitHub work cards do not override this revision.
2. Use an isolated worktree/task branch from the **owner-agreed** foundation commit. The documentation branch is based on candidate `b4aa1d2` for review; that does not freeze the integration base or authorize a merge.
3. Keep exact owned paths. Write proposed schema/wiring changes in your brief/PR; Robert lands reviewed canonical changes before dependent integration. Do not create duplicate calculators, provider adapters or fixture registries to avoid a dependency.
4. Robert maintains this tracker; each other owner records progress/handoff evidence only in their own brief/PR for Robert to incorporate. Every task has one accountable owner even when adjacent owners review it.
5. Handoffs record task ID, branch/base commit, contract version, changed owned paths, verification, remaining dependencies and the receiving module. No live issuer/payment/AI integration is implied by a synthetic adapter.
6. Feature integration requires `npm run check`, `npm run test:e2e` and relevant financial/DB checks, with UI screenshots and design updates. Documentation-only changes use link, ownership and consistency checks. Local passes and remote CI results are distinct.
7. Keep main runnable. Never merge without the user's authorization. GitHub issues/existing PR descriptions remain unchanged by PLN-01; publish the coordinated documents in a new draft PR stacked on PR #10.

## Shared foundation and dependencies

| Item | Owner | Current state | Next step |
| --- | --- | --- | --- |
| Canonical contract | Robert | **0.1.0 candidate**, executable schemas/client supplied | Record consuming-owner agreement before freezing; FND-03 extensions remain proposed |
| Integration base | Robert | Pending owner agreement | [PR #10](https://github.com/Aracena18/AGAP/pull/10), implementation `4b03c6b`, handoff `b4aa1d2`, based on `875b405`; record the actual reviewed base |
| Evidence/AI/irregular-cost interface | Robert, accountable; Aaron reviews | Current evidence/assessment port exists; new drafts/confirmation/horizon fields proposed | FND-03 with EVD-01/CRD-01/AI-01; no executable contract changes in PLN-01 |
| Transactional posting interface | Robert, accountable; Earl/Benedict review | Candidate port/DTO supplied | GL-01 implements posting; PAY-01 uses the same transaction |
| Loan-position/support/amendment interface | Robert, accountable; Benedict/Earl review | Loan-position candidate supplied; member support/amendment extensions proposed | HLT-01 receives requests; SRV-01 alone changes terms after authorization/acceptance |
| Member access and reminders | Robert | Planned, distinct from staff intake | FND-03 linkage/access; MOB-01 portal; domain dates/positions from B–D |
| Synthetic evaluation | Earl | Planned | Independent expected results and held-out cases; preserve canonical demo fixtures |
| Institutional rules | Relevant cooperative roles; affected owner records dependencies | Unconfirmed | Evidence alternatives, approval/conflict rules, support options, accounting, retention and external processing need confirmation before live activation |

## Progress updates

| Date | Update |
| --- | --- |
| 20 October 2026 | Assigned Robert, Aaron, Benedict and Earl to the four workstreams and adopted this file as the task tracker. Production tasks have not been marked started or completed. |
| 21 October 2026 | Robert implemented the foundation/intake review candidate in an isolated worktree, tested it, recorded critique/improvements and a successful encrypted restore drill. FND-01/FND-02 await review; OPS-01 remains in progress. Other owners' tasks and merge authorization are unchanged. |
| 25 October 2026 | PLN-01 updates the target plan for Robert-owned phone access, AI-assisted irregular-expense discovery, accountable approval and payment help. Existing foundation/operations statuses are preserved. New tasks and 12-unit first-demo budgets are planning assignments, not implementation evidence. |
