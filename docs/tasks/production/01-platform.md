# Robert (A): platform and integration

Tracker: [Assignment.md — Robert](../../../Assignment.md#robert). Robert maintains the central task/status register and shared foundation.

Read the [product priorities](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery plan](../../AGAP_Delivery_Plan.md) and root AGENTS.md before implementation. Implementation progress is recorded below; this brief defines Robert's scope and does not certify production readiness.

## Work packages and ownership

Own FND-01, FND-02 and OPS-01; coordinate SHOW-01. Use the exact shared/platform/member paths in the delivery ownership table. Own canonical contracts, generated client, root configuration/dependencies, migrations registry, shell and integration wiring. Do not implement B–D's business rules on their behalf.

Publish the first command/read-model schemas and shared module ports before dependent workers integrate. Include actor context, safe money/date validation, version/precondition errors, idempotency, financial event identity, transaction context, canonical lock order and audit/outbox/inbox envelopes. Publish the supported contract version and integration base commit.

Set up Node/Nest/PostgreSQL, Keycloak, private document adapter, worker bootstrap and a free local fictional environment. Keep the existing frontend runnable. Migrate repository access through a server adapter; never send a whole browser CaseRecord as an authoritative financial write.

Implement scoped identity and member/application intake. Session state and permission checks belong to the server. Preserve membership, notice/consent and identity-reference history. Admin rights do not imply financial approval authority.

## Acceptance and handoff

- Generated schemas/client, migrations and local environment work together; every module has a named owner and registered route/migration boundary.
- Test actual organization/branch permissions, expired/revoked sessions, CSRF, MFA-sensitive actions and forbidden self-authorization with runtime DB roles.
- Ensure secrets/member payloads do not enter logs, public assets, demo seeds or localStorage.
- Demonstrate independent backup restoration and a fictional, reconciled migration rehearsal; record unresolved live recovery/capacity inputs.
- Integrate owner PRs, run the contributor checks and track local versus remote CI honestly. A controls shared wiring but does not merge without user authorization.

Record assignments, contract changes, dependencies and handoff evidence in Assignment.md and the relevant owner brief rather than creating required GitHub issues or relying on chat.

## Progress and handoff notes

21 October 2026: FND-01/FND-02 are Ready for review on `feat/robert-fnd-01`, based on `875b405c3c6e5d13f8a00aed7c8712b99c5422ef`. Contract 0.1.0 is a candidate, awaiting Aaron/Benedict/Earl interface agreement. OPS-01 is In progress; its local encrypted restore drill passed, while full identity/offsite recovery and integrated financial cutover remain dependencies.

Changed owned paths: `packages/contracts/`, `packages/api-client/`, `apps/api/src/platform/`, API bootstrap, modules `identity/`, `members/`, `applications/`, `apps/api/scripts/`, platform tests, `apps/worker/`, staff shell/access/member/application intake, root configuration/dependencies, infrastructure and shared documentation. Aaron/Benedict/Earl implementation files, existing financial functions, tokens and fictional fixture registry were not changed.

Read the [platform setup/integration guide](../../AGAP_Platform_Foundation.md), [verification and critique](../../AGAP_Robert_Verification.md), and [restore evidence](../../AGAP_Robert_Restore_Drill.json). The staff UI creates/corrects members, prepares drafts and revokes access; application-correction/reassignment APIs are implemented with UI pending. Financial endpoints are explicitly contract-only. Record reviewer agreement and the actual accepted integration commit in Assignment.md before downstream integration. No merge is authorized by this handoff.

Published [draft PR #10](https://github.com/Aracena18/AGAP/pull/10), implementation commit `4b03c6ba2d3f7e8f7bd7b338bb83ac4255b74f57`, stacked on the existing frontend branch. This is a review candidate, not the agreed integration base. Remote push/PR workflows ended in startup failure before jobs ran; passing local results are recorded separately.
