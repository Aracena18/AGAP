# Accounting, posting and reconciliation

The accounting module supplies atomic balanced journals and principal-only reconciliation. The gated fictional lifecycle pilot connects actual database postings to simulated release/repayment; it does not execute real transfers or establish institutional accounting approval. [Verification](../../../../../docs/AGAP_Verification.md) records dated evidence and remaining release gates.

## Runtime reporting

`ReconciliationService` compares servicing's public `LoanReads.inventory` with actual GL rows/lines and independently configured principal reporting mappings. `POST /reconciliations` uses an idempotency key/date range; list/detail operations expose immutable saved reports through the generated client. Organization, cutoff, snapshot identity, evidence hash, mapping versions, and results are server-owned. Only current organization-wide auditors are authorized; a single-branch grant or administrator role is insufficient. Access is rechecked before create/replay/list/detail.

Both inventories are read inside one REPEATABLE READ transaction, with at most three bounded whole-transaction retries for serialization/deadlock failure. Isolation is set before identity queries. Each source collection uses pages of 250 and a 5000-record budget; union/results remain bounded to 5000 events. The requested range is at most 31 days. Missing/incomplete/over-budget sources yield unavailable, never a truncated clean report. No HTTP cursor carries a database snapshot across transactions.

Enumerate both sources independently, including orphan journals; do not derive the ledger inventory only from servicing IDs. Reporting mappings reference approved account/rule versions and are never inferred from observed journals. Persist result, evidence hashes, audit/outbox, and retry receipt atomically. Saved results describe the captured snapshot/cutoff, not arbitrary historic reconstruction.

The staff route `/#/staff/reconciliations` runs, lists, and reopens reports, with inspectable event statuses and expected/actual values. It preserves exact uncertain retries and unsaved-change guards. Canceled reads are ignored; access denial clears cached findings. A report never repairs balances, retries a transfer, supplies missing fees/interest rules, or completes bank/capital/report/close accounting.

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

## Registration and configuration

The central checksum-checked migrator discovers accounting migrations before decision/servicing dependencies. Use the normal migration command with operator credentials. The fictional pilot composes `AccountingService` with servicing in the same transaction; default capability flags do not activate live financial commands.

Posting and reporting configuration are operator-managed and organization/version bound. No institutional chart, policy, or mappings are inferred from test fixtures. Full period-close prerequisites, nonprincipal/reversal treatment, capital, external reconciliation, reports, and receiving-owner/institutional acceptance remain pending.

## Verification commands

Use Node 24 and a dedicated fictional PostgreSQL `agap_test` database, following the platform guide. `AGAP_TEST_DATABASE_URL` must point to the guarded localhost test database; no operational database is supported by the fixtures.

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/accounting
npm run check
npm run test:e2e
```

The original GL-01 module test temporarily registers its directory in memory with the existing migrator. Runtime integration tests exercise the current shared registration; neither creates a second migrator. The suites reset fictional fixtures. Do not run them concurrently with the platform/browser suites against the same database.

Current runtime results and receiving-owner dependencies are recorded in [verification summary](../../../../../docs/AGAP_Verification.md); its earlier sections preserve the original slice's verification.

## ACC-01 principal reconciliation candidate

[reconciliation.ts](reconciliation.ts) supplies the pure `reconcilePrincipalMovements(input)` comparison. Its originally accounting-local input now lives in the canonical shared schema module with a compatibility export. It covers principal-only disbursements and repayments using integer centavos and independent dated account mappings. The function itself does not query a database, post money, change a loan, persist a report or expose an HTTP route/UI. The runtime service above supplies reporting integration around it.

### Evidence input

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

The caller must authorize the organization and applicable reporting scope, obtain complete owner-published read projections, and establish a genuinely consistent snapshot through the existing platform coordinator. Matching `snapshotId` strings and `complete: true` are assertions, not authentication, proof of completeness or transaction isolation. No reporting role/branch policy is introduced by this pure function. The runtime reporting service enforces organization-wide auditor access before reading GL/source events; a pure checker call supplies no authorization.

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

## Remaining acceptance

Review servicing inventory completeness/cutoff semantics, approved principal mappings, shared DTO/access/registration, and larger-cohort limits with the consuming owners. Preserve independent checker use, immutable reports, and the retained bank/capital/report/close scope. Supplied code and fictional tests do not certify production readiness.

Run database-independent comparison tests with:

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/accounting/reconciliation.test.ts
```

## Trial-balance reporting

The module supplies immutable trial-balance reports over actual posted journal lines. Operations are `POST/GET /accounting/trial-balances` and `GET /accounting/trial-balances/{id}`, canonical strict DTOs/generated client and an auditor staff screen. Reuse complete organization auditor authorization, REPEATABLE READ, exact command replay and transactional audit/outbox. Show opening debit/credit, period movements, closing debit/credit, account status, explicit dates/cutoff and aggregate source counts. Include inactive accounts with history. Use SQL numeric/BigInt and explicit unavailable results on unsafe amounts or more than 5000 accounts; the request span is technically bounded to 366 inclusive days. A balanced report describes posted-ledger arithmetic only; institutional opening migration and bank reconciliation remain separate evidence.

Existing APIs/migrations/financial writes stay intact. New reporting tables/functions are accounting-owned and append-only. Robert retains shared schema/client/registration review. Later financial statements need approved versioned classifications; bank, capital, adjustments/close and goals require their source/authority contracts and rules. Missing inputs are not institutional defaults. This proposal precedes coordinated shared edits and asserts no external or receiving-owner acceptance.

Latest-main compatibility: the expansion retains the 0.4.0 pilot/review contracts and configured public loan reader. Its reporting coordinators honor the existing fictional-pilot material guard when enabled. Query argument generation is opt-in for the new check-in summary; existing query-schema metadata and client option signatures stay intact. This adds no decision/servicing producer or financial write.

Integration-test proposal: the latest pilot browser harness needs a separate guarded fictional database, but its hard-coded port was absent from shared test Compose. Supply that second test service on configurable port 55436, an optional explicit pilot test URL, and a pre-reset endpoint-isolation check in the harness. Robert reviews these test-only configuration changes; ordinary development services and application database settings are unaffected.
