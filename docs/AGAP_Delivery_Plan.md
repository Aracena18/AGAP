# AGAP delivery and ownership plan

**Baseline:** 20 October 2026, Asia/Manila.

**Team:** Robert (A), Aaron (B), Benedict (C) and Earl (D). [Assignment.md](../Assignment.md) is the active task and progress tracker.

**Scope:** [product solution and priorities](AGAP_Product_Solution.md).

**Technical baseline:** [production architecture](AGAP_Production_Architecture.md).

## 1. Outcome and priorities

Build toward the confirmed complete lending product while making the hackathon's core financial-health journey understandable and demonstrable first. Evidence → cash-flow scenarios → available alternatives → accountable human decision → financial-health follow-up is the presentation spine. Disbursements, repayments and accounting are real product responsibilities, not an implied dependency on another lending system.

The existing browser implementation is reusable groundwork. It is not the production backend. Neither the presentation deadline nor a completed task changes that distinction.

## 2. Four ownership areas

Each developer owns a vertical area: UI, API service/domain code, module persistence and meaningful tests. The integration owner controls shared contracts and wiring so workers do not edit the same files.

| Developer | Responsibility | Exclusive implementation paths after foundation |
| --- | --- | --- |
| Robert (A) — platform and integration | Identity, permissions, member/application intake, shared contracts/client, shell, infrastructure, migrations registry and integration | `src/app/`, `src/features/applications/`, new `src/features/members/` and `src/features/access/`; `src/shared/`, `src/styles/`, `src/demo/`; `src/domain/types.ts` and `format.ts`; `packages/contracts/`, `packages/api-client/`; `apps/api/src/platform/`, API bootstrap and modules `identity/`, `members/`, `applications/`; worker bootstrap; `infra/`, root manifests/configuration/lockfile, `.github/` |
| Aaron (B) — evidence and credit | Evidence, CI/verification, product/policy terms, deterministic schedule and cash-flow calculations, offer comparison | `src/features/evidence/`, `src/features/comparison/`, new `src/features/products/`; `src/domain/evidence.ts`, `assessment.ts` and corresponding tests; finance-package implementation after the agreed extraction; API modules `evidence/` and `credit/` |
| Benedict (C) — decisions and servicing | Recommendation/approval/acceptance, explanations, loan lifecycle, disbursement/payment/refund/restructure commands and payment adapters | `src/features/decision/`, new `src/features/loans/`, `src/features/payments/`; `src/domain/review.ts`, `explanation.ts` and corresponding tests; API modules `decisions/`, `servicing/`; payment-provider adapters inside `servicing/` |
| Earl (D) — accounting and health | Posting, capital transactions, GL/reconciliation/reporting, health-review tasks and member check-ins | New `src/features/accounting/`, `src/features/monitoring/`; API modules `accounting/` and `monitoring/`, including their own domain rules/read models |

Module paths above live under `apps/api/src/modules/` unless otherwise shown. Each owner also controls that module's migrations and tests. A owns the migration discovery/ordering mechanism; workers submit module migrations through it instead of sharing one schema file.

New paths are planned, not an assertion that those folders already exist. Do not move the entire frontend just to match a monorepo template. A performs the one-time finance extraction/re-export migration; B takes ownership only after that handoff, so old and new calculators cannot diverge.

Shared files include route registration, Context/repository wiring, API module registration, infrastructure, dependencies, generated code, DTO schemas and default policies/fixtures. **Only Robert edits them.** Workers record a small contract/wiring request in their own brief/PR; Robert records the agreed change and dependency in Assignment.md and lands it before dependent implementation. Never copy a shared type or implement a second authoritative calculation to avoid waiting.

## 3. Contract-first foundation

Before workers integrate against the server, A establishes:

1. API error/validation shapes, pagination, safe centavo/date types, ID conventions and server-established actor context.
2. OpenAPI schemas and generated client for the first end-to-end slice, including complete/incomplete assessment, recommendation/decision snapshot, financial command/receipt/journal and health review.
3. Concurrency and assessment-input version semantics; `If-Match`, idempotency and stable financial business-event uniqueness.
4. Module ports for checked assessments, release authorization, transactional GL posting, loan positions and payment-provider unknown outcomes.
5. Shared transaction context, canonical lock order, audit/outbox/inbox schema and the migration registry.
6. Minimal shell, authentication/authorization boundaries and feature route registration; a local fictional environment with no production credentials.

