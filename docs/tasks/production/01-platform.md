# Robert (A): platform, member portal and integration

Tracker: [Assignment.md — Robert](../../../Assignment.md#robert). **Current direction: 29 October 2026; the goal-guidance addendum below supplements the retained 25 October assignments.** This brief supersedes earlier task directions where they differ; dated implementation evidence below remains intact.

Read the [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery/path boundaries](../../AGAP_Delivery_Plan.md), [design](../../../design.md) and root AGENTS.md. Assignment.md alone records current statuses. The first foundation is a review candidate, not an accepted integration base or production release.

## Work packages and ownership

Own PLN-01/PLN-02, FND-01/FND-02/FND-03, MOB-01, OPS-01 and SHOW-01. Preserve supplied FND-01/FND-02 evidence and pending consuming-owner agreement. New member access is FND-03; it must not be described as supplied staff authentication.

**All phone-facing work is reserved for you.** Own planned `src/features/member-portal/` and API module `member-portal/`, plus existing platform/identity/member/application and shared paths in the delivery table. B–D supply their services and staff screens, not portal screens. The facade delegates to their authorized services and never copies calculators, writes financial tables or impersonates a staff actor.

Only you edit canonical schemas/ports, generated client/OpenAPI, route/provider/migration registration, common UI/tokens, demo fixtures, root configuration/dependencies and integration wiring. Keep one transaction coordinator and one authoritative calculation engine. Perform the finance extraction/re-export handoff once before Aaron takes package ownership.

## First-demonstration slice — 16 relative units

| Work | Units | Required result |
| --- | --- | --- |
| MOB-01 | 5 | Responsive apply/document-confirmation/status/own-loan/in-portal-reminder/payment-help flow using the existing design system |
| FND-03 | 5 | Member linkage/separate principal, own-record ports, model artifact/provenance envelope and next contract proposal; review supplied staff foundation |
| SHOW-01 | 6 | Boundary coordination, model runtime/registration and artifact checks, fallbacks, integrated journey and reproducible model/feature evidence |

These are provisional remaining-effort slices including tests/review. The total team estimate rises from 48 to 64 units; this is added scope, not a guaranteed date. Full OPS-01 and later portal/channel breadth remain assigned for stage 2. Benedict’s first contractual amendment also moves to stage 2; keep payment-help submission and staff response in the first demo. Do not recount supplied platform work as future implementation or treat units as hours.

## Interfaces and execution order

1. Read the candidate [platform handoff](../../AGAP_Platform_Foundation.md); record Aaron/Benedict/Earl agreement and the actual accepted base before dependent integration.
2. Under FND-03, propose a server-established member principal/linkage distinct from staff roles. Link verified cooperative membership through the approved process; client IDs, phone edits or AI matches cannot grant access. Cover revocation, recovery and own-record downloads as well as UI access.
3. Publish the reviewed ports for evidence drafts/confirmation, irregular-cost inputs, checked results, support requests, servicing amendment views and reminder preferences. Also propose the base/adapter/checksum, prompt/schema/dataset/evaluation provenance and runtime-limit envelope with Benedict/Aaron/Earl. This documentation change itself does not generate schemas/client or change version 0.1.0.
4. Build the portal against Aaron's evidence/credit, Benedict's decision/servicing and Earl's monitoring ports. Persist drafts server-side; label unknown outcomes and retain stable retry/version semantics.
5. Provide notification preferences/delivery infrastructure; servicing supplies effective schedules and monitoring supplies support/review facts. First-demo notices are in-portal. External channels require configured providers, real delivery evidence and verified costs; label simulations.
6. For [QWN-01/XAI-01](../../AGAP_Model_Training_Plan.md), Benedict owns Qwen training/artifacts and Aaron owns EBM/logistic training plus the reusable inference adapter. Earl owns data/splits and independent evaluation. You alone approve shared dependencies/schema proposals and wire the configured compatible runtime. Do not make free training notebooks an always-on backend. Keep EBM research outside operational APIs/member screens; package the offline report separately.
7. Integrate controlled money operations only after Earl's real posting service and Benedict's authority/state rules exist. Preserve demo/backend separation and historical snapshots.

## Acceptance and retained work

- Cross-member reads/writes/downloads, revoked linkage and caller-supplied scope are denied by the server. Member routes never expose staff lists or CI/audit notes.
- Phone screens follow design.md, support 320px reflow/keyboard/errors and distinguish AI drafts, confirmed facts, verification, calculated scenarios and human decisions.
- Help submissions do not silently change schedules, pause fees or promise support. Updated reminders use a newly effective schedule only after approved member acceptance.
- No identity tokens, real financial payloads or provider keys in localStorage/public assets/logs. Manual/template workflows continue when AI is unavailable.
- Keep OPS-01's full identity/offsite recovery, keys, observability, migration/cutover and institutional release evidence pending until delivered. Additional portal services/native app/external channels are later breadth, not completed demo features.
- Verify eligible model/artifact/prompt versions, independent baseline comparison and promotion decision; preserve manual/template fallback if training or hosting is unavailable. A prerecorded notebook output is not a live tuned-model call.
- Integrate owner evidence and run required feature checks before integration; documentation changes use link/consistency checks. Existing issues/PR descriptions are not rewritten for PLN-01. Never merge without user authorization.

## Goal-guidance addition (29 October 2026)

Own PLN-03, FND-04 and MOB-02 within your existing shared/member-portal paths. After FND-03, propose the later own-record goal/consent, checked planning/catalogue, reviewed-content, advice-review and provenance/version envelopes with Aaron/Earl/Benedict. A document changes no executable schema/client or version 0.1.0. Implement all member goal setup, data confirmation, contribution preview, guidance review, voluntary choice/pause/withdrawal and progress screens from [design.md](../../../design.md#11-planned-goals-savings-and-product-guidance-29-october-2026); use CRD-02/GOL-01 projections instead of copied financial rules.

Keep source dates, incomplete/infeasible/conditional plans, AI draft versus reviewed advice, stale/expired recommendations, no-product and manual/template states visible. Member access remains own-record and revocation-aware. Product-specific investment suggestions require Earl's recorded authorized suitability-review state. No portal control moves money, opens an account or amends a loan. New packages are stage 2 by default and unestimated beyond the existing 16-unit first-demo slice; record an explicit capacity re-estimate before adding an earlier fictional demonstration. Coordinate EVAL-02 and eligible QWN-02 runtime evidence through Aaron's existing adapter. Existing progress is unchanged; Assignment.md alone records status.

## Institution-rubric 5C addition (29 October 2026)

Own PLN-04 and FND-05 within the shared-contract/registration boundary. Propose source/institution/product/version rubric references, candidate versus reviewed criteria, deterministic score/coverage/trace and handoff/decision versions; no schema/client or 0.1.0 changes occur in documentation. Aaron owns staff 5C views and credit/rule results; Benedict owns the grounded handoff/explanation and Qwen adaptation; Earl independently evaluates. Preserve actual officer/reviewer authority, member correction access, server scopes and stale-result checks. Existing member-portal ownership and goal work remain intact. Additional stage 2 estimates are Pending beyond current first-demo budgets; no universal rubric or calibrated repayment probability is supplied.

## Progress and handoff notes

21 October 2026: FND-01/FND-02 are Ready for review on `feat/robert-fnd-01`, based on `875b405c3c6e5d13f8a00aed7c8712b99c5422ef`. Contract 0.1.0 is a candidate, awaiting Aaron/Benedict/Earl interface agreement. OPS-01 is In progress; its local encrypted restore drill passed, while full identity/offsite recovery and integrated financial cutover remain dependencies.

Changed owned paths: `packages/contracts/`, `packages/api-client/`, `apps/api/src/platform/`, API bootstrap, modules `identity/`, `members/`, `applications/`, `apps/api/scripts/`, platform tests, `apps/worker/`, staff shell/access/member/application intake, root configuration/dependencies, infrastructure and shared documentation. Aaron/Benedict/Earl implementation files, existing financial functions, tokens and fictional fixture registry were not changed.

Read the [platform setup/integration guide](../../AGAP_Platform_Foundation.md), [verification and critique](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md), and [restore evidence](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Restore_Drill.json). The staff UI creates/corrects members, prepares drafts and revokes access; application-correction/reassignment APIs are implemented with UI pending. Financial endpoints are explicitly contract-only. Record reviewer agreement and the actual accepted integration commit in Assignment.md before downstream integration. No merge is authorized by this handoff.

Published [draft PR #10](https://github.com/Aracena18/AGAP/pull/10), implementation commit `4b03c6ba2d3f7e8f7bd7b338bb83ac4255b74f57`, stacked on the existing frontend branch. This is a review candidate, not the agreed integration base. Remote push/PR workflows ended in startup failure before jobs ran; passing local results are recorded separately.

25 October 2026: PLN-01 revised this brief, ownership and first-demonstration slices. This note records documentation only; no new feature implementation or review acceptance is claimed. Use Assignment.md for the current task status and next action.

25 October 2026 — PLN-02: the user-requested model-training revision supersedes this brief’s earlier 12-unit allocation. Current scope is the 16-unit table above and the [model training plan](../../AGAP_Model_Training_Plan.md); recorded implementation history remains unchanged. No training result or new feature implementation is claimed.

29 October 2026 — PLN-03: goal-guidance responsibilities and future acceptance added by user request. Existing feature/model progress, exclusive ownership and first-demo budgets remain unchanged; new goal packages have separate pending estimates.

29 October 2026 — PLN-04: added planned 5C review/trace/handoff responsibilities without changing existing feature/model progress, original first-demo budgets or the separate goal packages. Numeric rubric configuration remains pending.
