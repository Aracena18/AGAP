# PAY-01 Phase 5 — atomic principal-only simulation candidate

Implemented on `feat/benedict-pay-01-phase5` from local prerequisite checkpoint `b4f86ae`. This extends the [Phase 4 foundation](BACKEND.md) under the [Phase 5 plan](../../../../../docs/tasks/production/benedict-phase5/PLAN.md). [Implementation evidence](../../../../../docs/tasks/production/benedict-phase5/IMPLEMENTATION.md) separates real PostgreSQL/GL results, fictional producer adapters, UI simulation and pending shared integration. Canonical contracts remain 0.2.0; no new endpoint or capability is registered.

## Supported path and explicit components

`MoneyService` supplies a simulation-only first release and exact scheduled principal repayment through the actual `PostingPort`. The configured `principal-only-v1` policy explicitly supplies organization/product/version/effective dates, zero interest/fees/grace, the supported allocation method, separate release/repayment rule IDs and cash/principal account mappings. Loan principal must equal delivered cash and the supplied schedule must sum to principal. Unsupported withheld proceeds, interest/fees or payment amounts fail explicitly; missing rules are not zero.

The fixture and configuration are fictional. They do not replace Ana's original interest-bearing example, establish institutional accounting policy or authorize real funds. No model calculates money, approves a loan or posts a journal. No provider is called. Bank/cash method labels remain simulation labels.

## Versioned command and posted evidence

Phase 4's command rows, snapshots and migrations 001–003 remain unchanged. New `servicing-command-v2` envelopes and immutable tables preserve distinct intent, settlement and posted success:

- `money_commands`: immutable header, source event/provider identity, origination and scheduled repayment index. Application-to-origination and first-release uniqueness remain enforced by Phase 4; v2 adds one release outcome and one repayment intent per schedule index. A failed/unknown intent cannot be replaced through a new transport key.
- `money_revisions`: canonical JSON text/SHA-256, actor, safe version and append-only lifecycle; database recording times accompany the value history.
- `postings`: one immutable business event/allocation/result per command, journal reference, explicit principal effect, original schedule index and unique repayment receipt. This record is the posted lifecycle fact and first-release consumption; no original pending origination is updated to active.
- `money_movements`: private scoped producer/movement deduplication with committed evidence requirements. The bounded conflict query also checks the Phase 4 movement index. Different commands reporting the same movement retain evidence and a review hold rather than another debt effect.

A legacy release is adopted only from its exact stored `confirmed_unposted` revision and unchanged bindings. Its original authorization and settlement remain recorded; the v2 header links the legacy version. Hash references are adapted to the v2 envelope without pretending another historical human authorization occurred. The current distinct finalizer must separately pass current financial scope/limits/MFA before posting the component mapping. No adoption survives a failed posting transaction.

The legacy Phase 4 `ServicingService.read` intentionally continues to read its original evidence stream; it is not the current posted-state projection after adoption. Registered current status must use `LoanReads`/v2 projections. Do not expose the historical `confirmed_unposted` value as current status when a v2 posted result exists.

## Internal service and release port

`MoneyService.prepareRepayment` requires a posted release, exact next supplied schedule entry, explicitly supported components, a current scoped cashier and no existing intent for that entry. It does not reload household affordability or change accepted terms. `authorize` requires a different configured financial authorizer and fresh MFA. `submitIntent` rechecks the original authorizer, configuration and exact version and stores one durable intent; it does not move money.

`observe` accepts only trusted authorized intake output, never a browser's own verification/authority claims. Known mismatched amounts/currency/dates and contradictory or late outcomes remain recorded as conflicts. Unknown amount/date/reference remains null. An unsupported already-received amount is not truncated into a supported allocation. A stale new observation must be retained by intake and retried after reading current state; this service is not an external durable webhook inbox. Corrections after an already posted command require a separate reviewed incident/correction workflow, not a state patch.

`MoneyPorts` are private producer proposals. Defaults are unavailable. The `financial` producer is separate from household/decision inputs so ordinary repayment collection can continue against the original posted contract after household facts change. Actual producer implementations must protect their sources/configuration/identity through commit; fictional context tables in tests prove consumer requirements only.

`StoredReleaseGuard` in the decision module implements canonical `ReleaseAuthorizationPort.authorizeRelease` using actual stored loan/command IDs, current producer guards and the existing pre-submission rules in the **caller transaction**. Its discarded pure candidate changes no state and opens no coordinator. It is a pre-dispatch check, not approval of an unknown/settled movement or authority to retry a transfer. Registration and real dispatch remain Robert's reviewed integration work; the old decision `reviewBasis` still truthfully returns `releaseAuthorized: false`.

## Atomic finalization and permissions

`finalize` first checks real current resource access and exact transport replay. A previously committed business result also resolves once under a fresh HTTP key. New work obtains current producer/component guards, then calls Earl's actual `lockPostingPeriod` **before** servicing application/loan/command locks. One loan is supported per operation; future batches must lock all affected loans in sorted order.

