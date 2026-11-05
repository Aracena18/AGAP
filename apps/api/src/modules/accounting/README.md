# Accounting module candidates

## Accounting expansion proposal — 5 November 2026

The user-approved expansion branch starts with an additive immutable trial-balance report over actual posted journal lines. Propose `POST/GET /accounting/trial-balances` and `GET /accounting/trial-balances/{id}`, canonical strict DTOs/generated client and an auditor staff screen. Reuse complete organization auditor authorization, REPEATABLE READ, exact command replay and transactional audit/outbox. Show opening debit/credit, period movements, closing debit/credit, account status, explicit dates/cutoff and aggregate source counts. Include inactive accounts with history. Use SQL numeric/BigInt and explicit unavailable results on unsafe amounts or more than 5000 accounts; the request span is technically bounded to 366 inclusive days. A balanced report describes posted-ledger arithmetic only; institutional opening migration and bank reconciliation remain separate evidence.

Existing APIs/migrations/financial writes stay intact. New reporting tables/functions are accounting-owned and append-only. Robert retains shared schema/client/registration review. Later financial statements need approved versioned classifications; bank, capital, adjustments/close and goals require their source/authority contracts and rules. Missing inputs are not institutional defaults. This proposal precedes coordinated shared edits and asserts no external or receiving-owner acceptance.

## Bounded inventory extension proposal — 5 November 2026

The coordinated accounting/monitoring/evaluation branch extends Earl's reporting consumer and Benedict's servicing read producer under the user-approved implementation plan. Add source-owned bounded pages, retaining the legacy inventory interface, whole-transaction REPEATABLE READ, independent source enumeration, scope/cutoff validation and immutable report replay. Use pages of 250 and an explicit 5000-record budget per source collection; the union of report event IDs also remains bounded to the existing 5000-result contract. Crossing any budget yields unavailable, never a truncated clean result. No HTTP cursor carries a database snapshot between transactions. Robert retains shared contract/wiring review and Benedict retains servicing ownership; implementation is not receiving-owner acceptance. Financial commands, mapping policy, the 31-day report range and existing applied migrations remain unchanged.

## ACC-01 runtime integration proposal — 3 November 2026

This implementation proposes additive shared reconciliation DTOs and staff operations: `POST /reconciliations` with an idempotency key and date range, `GET /reconciliations` with cursor pagination, and `GET /reconciliations/{id}`. Organization, cutoff, snapshot identity, evidence hash and results are server-owned. The existing checker input moves to the canonical schema module without changing its meaning; accounting retains a compatibility export. This proposal precedes shared edits and records no receiving-owner or institutional approval.

Use the existing PostgreSQL coordinator with an explicitly configured REPEATABLE READ mode and bounded whole-transaction serialization retries. Set isolation before identity/scope queries; preserve existing actor/session locks and defaults for other callers. Compare actual GL rows/lines with Benedict's public `LoanReads.inventory` inside that same transaction. Keep the existing organization-wide auditor restriction. Report create/replay/list/detail must recheck current access; neither administrator membership nor a single-branch grant authorizes an organization report.

Add accounting-owned, operator-managed principal reporting mappings referencing existing rule/account versions; never infer expected mappings from observed journals or seed an institutional policy. Persist immutable reconciliation results, mapping versions and evidence hashes through a bounded write function with audit/outbox in the same transaction. Existing applied migrations remain unchanged. The already registered accounting directory discovers the new migration. Dates are bounded to 31 days and result inventories are bounded; incomplete/unsupported inputs do not become clean reports. Report data describes records visible in its captured database snapshot with the recorded cutoff, not arbitrary historic commit-time reconstruction.

The staff page uses the generated client and existing controls/command retry behavior. Shared schemas, snapshot support and app registration are a reviewed implementation candidate under this proposal; publication and code do not fabricate Robert/Benedict acceptance. No report repairs balances, retries a money movement, supplies unapproved fee/interest rules or completes full bank/capital/close accounting.

