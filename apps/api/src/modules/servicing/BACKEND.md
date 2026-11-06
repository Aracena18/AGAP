# Persistent servicing simulation

This guide describes preparation, authorization, durable submission intent, settlement observations, and recovery. The [atomic money path](MONEY.md) adds posting; the 0.4.0 [fictional pilot](../pilot/configure.ts) supplies reviewed-source/authority and accounting wiring. Simulation evidence never establishes real fund movement.

## Service operations

`ServicingService` uses the existing staff `UnitOfWork`, identity recheck, HTTP command cache and audit/outbox helpers. It makes no provider call and never posts a journal, activates a loan or publishes a posted receipt. All methods are internal exports, not new endpoint promises. Their private return values include sensitive review context and must not be exposed as a public response without approved projections.

| Operation | Actual behavior |
| --- | --- |
| `originate` | Scoped cashier prepares one immutable pending origination per organization/application from an exact current approved/accepted basis. A new ID/key cannot create another origination for the same application. Only simulation configuration is enabled. |
| `prepare` | Loads stored origination, rechecks current source/decision/acceptance/configuration through producer ports, and commits one first-release claim and initial command revision. Server-generated command, provider key and permanent event ID are distinct. |
| `authorize` | Loads the current command and rejects stale versions, the preparer's own authorization, wrong authority/amount/method, expired basis or unavailable configuration. Stores a new immutable revision. |
| `submitIntent` | Rechecks the accepted basis, financial authority, original authorizer and fresh MFA; stores exactly one immutable submission intent/fence before any hypothetical external effect. It does not execute that effect. |
| `observe` | Records trusted manual/simulated outcome evidence with current intake authority. It does not require the old release/source configuration to remain available merely to preserve an already-known fact. Observation, command revision, deduplication claim, idempotency and audit/outbox commit together. |
| `read` | Scoped cashier/financial-authorizer/auditor obtains checksum-verified command history and read-only recovery advice. No read changes state or fabricates a posted position. |

Current resource authorization precedes command replay. A successful retry returns its original committed response, not a recomputed new action or the latest command. Use a separately authorized read for latest status. New requests compare the supplied command version after acquiring the application lock. A stale new observation requires the caller to retain its original evidence and retry after reading current status; this manual service is not a durable external-webhook inbox.

Malformed fields return sanitized 422 errors, forbidden roles/authority/MFA return 403, stale versions return 412, and conflicting references/transitions return 409. Unknown backend failures return a sanitized 503 with the original cause retained internally, never serialized as a response. Existing command-cache key errors retain the platform's status/code.

## Producer contract and locking

`ServicingBackendPorts` is a consumer proposal with three required operations:

- `authorize(tx, applicationId)` establishes current scoped resource access, including on cached retries.
- `operation(tx, applicationId)` returns the exact persisted decision/snapshot, current basis, document and linked-member acknowledgment, configured financial authority and execution/component version, and current original-authorizer applicability. It must protect every participating source/policy/application/identity writer through commit.
- `observationAuthority(tx, applicationId)` supplies current financial observation permission independently of release readiness. Changed evidence or a closed posting period must not erase a known movement.

Default ports return `501 module_not_available`. No browser can supply its own authority, `verified` flag, actor, clock or current-basis packet. Input evidence is trusted only after an accepted owner intake boundary authenticates/authorizes it. The test-only `servicing.test_context` table and `FictionalManualDriver` are never runtime producers.

Phase 4 order is current identity → authorized producer/source guards → servicing application advisory lock → command append/claim → movement evidence. The database additionally serializes revision insertion by command. Competing first-release commands cannot escape through aliases because SQL enforces both application-to-origination uniqueness and origination-to-release uniqueness. This does not establish another owner's actual writer/guard protocol; the tests exercise a labeled stand-in.

Phase 5 must agree its accounting-period pre-lock **before** loan/command locks and integrate the actual `PostingPort` in the same coordinator. Do not invoke a nested decision unit of work, call a provider under a database transaction, or attach a blind money-submission handler to ordinary outbox retries. The legacy canonical `ReleaseAuthorizationPort` is not registered by this isolated foundation; the pilot composes its explicit producer/guard adapter separately.

