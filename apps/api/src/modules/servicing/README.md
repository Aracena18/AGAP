# Servicing rules and simulation foundation

This guide describes the original pure rules, fictional test driver, and persisted simulation foundation. [Backend behavior](BACKEND.md) and the [atomic money path](MONEY.md) extend it. The 0.4.0 fictional pilot now supplies explicit current-source/authority adapters, financial routes, safe loan projections, and accounting integration; the alternate connected workflow supplies its own guarded producers; both modes remain unavailable unless configured.

## Files and actual behavior

- `backend-contracts.ts`: unavailable-by-default transaction-aware producer requirements; not public HTTP DTOs.
- `servicing.repository.ts` / `servicing.service.ts`: append-only storage, one origination/first-release identity, current-basis guards, scoped commands/reads, atomic idempotency/audit/outbox, separately committed observation intake and read-only recovery.
- `migrations/001` through `003`: scoped immutable records, safe money/version constraints, database-enforced release/event/key uniqueness, allowed revision transitions, paired observation/movement evidence and least-privilege RLS.
- `backend.test.ts`: real PostgreSQL/runtime-role, concurrent-writer, rollback, fresh-connection recovery, privacy and non-BYPASSRLS function-owner tests. Its producer context table is a test fixture only.

- `context.ts`: private schemas composed from canonical 0.2.0 primitives, request/command types and the existing decision context. They are consumer proposals, not accepted public API DTOs. No shared schema/client/version is changed.
- `command-rules.ts`: pure validated candidates for pending origination, release preparation, separate financial authorization, one submission intent, observation intake, integrity inspection and read-only recovery advice. Outputs are cloned/validated and deeply frozen.
- `command-rules.test.ts`: fictional independent rule scenarios, including supplied figures, exact bindings, scope, roles, MFA, versions, mutation, unknown/conflicting outcomes and calendar expiry.
- `testing/fixtures.ts`: fictional inputs reusing the existing decision fixture and real Phase 1 recommendation/decision functions. Financial limits, identities, schedules and configuration are invented test settings, not DCCPEC policy. No operational records or independent evaluation labels are read.
- `testing/manual-simulation.ts` / its tests: network-free, in-memory fictional outcomes and explicit serialized fixture restoration. No real cash/bank/provider operation, DB durability or worker restart is implemented.

## Public module functions

| Function | Implemented semantics |
| --- | --- |
| `preparePendingOrigination` | Requires a current integrity-checked approval, exact linked-member acceptance/document and current unchanged review basis; preserves supplied schedule/offer and pending-release status; rejects an existing origination preflight |
| `prepareReleaseCommand` | Uses exact delivered cash rather than assuming principal equals cash; rejects reserved/settled/unavailable first-release preflight; creates immutable IDs/payload/hash/history with null receipt/journal |
| `authorizeCommand` | Requires distinct configured financial authorizer, actual role/scope in supplied actor context, method/product/date/amount applicability and fresh MFA; captures exact payload/configuration |
| `prepareSubmission` | Requires authorized state/current version, current release basis, current original authorizer and unchanged authority/component versions; creates one intent with stable provider/event identities and claim version |
| `recordObservation` | Uses a narrow current observation-authority context, independent of live source/release/execution availability. Records exact known facts or uncertainty; never turns settlement into posted success |
| `inspectCommand` | Validates structural/payload/history bindings and returns an immutable view; does not authenticate, query or authorize a transfer |
| `recoveryAdvice` | Gives read-only next-step advice, with `canResubmit`, `canActivateLoan`, `canPublishPostedReceipt` and `releaseAuthorized` all false |

All actor/context/time/preflight/verification inputs are **server-trusted requirements**. Pure functions cannot authenticate a session, establish source truth, prove a row exists or enforce concurrent uniqueness. They are not endpoints to which a browser may submit its own actor, grants, `verified: true`, clock, release-claim state or accepted decision packet. Actual coordinators/producer guards must supply those values through reviewed ports and keep them current through commit.

## Proposed owner inputs and unresolved acceptance

| Private proposal | Required actual producer / review |
| --- | --- |
| `ReleaseBasisSchema` | Decision-owned verified snapshot/document/acknowledgment plus Aaron/Robert's current guarded source/assessment/application basis and current pointer |
| `AcceptanceBindingSchema` | Actual immutable own-member acknowledgment record with link/member/document/snapshot identity and server time; no officer-as-member substitution |
| `FinancialAuthoritySchema` | Versioned applicable institutional financial configuration and Robert's authorized projection. Every limit/action/method/date is explicit; no default operational grant |
| `OperationContextSchema.originalAuthorizer` | Robert's current active/scoped financial-authorizer applicability projection, locked/revalidated through commit |
| Execution/component version | Reviewed component support from Aaron/Earl/Robert. Its version is bound into the immutable command; changed mappings cannot reuse authorization |
| Existing origination/release-claim preflight | Transaction-protected servicing repository plus database uniqueness covering application/origination/loan/event aliases. The supplied preflight alone is not uniqueness proof |
| `ObservationContextSchema` and observation input | Current scoped intake authority and trusted, authorized evidence/status provenance. No live release basis is needed merely to retain a known movement fact; intake authorization still applies |

These proposals are prepared for review, **not accepted** by implementation or tests. The service now loads its persisted loan/command binding and rechecks the pure release guard against a producer-guarded basis in the caller's transaction. The legacy canonical `ReleaseAuthorizationPort` is not a general live adapter; the pilot composes explicit current-source/authority guards under its own fictional configuration. The decision service's `releaseAuthorized: false` read is unchanged. No nested decision unit of work or cross-module table write is introduced.

