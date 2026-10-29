# GL-01 accounting module candidate

This implements the existing contract 0.2.0 `PostingPort` on the provisional member-platform base. All configuration and examples used in tests are fictional. No HTTP route, financial capability flag or institutional accounting policy is activated.

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
