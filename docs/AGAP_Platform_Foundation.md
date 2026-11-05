# Robert's platform foundation

## Local development workflow — 6 November 2026

The user authorizes coordinated OPS-01/SHOW-01 tooling on `chore/earl-local-dev-workflow`, based on merged main `e869591`. The proposal recorded before root script edits adds `local:doctor` for read-only configuration/dependency/service/migration diagnostics and `local:dev` for foreground API/frontend supervision. The candidate reuses the existing application configuration, migration registry, migration/seed commands and Compose services; no dependency or business rule is added. Robert retains consuming-owner review.

Application/operator commands use Node 24 from the current executable or the existing `node_modules/.cache/agap-gl01` runtime, without downloading a runtime or changing PATH. Local fictional settings come from `.env`; existing contents and configured ports are preserved. A temporary Compose override replaces the base ports using `!override`, which requires [Compose 2.24.4 or later](https://docs.docker.com/reference/compose-file/merge/). A running project with different/non-loopback bindings is refused before Compose startup. No volume reset, credential changes, unrelated process termination, authentication-mode change or lending/model activation is introduced. Diagnostics display non-secret endpoints/status, never dump `.env`, and withhold raw configuration/database errors. Server output redacts PostgreSQL credentials and bearer tokens.

Install/select Node 24 for a fresh checkout or dependency reinstall. The existing runtime cache is only a fallback; `npm ci` replaces `node_modules` and can remove it. The commands do not install runtimes, preserve a cache across arbitrary external installations or alter the system Node selection.

Startup requires development mode, fictional records/notice, loopback endpoints, matching runtime/identity/operator database targets named `agap` or independently managed `agap_test`, a local `agap` identity realm and distinct valid ports. Database probes use read-only transactions. Missing migration history is reported rather than created; changed checksums or migrations absent from the checkout block startup even with `--migrate`. The existing migration runner remains authoritative.

| Command/option | Behavior |
| --- | --- |
| `npm.cmd run local:doctor` | Read-only setup, dependency, Docker, configuration, database/history, identity-discovery and application-port diagnostics; exit 1 for unresolved checks |
| `npm.cmd run local:doctor -- --json` | The same diagnostics as structured JSON, without credentials |
| `npm.cmd run local:dev` | Start/check development Compose dependencies, require current migrations, then supervise API and Vite on the configured ports |
| `--init-env` | Explicitly copy `.env.example` only when `.env` is absent; never overwrite an existing environment |
| `--migrate` | Explicitly run the existing migration command, then recheck history |
| `--seed` | Explicitly run the existing fictional seed; its original `agap`-only restriction remains |
| `--fresh` | Request Vite `--force` re-optimization without deleting dependencies or data |
| `--no-infra` | Use independently managed local PostgreSQL/identity services; no Docker commands are executed; accepted by both commands |

Open Docker Desktop first and run `npm.cmd ci` for missing dependencies or after lockfile changes. First-time setup can combine `npm.cmd run local:dev -- --init-env --migrate --seed`. Later use `npm.cmd run local:dev`; after a pull, stop the previous API/frontend terminals first and request `--migrate` only when needed. If an application port is occupied, the command identifies it and stops before data writes or infrastructure startup. On Windows, reserved-port failures point to `Get-NetTCPConnection` and `netsh interface ipv4 show excludedportrange protocol=tcp`; the tool does not silently select other ports or rewrite `.env`.

The API must pass canonical contract-version health, Vite must respond, and the frontend API proxy must pass health before **AGAP is ready** is printed. Ctrl+C, readiness failure and unexpected server exit stop the child processes/groups created by this invocation. Windows uses the tracked child PID tree; POSIX uses its detached process group, following the [Node subprocess boundaries](https://nodejs.org/docs/latest-v24.x/api/child_process.html). No persisted PID file, process-name sweep or port-owner kill is used. Shared PostgreSQL/Keycloak containers remain running. In PowerShell, answer `Y` if npm subsequently asks to terminate its batch job.

This starts the API/frontend plus database/identity dependencies; workers, scanners, inference services, provider configuration and release approvals retain their existing setup/gates. Identity discovery is a readiness check, not proof of a successful sign-in/MFA walkthrough. Default feature flags and credentials remain unchanged. No browser appearance or financial contract changes require a design/frontend-spec revision. [Machine-readable verification](AGAP_Local_Development_Verification.json) records code source `f0f2cec` and final input hashes. Required `npm run check` passes: **19 local tooling**, **278 UI/domain**, **834 backend/contracts**, **109 evaluation** tests. The full browser suite passes **149** cases with four existing presentation skips; all **4** presentation cases pass separately. The same 19 tooling cases pass on Windows with permitted process-tree control and on Linux. Type/lint, generated parity, browser/API builds, production dependency audit (zero vulnerabilities) and the Docker build-context check (seven required inputs/25 private sentinels) pass.

The actual PostgreSQL inspection regression preserves migration history. The fresh task-only `agap` database smoke first proves that doctor reports pending migrations without creating history, then explicitly runs the real migration/seed commands: **55 migrations**, **3 fictional staff records**. Actual API, Vite and the frontend API proxy pass health; anonymous staff session access remains denied. Both owned application ports are released after shutdown and the unrelated discovery fixture remains alive; final doctor passes. This is actual application startup with a controlled local discovery fixture, not an OIDC/MFA walkthrough. An initial second-database fixture collided with a cluster-wide migration role; the final smoke uses a separate fresh PostgreSQL cluster and preserves all original migration bytes.

Read-only Windows/Docker checks select the existing Node 24 under the system Node 26 shell, preserve the private `.env`, render exactly one replacement binding per service at the configured 55435/18080 ports, preserve original volume paths and verify running container identities/bindings without Compose mutations. The current development setup truthfully reports **seven pending migrations** and already running API/frontend processes; those processes, credentials and development data are untouched. Initial restricted test execution could not stop its own spawned trees; only the identified test tree was cleaned up before the permitted Windows run passed. Cold-start review added a bounded Keycloak discovery wait with delayed-service, timeout and cancellation regression coverage before final verification.

All **576 listed runtime/test/SQL/contract/model/infrastructure/config inputs** match the final passing runner, with LF-normalized fingerprint `0c7e36f0102cf4e19b473a36dbe8ce490e0f135346916dae3d34e846db64aa49`. No dependencies, canonical types/tokens/fixtures, financial contracts, earlier migrations, model schemas, authentication controls or browser appearance are changed. The four ownership-verified disposable test containers are removed after evidence collection; development database/identity containers remain running. `graft`/`graphify` are unavailable, so no graph update is claimed. Robert's consuming-owner/representative review and actual production release remain separate; task statuses/budgets are unchanged. Publication and remote CI are recorded after the feature push.

## HLT-01 integration candidate — 3 November 2026

The [monitoring candidate](../apps/api/src/modules/monitoring/README.md) adds actual confirmed member support submission/history, branch-scoped assignment and assigned-officer response history. The startup member adapter also consumes servicing's existing safe posted-loan projection; a complete empty loan list is now available rather than an unimplemented default. Optional linked loans produce a preserved submission-time position, with fresh staff positions still explicitly unavailable. Other unavailable domain defaults and financial-command restrictions remain in effect. The staff route is `/#/staff/support-requests`; the existing `/#/member/help` uses the new service. Apply new module migrations with the existing `npm run db:migrate`. This candidate does not establish institutional permission/retention approval or complete monitoring/financial capabilities. The sections below preserve the dated foundation baseline; their original all-unavailable descriptions do not describe these newly supplied adapters.

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

Use Node 24, npm and Docker Compose. The commands below use a POSIX shell; [Windows PowerShell startup](#windows-powershell-startup) is documented separately. All supplied credentials, organizations and identities are public fictional development fixtures. The database and Keycloak listen on loopback. Initial image downloads require network access.

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

### Windows PowerShell startup

Open PowerShell at the repository root with Node 24 active (`node --version` must report `v24.x`). Open Docker Desktop and wait for its Linux engine to start. `docker info` must succeed before starting containers; a missing `dockerDesktopLinuxEngine` pipe means the engine is not available yet.

Run each command separately, continuing only after success:

```powershell
if (!(Test-Path .env)) {
  Copy-Item .env.example .env
}
docker info
docker compose -f infra/compose.yml --profile identity up -d --wait
npm.cmd run db:migrate
npm.cmd run db:seed
```

If Windows refuses port `58080`, apply the [port workaround](#windows-reserved-keycloak-port) before migrations/seeding. Choose the issuer before the first seed: existing staff and member linkages reference that exact issuer, so changing an already-used issuer requires a reviewed linkage migration.

Keep the API and Vite running in separate terminals, both at the repository root with Node 24 active:

```powershell
npm.cmd run api:dev
```

```powershell
npm.cmd run dev -- --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/`. The account names, password and authenticator enrollment described above also apply on Windows. These instructions cover the fictional local application; native document-processing prerequisites and the full Linux verification environment remain separate. [Observed startup/workflow results](AGAP_Verification.md#windows-local-startup--4-november-2026) record the tested scope.

### Windows reserved Keycloak port

Windows can reserve a range containing `58080` even when no application is listening there. Inspect the ranges with:

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

The verified machine reserved `58020–58119`. An available alternate port, `18080`, worked using this local override. Check your own reservations before selecting a port. This example was validated with Docker Compose 5.1.0 and its `!override` support; the tag replaces the original mapping rather than adding a second blocked mapping.

After installing dependencies, create an override under the already ignored dependency cache:

```powershell
New-Item -ItemType Directory -Force node_modules/.cache/agap-local | Out-Null
@'
services:
  keycloak:
    ports: !override
      - "127.0.0.1:18080:8080"
'@ | Set-Content node_modules/.cache/agap-local/compose.override.yml -Encoding utf8
```

Set the matching values in your private `.env`:

```dotenv
OIDC_ISSUER=http://127.0.0.1:18080/realms/agap
LOCAL_PRESENTATION_MODE=false
```

Start the services with both Compose files, and retain this command for later startups:

```powershell
docker compose -f infra/compose.yml -f node_modules/.cache/agap-local/compose.override.yml --profile identity up -d --wait
```

The local Keycloak console is then `http://127.0.0.1:18080`; the web and API ports remain `5174` and `4100`. Its discovery document is `http://127.0.0.1:18080/realms/agap/.well-known/openid-configuration`. Wait for that endpoint before signing in. The ignored override must be recreated if a dependency reinstall removes the cache.

Normal OIDC sign-in works with this alternate-port setup. [Automatic presentation mode](#temporary-automatic-presentation-entry) also accepts the exact fictional issuer `http://127.0.0.1:18080/realms/agap`, alongside the default port `58080`. Set `LOCAL_PRESENTATION_MODE=true` and restart the API, then open the application directly rather than continuing an existing Keycloak login page. Existing account links keep the same issuer. Other issuer ports/hosts/realms and all nonlocal or real-record presentation settings remain rejected.

### Missing Vite dependency-cache files

If the browser shows **Failed to fetch dynamically imported module** and requests under `/node_modules/.vite/deps/` return 404, stop the existing AGAP Vite process in its terminal and rebuild its optimization cache:

```powershell
npm.cmd run dev -- --port 5174 --strictPort --force
```

Reload the browser after Vite is ready. This resolved the observed missing `motion_react.js` and `zod.js` files. The [verification record](AGAP_Verification.md#windows-local-startup--4-november-2026) distinguishes this local cache repair from an application-code change.

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


## Temporary automatic presentation entry

For the current fictional local presentation, set `LOCAL_PRESENTATION_MODE=true` in the private local environment and restart the API with `PUBLIC_ORIGIN` matching the frontend origin. Both member and staff/review open automatically using their existing seeded fictional accounts. The flag defaults false in `.env.example` and refuses non-loopback API/origin/database, another identity realm, non-development mode, real records or a non-fictional notice. It creates no accounts or access grants and never claims fresh MFA. Sign-in/account controls are hidden with a Presentation mode label; domain unavailable states remain truthful.

To restore passwords, set `LOCAL_PRESENTATION_MODE=false` and restart the API; reload the workspace. Presentation cookies are then refused and the original OIDC/password/MFA flow returns. Existing ordinary authenticated sessions still follow their normal expiry/logout rules. No Keycloak credential, realm flow, database record or browser demo snapshot is deleted. See [verification and screenshots](AGAP_UI_Review_Verification.md#temporary-presentation-mode--3-november-2026).