## State and integrity rules

The canonical seven public command states remain unchanged. This private Phase 4 candidate can create `prepared`, `authorized`, `submitted`, `unknown`, `failed` and `confirmed_unposted`. The canonical posted `confirmed` state is deliberately rejected by this private candidate schema: Phase 5 must provide an accepted atomic posting implementation/evidence before final success, loan activation or a posted receipt can exist. There is no arbitrary next-state operation.

Payload hashing binds command/origination/application, supplied cash amount/date/method/reference/reason, preparer, simulation mode, component version, schedule/acceptance, provider key and permanent event identity. Authorization references that hash and the financial policy version. State/history advances preserve the immutable payload and increment a safe version. Current grants and original-authorizer identity/role/MFA applicability are rechecked before submission. MFA configuration cannot exceed the existing platform's 15-minute ceiling; real integration must also retain the identity coordinator's controls.

Pending origination uses the existing decision `reviewChangeEffect` and saved-snapshot hash; it does not implement another assessment engine or regenerate accepted terms. Dates are valid calendar dates, UTC instants are preserved, and approval expiry is inclusive on the Asia/Manila calendar. Cash release is the approved net proceeds, not a sum or inferred fee/interest split. No balance, allocation, accrual or authoritative financial total is calculated.

## Observation, conflict and recovery behavior

Definitive outcomes require verified evidence metadata; confirmed settlement additionally requires original movement identity/reference and all reported amount/currency/date/time fields. Unknown fields remain **null**, including unknown observed amount/date; intended request amounts are not substituted as movement facts. Reported amounts are integer **minor units**. Unexpected currency is retained as conflicting evidence, never converted or treated as PHP lending support.

Observation ID replay returns the existing candidate without another version/history effect after current scoped intake checks. A new notification for the same underlying movement can retain provenance without another financial effect. Different payload under an existing observation ID is rejected; contradictory newly identified evidence is appended with conflict markers and the original preserved. Amount/currency/date/time/reference mismatch, a second movement or contradictory definitive outcome requires review. Known settlement is not downgraded by a late failure/unknown status.

If confirmed evidence arrives after a recorded `failed` status, that historical state is retained with a **late-settlement conflict and `knownSettlement: true`**. Consumers must use the review disposition, not present that record as definitive no-movement failure. Conflict review takes precedence over normal recovery advice. No automatic replacement/retry is available.

Observation intake requires only current financial observation authority and the stored command; a missing/changed source/execution packet cannot force loss of an already known movement. This is a value-level result: a future durable intake transaction must commit the observation/conflict independently of any failing later posting operation. Unmatched/orphan observations and a full provider inbox are not implemented here.

Submission/unknown recovery advice never submits again. Unknown with no reference requires operator reconciliation because the current canonical provider status port cannot query a null reference. No reference/key lookup endpoint is invented. Known settlement remains unposted; there is no journal ID, active loan, posted timestamp or member receipt fabricated to fit an existing DTO.

## Fictional driver and verification limits

The driver accepts only validated submitted **simulation-mode** candidates. It counts fictional movements, preserves a stable outcome for a provider key, rejects key/event reuse for another candidate, and exports/imports explicit `fictional-test-only` state. Unknown simulated outcomes remain unknown on repeated submit calls; tests use explicit operator evidence for recovery. Driver-key replay tests are not instructions to blindly resubmit a real transfer.

The driver is imported only by tests. It has no network/storage adapter and is not registered in API/worker startup. JSON fixture restoration proves value preservation and the test driver's semantics, **not process-crash recovery, database durability, multi-worker fencing, RLS, concurrent first-release uniqueness or exactly-once external execution**. Those are P4-C through P4-H integration requirements after accepted ports.

Run focused tests with the existing toolchain:

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/servicing
npm run typecheck:platform
```

Full repository checks still use the guarded isolated fictional test database and run sequentially with browser regression. Exact results are in the [verification summary](../../../../../docs/AGAP_Verification.md). No new dependency, shared configuration, canonical fixture, design or model file is needed for this slice.

## Connected money workspace

The additive staff session advertises `connectedLending: true` only when the guarded fictional connected mode is enabled. Existing sessions and member-session shapes remain compatible; navigation consumes this server flag.

The connected fictional workflow reuses `ServicingService`, `MoneyService`, `LoanReads`, actual accounting posting, and current connected-lending producers. Bounded financial application/workspace reads expose preparation, separate authorization, durable intent, server-generated fictional observation, and posting through canonical safe projections. The pilot remains separate; their default-off switches are mutually exclusive. Institutional operations and independent acceptance remain pending.

Canonical schemas/operations and generated-client adapters reuse safe money/loan projections and reason-bound transition bodies. Scope every read/retry to the current identity, organization, branch and financial role. Execute transport receipts, action reasons and underlying commands in one existing guarded transaction; an observation request commits independently of later posting. The server constructs fictional evidence and stable movement identities; HTTP never supplies verified flags, amounts for an observed settlement, authority packets or ledger effects. No external money/provider call is introduced. Preserve existing posting-period/aggregate lock order, immutable terms and exact retry behavior.

The authorized application queue, origination/release entry, and loan workspace compose the generated client. Members consume existing own-record posted loan/receipt reads, due notices and confirmed support flows. Full PostgreSQL/API/browser verification must cover the complete connected journey, distinct preparer/authorizer, duplicate/new-key replay, unknown settlement recovery, posting rollback, stale/revoked access, receipt printing, reconciliation and unchanged support history. Update the existing specs/design/tracker and verification records. Robert/Benedict retain consuming-owner review of their boundaries; no institutional acceptance is invented.
