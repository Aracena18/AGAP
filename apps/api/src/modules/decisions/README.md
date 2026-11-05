# DEC-01 — decision rules and connected review candidate

## Current connected candidate — CL2, 5 November 2026

The [CL2 record](../../../../../docs/tasks/production/connected-lending-cl2/IMPLEMENTATION.md) supersedes historical implementation-availability statements below. The module now supplies actual PostgreSQL persistence, authoritative workflow producers, default-off authenticated staff routes, generated-client navigation and immutable review/escalation/notice/currentness controls. Connected fictional review uses `connected-review/v2` and the lossless `decision-snapshot/v2`; older formats remain decoded unchanged. Recording requires an explicit preview proof envelope and exact unchanged explanation/terms before expiry. Staff-assisted acceptance is still unavailable; member facade connection and money transport follow CL3–CL6.

The following Phase 1 sections retain their original scope/history. They do not override the later canonical schemas, migrations, implementation record or current frontend specification. Technical tests do not supply receiving-owner or institutional acceptance.


This module implements the standalone rule/immutable-basis slice of Benedict's [assignment](../../../../../docs/tasks/production/03-decisions-servicing.md). It is not a database service, authenticated endpoint, approved DCCPEC policy, model integration or completed DEC-01 feature. The existing fictional browser review remains unchanged.

## Public functions

| Function | Input/output and purpose |
| --- | --- |
| `reviewBasisHash(context)` | Validates module-local references and hashes the material review basis. Assignment/workflow timestamps and the application concurrency version are excluded; financial input versions, actual facts/sources, checked assessment, horizon, offers and authority configuration are included |
| `prepareRecommendation(actor, context, preparation)` | Validates assigned-officer scope, conflict clearance, workflow/version, current complete checked assessment and explicit offer/scenario. Returns a detached, deeply frozen recommendation candidate |
| `prepareDecision(actor, context, preparation)` | Validates an explicit human reviewer outcome, distinct identities, authority/limits, conflicts, freshness, applicable exceptions and reviewed explanation. Returns a deeply frozen snapshot and its deterministic SHA-256 |
| `reviewChangeEffect(saved, context, loanStage)` | Checks saved snapshot integrity and current material basis, recommendation and participant conflict clearance. Indicates renewed review/hold for an unreleased loan or preserved-contract referral for a released loan. This is not release authorization |
| `prepareMemberAcceptance(memberActor, context, saved, preparation)` | Validates own-member scope, current decision/version, unchanged reviewed basis, approved exact published document/checksum and explicit acknowledgment. Returns a frozen acceptance candidate; it never releases money |

`context.ts` composes the existing canonical schemas and types. Additional context, authority, conflict, source-checksum, saved-explanation and snapshot fields are **module-local proposals for Robert/Aaron/Earl review**, not a parallel shared API contract. No generated client, route, capability, dependency, migration or public schema was modified.

## Trusted caller boundary

The future service must load these projections itself using a server-established staff/member actor and one authorized transaction. It must not deserialize a caller-provided `ReviewContext` as evidence, authority or authenticated identity. This pure code cannot authenticate a session, prove completeness/verification, protect a database, lock concurrent revisions or establish that the caller has published the displayed document bytes.

Phase 2 must recheck identity, permissions, current versions and source/policy bindings under the platform unit of work; persist candidates/idempotent results/audit atomically; preserve append-only history; and obtain accepted interfaces/registration from Robert. Recommendation preparation deliberately does not increment application versions or save workflow state. Those effects belong to the future coordinator.

Use the existing `/api/v1/applications/{id}/recommendations`, `/decisions` and `/acceptances` candidates after integration review. Member acceptance consumes `MemberActorContext` and the existing member request schema; no member is cast into a staff actor. Phase 1 supports direct member acknowledgment only. Any staff-assisted acknowledgment requires a separately specified provenance/authorization path, not impersonation.

## Rules and transition specification

| Action/state | Guard and result |
| --- | --- |
| Assessment ready/recommended → recommendation candidate | Assigned officer, same organization/branch, clear conflict declaration, matching aggregate version and complete/current checked basis; selected offer must have a supplied scenario |
| Recommended → approve/decline candidate | Scoped reviewer distinct from both current assigned officer and recorded preparer, configured effective authority, current recommendation and assessment, exact request bindings, rationale and reviewed explanation |
| Submitted/evidence review/clarification/assessment ready/recommended → return candidate | Otherwise authorized reviewer may request clarification without a complete assessment or recommendation. No approval document, approved offer or policy exceptions are carried. Missing authority/conflict clearance is still not silently granted |
| Failed financial check → approval candidate | Only a check explicitly marked overridable, with the reviewer's individual authority and a nonblank reason for every failed selected-scenario check. Unknown critical facts cannot be repaired by an exception |
| Reviewer departs from current recommendation | Explicit departure reason, whether choosing another available checked offer, declining or returning |
| Decision recorded → acceptance candidate | Only the linked member, matching aggregate/current-decision ID, approved outcome, unaltered basis and exact document ID/checksum; acknowledgment is literal true |
| Material change while unreleased | Renewed review and a hold indication, preserving the original snapshot |
| Material change after release | Preserve original decision/contract and refer to a later review/dispute/amendment process; do not rewrite obligations |

