# Robert (A): platform, member portal and integration

Tracker: [Assignment.md — Robert](../../../Assignment.md#robert). **Current direction: 2 November 2026; the policy-source refinement below supplements ongoing work and the retained goal/5C assignments.** This brief supersedes earlier task directions where they differ; dated implementation evidence below remains intact.

Read the [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery/path boundaries](../../AGAP_Delivery_Plan.md), [design](../../../design.md) and root AGENTS.md. Assignment.md alone records current statuses. The first foundation is a review candidate, not an accepted integration base or production release.

## 26 October candidate handoff

Start interface review from [the current platform guide](../../AGAP_Platform_Foundation.md), [member contract proposal](../../AGAP_Member_Contract_Proposal.md) and [verification/limits](../../AGAP_Robert_Member_Verification.md) on `feat/robert-member-platform`. Executable 0.2.0 is supplied for review; no consuming-owner agreement is recorded. Member actor/transactions are separate from staff, and domain defaults are unavailable. This supersedes earlier future-tense instructions about creating the member contracts from scratch. Assignment.md remains the only status tracker.

## Work packages and ownership

Own PLN-01/PLN-02/PLN-03/PLN-04, FND-01/FND-02/FND-03/FND-04/FND-05, MOB-01/MOB-02, OPS-01 and SHOW-01. Preserve supplied FND-01/FND-02 evidence and pending consuming-owner agreement. New member access is FND-03; it must not be described as supplied staff authentication.

**All phone-facing work is reserved for you.** Own planned `src/features/member-portal/` and API module `member-portal/`, plus existing platform/identity/member/application and shared paths in the delivery table. B–D supply their services and staff screens, not portal screens. The facade delegates to their authorized services and never copies calculators, writes financial tables or impersonates a staff actor.

Only you edit canonical schemas/ports, generated client/OpenAPI, route/provider/migration registration, common UI/tokens, demo fixtures, root configuration/dependencies and integration wiring. Keep one transaction coordinator and one authoritative calculation engine. The 26 October candidate performs the one-time finance extraction/re-export handoff; Aaron owns subsequent package implementation. Do not repeat or copy the extraction.

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
3. Publish the reviewed ports for evidence drafts/confirmation, irregular-cost inputs, checked results, support requests, servicing amendment views and reminder preferences. Also propose the base/adapter/checksum, prompt/schema/dataset/evaluation provenance and runtime-limit envelope with Benedict/Aaron/Earl. The supplied 0.2.0 candidate generates schemas/client after the written proposal; consuming-owner review remains required before dependent domain integration.
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

Own PLN-03, FND-04 and MOB-02 within your existing shared/member-portal paths. After FND-03, propose the later own-record goal/consent, checked planning/catalogue, reviewed-content, advice-review and provenance/version envelopes with Aaron/Earl/Benedict. A document changes no executable schema/client or the supplied 0.2.0 candidate. Implement all member goal setup, data confirmation, contribution preview, guidance review, voluntary choice/pause/withdrawal and progress screens from [design.md](../../../design.md#11-planned-goals-savings-and-product-guidance-29-october-2026); use CRD-02/GOL-01 projections instead of copied financial rules.

Keep source dates, incomplete/infeasible/conditional plans, AI draft versus reviewed advice, stale/expired recommendations, no-product and manual/template states visible. Member access remains own-record and revocation-aware. Product-specific investment suggestions require Earl's recorded authorized suitability-review state. No portal control moves money, opens an account or amends a loan. New packages are stage 2 by default and unestimated beyond the existing 16-unit first-demo slice; record an explicit capacity re-estimate before adding an earlier fictional demonstration. Coordinate EVAL-02 and eligible QWN-02 runtime evidence through Aaron's existing adapter. Existing progress is unchanged; Assignment.md alone records status.

## Institution-rubric 5C addition (29 October 2026)

Own PLN-04 and FND-05 within the shared-contract/registration boundary. Propose source/institution/product/version rubric references, candidate versus reviewed criteria, deterministic score/coverage/trace and handoff/decision versions; no schema/client or supplied 0.2.0 changes occur in documentation. Aaron owns staff 5C views and credit/rule results; Benedict owns the grounded handoff/explanation and Qwen adaptation; Earl independently evaluates. Preserve actual officer/reviewer authority, member correction access, server scopes and stale-result checks. Existing member-portal ownership and goal work remain intact. Additional stage 2 estimates are Pending beyond current first-demo budgets; no universal rubric or calibrated repayment probability is supplied.

## New-feature deliverables

These steps expand the existing task IDs. Preserve first-demo priorities; new feature work defaults to stage 2 with separate Pending estimates. Use the tracker for current status and the delivery plan for exact paths. Proposals can be reviewed before implementation; canonical contracts change only through your reviewed integration work.

### FND-04 — goal and guidance contracts

Prepared review input: [field-level FND-04 proposal](../../AGAP_Goal_Guidance_Contract_Proposal.md). Confirm Aaron's planner/catalogue projections, Earl's records/content/reviewer mapping and Benedict's bounded model provenance before canonical changes; receiving-owner acceptance is pending.

1. After FND-03, collect Aaron's planner/catalogue, Earl's goal/content/review and Benedict's model/provenance requirements. Propose own-record commands/results, consent, dated inputs/horizon, explicit unavailable states and version/review history.
2. Record consuming-owner agreement, then implement the canonical schemas/client and registration in your owned paths. Do not copy financial logic or goal tables into the member facade.
3. Hand the reviewed contract version and examples to Aaron/Earl/Benedict. Supply cross-member denial, revoked linkage, stale-version and retry evidence for integrated operations.

### FND-05 — 5C review contracts

Prepared review input: [field-level FND-05 proposal](../../AGAP_5C_Review_Contract_Proposal.md). Confirm Aaron's approved rubric/score trace, Benedict's explanation/handoff and Earl's independent expectations; proposed score serialization and actual institutional criteria are not accepted defaults.

1. After FND-03, agree Aaron's rubric provenance/criteria/points/weights and calculation-trace projections, Benedict's finding/explanation/handoff needs and Earl's independent expected records. Keep candidate, accepted, verified, unavailable and not-applicable meanings distinct.
2. Propose and review versioned rubric/finding/result/coverage/review/handoff ports, including source/offer bindings and material-change invalidation; then implement the agreed canonical contract/client/registration changes. Do not invent numerical policy.
3. Hand the same version to all three owners with schema, scoped-access, stale-input and preserved-snapshot evidence. Coordinate later wiring without taking ownership of Aaron's staff panel or Benedict's decisions.

### MOB-02 — member goals and progress

1. After FND-04, CRD-02 and GOL-01 provide reviewed interfaces, implement the existing design blueprint: voluntary goal setup, relevant-data confirmation, checked contribution preview, guidance/review status, member choice, progress and pause/withdrawal.
2. Consume domain-owned projections and eligible Qwen through Aaron's adapter. Display incomplete/infeasible/conditional, no-product, AI-unavailable, stale and suitability-review-pending states; keep staff-only investment drafts behind review.
3. Supply own-record/revocation and workflow checks, keyboard/320px evidence and UI screenshots. Integrate only after required application checks and owner evidence; no control opens accounts, moves funds or changes loan terms.

For each handoff, record task ID, branch/base, contract/model versions, owned files, relevant checks, unresolved inputs and receiving owner. PLN-03/PLN-04 document this scope; they are not runtime completion evidence.

## Policy-source refinement — 2 November 2026

Under FND-03/MOB-01/SHOW-01, coordinate the [policy-source checkpoint](../../AGAP_Policy_Clarification_Register.md#ongoing-work-checkpoint) and reconcile the sole tracker with merged handoff evidence. Preserve active branches and all existing owner paths. Gather actual branch/base, delivered slice, contract consumption, checks, dependencies and remaining effort; do not invent acceptance or estimate new work as zero.

Review whether policy/source version, product-conditional evidence and amount period/basis/deduction information fit current contracts. Publish only a reviewed compatible proposal before canonical edits or dependent integration. Keep UI details in design.md section 14. The existing 64-unit baseline and later goals/5C/SRV-01 gates remain intact. Draft PR #18 registration/check work is separate and unmerged by this amendment; do not duplicate it or imply its code is present. Supplied private workbook/meeting records remain outside repository fixtures and model inputs.

## Progress and handoff notes

30 October 2026 — FND-03/SHOW-01: reviewed current main `266379a` against the member ports, GL-01 posting and EVAL-01 corpus/protocol handoffs. The [technical review record](../../AGAP_Foundation_Contract_Review.md) provides the source/transaction/model boundaries and actual consuming-owner feedback still needed. On `codex/foundation-contract-handoff`, register Earl's unchanged accounting migrations and root evaluation checks within Robert's existing paths; test normal migration discovery/replay/checksum refusal on an isolated fictional database. Do not repeat the finance extraction, enable financial HTTP/capability states, invent reviewer acceptance or treat the development preview as a frozen release. Exact verification and remaining integration inputs are recorded in that review; FND-03 remains Ready for review and SHOW-01 In progress.

30 October 2026 — FND-04/FND-05: written proposals prepared on `codex/member-goals-fivec-contracts`, base `266379ac293572de91a603a72c1a01750a1c3101`; [documentation verification](../../AGAP_Goal_5C_Contract_Verification.md). Changed only Robert-owned shared Markdown. Goal/planning/guidance and 5C/rubric/trace/handoff fields, operations, version guards and per-owner review inputs are concrete review drafts. Canonical 0.2.0, runtime, financial fixtures and the other owners' files are unchanged. FND-03/receiving-owner agreement, actual institutional rules and stage 2 capacity remain dependencies; no accepting actor/version is fabricated. Foundation registration draft PR #18 remains a separate unmerged change. Use Assignment.md for current status.

21 October 2026: FND-01/FND-02 are Ready for review on `feat/robert-fnd-01`, based on `875b405c3c6e5d13f8a00aed7c8712b99c5422ef`. Contract 0.1.0 is a candidate, awaiting Aaron/Benedict/Earl interface agreement. OPS-01 is In progress; its local encrypted restore drill passed, while full identity/offsite recovery and integrated financial cutover remain dependencies.

Changed owned paths: `packages/contracts/`, `packages/api-client/`, `apps/api/src/platform/`, API bootstrap, modules `identity/`, `members/`, `applications/`, `apps/api/scripts/`, platform tests, `apps/worker/`, staff shell/access/member/application intake, root configuration/dependencies, infrastructure and shared documentation. Aaron/Benedict/Earl implementation files, existing financial functions, tokens and fictional fixture registry were not changed.

Read the [platform setup/integration guide](../../AGAP_Platform_Foundation.md), [verification and critique](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Verification.md), and [restore evidence](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/AGAP_Robert_Restore_Drill.json). The staff UI creates/corrects members, prepares drafts and revokes access; application-correction/reassignment APIs are implemented with UI pending. Financial endpoints are explicitly contract-only. Record reviewer agreement and the actual accepted integration commit in Assignment.md before downstream integration. No merge is authorized by this handoff.

Published [draft PR #10](https://github.com/Aracena18/AGAP/pull/10), implementation commit `4b03c6ba2d3f7e8f7bd7b338bb83ac4255b74f57`, stacked on the existing frontend branch. This is a review candidate, not the agreed integration base. Remote push/PR workflows ended in startup failure before jobs ran; passing local results are recorded separately.

25 October 2026: PLN-01 revised this brief, ownership and first-demonstration slices. This note records documentation only; no new feature implementation or review acceptance is claimed. Use Assignment.md for the current task status and next action.

25 October 2026 — PLN-02: the user-requested model-training revision supersedes this brief’s earlier 12-unit allocation. Current scope is the 16-unit table above and the [model training plan](../../AGAP_Model_Training_Plan.md); recorded implementation history remains unchanged. No training result or new feature implementation is claimed.

26 October candidate: separate linked member identity/session/RLS and own draft/submission/preferences are supplied, along with the member facade/screens and staff assignment/correction UI. The pure assessment implementation was moved once with import-only changes and re-exported. Real PostgreSQL, signed OIDC, browser and encrypted-restore evidence is in [the current verification](../../AGAP_Robert_Member_Verification.md). Domain rendering simulations are explicitly labeled; default runtime domains remain unavailable. Remaining integration awaits the actual B–D services, model artifacts/evaluation and recorded owner review; full OPS recovery/cutover is still separate. Historical statements above describe their date, not the current UI capability.

26 October — UI refinement: the user approved UI-01 for shared workspace/account navigation, real account sign-out, concise member/application/case/evidence presentation and guarded password-only local administrator access with explicit MFA step-up. Evidence edits are presentation-only under this explicit request. Use design.md section 13 and the [authentication proposal](../../AGAP_UI_Auth_Proposal.md). No task ownership, model training assignment or financial rule is transferred.

29 October 2026 — PLN-03: goal-guidance responsibilities and future acceptance added by user request. Existing feature/model progress, exclusive ownership and first-demo budgets remain unchanged; new goal packages have separate pending estimates.

29 October 2026 — PLN-04: added planned 5C review/trace/handoff responsibilities without changing existing feature/model progress, original first-demo budgets or the separate goal packages. Numeric rubric configuration remains pending.

## Gabay asset and rebranding handoff — 3 November 2026

UI-05 preserves the supplied design assets and analyzes their adoption under [design.md section 16](../../../design.md#16-planned-gabay-rebranding--3-november-2026); [analysis and verification](../../../design-library/ANALYSIS.md). UI-06 is the next presentation-only implementation after the user-requested analysis checkpoint. Own canonical token migration, shared controls/navigation and all member UI; coordinate staff feature presentation within existing ownership. Keep current APIs, auth, financial rules, source confirmation, uncertain retries, UI-04 safeguards and saved snapshots. The showcase calculator and depicted features are references, not new production behavior. Use Assignment.md for status and design.md for all UI rules; estimates beyond the existing core plan remain Pending.