## Storage and access

Apply all three owned migrations before enabling any consumer:

1. `001-servicing-foundation.sql`: immutable originations, first-release claims, append-only command revisions, private movement identity index and indexed settlement observations. Command bodies use canonical text and SHA-256 checked by PostgreSQL and the repository. SQL validates immutable bindings, sequential versions and allowed history transitions.
2. `002-binding-guards.sql`: actual writer identity, cashier-only preparation, integer centavos, original application/branch/member linkage, claim-to-initial-revision completeness and observation-to-revision/actor binding.
3. `003-movement-evidence.sql`: a movement identity claim cannot commit without its matching indexed observation. No orphan reservation can silently poison deduplication.

All tables have FORCE RLS. Runtime users are not owners, superusers or BYPASSRLS roles. Organization/branch/role predicates also exclude member context. Ordinary runtime roles have no history UPDATE/DELETE grant; append-only triggers also reject accidental owner mutation. Snapshot/model/terms integrity checks detect supported-path corruption, not malicious administrator rewrites of both content and checksums.

The organization-wide `(producer, movement ID)` index is private. Its narrow definer function accepts a scoped target command and returns only a conflict flag, never another branch's command identity. PUBLIC function execution is revoked. Real tests change the security-definer owners to a non-superuser/non-BYPASSRLS role and exercise FORCE RLS. Robert must review the eventual production function ownership/grants and startup schema-ownership checks.

Current storage is deliberately append-only: the latest version is read from the revisions table; no runtime method patches a financial balance or arbitrary next-state string. Expected history growth and document/body limits need operational capacity review before live deployment.

## Settlement and recovery

Settlement confirmation becomes `confirmed_unposted`. The posted `confirmed` state, journal/receipt IDs and active-loan status are rejected/unavailable in Phase 4. Exact observation ID replay has no new history effect. New notifications for the same movement retain provenance without another release. Reusing an observation ID for different evidence is rejected; a new-ID contradiction is preserved with conflict markers.

If a movement is reported for another command, its new observation is retained but flagged for review; it does not acquire a second movement claim or become posted success. A late settlement after `failed` retains the original failed history plus known settlement/conflict evidence. Consumers must use `knownSettlement` and `nextAction`, not interpret the old state as proof no money moved.

An unknown outcome has null observed amount/date/reference where unknown. Intended cash is not substituted as settlement evidence. A missing provider reference requires operator reconciliation; no key-lookup endpoint or replacement transfer is invented.

Submission intent and subsequent observation are separate transactions. A process stopping before observation leaves a durable submitted intent and requires reconciliation. The service never resubmits it. Fresh-connection tests demonstrate database persistence; they do not certify exactly-once external execution, a live provider, operating-system crash recovery or a multi-worker lease/dispatch protocol. No external dispatcher exists in this candidate. The stored submission ID/claim version is a single-use logical intent, not a claim that provider submission already occurred.

Posting/period failures cannot roll back an **earlier committed** observation. An observation intake transaction that itself fails commits nothing; the manual caller must preserve evidence and retry. Real external intake still requires Robert's separately wired authenticated durable inbox. Phase 5 must leave known unposted evidence recoverable while committing servicing allocations/GL/receipts/final status atomically.

## Remaining receiving-owner work

Robert/Aaron/Benedict review producer contracts, resource/version/lock semantics and a real current-authorizer projection; cooperative settings remain unconfirmed. Robert publishes approved public projections/operations/client changes, registers all migrations and providers, and enables capabilities only after combined HTTP/browser evidence. Current module exports must not be wired directly to an HTTP body.

Benedict supplies the eventual release-port adapter on the accepted mapping and contributes combined source/policy/revocation/replay tests. Earl/Aaron/Robert/Benedict agree exact principal/interest/fee components and Phase 5 posting/reconciliation boundaries. This foundation is extended by the atomic-money and pilot layers; real provider dispatch, contractual amendments, and production operating acceptance remain separate.
