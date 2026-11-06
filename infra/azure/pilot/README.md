# Private fictional Azure pilot

This is the explicitly authorized Experiment F/principal-only pilot, not the
institutional deployment in the parent Azure guide. Use one temporary
`Standard_NC24ads_A100_v4` in Australia East. Normal OIDC/TOTP and segregation of
duties remain enforced; presentation and password-only shortcuts are disabled.
The laptop accesses only loopback SSH forwards. Database, scanner, API and GPU
never receive public inbound rules. The VM has an operator-/32 SSH rule only.

## Before provisioning

Renew Azure sign-in with the account owning the student subscription. Device
authentication can be denied by tenant security defaults; use ordinary browser
sign-in rather than weakening those settings. Check actual remaining credit and renewal/expiry in the
[Azure Education Hub](https://portal.azure.com/#view/Microsoft_Azure_Education/EducationMenuBlade/~/overview).
Microsoft documents this [student usage view](https://learn.microsoft.com/en-us/azure/education-hub/navigate-costs).
The separate Sponsorships portal is optional if it actually displays this
account's balance; a missing sponsorship does not disprove the student benefit.
The original USD100 grant is not evidence of the current remaining balance.
Create a private `.state/credit.json` with actual observed values:

```json
{
  "subscriptionId": "actual-selected-subscription-id",
  "currency": "USD",
  "source": "Azure Education Hub",
  "remainingUsd": 0,
  "observedAt": "actual-observation-with-offset",
  "expiresAt": "actual-credit-expiry-with-offset",
  "operatorReference": "actual-operator-and-observation-reference"
}
```

The zero is deliberately invalid. Do not invent credit evidence or commit this
file. `preflight` performs live ARM access, student/spending-limit, exact regional
SKU and 24-vCPU family/total quota checks. It refreshes Linux retail pricing and
pins the exact Ubuntu image. It rejects missing evidence; a cached account is
insufficient. It does not request an offer upgrade, quota or alternative SKU.

```bash
python3 infra/azure/pilot/pilot.py preflight --credit-evidence infra/azure/pilot/.state/credit.json
python3 infra/azure/pilot/pilot.py deploy --credit-evidence infra/azure/pilot/.state/credit.json --plan-sha256 ACTUAL_PRINTED_DIGEST --operator-cidr ACTUAL_PUBLIC_IPV4/32
```

Default forecast limit is the lesser of USD30 and observed remaining credit,
including an USD8 ancillary reserve and at most four allocated GPU hours. These
are planning bounds, not a claim that Azure cost reporting stops billing. Each
session is at most two hours, with a separate Azure shutdown schedule and explicit
deallocation. No automatic restart is implemented; refreshed credit/time checks
are required before another allocation. The student spending limit stays On.
Verify the current disk/network quote fits the reserve before deployment.

## Assemble and run

Use the reviewed model importer under `models/qwen/experiment_f/`; preserve the
pinned base and F artifact hashes. Transfer the verified ignored artifact folder
and a checked repository revision to the VM over SSH. Do not transfer `.env`,
existing document stores, unrelated projects or real member records. Install
Docker/Compose and the compatible NVIDIA driver/container runtime from their
official packages. Validate actual CUDA BF16 support against the pinned model
image before starting inference; model preflight failures are blockers.

Generate isolated credentials on the VM, retaining the generated directory:

```bash
python3 infra/azure/pilot/prepare.py --directory /home/agappilot/agap-private-runtime --artifacts /home/agappilot/agap-artifacts
docker compose --env-file /home/agappilot/agap-private-runtime/compose.env -f infra/azure/pilot/compose.yml build
docker compose --env-file /home/agappilot/agap-private-runtime/compose.env -f infra/azure/pilot/compose.yml up -d --wait database scanner
docker compose --env-file /home/agappilot/agap-private-runtime/compose.env -f infra/azure/pilot/compose.yml up -d identity
docker compose --env-file /home/agappilot/agap-private-runtime/compose.env -f infra/azure/pilot/compose.yml run --rm operator apps/api/scripts/migrate.ts
docker compose --env-file /home/agappilot/agap-private-runtime/compose.env -f infra/azure/pilot/compose.yml run --rm operator apps/api/scripts/seed.ts
```

Prepare the explicit fictional lifecycle policy/authority and posting
configuration, inspect the resulting private JSON and publish with its printed
SHA256. The operator mount saves this file in the generated private directory.
Never register the test producer fixtures.

```bash
docker compose --env-file /home/agappilot/agap-private-runtime/compose.env -f infra/azure/pilot/compose.yml run --rm operator apps/api/src/modules/pilot/operator.ts --prepare /private-pilot/setup.json
docker compose --env-file /home/agappilot/agap-private-runtime/compose.env -f infra/azure/pilot/compose.yml run --rm operator apps/api/src/modules/pilot/operator.ts --publish /private-pilot/setup.json --sha256 ACTUAL_PRINTED_DIGEST
```

Then start `qwen`, wait for authenticated `/readyz`, and start
`api worker web`. Enroll TOTP separately for officer, reviewer, cashier, financial
authorizer and other staff. Generated passwords are in private `access.json`;
they are never printed or committed. Keycloak uses its normal `start` command,
retains the existing authentication flows and database-backed state. Its HTTP
listener is loopback-only inside the SSH-encrypted development sandbox.

API/worker receive separate constrained credentials; only the one-shot operator
gets the owner login. The generated realm is mounted for the seed so staff
subjects match actual identities. Files and database volumes persist across
container restarts. No cloud storage or other paid service is assumed.

```bash
python3 infra/azure/pilot/pilot.py tunnel
```

Open `http://127.0.0.1:5286/#/staff/review-queue` or `/#/member`. The second forward
is the exact loopback identity issuer on port 59080. If either port is occupied,
stop and resolve the collision; do not stop an unrelated application. Verify SSH
host fingerprints through the Azure/operator channel before accepting them.

## Verification, recovery and cleanup

Run the real scanner/OCR and model smoke/comparison tools and the connected
fictional browser journey. Preserve raw model evaluation separately from fake
HTTP protocol tests; a successful citation guard is not independent semantic
acceptance. Exercise failed model/scanner states, worker restart, stale inputs,
same-key retries and atomic GL rollback. Inspect desktop and 320px screenshots.

Before export, stop API, worker and identity writes. Back up both PostgreSQL
databases, private document volume and the generated realm/secrets as one private
snapshot; exclude replaceable model weights. Record file hashes and checked Git/
image/model identities. Restore into separate databases/volumes, verify saved
financial/document hashes and identity linkage, and retain actual results.
Unproven restore is an explicit blocker, not a successful verification entry.

```bash
python3 infra/azure/pilot/pilot.py stop
```

Confirm `PowerState/deallocated`, export the verified snapshot, and delete only
the tool-created, tagged pilot resource group using its exact saved ID. Retained
disks/public IPs can still cost credit after deallocation. Preserve deployment
state until cleanup is verified; never delete an unrelated group. Rollback keeps
the additive schema/history and disables new writers while restoring a verified
compatible image. Real records/funds require the separate institutional release.

Sources: [A100 VM family](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nca100v4-series),
[VM billing states](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing),
[Keycloak hostname](https://www.keycloak.org/server/hostname).
