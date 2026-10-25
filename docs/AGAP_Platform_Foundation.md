# Robert's platform foundation

21 October 2026. Task register: [Assignment.md](../Assignment.md). Branch `feat/robert-fnd-01`, base `875b405c3c6e5d13f8a00aed7c8712b99c5422ef`. Published in [draft PR #10](https://github.com/Aracena18/AGAP/pull/10), implementation commit `4b03c6b`. Contract **0.1.0 is a review candidate**, awaiting Aaron, Benedict and Earl's interface review. It is not an agreed integration base or a production release.

The foundation adds a real Nest/PostgreSQL intake boundary beside the fictional browser review demo. No production evidence, calculator, lending decision, payment, ledger or health-review service is supplied by this change. Known operations belonging to those modules return `501 module_not_available`; [capabilities](../packages/contracts/src/operations.ts) and OpenAPI mark their status explicitly.

## Next planned revision — 25 October 2026

Read the current [Assignment.md](../Assignment.md), [product](AGAP_Product_Solution.md), [architecture](AGAP_Production_Architecture.md), [delivery boundaries](AGAP_Delivery_Plan.md) and updated owner brief before implementing. They supersede earlier task instructions; GitHub issues/existing PR descriptions remain historical references. This paragraph records planning, not new platform capability or a change to the dated verification below.

- Robert exclusively owns the member-phone feature/API facade under MOB-01 and separate member linkage/access/shared interfaces under FND-03. Existing staff identity/intake does not provide member authentication or own-record endpoints.
- Aaron owns evidence/credit plus the one reusable AI adapter and expense assistance; Benedict owns conflict-aware approval and authorized loan amendments; Earl owns support records/queue, accounting and synthetic evaluation. Member screens stay with Robert, with domain services supplied through their owners' reviewed ports.
- New member principals, draft/confirmation and irregular-cost inputs, support/amendment projections and reminder preferences are proposed for the next contract review. This documentation revision changes no executable schemas, generated clients, migrations or 0.1.0 capability flags. Do not cast members as staff to reuse an endpoint.
- FND-01/FND-02 remain Ready for review; OPS-01 remains In progress with its existing recovery/cutover dependencies. Contract 0.1.0 and the candidate branch are not frozen as the integration base. Record consuming-owner agreement before dependent integration.
- First-demo reminders are in-portal; issuer checks use clearly fictional verification records. No live provider, production verification or automatic repayment adjustment is established by a written plan.

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

Open `http://127.0.0.1:5174/#/staff`. Sign in as `officer`, `auditor` or `administrator`, password `Fictional-training-123!`. Enroll an authenticator when Keycloak requests it. Its client includes `basic` (subject/authentication-time claims) and `acr`; see the [Keycloak claim-scope change](https://www.keycloak.org/docs/26.2.5/upgrading/index.html). Its import binds a password/OTP flow to LoA 2; AGAP requests a fresh sign-in and accepts MFA only from signed `acr=2`. The local realm is in [infra/keycloak/agap-realm.json](../infra/keycloak/agap-realm.json). Existing realms are not overwritten on restart; changing an imported realm requires an explicit local migration/reset, never deletion of a real identity database.

The fresh-authentication request permits completion within the browser-bound ten-minute login window; older authentication is rejected (subject to the OIDC library's clock tolerance). The [real Keycloak walkthrough](AGAP_Robert_Identity_Walkthrough.json) passed. With the local API/web/Keycloak running, `npm run test:keycloak` repeats this development-only check: it temporarily enrolls the fictional administrator, checks the signed MFA/self-revocation guard and logout, then removes its temporary OTP credential so the developer can enroll their own authenticator. No OTP secret or token is written to test artifacts. This is separate from the default CI suite and never runs against a production realm.

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

The staff UI supports member creation/contact correction, draft application creation and administrator revocation. Application corrections and reassignment are implemented API/client operations, with UI integration still pending. Broader membership/identity-reference management, permission grants/reactivation/recovery and audit/history browsing need additional reviewed workflows; do not improvise them with general table edits or a browser role selector.

## Command and transaction rules

1. Use server-established `ActorContext`. Session/role/branch access is read on each request and rechecked inside the transaction. The narrow `identity.assert_actor` function locks the current user/session through commit, preventing a permission change from racing a command after its initial HTTP check.
2. Submit safe integer centavos, explicit PHP and real calendar dates. No decimal currency, unsafe coercion, actor fields or computed financial totals. `unavailable` has an explicit reason; zero is a recorded value. Database bigints are bounded before Number conversion.
3. Creation/consequential commands require an `Idempotency-Key` (16–128 safe characters). Retain the same request/key across an uncertain result. The claim, hash, saved result, aggregate write, revision, audit and outbox share one transaction. Concurrent duplicates wait and replay the committed response; different bodies with the same key return 409. No idempotency expiry is enabled yet.
4. Updates also require `If-Match: "<version>"`: missing is 428, stale is 412. Changing request terms increments aggregate and assessment-input versions; changing assignment increments only aggregate version. Intake updates stop after review has progressed. Later modules must use explicit amendment/review commands and preserve saved decisions.
5. Call module ports with the **same** `TransactionContext`. Only `PostgresUnitOfWork` starts/commits/rolls back/releases the connection. Services must not open nested connections for part of a financial posting. Future financial operations follow identity checks, accounting-period lock, affected loans in sorted ID order, then financial-command lock. Period close uses the conflicting period lock. C/D must verify this with their actual tables; this foundation does not claim ledger or close-race coverage.
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

`PrivateDocumentStore` stores exact bytes under generated UUID keys with SHA-256, 0700 directory/0600 files, bounded streaming, atomic immutable publication and traversal/symlink defenses. Successful writes are still quarantined. Aaron owns file metadata, authorization, content-type checks, malware scanning, cleared/blocked states, download access/audit and retention/holds. No HTTP document endpoint is exposed before that lifecycle exists. The adapter's remove method is infrastructure only; it must sit behind an authorized retention/hold decision.

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

The drill reads fictional persisted browser-test records, encrypts a custom PostgreSQL dump and private-file fixture in Restic, checks repository data, removes the plaintext staging source, restores into a new isolated PostgreSQL container, and compares table fingerprints/file hashes. It writes [restore evidence](AGAP_Robert_Restore_Drill.json). Local artifacts/recovery key are private and gitignored under `.backups`; keep or remove the generated drill directory deliberately. No existing database is overwritten.

This is not the production backup system. The remaining OPS-01 acceptance includes a quiesced/consistent backup of the application **and Keycloak database**, all document versions and configuration, independently recoverable keys, offsite copies, retention/monitoring, approved recovery objectives, and an integrated opening-balance/cutover reconciliation with C/D's ledger. Source data, accountant-approved totals and the other modules do not exist in this slice. Keep OPS-01 in progress until those dependencies are implemented and exercised.

Implementation critique, exact check results and deployment limitations are recorded in [Robert's verification record](AGAP_Robert_Verification.md).
