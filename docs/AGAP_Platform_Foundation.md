# Robert's platform foundation

26 October 2026 candidate: `feat/robert-member-platform`, built from the published plan and Robert's earlier foundation candidate. Contract **0.2.0 is for review**, not consuming-owner agreement or a production release. [Assignment.md](../Assignment.md) is the task tracker. Historical [PR #10](https://github.com/Aracena18/AGAP/pull/10) and its [21 October verification](AGAP_Robert_Verification.md) remain intact; no PR merge is authorized by this guide.

This checkout supplies real Nest/PostgreSQL staff/member intake, separate member linkage/session, reminder preferences and member-portal screens/facade. Source verification, trained inference, checked production assessments, decisions, loans, ledger and support records require their owners. Known financial operations return `501 module_not_available`; member domain reads explicitly return unavailable. [Capabilities](../packages/contracts/src/operations.ts) identify the facade, not completed downstream services. [Current verification](AGAP_Robert_Member_Verification.md) distinguishes real integration from labeled simulations.

## Current member and domain handoff

- Robert owns all phone-facing UI, member identity/access/facade, shared schemas/client and registration. The [written 0.2.0 proposal](AGAP_Member_Contract_Proposal.md) precedes canonical changes. `MemberDomainPorts` uses a separate member transaction/actor; members never impersonate officers.
- Aaron supplies evidence/CI/cleared-file lifecycle, confirmed facts, checked options and one AI adapter. Benedict supplies current decisions/acceptance and posted loans/receipts; Earl supplies confirmed support and staff responses. Their default ports remain unavailable. Qwen/EBM training and independent evaluation stay with the existing owners; no weights/runtime are supplied.
- Append-only migrations 008–010 add member links, separate OAuth/session audience, own-record RLS/commands/preferences/events and narrow locked login lookup. Identity runtime can look up/recheck a link but cannot grant or revoke it. Existing migrations and historical evidence are preserved.
- The original assessment engine was extracted once to `packages/finance/src/assessment.ts`; demo imports use the compatibility re-export. Arithmetic is unchanged; Aaron owns further finance work.
- Independent owner review/base agreement, full domain integration and OPS identity/offsite/cutover evidence remain required. First-demo reminders are in-portal and support requests never change terms.

## Foundation review registration — 30 October 2026

The [FND-03/SHOW-01 technical review](AGAP_Foundation_Contract_Review.md) covers current main `266379a`, including the merged GL-01/EVAL-01 and fictional-browser evidence slices. Contract 0.2.0 still needs actual consuming-owner agreement. Robert's integration branch registers the three existing accounting migrations after platform migrations in the same checksum-checked migrator. It adds no live chart, rule or period configuration, posting HTTP route, payment orchestrator or financial capability flag.

`npm run check` now also runs `npm run typecheck:evaluation` and `npm run test:evaluation`, using Earl's existing local evaluation configuration. The current CI workflow already calls `npm run check`; no second runner, provider, corpus or schema is introduced. The module README's original registration requests describe its earlier handoff; the shared commands/registry and this current review record describe the integration proposal.

Verification uses an isolated fictional `agap_test` instance. The normal migration path must install the ledger, preserve history on replay and reject a changed applied ledger checksum. Keep the module's full transaction/permission checks and the contributor-required browser checks. A development corpus preview is not an accepted training release or model result; [the review record](AGAP_Foundation_Contract_Review.md#verification) records observed results and pending owners.

## Production baseline registration — 2 November 2026

The next FND-03/SHOW-01 technical step registers the already supplied decision and servicing migrations in the default checksum-checked migration path: platform → accounting 001–003 → decisions 001–005 → servicing 001–007. All module-owned SQL remains unchanged. The existing module tests' temporary registration describes their original isolated handoff; a normal fresh installation and an installation with the earlier platform/accounting history must now discover the same delivered schemas without a test shim.