These are the **first implementation tasks**, not schemas that this documentation pretends are already executable. Owners may develop pure functions and interface-driven tests against the agreed contract during foundation work. Production financial integration waits for the actual posting/authorization contracts and behavior.

Freeze the first contract version once all four owners review the first slice. Additive contract changes can follow with compatibility checks; breaking changes need an explicit migration and coordinated task dependency.

## 4. Parallel work and integration waves

| Wave | Robert (A) | Aaron (B) | Benedict (C) | Earl (D) | Integration condition |
| --- | --- | --- | --- | --- | --- |
| 0: contracts and domain groundwork | Publish contracts, transaction context, schema/migration boundaries and local environment | Specify evidence transitions and implement independently checked schedule/cash-flow tests | Specify decision, acceptance and transfer state transitions with retry tests | Implement ledger balance/period/idempotency domain tests | Owners agree the first interfaces; generated client and migrations run cleanly |
| 1: core review | IAM and member/application intake; shared wiring | Real source/fact/verification commands, assessment and offer comparison | Recommendation, human decision, preserved brief and acceptance | Posting service, accounts/periods and health-review domain/UI against agreed read models | Persisted application → evidence → assessment → decision works with server permissions |
| 2: complete money path and follow-up | Integrate modules; backups and audit visibility | Product validation, verification alternatives and scenario edge cases | Controlled fictional disbursement → payment → receipt using real posting service | Atomic journal integration, loan/GL reconciliation, repayment position and health check-in | Money path survives duplicate events, unknown outcomes and reversals; follow-up distinguishes repayment from wellbeing |
| 3: breadth and operational completion | Access recovery, deployment/restore, cutover tooling and integration checks | Approved product methods, policy applicability, required disclosures and robustness | Refunds, restructuring, settlement, write-off/recovery workflows and provider reconciliation | Financial reports, share-capital postings, period close and accounting adjustments | Full product acceptance matrix is satisfied; unresolved live-policy/provider/operations inputs are explicit |
| 4: presentation and institutional evaluation | Maintain integrated build and presentation evidence | Demonstrate evidence and affordability | Demonstrate accountable decisions and servicing | Demonstrate journal integrity and member follow-up | Each shown capability is implemented or visibly labeled planned/sandbox; user acceptance remains separate |

Presentation rehearsal and regression checks occur throughout, not only after wave 3. The team does not wait to finish all accounting reports before evaluating the core story. Conversely, a live money workflow never bypasses ledger integrity because its UI is ready.

## 5. Work packages and acceptance

These are stable work-package IDs. [Assignment.md](../Assignment.md) is authoritative for named ownership, current status, dependencies and progress evidence. The table below defines deliverables and acceptance criteria; it does not maintain a competing status register. GitHub issues are not required for this workflow. Earlier issues remain historical references and have not been closed or otherwise changed by this tracking update.

| ID | Owner | Deliverable | Dependencies | Acceptance evidence |
| --- | --- | --- | --- | --- |
| FND-01 | A | Contract/client and backend module foundation | Architecture baseline | Schemas validate, client generates, migrations and test environment run, module imports respect ownership |
| FND-02 | A | Identity, scoped access and member/application intake | FND-01 | Actual runtime-role access tests; separate user identities; revocation and session/CSRF tests |
| EVD-01 | B | Source files, fact corrections and verification history | FND-01 | Quarantine/download permissions, explicit missing/conflict states, preserved prior facts and stale-review behavior |
| CRD-01 | B | Versioned products/offers and deterministic assessments | FND-01 | Existing independent oracles plus schedule rounding/principal conservation, cost/fee and invalid-input tests |
| DEC-01 | C | Recommendation, approval steps, member acceptance and brief | FND-01; integrate with EVD-01/CRD-01 | Current-input enforcement, authority limits, reason/exception requirements, immutable historical brief |
| GL-01 | D | Transactional journal posting, chart and periods | FND-01 | Balanced entries, durable business-event deduplication, closed-period and concurrent-post/close tests |
| PAY-01 | C | Disbursement/payment and receipt path | FND-02, DEC-01, CRD-01, GL-01 | No self-authorization, no second transfer after timeout, atomic subledger/GL update, duplicate-notification and allocation tests |
| HLT-01 | D | Health reviews and staff action queue | FND-01; integrate loan positions from PAY-01 | Current repayment can coexist with reported strain; unknown responses remain unknown; no automatic contract change |
| ACC-01 | D | Reconciliation, capital, reports and adjustments | GL-01, PAY-01 | Opening/trial balance, loan-to-GL and cash/bank reconciliation, reversal/period history, financial-report mapping |
| SRV-01 | C | Refunds, restructures, settlement and write-off/recovery commands | PAY-01, ACC-01 posting contracts | New approved schedule preserves original; excess money and reversals conserve value; authorized journal references |
| OPS-01 | A | Restore, migration and operating evidence | FND-02 plus integrated modules | Restore drill, scoped secrets/logs, reconciled cutover rehearsal, unresolved recovery targets recorded |
| SHOW-01 | A, with B–D evidence | Integrated hackathon journey and staff exercise | Core review; add money/health paths only when implemented | Reproducible fictional run, screenshots/brief, observed usability notes, accurate capability/impact claims |