Inside the existing coordinator, actual GL posting, servicing event/allocation, receipt, lifecycle result, final `confirmed` revision, permanent event identity and audit/outbox commit together. SQL independently requires matching real journal/source-event/rule/date/account/side/amount pairs, exact command/receipt/result linkage and safe principal conservation. The accounting receipt is provisional until this transaction commits. No nested unit of work, separate accounting connection, asynchronous GL-after-success or provider call is introduced.

Failure after the actual GL call rolls that journal and all new servicing effects back. Earlier committed settlement evidence survives, and recovery can only post the existing movement after required review. Exact committed replay works even after a period closes, while authentication/revocation/resource access is still checked. A changed event/policy/payload or a conflicting settled movement cannot be silently finalized.

All new tables use FORCE RLS, scoped references and immutable-history triggers. Runtime has no history UPDATE/DELETE grant. Private table SELECT is replaced by scoped staff views where member projections require definer access. Tests also use non-superuser/non-BYPASSRLS owners for the financial functions and member projection. These controls do not certify resistance to a malicious database administrator.

## Dated staff/member reads and reconciliation

`LoanReads.workspace` exposes the original schedule, current command summaries, selected saved receipts, pending count and dated principal/arrears from posted events. Before a posted release it returns no position, not an invented zero/active loan. Zero interest/fees are valid only because the posted product is explicitly supported by the principal-only policy. `postedThrough` comes from posted records, not the browser clock. Display-name metadata was not captured in pending origination, so this proposal labels the saved member identifier rather than inventing an original name.

`memberLoans` runs inside the real supplied `MemberTransactionContext` and returns the existing canonical `MemberLoansView`. A bounded SQL function rechecks active own-member linkage, returns only safe loan/schedule/receipt fields and excludes staff commands, source/approval bodies and authority. Raw tables remain inaccessible; staff views return no member rows. The exported `loanMemberPorts` supplies only the owned `loans` facade subset. Robert retains all member UI and facade registration.

`inventory` requires a real coordinator-established REPEATABLE READ/SERIALIZABLE snapshot, authorized organization-wide auditor scope and explicit date/cutoff. It refuses the unchanged platform's default READ COMMITTED coordinator. It separately enumerates servicing events/allocations/receipts and pending legacy/v2 commands; Earl's ledger reader must independently include all scoped journals, including orphans. No record is selected only because another source already knows its ID.

New recording metadata permits cutoff reads. Older Phase 4 recording instants remain null, not fabricated; an affected historical inventory is unavailable. A known unposted movement is exposed as `confirmed_unposted` financial disposition even if its original failed/submitted history is retained, so the checker cannot falsely match a failed/no-effects command while cash is known. That mapping does not rewrite original history. Cutoff semantics concern recorded evidence within the chosen snapshot, not a claim to know external settlement/transaction commit time to arbitrary precision.

The actual `reconcilePrincipalMovements` is reused without copying or modifying Earl's code. Database tests use a fictional ledger-reader adapter over actual accounting journals and the same actual snapshot, including a concurrent-write case. Robert/Earl still supply the accepted operational snapshot coordinator, ledger evidence reader/report and scope policy. No reconciliation run repairs records, retries transfers or supports nonprincipal accounting by assumption.

## Migration and UI handoff

Register platform and accounting migrations first, then all servicing migrations in order. Newly added migrations are:

1. `004-posted-money.sql`: v2 commands/revisions, posted allocation/lifecycle/receipt facts, exact real-GL paired-effect constraints and movement identities.
2. `005-money-evidence.sql`: recording-time metadata, full-report-scope guard and durable movement/evidence pairing.
3. `006-safe-member-loans.sql`: scoped staff views, raw-read revocation and bounded own-member loan projection.
4. `007-money-command-completeness.sql`: headers cannot commit without their exact initial revision.

The Phase 4 repository now reads its scoped staff origination view. Deploy matching code/migrations together before enabling consumers. Robert must review ownership/grants/startup schema checks, canonical DTOs/client, routes/capabilities and actual producer wiring. Private v2 command/results are not automatically public HTTP responses.

The owned staff loan page and receipt component use shared controls/tokens, real `useStaff` by default, exact uncertain-command retry, safe scope-validated projections and selected immutable receipt printing. Session identity/organization/branches/roles/CSRF changes remount the controller; stale reads/selected receipts disappear. The gateway is unavailable by default and invents no endpoint URL. Its simulated-settlement action sends only command/version/reason; a future development adapter must establish trusted simulated evidence server-side. It must never become a public way to assert real verification.

The feature-local preview, fixture and browser-check script are labeled fictional presentation evidence. They do not authenticate, post financial effects or form application routes. Shared route/client/app/worker/member integration, representative UI acceptance and production controls remain pending. See the [handoff evidence](../../../../../docs/tasks/production/benedict-phase5/IMPLEMENTATION.md) for actual checks, screenshots and remaining cases.


## Dated projection correction — 5 November 2026

Staff workspace principal, arrears, receipts and next-installment selection use posted events with effective date on or before the requested as-of date. `postedThrough` is the latest recording instant among those included events; it is not a claim that all facts were known on the historical date. Command summaries and the pending count remain the latest recorded operational state, rather than a reconstructed historical command stream. An actual database regression posts a later repayment and checks both the earlier outstanding position/next installment and the later settled view. The original schedule and all event history remain unchanged.