The original GL-01 posting candidate implemented the 0.2.0 `PostingPort`; the current 0.3.0 shared candidate retains its financial posting shapes. All configuration and examples used in tests are fictional. No financial-command HTTP route or institutional accounting policy is activated. ACC-01 adds the separate reporting candidate described here.

### Supplied runtime candidate

The branch implementation extends the existing 0.3.0 shared candidate additively under the proposal above; financial posting shapes retain their earlier meaning. `ReconciliationService` reuses `LoanReads.inventory`, `LedgerReader` and the original checker inside the explicitly configured platform REPEATABLE READ coordinator. Other coordinator callers retain their original behavior; only reporting mode retries serialization/deadlock failures, at most three whole attempts. Current identity and complete auditor scope are rechecked before report creation, replay, listing or reading.

Migration `004-reconciliation.sql` adds `reconciliation_mappings` and `reconciliation_runs`, forced scoped policies, immutable history and a bounded save function that records audit/outbox atomically. It is discovered by the existing accounting migration registration. Runtime credentials have no direct report or mapping write grants. Operator-created mappings must reference the organization/rule/accounts and include an actual review reference. No institution mapping or reporting permission is seeded by application startup; the test fixtures are explicitly fictional.

The report's evidence hash commits its validated input, actual database snapshot identifier, checker version and mapping version references. Results describe evidence visible in that snapshot, filtered by effective dates and the recorded cutoff; they do not reconstruct arbitrary historical commit visibility. An identical transport retry returns its preserved result, even if later postings exist. A new report requires a new key. Source authorization/database failures are not converted to an empty report; a specifically unconfigured producer is recorded as unavailable. Unknown legacy recording times remain unavailable through the servicing projection.

The ledger reader enumerates actual journal headers and lines, including unmatched journals, without reconstructing actual amounts from saved request JSON. Reviewed reporting mappings are independent configuration. Inclusive date ranges remain limited to 31 days. The source-owned reader now uses 250-record pages in one reporting transaction, with a 5000-record budget per inventory collection and a 5000-event union/result budget. Posted, pending and legacy servicing stages must all finish with monotone cursors and the same snapshot identity. Ledger headers and their actual lines are read per page independently of servicing IDs. Injected legacy producers retain the reviewed 1000-record bound. No incomplete or over-budget collection is declared complete.

The staff candidate is `/#/staff/reconciliations`: current full-organization auditors can run, list and reopen preserved results, filter event statuses, and inspect references/expected amounts. It uses the generated client, shared controls, command retry key and unsaved-change guard. Canceled reads are ignored; access denial clears cached findings; uncertain report creation keeps the original request/key. This screen is independent of the still-unregistered financial-command UI.

For a fictional local installation, apply the additive migration with `npm run db:migrate`, start the API/web, and sign in with an auditor authorized for all current organization branches. Populate only reviewed operator mappings before expecting posted principal comparisons to be available. The reporting API accepts `{fromDate,throughDate}` only; list supports an optional UUID cursor and limit 1–20. Snapshot, cutoff, actor, organization and report body are server-owned. No report changes a payment or balance. Full bank/provider reconciliation, opening-balance proof, capital/report/close workflows and nonprincipal/reversal support remain pending.

## Public boundary

`new AccountingService().post(tx, request)` returns the shared journal receipt. It uses the supplied `TransactionContext` and never opens or commits another connection. The receipt becomes financial success only when the caller's unit of work commits. Exact input retries return the same journal; changed requests under the same organization/source event fail. Request line order is part of replay identity. HTTP idempotency keys are a separate boundary.

Call `lockPostingPeriod(tx, request.effectiveDate)` before taking servicing loan/command locks. Posting also acquires that shared period-row lock, then a source-event lock. Closing must take the conflicting period-row lock in the same database transaction. Configuration has open → closing → closed transitions; there is no reopening operation. Full close prerequisites and workflow belong to ACC-01.

Servicing owns authority, confirmed provider/manual movements, allocations and permanent event uniqueness in its own records. It must not reapply loan changes just because accounting replays a journal. Its event claims, loan effects, accounting call, command state and audit must commit together. The test caller-effect table is a disposable atomicity harness, not an implemented loan subledger.

