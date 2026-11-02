# PAY-01 Phase 4 — implementation evidence and integration handoff

**Current continuation:** the persistent simulation foundation described in [the backend specification](../../../../apps/api/src/modules/servicing/BACKEND.md) is now implemented and verified as an isolated candidate. The first-slice record below is retained as historical evidence; its original persistence exclusions describe that earlier slice. See [the continuation evidence](#continuation--persistent-simulation-foundation) for current delivered scope and remaining integration.

**Date:** 2 November 2026, Asia/Manila. **Owner:** Benedict. **Branch/worktree:** `feat/benedict-pay-01-phase4-rules`, `.worktrees/benedict-pay-01-phase4-rules`. **Dependency:** planning checkpoint `c9488cb`, containing Phase 3 `9af25b5`. Main remains `1776d9fdd5022e141a48ba1fda318636637e3d85`.

The user requested beginning Phase 4 after discussing independent work. This implements **P4-B pure command/origination/authorization/recovery rules**, a concrete P4-A input proposal, and a fictional test driver. **Phase 4 as a durable connected foundation is not complete.** Persistence/lock/producer acceptance remains unrecorded, so no guessed SQL migration, repository, real financial service, endpoint, worker or shared wiring is added.

## Delivered code

| File under `apps/api/src/modules/servicing/` | Actual result |
| --- | --- |
| `context.ts` | Private canonical-composed schemas for exact release basis, pending origination, applicable financial authority, immutable command, submission and observation values |
| `command-rules.ts` | Deeply immutable candidates for prepare/authorize/submission/observation; exact saved-basis and delivered-cash checks; read-only inspection and recovery advice |
| `command-rules.test.ts` | Independent fictional rules/edge cases using the existing actual Phase 1 decision functions |
| `testing/fixtures.ts` | Explicit fictional actor/configuration/evidence inputs; no operational records or accepted policy |
| `testing/manual-simulation.ts` and tests | Network-free fake manual outcomes, key/event consistency and serialized fixture restoration; no durable storage or real transfer |
| [README.md](../../../../apps/api/src/modules/servicing/README.md) | Behavior specification, proposed producer inputs, trust boundaries, limitations and next integration steps |

The private command model binds exact schedule/acceptance/snapshot, origin/application/loan, intended cash amount/date/method/reference, financial component version, preparer, logical/provider key and permanent event ID. Same-person preparation/authorization is denied even with both roles. Current scope/grant/limits/MFA and original-authorizer applicability are required; missing inputs never become a grant or zero.

Known observations are separated from permission for a new release. Unknown observed fields remain null; current observation authority is sufficient to retain a known fact without fetching a live release/source packet. Contradictions preserve original and new evidence with a review hold. Posted success, active loan, receipt publication and resubmission permission are never produced. The simulation driver's state is a serialized test fixture, not a database or a production provider.

## Verification

Node 24.12.0/npm 11.9.0, existing locked dependencies. New tests are pure/in-memory and require no database. Repository regressions use dedicated Compose project `agap-benedict-phase4`, fictional PostgreSQL 18 `agap_test` on localhost:55446; no partner/model/real-member data is loaded. Database and browser suites run sequentially.

- Focused servicing suite: **103 tests passed across two files**.
- `npm run typecheck:platform` and focused lint: **passed**.
- `npm run check`: **passed** — lint, canonical generated-contract drift check, frontend/API builds, **182 frontend tests** and **430 platform tests** (including the 103 new servicing cases).
- `npm run test:e2e`: **34 tests passed**, using isolated web/API ports 5190/4116 and Playwright 1.64.1/Chromium headless revision 1248. These are existing app-path regressions, not new servicing endpoint tests.
- Ownership/link/source consistency and whitespace: **passed**. All 31 Phase 0, 27 Phase 2 planning, 47 Phase 3 planning and 36 Phase 4 planning source hashes remain unchanged. The 38 original planned acceptance rows remain historical/planned. All eight new local Markdown references, owned changed paths and scoped LF/whitespace checks passed.

The tests cover exact approval/document/member acknowledgment, source/input/conflict/snapshot changes, expiry at Manila midnight, original schedule preservation, preflight duplicate rejection, delivered cash versus principal, invalid money/dates, financial roles/separation, limits/MFA/configuration versions, immutable command identity, one submission candidate, definitive versus unknown evidence, duplicate/conflicting observations and late known settlement. Simulation tests verify no network calls, no movement before submitted intent, key/event consistency, null unknown facts and explicit serialized fixture restoration.

**These passes do not prove servicing DB constraints/RLS, runtime authentication, concurrent first-release uniqueness, atomic durable observation/audit/cache effects, real worker restart/lease fencing, HTTP replay or actual provider/GL integration.** The inherited platform/decision/accounting tests still test their respective layers; they do not implement servicing persistence by passing again.

## Planned acceptance coverage

This slice provides pure-rule evidence for relevant portions of P4-T02/03/04/06/07/08/10/15/16/22/23/24/25/28/31/32/33/34/37, plus fictional simulation portions of P4-T18/19/20. P4-T09 and related race/uniqueness requirements have **preflight tests only**, not real DB proof. Actor tests validate supplied server-context rules; they are not evidence of real session authentication/revocation.

The original [38-case matrix](acceptance_tests.csv), [transition proposal](transition_matrix.csv), [planning verification](VERIFICATION.md) and source manifests remain historical and unchanged. Their planned/unaccepted labels have not been rewritten into integrated completion. Actual durable/HTTP/combined portions remain pending, particularly P4-T01/05/09/11–14/17/18–21/26/27/29/30/31/35–38.

## Concrete next dependencies

1. **Robert/Aaron/Benedict/Earl:** review and record the exact input/base/lock proposals in the [plan](PLAN.md) and module specification. P4-A has concrete reviewable types, not fabricated owner sign-off. Cooperative financial settings remain unconfirmed; all test settings are fictional.
2. **Robert with Aaron/Benedict:** supply current identity/app/source/policy/decision/acceptance guards in the caller transaction. Producer fields such as current authorizer, verified observation and release preflight must be server-derived; never deserialize these private contexts directly from a client.
3. **Benedict after accepted boundaries:** implement P4-C servicing persistence, constraints and runtime RLS; one origination/first-release identity must cover alias loan IDs and be enforced under concurrent writers. Pure supplied `existingOriginationId`/release-claim flags do not establish this.
4. **Benedict/Robert:** implement the real transaction-aware release mapping/authorization boundary and command/status/intake services. Keep the existing decisions `releaseAuthorized: false` read and existing public `ReleaseAuthorizationPort` honest. Do not open nested decision coordinators or enable an arbitrary state patch.
5. **Robert with Benedict:** integrate durable HTTP idempotency, audit/outbox, submission claim/fencing and worker/status recovery. Capture actual observations separately from posting; no real adapter/outbox handler may blindly resubmit an unknown movement. Null provider references remain a contract gap.
6. **Earl/Aaron/Robert/Benedict:** accept component/period/posting interfaces and matching fictional treatments for Phase 5. No interest/fees are silently dropped; actual GL/servicing/receipt/claim/activation must commit atomically before final `confirmed`.
7. **Robert:** publish accepted canonical schema/client/operations and register reviewed modules/migrations/providers/capabilities, then update `Assignment.md` from actual combined evidence. No shared file/status/configuration is changed by this slice.

No UI is changed, so screenshots are not applicable. Main, all earlier implementation/planning artifacts, other owners' files, dependencies, model notebooks and cooperative documents are untouched. `graft` and `graphify` are unavailable; navigation used `rg`/direct reads and no graph refresh is claimed. The dedicated fictional Phase 4 Compose project was stopped after verification; no other developer database was reset or stopped. No push, PR publication, external message or merge is performed.

## Continuation — persistent simulation foundation

2 November 2026. Continued in the existing `feat/benedict-pay-01-phase4-rules` worktree at planning checkpoint `c9488cb`. The user's instruction authorizes this further implementation; it does not imply consuming-owner approval of shared interface proposals. Canonical contract 0.2.0 and main remain unchanged. No new dependency, shared configuration, route, capability, member UI or tracker change is introduced.

### Delivered continuation

- `backend-contracts.ts`: transaction-aware resource/current-basis/observation-authority consumer proposals with unavailable defaults. Test adapters are explicitly fictional and never registered at startup.
- `servicing.repository.ts`: checksum-verified immutable pending originations, permanent first-release/event/provider identities, append-only command revisions and separately indexed observation/movement evidence.
- `servicing.service.ts`: scoped origination, prepare, distinct authorization, durable single submission intent, separately committed observation intake and read-only recovery under the existing unit of work. Existing idempotency, identity, audit and outbox behavior is reused.
- Three additive owned migrations enforce application/origination/release uniqueness, exact scoped bindings, safe integer money/versions, simulation-only nonposted states, actor/history/observation identity, immutable records, paired evidence and FORCE RLS. A second request key or alias loan ID cannot bypass the first-release identity.
- `backend.test.ts`: **24 new database/service cases** exercise real runtime roles, two-writer races, source guard locking, rollback, recovery through a fresh connection, exact replay, revoked actors, cross-scope denial, changed authorizer, late/conflicting observations, cross-command movement deduplication and non-superuser/non-BYPASSRLS function ownership.
- The pure observation rule now accepts a trusted repository-established cross-command movement conflict flag. It retains the new observation as conflict evidence rather than claiming another movement or throwing away a known fact. Existing pure rules/fictional driver remain operational.
- The owned [README](../../../../apps/api/src/modules/servicing/README.md) and [backend specification](../../../../apps/api/src/modules/servicing/BACKEND.md) describe actual storage, errors, replay, trust boundaries, limits and receiving-owner requirements. Frozen planning manifests/matrices are unchanged.

The complete submission intent commits before any hypothetical financial side effect. No dispatcher/provider is implemented. A fresh process sees a submitted/unknown command and reconciliation advice; it does not initiate another transfer. Observation intake does not depend on obsolete source/execution readiness, and a later failed operation cannot roll back an earlier committed observation. An intake transaction that itself fails still requires manual evidence preservation/retry; external webhook inbox/worker registration remains future integration.

### Executed verification

Temporary toolchain: Node **24.12.0**, npm **11.9.0**, existing repository-locked dependencies. The default shell originally supplied Node 18 and the sandbox denied localhost database access; Node/npm and the matching browser were obtained in temporary storage, and authorized checks ran against dedicated Compose project `agap-benedict-phase4`, PostgreSQL 18 `agap_test` on localhost **55446**. No project dependency/configuration was changed. No automatic approval review rejection occurred.

| Check | Final result |
| --- | --- |
| Focused servicing runtime/DB checks | 23 cases passed before the final field/status case; all **24** are included in the final full platform pass |
| `npm run typecheck:platform`, focused lint | Passed |
| Final `npm run check` | Passed: lint, generated canonical contract/client check, frontend/API builds, **182 frontend tests**, **457 platform/backend/contract tests** |
| `npm run test:e2e` | **34 passed**, 36.7 seconds, isolated web/API ports **5190/4116**, matching Playwright Chromium headless revision 1248 |
| Source preservation | All **31 Phase 0**, **27 Phase 2**, **47 Phase 3** and **36 Phase 4 planning** source fingerprints preserved |
| Documentation / ownership | Local link existence, whitespace and changed-file boundary checks passed; final paths remain in Benedict's servicing module and this evidence record |

The browser suite exercises existing registered application paths. It does not test new servicing HTTP endpoints, since no such route is registered. Backend tests use real PostgreSQL/runtime isolation with fictional authoritative producer stand-ins; they do not prove Robert/Aaron's actual source/identity/application writer protocol. No screenshots are applicable to this backend-only continuation. The existing manual-hash-router warning remains the already documented browser limitation.

Initial fixture runs exposed a UUID/text parameter cast and missing test-producer row-lock permission; only fictional test setup was corrected. Review of the initial candidate led to additive migrations 002/003 for exact writer/binding/evidence constraints. SQL applied migration 001 was preserved after its first application; no earlier owner migration was rewritten. Internal error causes remain server-side while field/permission/version failures preserve 422/403/412/409 semantics.

`graft` and `graphify` remain unavailable. Navigation used `rg`/direct reads, with no indexed navigation or graph update claimed. Full database checks and browser suites ran sequentially, preserving the shared fictional fixture reset boundary. The task-owned test Compose project is stopped after verification.

### Remaining phase boundaries and next handoff

1. **Robert/Aaron/Benedict:** accept the producer/current-authorizer/source/decision/acceptance guards and lock order. The fixture context is not a production authorization service. Supply guarded inputs in the same transaction; retain unavailable defaults until then.
2. **Benedict with Robert:** implement the canonical transaction-aware release-port adapter on the accepted mapping; the candidate service already validates its stored command/origination against the supplied exact basis. No nested decision coordinator or cross-owner table write is permitted. The existing decision read still returns `releaseAuthorized: false`.
3. **Robert:** review schema/function ownership and grants, register all servicing migrations/providers and accepted canonical operations/projections/client shapes, and connect actual producers. Private service results contain sensitive review context and must not be exposed as HTTP DTOs.
4. **Robert with Benedict:** add authenticated external inbox/worker dispatch/lease/fencing only under its reviewed protocol. This candidate persists a single logical intent but implements no external worker or live transfer. Missing-reference recovery remains authorized operator reconciliation.
5. **Earl/Aaron/Robert/Benedict:** accept period/component mappings and Phase 5's atomic servicing/GL/receipt orchestration. No posted balance, repayment allocation, active loan, receipt or journal is supplied here. Broader servicing/amendments and model work remain separate.
6. **Benedict with receiving owners:** execute combined real-producer/registered HTTP/replay/privacy tests on the agreed integration base. Robert updates Assignment.md from that evidence. No phase is declared integrated by this local candidate.

All continuation changes remain uncommitted in the existing Phase 4 worktree. No push, PR, merge, external message or shared-file edit was performed; the root workspace's cooperative documents and training files are untouched.
