# PAY-01 Phase 5 — atomic fictional money path implementation plan

**Prepared:** 2 November 2026, Asia/Manila. **Owner:** Benedict. **Scope:** planning only; this package implements no payment, posting, screen or shared contract. [Assignment.md](../../../../Assignment.md#benedict) remains the only active task/status tracker.

**Recommendation: proceed with Phase 5 planning and isolated implementation.** The Phase 4 storage/service candidate is sufficient groundwork to begin. Connected financial integration is conditional on the explicit gates below; this is not a declaration that Phase 4 is integrated or that real money processing is ready.

Authorities: [product](../../../AGAP_Product_Solution.md), [architecture](../../../AGAP_Production_Architecture.md), [delivery/ownership](../../../AGAP_Delivery_Plan.md), [Benedict brief](../03-decisions-servicing.md), [frontend specification](../../../AGAP_Frontend_Spec.md) and [design.md](../../../../design.md). Retain the [historical fictional oracles](../../../AGAP_Product_Freeze.md#5-the-fictional-demonstration). This plan sequences existing PAY-01 work; it does not create policy, another design guide or a new budget.

## 1. Inspected starting point and readiness

Planning is prepared in the existing isolated `feat/benedict-pay-01-phase4-rules` worktree. Its committed checkpoint is `c9488cb`; inherited Phase 3 is `9af25b5`, and inspected main is `1776d9f`. The latest Phase 4 module/evidence remain **uncommitted** and are explicitly fingerprinted in [source_manifest.json](source_manifest.json). A branch at `c9488cb` alone does not contain those files. No accepted implementation base or consuming-owner contract agreement is inferred.

| Evidence inspected | Actual consequence for Phase 5 |
| --- | --- |
| [Phase 4 implementation record](../benedict-phase4/IMPLEMENTATION.md#continuation--persistent-simulation-foundation): 24 new DB/service cases; final full check 182 frontend/457 platform tests and 34 browser regressions | Reuse this candidate; do not rebuild origination/authorization/idempotency. These are recorded Phase 4 results, not Phase 5 tests or real-producer integration evidence. |
| [Servicing backend](../../../../apps/api/src/modules/servicing/BACKEND.md) | Current scope is simulation-only, durable intent/observation/recovery; no dispatcher, active loan, posted receipt or journal. |
| `CommandSchema`, rules and SQL reject posted `confirmed`; kind is disbursement and amount is tied to accepted net proceeds | Add versioned posted-event/repayment behavior and additive migrations. Simply allowing `confirmed` or reusing the disbursement amount check for repayment is insufficient. |
| Pending origination and its schedule are immutable and always `pending_release` | Keep the original unchanged; introduce linked posted lifecycle events/current projections rather than updating that saved artifact to active. |
| Canonical `ReleaseAuthorizationPort` remains unimplemented; producer ports default unavailable | Propose/complete the transaction-aware mapping and actual guards before connected release. Do not flip the existing decision read's `releaseAuthorized: false`. |
| [AccountingService and period helper](../../../../apps/api/src/modules/accounting/accounting.service.ts) use the caller transaction | Use the actual service for candidate money-path DB tests. Its returned journal receipt is provisional until the coordinator commits. |
| [GL/ACC specification](../../../../apps/api/src/modules/accounting/README.md) supports principal-only fictional comparisons | Select compatible explicit fixture terms or obtain matching interest/fee treatment. Do not claim the existing checker covers unsupported components. |
| Shared financial operations are contract-only; generated schemas/client do not supply the complete lifecycle/read facade | Robert owns approved public contracts, migration/provider/route registration and member wiring. Private Phase 4 return values are not public DTOs. |

Qwen/Colab completion is not a prerequisite. Deterministic explanation/manual operation must support the same path with inference disabled. No task is reassigned based on another developer's progress.

## 2. Outcome, bounded first slice and exclusions

Deliver one **clearly fictional manual** accepted loan → separately authorized simulated disbursement → durable settlement evidence → atomically posted loan/subledger/GL → one controlled repayment → posted receipt and dated position → actual servicing-to-accounting reconciliation evidence.

Start with one reviewed test product whose principal equals delivered cash, whose interest/fees are explicitly zero, and whose supplied schedule/allocation rules support the shown repayment. Reuse the existing isolated fictional servicing fixture where suitable; this is a proposed development fixture, not approved cooperative policy or another Ana/Ben/Cora registry. Record product/schedule/engine/rule/account versions before the money-path claim.

If the chosen demonstration is interest-bearing or has withheld/separate fees, support its exact components and accounting before showing full processing. Ana's original 30,000 received/36,000 repayment oracle must remain unchanged. Do not silently drop 6,000 financing cost to fit principal-only mappings. An unavailable component is not zero.

The first repayment should be one explicitly supported scheduled payment under the reviewed fixture rule. Preserve principal/interest/fee/unapplied components even when the reviewed zero-fee fixture legitimately supplies zero. Partial/early/late variants, overpayments, penalties, reversals/refunds and amended terms remain retained later scope unless separately agreed into this slice. Reject unsupported **new actions** explicitly. If an unsupported amount has already arrived, retain the whole observed movement as unposted review work; never discard it, silently truncate it to the amount due or manufacture a negative principal.

No real provider transfer, unattended dispatch/lease protocol, real member record, external notification, new AI client, accounting report UI, amendment or member-phone screen is included. Demo settlement remains labeled simulation. A voucher records evidence; it does not electronically move funds.

## 3. Ownership and implementation boundaries

| Owner | Required contribution | Protected boundary |
| --- | --- | --- |
| Benedict | Servicing event/allocation/lifecycle/receipt persistence; exact release guard in owned decision paths; atomic orchestration; loan/schedule/receipt/position reads; staff loan/payment views; tests and handoff | `apps/api/src/modules/servicing/`, specifically required `decisions/` extension, `src/features/loans/`, `src/features/payments/`, owned migrations/tests/docs |
| Robert | Canonical schemas/client/OpenAPI, actor/application/transaction/lock and reporting-snapshot integration, central migration/provider/route/capability registration, shared app state/navigation and every member screen | No Benedict edit to shared platform/app/configuration/dependencies/fixtures/tokens or member facade |
| Aaron | Current accepted evidence/assessment/offer/schedule and product/allocation component inputs, finance rules and one inference adapter | No new local interest/schedule calculator or guessed financial policy |
| Earl | Actual period/posting service and mapping review; ledger inventory, independent reconciliation checker/reader/report and accounting corrections | No servicing SQL writes to accounting/monitoring tables or duplicate reconciliation implementation |

Proposed module-local files include `posting-context.ts`, `posting-rules.ts`, `posting.service.ts`, `loan-reads.ts`, `repayment-rules.ts`, `repayment.service.ts`, repository additions, additive migrations and focused tests. Names follow actual implementation need; create no empty scaffolding. Staff features consume reviewed generated projections. Existing React/TypeScript/NestJS/PostgreSQL/shared controls remain sufficient; no new framework/ORM/provider SDK is assumed.

## 4. Entry and integration gates

| Gate | What must be concrete | When required |
| --- | --- | --- |
| G1 — reproducible base | Preserve the uncommitted Phase 4 module/evidence; obtain the authorized checkpoint operation, record exact commit and branch dependency, then create a focused Phase 5 task branch/worktree. Never use stash/reset/clean or copy an entire worktree over another. | Before reproducible Phase 5 implementation/handoff; this planning task performs no commit/branch mutation. |
| G2 — terms/components | Exact approved/accepted decision/document, product/schedule, principal versus delivered cash, supported allocation rule, explicit components and effective fictional posting mappings. | Before claiming a posted candidate path. Pure rules/proposals may advance with labeled fixtures. |
| G3 — authority and locks | Real current-scoped actor/configuration, distinct preparation/authorization, release mapping and agreed producer/period/application/loan/command lock order. | Before actual producer integration. Isolated tests may use clearly identified producer stand-ins. |
| G4 — posting boundary | Earl's actual service/migrations, period pre-lock, supported account/rule version and rollback/replay semantics. | Required for Phase 5 money-path DB evidence; a mocked ledger is insufficient. |
| G5 — public contracts | Approved commands/read projections, generated client, safe errors, ownership scopes and honest capability flags; no private snapshot exposed through HTTP. | Before registered browser/member integration. |
| G6 — reconciliation snapshot | Independently complete servicing and ledger inventories, scope/date/cutoff, unmatched records, stable pagination and a coordinator-established consistent snapshot. | Before a reconciled-path claim. Matching snapshot strings alone do not satisfy this gate. |

These gates identify receiving-owner inputs, not a requirement to finish their whole work packages. Missing integration must remain unavailable. Closing agreements never grants permission to change another owner's files.

## 5. Proposed state and persistence extension

Retain Phase 4 migrations 001–003 and existing snapshots. Add the next additive migration(s) after inspecting the actual accepted base; do not assume a filename or rewrite applied SQL. Preserve parsers for historical Phase 4 values and explicitly version any new persisted envelope.

| New record/projection | Required invariant |
| --- | --- |
| Posted business event | Permanent organization/loan/source-event identity linked to one command, exact observation, supported components and posting-rule version; database uniqueness across transport keys |
| First-release consumption | One immutable posted consumption per origination/release claim, linked to its posted event and GL journal; original first-release reservation remains preserved |
| Allocation | Immutable event/loan/schedule/direction and explicit principal/interest/fee/unapplied centavos; safe totals, no hidden negative principal |
| Loan lifecycle event | Pending origin → active only on posted first release; later settled only from the supported posted repayment facts/rules. Original approval, origination and schedule remain unchanged |
| Receipt | One immutable repayment receipt per underlying posted repayment event; safe references, amount/date/currency, journal/allocation linkage and actor/time. A disbursement voucher is a distinct artifact |
| Posted command revision | Can become `confirmed` only with its corresponding posted event/journal and required receipt/allocation/lifecycle evidence in the same commit |
| Repayment intent/observation | Explicit repayment kind, active-loan/schedule binding and source-event/movement identity; supports its own supplied amount rather than the disbursement net-proceeds constraint |

Use integer centavos, safe bounds and exact intermediate arithmetic; due/effective/value/posting dates and recorded UTC instants remain distinct. Validated zeros are permitted only where the supported rule explicitly establishes them. SQL must enforce scoped references, immutable history, release/event/receipt uniqueness, current command versions and no posted `confirmed` with missing paired effects. Ordinary runtime roles cannot insert arbitrary posted success or patch balances.

The private Phase 4 schema hard-codes null receipt/journal and excludes `confirmed`; its SQL trigger also rejects that transition. Implement an explicitly gated finalization path and matching additive SQL controls. Do not merely widen an enum or grant generic history updates. Retain denied transitions and all existing Phase 4 regression tests.

## 6. Transaction and recovery protocol

Keep settlement intake and financial posting separate:

1. Authorized simulated/manual settlement observation commits independently as `confirmed_unposted`, or as preserved conflict evidence. Unknown is not settlement proof. A new input never supplies trusted actor/configuration/verified status on its own.
2. A scoped finalization command authorizes resource access before replay. Read only enough stored metadata to select the effective period; then acquire and revalidate the agreed guards. Expected version, exact basis and observation identity remain bound through commit.
3. Lock order: current identity/accepted producer guards → accounting period pre-lock → servicing application lock → affected loans in sorted order → command/business-event/movement/posting locks. Review this against all competing source/configuration/close writers. Do not acquire Phase 4 application/command locks and only then call the period helper.
4. Under **one caller-owned transaction**, claim the business event, apply supported allocations/subledger/lifecycle effects, call `AccountingService.post(tx, request)`, record receipt and journal references, append the final command revision, consume the first-release claim where applicable, and write audit/outbox.
5. Only the existing coordinator commits. No nested `UnitOfWork`, separate accounting connection, asynchronous GL-after-success or provider call inside the transaction. Extend transaction-aware repository/guard helpers rather than calling Phase 4's high-level service methods, which open their own coordinators.
6. An exact committed replay returns its original receipt/result without reapplying servicing effects, including if the period later closes. Current authentication/revocation/resource access still precede replay. Same event under a new HTTP key must also resolve once through permanent business identity. Accounting journal replay alone is not permission to reapply allocations.
7. A failed finalization rolls back all new servicing/GL/receipt/command/audit/outbox effects; the earlier committed observation survives. Retry **posting the same movement**, not submitting another transfer. A changed posting payload or conflicting journal returns a review conflict.
8. No finalization from `unknown`, mismatched amounts/currency, conflicting/late-settlement evidence, stale configuration or missing authority. Known cash plus a newly invalid approval stays durable for authorized resolution; it does not justify deleting the fact, a replacement transfer, silently using new terms or inventing a suspense-account policy. An approved corrective accounting workflow is separate owner work.

The fixture must distinguish actual command execution from a stored intent. A submitted intent alone proves no cash movement. A posted result is shown only after a successful database commit. Tests must inject failures both before and after Earl's posting call.

## 7. Ordered implementation packages

| Package | Benedict's deliverable | Completion evidence |
| --- | --- | --- |
| P5-A — freeze inputs and propose interfaces | Exact Phase 4 dependency/checkpoint, proposed component/permission/lock/read contracts and reviewed bounded fixture | G1–G4 decisions recorded with named receiving owners; unresolved inputs explicit |
| P5-B — versioned posted records and rules | Additive schema/repository, event/receipt/release-consumption/lifecycle bindings and allowed finalization rules | Pure rules plus actual runtime-role/SQL uniqueness/immutability tests |
| P5-C — post one disbursement | Transaction-aware release mapping/guard and atomic first release through Earl's actual service | One confirmed settlement → one event/journal/active projection; rollback and duplicate races pass |
| P5-D — post one repayment | Separate repayment preparation/authorization/observation/finalization, explicit supported allocation, unique receipt | One posted receipt/journal/loan decrease with no duplicate effect or negative principal |
| P5-E — publish dated reads | Authorized staff/own-member-safe position, original schedule, receipt and pending-movement projections | Dated/freshness, no-before-release fabrication, privacy and current/historical consistency tests |
| P5-F — staff release/payment/receipt experience | Owned features using shared design, generated safe gateway and exact retry semantics | Keyboard/320px/print/error/uncertainty tests and labeled screenshots; real routes are Robert's registration |
| P5-G — reconciliation evidence | Complete servicing event/allocation/receipt inventory and handoff consumed alongside Earl's independent ledger inventory | Actual checker identifies matching and deliberately discrepant/orphan cases; no reconciliation-driven repair/retry |
| P5-H — combined verification/handoff | Focused financial DB tests, full contributor checks, screenshots, exact base/contracts/rules and limitations | G5/G6 closed for connected demonstration; real routes/producers tested separately from fixtures |

Execution order: A → B → C → D → E/G → F/H. Staff presentation composition may begin with explicitly simulated reads while backend work proceeds; it cannot establish financial integration. No staffing/hour/date commitment follows from this sequence. PAY-01's existing five relative units cover the earlier minimum slice; re-estimate remaining work using actual availability rather than assuming Phase 5 fits a new fixed timebox.

## 8. Posted positions and reconciliation

Derive balances from posted servicing events and linked allocations as of the requested calendar date, using the accepted original schedule/rules. Pending/unknown observations never reduce debt. Preserve schedule versions and late-recorded corrections; define effective-date versus recorded-through semantics. Interest/fees/arrears cannot be inferred from absent rules. A supported explicit zero-interest fixture may legitimately report zero interest; an unsupported product returns unavailable.

`postedThrough` must come from actual posted evidence/read completeness, not `now()`. Before any posted release, do not fabricate a zero loan position or expose pending origination as an active member loan. Reads must include pending movement counts and distinguish loan state, payment status and member-reported wellbeing. No receipt exists for an unposted repayment. Member reads use Robert's real member transaction/own-record authorization; never cast a member into staff or expose staff command/snapshot payloads.

For ACC-01 supply complete, separately enumerated events, allocations and repayment receipts with permanent event/loan IDs, organization/currency, amount/components, effective/recorded dates, command state and rule/journal/receipt links. Earl provides complete ledger journals and independently approved account mappings. Include unmatched records on **both** sides; do not fetch journals only for known servicing events. Preserve explicit zero components and the distinction between unavailable, pending, discrepancy, matched and empty.

The existing coordinator defaults to READ COMMITTED. Sharing a `TransactionContext` or matching `snapshotId` labels does **not** establish a repeatable reporting snapshot across queries/pages. Request Robert's reviewed snapshot/transaction boundary (for example isolation established before the coordinator's first query), or a supported immutable materialized read basis. Do not issue nested BEGIN or change transaction isolation after identity queries have started. Tests must inject concurrent writes and prove completeness/cutoff semantics before declaring reconciliation matched.

Reuse Earl's actual `reconcilePrincipalMovements` only for its supported principal-only slice. Nonprincipal allocation or reversal cases remain unavailable until Earl supplies the matching independent comparison. Do not copy his checker into servicing. Findings do not automatically mutate journals, loan history or initiate a financial retry.

## 9. Staff UI and public integration

Implement only staff loan/payment/receipt features in Benedict's assigned paths. [design.md](../../../../design.md) remains the UI authority: reuse shared controls, tokens, formatting, existing Google-inspired appearance and uncertainty/retry patterns. This plan introduces no new palette/component system or competing screen design rules.

Expose explicit prepare, separate authorization, settlement-recorded, posting-pending, posted and recovery states. A success notice must describe the actual committed event. Keep exact original body/key/version on uncertain submissions and serialize commands; known unavailable services never appear successful. Generated public projections must omit internal approval/source/conflict payloads. A posted receipt view/print reads the saved immutable record; it never recalculates or regenerates accepted loan terms.

Robert owns routes, application state/navigation, generated client/schema changes, member-portal wiring and central test configuration. Agree source/version-safe public read/write shapes and login return paths before connection. UI fixtures must be labeled simulation and must not be registered as real financial producers. Include 1366×768 and narrow screenshots, keyboard/error recovery, 320px reflow, print content and representative review in actual feature evidence.

## 10. Verification, exit criteria and retained work

The [acceptance matrix](acceptance_tests.csv) specifies planned cases and evidence layers, not executed passes. Use actual servicing tables with Earl's actual posting service and real least-privilege runtime roles. Test duplicates by request, command, permanent event and movement identities; real two-connection races; crash/response loss; period close; role/revocation; rollback after allocation/posting/receipt; bitemporal reads; member isolation; and unmodified decision/origination/schedule history.

Use Node 24/npm 11.9.0 and the existing locked dependencies. Choose a dedicated fictional `agap_test` Compose project/ports, preserving other developers' databases. Run focused suites first, then `npm run check` and `npm run test:e2e` sequentially. Both suites reset shared fictional fixtures. Run `graphify update .` after code changes if available; report unavailable tooling honestly. This documentation-only plan requires link/ownership/source/consistency checks, not another application test run.

Exit only when the shown settled event has one consistent servicing/allocation/GL linkage, posted repayment has exactly one receipt, release uniqueness survives retries/races, known unposted facts survive failures, dated reads are honest, and independent reconciliation exposes discrepancies as well as agreement. Record which results use fictional upstream producers and which establish actual HTTP/member integration. Screenshots and automated tests do not substitute for representative acceptance or production controls.

Before integration, Robert applies accepted canonical documentation/spec/wiring changes and updates Assignment.md from owner evidence. PRs include PAY-01, purpose, exact dependency/contract/rule versions, owned paths, checks, screenshots and remaining gaps. No push or merge is authorized by this planning request. Stage 2 SRV-01, provider operations, broader allocation/refund/reversal/settlement/write-off/recovery and model extensions remain assigned and separately gated.