The migration regression verifies scoped/immutable decision/payment storage, safe read projections, deferred money-command completeness, unchanged applied history on replay and refusal of changed accounting/decision/servicing checksums. This is database preparation. Business routes, member-domain providers, public schemas/client and financial capability defaults remain unchanged; test-only upstream producers and fictional policy are not registered. Full domain integration, accepted interfaces and operational policy remain pending. [Current verification](AGAP_Foundation_Contract_Review.md#production-baseline-and-database-registration--2-november-2026) and the [production sequence](../Assignment.md#production-completion-sequence--2-november-2026) record scope and next work.

## Run the local staff workspace

Use Node 24, npm and Docker Compose on Linux. All supplied credentials, organizations and identities are public fictional development fixtures. The database and Keycloak listen on loopback. Initial image downloads require network access.

```sh
npm ci
cp .env.example .env
docker compose -f infra/compose.yml --profile identity up -d --wait
npm run db:migrate
npm run db:seed
```

In separate terminals:

```sh
npm run api:dev
```

```sh
npm run dev -- --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/#/member` as the seeded fictional `member`, or `http://127.0.0.1:5174/#/staff` for staff. The member uses the same public development password below and enrolls an authenticator if requested. It is explicitly linked to the fictional portal member, with no staff role. Sign in as `officer`, `auditor` or `administrator`, password `Fictional-training-123!`. Enroll an authenticator when Keycloak requests it. Its client includes `basic` (subject/authentication-time claims) and `acr`; see the [Keycloak claim-scope change](https://www.keycloak.org/docs/26.2.5/upgrading/index.html). Its import binds a password/OTP flow to LoA 2; AGAP requests a fresh sign-in and accepts MFA only from signed `acr=2`. The local realm is in [infra/keycloak/agap-realm.json](../infra/keycloak/agap-realm.json). Existing realms are not overwritten on restart; changing an imported realm requires an explicit local migration/reset, never deletion of a real identity database.

The fresh-authentication request permits completion within the browser-bound ten-minute login window; older authentication is rejected (subject to the OIDC library's clock tolerance). The [real Keycloak walkthrough](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Identity_Walkthrough.json) passed. With the local API/web/Keycloak running, `npm run test:keycloak` repeats this development-only check: it temporarily enrolls the fictional administrator, checks the signed MFA/self-revocation guard and logout, then removes its temporary OTP credential so the developer can enroll their own authenticator. No OTP secret or token is written to test artifacts. This is separate from the default CI suite and never runs against a production realm.

The Keycloak admin console is `http://127.0.0.1:58080`, with `local-admin` / `development-admin` for local setup. Ordinary staff accounts are preprovisioned by issuer and subject in AGAP. Provider role/group claims cannot grant application access. Development seeds never update/re-enable an existing staff identity and never import browser demo records.

The API listens on `127.0.0.1:4100`; Vite proxies `/api` without changing the public Origin. The application never accepts caller-supplied actor/organization fields. API bundles are built with `npm run api:build` and started with `npm run api:start` from the repository root. OpenAPI remains available at `/api/v1/openapi.json`.

`npm run worker:dev` starts a worker for the explicitly configured organization. The initial consumer registry is empty: it reports `awaiting_module_handlers` and leaves events pending. Owners register reviewed consumers through Robert; the bootstrap never silently acknowledges an event or invents a notification/payment adapter.

## Contracts and ownership

| Artifact | Purpose |
| --- | --- |
| [schemas.ts](../packages/contracts/src/schemas.ts) | Canonical runtime validation for production commands and projections |
| [operations.ts](../packages/contracts/src/operations.ts) | Versioned routes, owners, preconditions and implementation status |
| [ports.ts](../packages/contracts/src/ports.ts) | Transaction, checked assessment, release authority, posting, position, provider and private-file boundaries |
| [openapi.json](../packages/contracts/openapi.json) | Generated OpenAPI 3.1; validation and centavo/date schemas included |
| [generated client](../packages/api-client/src/index.ts) | Typed methods and runtime response validation |
| [migrate.ts](../apps/api/src/platform/migrate.ts) | Owner-operated, checksum-checked migration registry |

Run `npm run contracts:generate` after an approved canonical change. `contracts:check` rejects generated drift. Robert edits shared contracts/registration; other owners propose changes in their brief/PR. Existing `src/domain/types.ts` remains the demo/domain type authority. Production DTOs describe normalized commands, not another browser `CaseRecord`; money/calendar aliases refer to those shared types. No copied calculator or fixture registry was introduced.

| Implemented boundary | Behavior |
| --- | --- |
| Staff session | OIDC code/PKCE, signed ID token, state/nonce, rotated opaque HttpOnly cookie; server-side expiry and active membership |
| Members | Scoped cursor list/get; officer create/update; versioned contact and notice acknowledgment history |
| Applications | Scoped cursor list/get; officer draft create/update; assigned officer checked on update |
| Assignments | Fresh-MFA administrator command, intake states only, active same-branch officer; reason/history/version preserved |
| Staff access | Scoped administrator list; fresh-MFA, reasoned revocation of another account; immediate session invalidation |
| Provisioning | Operator CLI from an explicitly reviewed private input, trusted issuer and verified branch membership; append-only provisioning record |
| Infrastructure | Atomic audit/outbox/idempotency, restricted runtime roles/RLS, private quarantine adapter, bounded worker retries |

The staff UI supports member creation/contact correction, draft application creation and administrator revocation. The staff UI also corrects an assigned draft and lets a fresh-MFA administrator assign a submitted member request with a reason. Broader staff workflows remain pending. Broader membership/identity-reference management, permission grants/reactivation/recovery and audit/history browsing need additional reviewed workflows; do not improvise them with general table edits or a browser role selector.

## Command and transaction rules

1. Use server-established `ActorContext`. Session/role/branch access is read on each request and rechecked inside the transaction. The narrow `identity.assert_actor` function locks the current user/session through commit, preventing a permission change from racing a command after its initial HTTP check.
2. Submit safe integer centavos, explicit PHP and real calendar dates. No decimal currency, unsafe coercion, actor fields or computed financial totals. `unavailable` has an explicit reason; zero is a recorded value. Database bigints are bounded before Number conversion.
3. Creation/consequential commands require an `Idempotency-Key` (16–128 safe characters). Retain the same request/key across an uncertain result. The claim, hash, saved result, aggregate write, revision, audit and outbox share one transaction. Concurrent duplicates wait and replay the committed response; different bodies with the same key return 409. No idempotency expiry is enabled yet.
4. Updates also require `If-Match: "<version>"`: missing is 428, stale is 412. Changing request terms increments aggregate and assessment-input versions; changing assignment increments only aggregate version. Intake updates stop after review has progressed. Later modules must use explicit amendment/review commands and preserve saved decisions.
5. Call module ports with the **same** `TransactionContext`. Only the appropriate staff/member unit of work starts/commits/rolls back/releases the command connection. Member domain services use the supplied `MemberTransactionContext`, not a nested staff transaction. Services must not open nested connections for part of a financial posting. Future financial operations follow identity checks, accounting-period lock, affected loans in sorted ID order, then financial-command lock. Period close uses the conflicting period lock. C/D must verify this with their actual tables; this foundation does not claim ledger or close-race coverage.
6. Transport idempotency is separate from permanent financial-event uniqueness. `PostingPort` supplies the latter boundary; Earl implements/enforces it. Provider timeouts are `unknown`, requiring status reconciliation under Benedict's durable command, never an automatic new transfer.

Runtime/API credentials cannot be superusers, table owners, members of table-owner roles or `BYPASSRLS`. Financial module services receive normal runtime credentials; migration/operator credentials are never loaded by the API. Organization/branch RLS is a second control, not permission to skip service authorization. Members/application history and audit are append-only for runtime roles.

All configured staff roles can read intake within their branch scope; only officers create/correct it. Administrator powers are limited to their scoped access-management/assignment operations and confer no financial authority. Revocation cannot target the caller or a staff account outside the administrator's entire branch scope. MFA-sensitive actions require a signed MFA context no older than 15 minutes. A provider must bind LoA 2 to actual multiple factors; an arbitrary custom ACR mapper cannot establish that fact.

Origin and CSRF token are required for writes; the API enables no cross-origin access. Sign-in initiation is database-rate-limited to 120 requests per observed network source per five minutes; Keycloak also enforces login-attempt protection. Forwarded address headers are ignored, so a reverse proxy shares this coarse allowance until a reviewed proxy/source design is configured. No credentials, member payloads, document contents or raw provider exceptions are included in HTTP error logs.

## Integrating another module

1. Review the candidate schemas/ports and record the agreed version/base in your owner brief. Propose missing fields before implementation; registration is not financial-policy approval.
2. Work only in your module/feature paths. Export a public application service; use its port rather than writing another owner's tables. Submit route/provider/migration registration to Robert.
3. Add append-only module migrations, in dependency order through `migrationDirectories`. The migration owner uses a dedicated connection and advisory lock. Applied files are checksummed; changes fail rather than silently modifying an existing database.
4. Use `recordEvent` in the aggregate transaction. Envelopes carry stable IDs and minimal payloads; consumers reload authorized projections. Jobs/outbox handlers use row locks and `SKIP LOCKED`, commit database effects on the supplied connection, delay failures, and stop after five attempts. Unknown kinds remain pending. Do not make irreversible provider calls inside these handlers; use the durable provider command/inbox design.
5. Add real database/permission/transaction tests for your invariants. The financial posting/release ports are intentionally unimplemented until their owners supply the services.

`PrivateDocumentStore` stores exact bytes under generated UUID keys with SHA-256, 0700 directory/0600 files, bounded streaming, atomic immutable publication and traversal/symlink defenses. Successful writes are still quarantined. Aaron owns file metadata, authorization, content-type checks, malware scanning, cleared/blocked states, download access/audit and retention/holds. The member facade exposes bounded upload/download delegation, but its default evidence port is unavailable and stores/serves no file. Enable it only with Aaron's reviewed lifecycle, authorization and durable metadata/deduplication service. Successful extraction never establishes authenticity. The adapter's remove method is infrastructure only; it must sit behind an authorized retention/hold decision.

## Staff provisioning

The local seed is fictional. Real enrollment requires a responsible operator to verify the provider subject and approved role/branch assignment outside the application first. Create a mode-0600 JSON file outside public assets:

```json
{
  "organizationId": "20000000-0000-4000-8000-000000000001",
  "issuer": "http://127.0.0.1:58080/realms/agap",
  "subject": "verified-identity-provider-subject",
  "displayName": "Fictional New Officer",
  "branchIds": ["20000000-0000-4000-8000-000000000002"],
  "roles": ["officer"],
  "operatorReference": "FICTIONAL-REVIEW-001",
  "reason": "Approved fictional training access"
}
```

Run `npm run staff:provision -- /private/path/staff.json` using operator-only migration credentials. It inserts a new identity and provisioning snapshot atomically; duplicates fail and existing access is not changed. The example IDs/HTTP issuer belong only to localhost training. Production bootstrap requires the actual institution/issuer, encrypted connections, institution-approved notice and external secrets. A first administrator/recovery arrangement needs an accountable operator; no public self-registration or automatic privilege grants exist.

## Verify and recover

```sh
npm run test:db
npm run check
npx playwright install chromium
npm run test:e2e
npm run ops:drill
```

Run these sequentially: platform/browser suites reset the **dedicated fictional `agap_test` database**. They never run against `agap`, and fixtures refuse another database name. Do not point that dedicated database at real records. `test:db` starts a separate ephemeral PostgreSQL container on 55433. `AGAP_TEST_DATABASE_PORT` and matching `AGAP_TEST_DATABASE_URL` can select another local test port; use a distinct Compose project if multiple worktrees run databases concurrently. Browser servers use 5174/4101 by default, configurable with `AGAP_E2E_WEB_PORT` / `AGAP_E2E_API_PORT`. They refuse existing servers. Two browser workers keep the suite practical on development hardware. CI starts the test DB before checks; remote startup success is reported separately from local results.

The drill reads fictional persisted browser-test records, encrypts a custom PostgreSQL dump and private-file fixture in Restic, checks repository data, removes the plaintext staging source, restores into a new isolated PostgreSQL container, and compares table fingerprints/file hashes. It writes fresh [member restore evidence](AGAP_Member_Restore_Drill.json), enumerating all current user tables and rejecting source changes during the dump. The original [21 October restore evidence](AGAP_Robert_Restore_Drill.json) is retained unchanged. Local artifacts/recovery key are private and gitignored under `.backups`; keep or remove the generated drill directory deliberately. No existing database is overwritten.

This is not the production backup system. The remaining OPS-01 acceptance includes a quiesced/consistent backup of the application **and Keycloak database**, all document versions and configuration, independently recoverable keys, offsite copies, retention/monitoring, approved recovery objectives, and an integrated opening-balance/cutover reconciliation with C/D's ledger. Source data, accountant-approved totals and the other modules do not exist in this slice. Keep OPS-01 in progress until those dependencies are implemented and exercised.

Implementation critique, exact check results and deployment limitations are recorded in [Robert's verification record](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md).

## Member enrollment, revocation and local verification

For a fresh development import, `db:seed` creates the fictional `member` link only when absent; it does not reactivate or replace access. Existing Keycloak databases are never overwritten on restart. Import/migrate the fictional member user explicitly into an existing development realm, or use a separate Compose project/volume on available local ports. Do not reset an identity database to obtain a demo account.

An accountable operator verifies the provider subject and cooperative record first. Then use a mode-0600 JSON file outside public assets:

```json
{
  "action": "provision",
  "organizationId": "20000000-0000-4000-8000-000000000001",
  "branchId": "20000000-0000-4000-8000-000000000002",
  "memberId": "20000000-0000-4000-8000-000000000003",
  "issuer": "http://127.0.0.1:58080/realms/agap",
  "subject": "externally-verified-provider-subject",
  "verificationReference": "FICTIONAL-MEMBERSHIP-CHECK-001",
  "operatorReference": "FICTIONAL-OPERATOR-001",
  "reason": "Approved fictional membership linkage"
}
```

Run `npm run member:provision -- /private/path/member-link.json` with operator migration credentials. Revocation uses `{ "action": "revoke", "linkId": "<recorded UUID>", "expectedVersion": 1, "operatorReference": "<review reference>", "reason": "<reason>" }`; it atomically disables the link, ends sessions and preserves operator history. API identity/runtime credentials cannot perform these changes. Recovery requires verified operator review, not a phone match or upload.

With the fictional API/web/provider running, `npm run test:keycloak:member` verifies a real signed member login, separate principal, denied staff session and logout. It refuses a member with an existing OTP credential, temporarily enrolls only when requested, restores the original required actions and removes only the temporary credential. [Member identity evidence](AGAP_Member_Identity_Walkthrough.json) contains no tokens or OTP secrets. Run this optional local check separately from the dedicated test database suites; production providers are refused.

## Shared local administrator preview

The user-approved UI cleanup reuses the seeded `administrator` and real staff session for review-demo access. Its account menu now signs out; simulated role/reset controls live under Demo tools. Staff and demo routes share session state; member sessions remain separate.

For the explicitly fictional loopback setup, set this in the existing private `.env`:

```dotenv
LOCAL_PREVIEW_PASSWORD_ONLY=true
```

Then run:

```sh
npm run db:migrate
npm run preview:setup
npm run api:dev
```

Start Vite in another terminal as above. `preview:setup` is repeatable: it adds/updates only the marked local preview client and removes pending CONFIGURE_TOTP for the fixed fictional administrator. It does not remove enrolled credentials, reset a realm/database, change roles or reactivate access. A fresh import also contains the preview client. The setting defaults to false, requires loopback development/fictional database names and cannot enable production.

Staff password-only sign-in uses the preview client at signed level 1; the normal client/member flow is unchanged. `/api/v1/auth/login?assurance=mfa&returnTo=%2Fstaff%2Faccess` requests level 2, verifies it and returns to the saved internal page. Assignment/revocation still reject single-factor sessions. Step-up does not replay commands; users review/submit after verification, with existing unsaved-navigation warnings.

With the local preview/API/provider running, `npm run test:keycloak:preview` checks real password-only login, denied privileged action before MFA, explicit step-up and account-menu logout. It requires a fictional administrator without an existing OTP credential, removes only its uniquely labeled temporary authenticator and restores the initial required actions. It writes new UI-preview evidence rather than overwriting historical identity records. Existing identity walkthroughs describe their dated baseline and should not be used to reset an enrolled account.
