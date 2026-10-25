# Robert (A): platform and integration

Tracker: [Assignment.md — Robert](../../../Assignment.md#robert). Robert maintains the central task/status register and shared foundation.

Read the [product priorities](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery plan](../../AGAP_Delivery_Plan.md) and root AGENTS.md before implementation. This is a planned production task brief, not an assertion that backend code exists.

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

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; update the corresponding Assignment.md entry.