## Posting and correction rules

- PHP, supported calendar dates and positive safe integer-centavo lines; total debits equal credits and remain within the safe range.
- Organization-owned active accounts, effective posting-rule version and permitted account/debit-credit pairs. The first fictional tests use principal disbursement and principal repayment only; they establish no interest/fee recognition policy.
- Current cashier, financial-authorizer or accountant role; ordinary administrator/auditor membership is insufficient. Servicing still enforces separate preparer/authorizer controls before calling this internal service. Session/revocation checks come from the shared unit of work.
- Immutable journals/lines, with direct runtime writes denied. A full reversal requires a new source event, `postingKind: 'reversal'`, the original rule version, an open effective period and exactly opposite original lines. Current accounts must remain active. Only one full reversal is allowed; reversing a reversal or a partial adjustment is unavailable.
- Used rule definitions/mappings and account identity are immutable. Posting locks and rechecks configuration through commit, including when an operator change began first; active-status changes remain possible for future postings.
- Database audit/outbox entries are created once in the posting transaction. Events include references rather than document or member payloads. Member transactions have no accounting read/write scope.

Accounts, rule definitions/mappings and periods are operator-managed configuration with no runtime table write grants. Their real-world configuration, scoped reporting permissions and financial authorization require the consuming owners' institutional review. The posting service exposes no financial-command HTTP endpoints; the separate reporting endpoints are described above.

## Registration proposal for Robert

This records the original GL-01 handoff. The current base already registers the accounting migration directory; the runtime candidate above adds its next migration without a second migrator.

1. After reviewing the base/interface, append `apps/api/src/modules/accounting/migrations` to the shared `migrationDirectories`, after platform migrations. Apply module-owned `001-ledger.sql`, `002-posting.sql` and `003-configuration-locks.sql` in order. Never rewrite an integrated/applied migration.
2. Register `AccountingService` as the implementation of the existing posting port in financial orchestration; retain unavailable HTTP/capability defaults until the authorized PAY-01 path is actually integrated.
3. Review the pre-lock helper with Benedict so the order remains identity → accounting period → sorted loans → command/event locks. No canonical schema change or extra calculator/provider client is needed for this slice.
4. Repeat module/financial integration, permission and full contributor checks on the accepted base. No main merge or push is authorized by this handoff.

## Verification commands

