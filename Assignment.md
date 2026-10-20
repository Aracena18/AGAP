# AGAP team assignments

**Updated:** 20 October 2026, Asia/Manila.

This file is the team's active assignment and progress tracker, replacing GitHub issues for this workflow. The names below follow the order supplied by the team: Robert, Aaron, Benedict and Earl. A–D remain technical role labels in the architecture documents.

The [product solution](docs/AGAP_Product_Solution.md) defines features and priorities. The [production architecture](docs/AGAP_Production_Architecture.md) defines technical boundaries. The [delivery plan](docs/AGAP_Delivery_Plan.md) defines exact owned paths, integration waves and acceptance criteria. This assignment does not mark any production task as implemented.

## Team ownership

| Person | Role | Main responsibility | Task brief |
| --- | --- | --- | --- |
| Robert | A — platform and integration | Shared API/transaction contracts, identity, permissions, member/application intake, app wiring, infrastructure and integration | [Robert's brief](docs/tasks/production/01-platform.md) |
| Aaron | B — evidence and credit | Evidence/CI verification, product/policy rules, schedules, deterministic assessment and offer comparison | [Aaron's brief](docs/tasks/production/02-evidence-credit.md) |
| Benedict | C — decisions and servicing | Recommendations, human decisions, member acceptance, loan lifecycle, disbursements, repayments and payment adapters | [Benedict's brief](docs/tasks/production/03-decisions-servicing.md) |
| Earl | D — accounting and health | Double-entry ledger, reconciliation, financial reports, share capital and financial-health follow-up | [Earl's brief](docs/tasks/production/04-accounting-monitoring.md) |

Each person owns the UI, backend module, module persistence and tests within their assigned paths. Robert alone changes shared contracts, generated clients, routing/module registration, common UI/tokens, configuration and dependencies. Exact path ownership is recorded in the delivery plan; needing an interface change does not transfer ownership.

## Task register

Production tasks start as **Not started**. Existing fictional frontend work is reusable groundwork, not completion of these production packages. Change a status only when its owner reports evidence.

| Task ID | Owner | Deliverable | Prerequisites | Status | Evidence / branch / blocker |
| --- | --- | --- | --- | --- | --- |
| FND-01 | Robert | Shared contracts/client, backend module and transaction foundation | Architecture baseline | Not started | Pending |
| FND-02 | Robert | Real identity, scoped permissions and member/application intake | FND-01 | Not started | Pending |
| EVD-01 | Aaron | Source files, corrections and verification history | FND-01 for server integration | Not started | Pending |
| CRD-01 | Aaron | Versioned products/offers and deterministic assessments | FND-01 for server integration | Not started | Pending |
| DEC-01 | Benedict | Recommendation, approval, acceptance and saved brief | FND-01; integrate EVD-01 and CRD-01 | Not started | Pending |
| GL-01 | Earl | Transactional journal posting, chart and accounting periods | FND-01 for server integration | Not started | Pending |
| PAY-01 | Benedict | Controlled disbursement, repayments and receipts | FND-02, DEC-01, CRD-01, GL-01 | Not started | Pending |
| HLT-01 | Earl | Member health reviews and staff action queue | FND-01; integrate loan positions from PAY-01 | Not started | Pending |
| ACC-01 | Earl | Reconciliation, capital, financial reports and adjustments | GL-01, PAY-01 | Not started | Pending |
| SRV-01 | Benedict | Refunds, restructures, settlement and write-off/recovery commands | PAY-01; ACC-01 posting contracts | Not started | Pending |
| OPS-01 | Robert | Backup/restore, migration and operating evidence | FND-02 plus integrated modules | Not started | Pending |
| SHOW-01 | Robert coordinates; all contribute | Connected hackathon presentation and evaluation evidence | Core review; money/health paths when implemented | Not started | Pending |

Statuses: **Not started → In progress → Ready for review → Integrated**. Use **Blocked** with a specific dependency when work cannot proceed. Integrated requires the relevant checks and the agreed integration/merge process; a PR or an unchecked checkbox alone is not completion.

## Robert

Start with **FND-01**. Publish the shared foundation to the repository through a reviewed PR; public deployment is not required for this task.

- [ ] Define one canonical request/response schema for the first connected review path, plus the payment/receipt/journal and health-review boundaries needed by the other owners.
- [ ] Define server-established actor context, centavo/date validation, explicit unavailable values, version checks, stable error shapes and idempotency rules.
- [ ] Define the shared transaction context and interfaces for checked assessments, release authorization, transactional journal posting, loan positions and unknown payment-provider outcomes.
- [ ] Establish module/migration boundaries, audit/outbox/inbox envelopes and a local fictional test environment.
- [ ] Generate the shared frontend client and validate the schemas; document the transaction-boundary verification and module integration checks.
- [ ] Have Aaron, Benedict and Earl review the interfaces they consume; record the agreed contract version and base commit below.

After FND-01, continue with FND-02, then integration/operations work as the modules become available. Keep the current frontend runnable and distinguish development fixtures from production configuration.

## Aaron

Start evidence-state and independent calculation work while Robert establishes the common interfaces. Begin with **EVD-01** and **CRD-01** within your owned paths.

- [ ] Specify missing, conflicting, document-supported and independently verified states with correction history.
- [ ] Reuse the canonical fictional fixtures and independent arithmetic oracles; do not create a second calculator or fixture registry.
- [ ] Implement/test allowed schedules, costs, rounding, payroll-debt handling and monthly versus dated cash shortages.
- [ ] Integrate evidence and assessment APIs after the common contracts are available.

Coordinate with Robert for any shared schema/client or finance-extraction change. Supply checked assessment/offer results to Benedict; do not implement approval or accounting rules in your module.

## Benedict

Start decision, acceptance and transfer state rules against the agreed interfaces. Begin with **DEC-01**; integrate money operations only after the required authority and ledger services exist.

- [ ] Define/test recommendation, approval/clarification, exception, acceptance and stale-review behavior.
- [ ] Preserve decision evidence and explanations as immutable snapshots.
- [ ] Implement PAY-01 with durable commands, separate authorization, duplicate protection and explicit unknown outcomes.
- [ ] Use Earl's posting interface so loan allocations and accounting commit together; complete SRV-01 exception paths afterward.

Do not modify Earl's ledger tables or build a second ledger. Provide dated loan positions for financial-health follow-up; repayment status alone does not establish wellbeing.

## Earl

Start ledger invariants and tests while Robert establishes the transaction interface. Begin with **GL-01**; develop the health-review model alongside the core financial-health story.

- [ ] Define/test balanced entries, permanent source-event uniqueness, reversals and open/closed-period behavior.
- [ ] Publish the transaction-aware posting interface for Benedict through Robert's shared contracts.
- [ ] Implement HLT-01 with dated member responses, explicit unavailable information and recorded staff next actions.
- [ ] Complete ACC-01 reconciliation, capital, report and adjustment paths with approved institutional mappings before live use.

Do not change loan balances or provider command state directly. Keep household circumstances separate from contractual balances and avoid automatic healthy/unhealthy or character classifications.

## Working in parallel

1. Read the product, architecture, delivery plan, design and your own task brief before editing.
2. Use a separate worktree and task branch. Suggested first branch names are `feat/robert-fnd-01`, `feat/aaron-evidence-credit`, `feat/benedict-decisions` and `feat/earl-ledger`.
3. Stay within the owned paths. Record a shared-interface request in your own brief/PR and ask Robert to incorporate the agreed change into the central tracker and canonical contracts.
4. Robert maintains this file to avoid four people editing the central task table simultaneously. Each owner maintains progress/handoff notes in their own linked brief.
5. Before a handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and unresolved dependencies.
6. Follow the contributor checks before integration. PRs reference task IDs from this file instead of requiring a GitHub issue. Merging still requires the user's authorization.

Aaron, Benedict and Earl can begin pure domain rules/tests and interface review during FND-01. Server integration depends on the actual shared foundation; real money operations also depend on the implemented authorization and transactional ledger behavior.

## Shared foundation and dependencies

| Item | Owner | Current state | Reference / next step |
| --- | --- | --- | --- |
| Canonical contract version | Robert | Pending | Record after all four owners review FND-01 |
| Integration base commit | Robert | Pending | Record the agreed foundation commit before dependent branches integrate |
| Assessment/offer interface | Robert with Aaron | Pending | B supplies checked calculations consumed by C |
| Transactional posting interface | Robert with Earl and Benedict | Pending | C and D share one transaction and stable financial-event identity |
| Loan-position interface | Robert with Benedict and Earl | Pending | D consumes dated posted repayment facts for health reviews |
| Institutional policies/accounting mappings | Relevant cooperative officers; each affected owner records the dependency | Unconfirmed | Use fictional development configuration; unresolved live rules block product activation |

## Progress updates

| Date | Update |
| --- | --- |
| 20 October 2026 | Assigned Robert, Aaron, Benedict and Earl to the four workstreams and adopted this file as the task tracker. Production tasks have not been marked started or completed. |