Owner briefs: [Robert (A)](tasks/production/01-platform.md), [Aaron (B)](tasks/production/02-evidence-credit.md), [Benedict (C)](tasks/production/03-decisions-servicing.md), [Earl (D)](tasks/production/04-accounting-monitoring.md).

External CI startup is an existing unresolved item in the [verification record](AGAP_Verification.md). Check its current status before relying on GitHub checks; local results and remote checks must be reported separately.

## 6. Conflict-prevention rules

- A maintains an integration branch. Each task uses an isolated worktree and a named task branch from the agreed contract/integration commit. Existing frontend feature branches are historical work; do not reuse or delete another worker's branch/worktree without coordination.
- Record exact owned paths, contract version and base commit in the owner's brief/handoff and the relevant Assignment.md task entry. A task does not gain ownership of another module because it needs an interface change.
- Keep PRs narrow: domain/persistence contract first when needed, then feature integration. Share commit references through owner handoffs and Assignment.md; never cherry-pick an unfinished branch or independently edit shared wiring.
- New migrations are module-owned and append-only after integration. A validates dependency ordering and the full database build; no worker renumbers or edits an integrated migration.
- Generated client artifacts are regenerated by A from canonical schemas. Feature code does not hand-edit generated files.
- All owners test financial/workflow invariants in their modules. Adjacent owners review the boundary behavior; A checks the integrated journey. Four developers do not imply a fifth QA or operations person.
- Run `npm run check` and `npm run test:e2e` before declaring a feature integrated; add backend/DB and financial integration checks as those modules are introduced. Documentation-only changes need reference/consistency checks instead.
- UI changes update `design.md` through A and include screenshots; feature briefs do not become competing design guides. All PRs identify purpose, the Assignment.md task ID, evidence and remaining limitations. Never merge without the user's authorization.

Robert maintains the central [Assignment.md](../Assignment.md) tracker. Aaron, Benedict and Earl maintain their own brief's progress/handoff notes and provide status evidence for Robert to incorporate, avoiding simultaneous edits to the central table. Track blockers and contract changes in these repository documents; chat is not the durable specification.

## 7. Inputs that must be settled before live deployment

These do not prevent architecture or fictional development, but cannot be replaced by invented live defaults:

| Input | Responsible institutional/team role | Affected work |
| --- | --- | --- |
| Exact loan products, rates, fees, grace/day-count/rounding and payment allocation | Cooperative product owner and accountant | Credit, disclosures, servicing and GL posting |
| Evidence alternatives, CI practice, authority limits, quorum and exceptions | Cooperative credit/approval officers | Evidence, decisions and access scopes |
| Chart, interest recognition, provisions, reporting and period/capital rules, including current applicable requirements | Cooperative accountant/responsible officer | Accounting, financial reports and capital |
| Cash/bank operating controls, electronic provider access/fees and reconciliation | Cashier/treasury and payment provider | Disbursement, repayments, refunds and incident handling |
| Existing member/loan/capital data and cutover balances | Cooperative data/finance owners | Migration and opening reconciliation |
| Privacy purposes, retention/holds and any external credit/AI processing | Institution's responsible privacy role | Documents, evidence, history and external adapters |
| Actual hosting hardware, operator, backups, capacity and recovery objectives | Team A plus institution's operator | Deployment feasibility and ongoing cost |
| Presenter format, time limit and any final-round-specific rubric | Team/organizer materials | Presentation sequence and evidence packaging |

No guaranteed completion date, production certification or free hosted operating budget follows from this plan. The four-person split reduces conflicting edits; its workload and live readiness still depend on implementation and verified institutional inputs.