Use Node 24 and a dedicated fictional PostgreSQL `agap_test` database, following the platform guide. `AGAP_TEST_DATABASE_URL` must point to the guarded localhost test database; no operational database is supported by the fixtures.

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/accounting
npm run check
npm run test:e2e
```

The original GL-01 module test temporarily registers its directory in memory with the existing migrator. Runtime integration tests exercise the current shared registration; neither creates a second migrator. The suites reset fictional fixtures. Do not run them concurrently with the platform/browser suites against the same database.

Current runtime results and receiving-owner dependencies are recorded in [Earl's task brief](../../../../../docs/tasks/production/04-accounting-monitoring.md#acc-01-runtime-integration-candidate--3-november-2026); its earlier sections preserve the original slice's verification.

## ACC-01 principal reconciliation candidate

[reconciliation.ts](reconciliation.ts) supplies the pure `reconcilePrincipalMovements(input)` comparison. Its originally accounting-local input now lives in the canonical shared schema module with a compatibility export. It covers principal-only disbursements and repayments using integer centavos and independent dated account mappings. The function itself does not query a database, post money, change a loan, persist a report or expose an HTTP route/UI. The runtime service above supplies reporting integration around it.

### Proposed evidence input

| Input | Required evidence |
| --- | --- |
| `scope` | Organization, inclusive effective-date range, recorded-through cutoff instant and common snapshot identity |
| `servicing` | Availability, snapshot identity, inventory completeness, and separate event/allocation/receipt inventories |
| Events | Permanent source-event ID, loan, kind, amount/currency, effective date, recorded time, canonical command state, posting-rule version and nullable receipt/journal references |
| Allocations | Unique allocation ID, source event, loan, date/time, increase/decrease direction, and explicit principal/interest/fee/unapplied centavos |
| Receipts | Unique receipt ID, source event, loan, date/time, amount/currency; these are repayment receipts, not a required disbursement receipt |
| `ledger` | Availability, snapshot identity, completeness and journal inventories; journals extend the canonical posting request with organization, journal ID and posted time |
| `mappings` | Independently supplied organization/currency, rule version, movement kind, effective range, cash account and principal account |

The evidence format reuses canonical IDs, money, currency, calendar dates, instants, posting requests and command states. Its runtime canonicalization does not replace the existing `PostingPort`/`LoanPositionPort`. A current balance or the member receipt projection alone cannot supply complete event/allocation/journal linkage. Missing allocation components fail validation; zero components must be explicitly supplied.

The caller must authorize the organization and applicable reporting scope, obtain complete owner-published read projections, and establish a genuinely consistent snapshot through the existing platform coordinator. Matching `snapshotId` strings and `complete: true` are assertions, not authentication, proof of completeness or transaction isolation. No reporting role/branch policy is introduced by this pure function. Robert must agree how the authorized reporting scope maps to GL events before a reader/endpoint is enabled.

Both source inventories must include unmatched records in the requested scope. Do not start from servicing event IDs and fetch only their journals: that would hide orphan journals. Finish all pages under the agreed snapshot before declaring completeness. Exclude records recorded after the cutoff while retaining late-recorded events in later runs; filter effective dates consistently across sources. Supplied out-of-scope or future-recorded evidence fails validation rather than being silently discarded. Organization mismatch also fails validation, but this check is not a substitute for server/database authorization.

### Comparison and results

The function compares the union of source-event identities. It checks event uniqueness, allocation direction/principal, receipt and loan references, dates, journal references/rule, balanced totals and actual account/side amounts against the independent mapping. Receipt/loan/GL differences are checked per event, so offsetting errors cannot disappear in a matching total. Equivalent split/order of journal lines is allowed; journal totals use `BigInt` and overflows are reported. Inputs are not mutated and results are sorted.

Report and event statuses are:

- `matched`: supplied evidence agrees with the expected state. A definitively failed command matches only if it has no posted effects/references; this does not mean money was received.
- `discrepancy`: missing, duplicate or inconsistent evidence, unexpected posted effects, or a confirmed-but-unposted exception.
- `pending`: prepared/authorized/submitted/unknown command without posted effects. This is not confirmed success.
- `unavailable`: incomplete/unavailable source inventories, mismatched snapshots, absent effective mapping, or unsupported nonprincipal allocation/reversal/posting kind.
- `empty`: both complete inventories contain no events or related records in scope; this is not a matched payment.

When findings coexist, `unavailable` takes precedence over `discrepancy`, then `pending`; every event/finding remains inspectable. Unavailable/incomplete source inventories return no event-level conclusion. Findings contain stable codes, record references through their event row, and expected/actual centavos where applicable. Reconciliation never repairs records or initiates a payment retry. Full linked-reversal/netting, interest/fee policies, opening-balance proof, reports/close and external bank/provider reconciliation remain later scope. Supplied unsupported journal kinds do not receive a clean result; the runtime reader includes relevant corrections rather than silently filtering them away.

### Receiving-owner handoff and runtime follow-up

- Benedict: the runtime candidate consumes the supplied public inventory. Review its completeness/cutoff semantics, older unconfigured producers and larger-cohort limits alongside approved principal mappings. Financial workflow fixtures remain fictional and establish no institutional approval.
- Robert: review the implemented shared DTOs, reporting coordinator, access policy, generated client and registration against the proposal above. `Assignment.md` is unchanged; reconcile the tracker from reviewed implementation evidence. No owner acceptance is fabricated by shared code changes.
- Earl: retain the tested ledger reader, preserved runs and staff page; complete receiving-owner acceptance and retained bank/capital/report/close work. The original pure checker remains independently usable; the runtime candidate does not certify production readiness.

Run the database-independent candidate tests with:

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/accounting/reconciliation.test.ts
```
