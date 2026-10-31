# Accounting module candidates

The GL-01 posting service implements the existing contract 0.2.0 `PostingPort` on the provisional member-platform base. All configuration and examples used in tests are fictional. No HTTP route, financial capability flag or institutional accounting policy is activated. The ACC-01 comparison candidate and proposed evidence boundary are described below.

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

Accounts, rule definitions/mappings and periods are operator-managed configuration with no runtime table write grants. Their real-world configuration, scoped reporting permissions and financial authorization require the consuming owners' institutional review. This service exposes no staff/member accounting HTTP endpoints.

## Registration proposal for Robert

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

The module test temporarily registers its directory in memory with the existing migrator; it does not modify shared registration code or create a second migrator. The suite resets fictional fixtures. Do not run it concurrently with the platform/browser suites against the same database.

Current exact results, environment limits and receiving-owner dependencies are recorded in [Earl's task brief](../../../../../docs/tasks/production/04-accounting-monitoring.md#gl-01-implementation-candidate--29-october-2026).

## ACC-01 principal reconciliation candidate

[reconciliation.ts](reconciliation.ts) supplies the pure `reconcilePrincipalMovements(input)` comparison and an accounting-local input schema for Robert/Benedict to review. It covers principal-only disbursements and repayments using integer centavos and independent dated account mappings. It does not query a database, post money, change a loan, persist a report or expose an HTTP route/UI. Existing posting migrations require no change for this slice.

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

The proposal reuses canonical IDs, money, currency, calendar dates, instants, posting requests and command states. It does not modify shared contracts or replace the existing `PostingPort`/`LoanPositionPort`. A current balance or the member receipt projection alone cannot supply complete event/allocation/journal linkage. Missing allocation components fail validation; zero components must be explicitly supplied.

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

When findings coexist, `unavailable` takes precedence over `discrepancy`, then `pending`; every event/finding remains inspectable. Unavailable/incomplete source inventories return no event-level conclusion. Findings contain stable codes, record references through their event row, and expected/actual centavos where applicable. Reconciliation never repairs records or initiates a payment retry. Full linked-reversal/netting, interest/fee policies, opening-balance proof, reports/close and external bank/provider reconciliation remain later scope. Supplied unsupported journal kinds do not receive a clean result; the future reader must include relevant corrections rather than silently filtering them away.

### Receiving-owner handoff

- Benedict: review the proposed event/allocation/receipt inventory and permanent source-event linkage; supply the actual PAY-01 read projection, completeness/snapshot semantics, and reviewed principal mappings. The tests use fictional values and do not implement servicing or establish policy approval.
- Robert: review/publish any accepted shared schema/port and report-access policy; arrange consistent snapshot/read integration, generated client and route/provider registration. Shared contracts, capability flags, configuration and `Assignment.md` are unchanged by this candidate.
- Earl: after those boundaries are agreed, implement the accounting evidence reader, recorded run evidence and staff report; verify actual PAY-01-to-GL reconciliation with runtime authorization, concurrency and rollback tests. ACC-01 is not integrated by the pure checker alone.

Run the database-independent candidate tests with:

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/accounting/reconciliation.test.ts
```