Clearance must be explicitly supplied for the acting officer/reviewer; absence and `unavailable` are not `clear`. A newly restricted/unavailable recorded preparer also blocks approve/decline, and participant restrictions after recording invalidate pending acceptance/release freshness. Administrative access provides no implicit decision authority. A user with officer and reviewer roles still cannot review their own preparation, including after reassignment.

Application concurrency and assessment-input versions are separate. A stale submitted concurrency version fails even if the assessment input has not changed. An assignment-only update with a current submitted version does not itself invalidate the material assessment/recommendation; the identities and applicable restrictions still apply. A replacement recommendation is detected independently of the non-circular material hash. Arrays of sources, facts and offers are ordered by identity for that hash.

Authority settings have no operational default. Configured grants explicitly list user IDs, allowed outcomes, nullable approval limits, permitted exception IDs, effective dates, required approver count and acceptance validity. Unavailable authority blocks decisions. An unavailable amount is not a zero limit. A requirement for more than one approving reviewer fails closed in this single-reviewer slice; quorum accumulation is later work. Required approver count does not silently become one.

Acceptance validity distinguishes an explicit inclusive expiration date, an explicitly configured no-expiry rule, and unavailable policy. Expiry uses Asia/Manila calendar dates; recording uses UTC instants. A no-expiry rule is accepted only as supplied configuration, not assumed DCCPEC practice. Acceptance expiry comes from the saved approved terms, not the later expiry of an officer's historical authority grant. Superseded decisions, altered published document bytes, changed basis and acceptance before the decision are rejected.

## Evidence, figures and explanation

The module does not calculate affordability, instalments, DTI, repayment percentages or 5C scores. It consumes the existing checked `AssessmentSchema`/`OfferSchema` and preserves those exact supplied figures, policy checks and versions. Their provenance/readiness must come from Aaron's service. Additional critical/unresolved facts cannot be overridden merely because a supplied assessment says complete.

Sources retain exact IDs/versions, checksums, authorized excerpts and independent-verification status; accepted facts do not become independently verified. Fact/source version references must resolve without ambiguity. Zero is explicit; unknown values retain their reason. Referenced sources must come from the same application. Duplicate sources, grants, declarations, scenarios and policy checks are rejected rather than silently choosing one.

Explanations are supplied reviewed `template` or `manual` text bound to the current material hash, reviewer and existing source IDs. Phase 1 does not generate a new template/UI, contact Qwen or automatically establish that every sentence is supported. Human content review remains required; numeric/source faithfulness checking for future model explanations is a later domain/inference integration task. No hidden model reasoning or source-embedded instruction grants authority.

Snapshot preparation detaches caller-owned arrays/objects and freezes the result recursively. The checksum detects changed saved content; it does not provide a signature, establish approval by itself or defeat a database administrator. Persistent append-only controls, original-file authorization/retention and recovery remain Phase 2/operations work.

## Cooperative material and unresolved settings

The reviewed partner material includes the manual's Section XXIX recommendation/verification/GM stages, application/promissory-note signature structures, September-revised loaning guide and cash-flow workbook. These support workflow discovery but do not establish all production settings. Still resolve the authoritative version, membership/capital rule applicability, ordinary-loan approval limits/quorum, conflict/recusal and exception authority, expiry and member acknowledgment. The guide's restructuring Board threshold is not used as an ordinary-loan limit; the workbook's adjusted-capacity label is not implemented as a universal DTI rule.

All tests use newly authored fictional unit inputs and explicitly fictional settings. No partner workbook rows, real identities, credential values or canonical Ana/Ben/Cora fixture copies are included. Staff/member principal fixtures are typed test inputs, not evidence of actual authentication or DB permissions. Runtime registration remains unavailable until later integration.

## Verification

Use Node 24 and the repository's locked dependencies. From the repository root:

```sh
npx vitest run --config vitest.platform.config.ts apps/api/src/modules/decisions/rules.test.ts
npm run typecheck:platform
npm run lint
```

These rule tests require no database, model, cooperative record or external service. Existing demo regression tests remain in the frontend suite. Actual financial/server integration still requires the relevant DB/permission tests, `npm run check` and `npm run test:e2e` on the agreed base; passing pure tests does not mark DEC-01 integrated.

Exact branch/base, verification results and next-phase handoffs are in [Benedict's Phase 1 verification](../../../../../docs/tasks/production/03-benedict-phase1-verification.md).
