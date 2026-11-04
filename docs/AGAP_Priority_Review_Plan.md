# AGAP selected constraint: priority review and human escalation

**Date:** 5 November 2026, Asia/Manila. **Task:** PLN-05, Robert. **Disposition:** implementation proposal for review; the four additions remain planned. Current feature status stays in [Assignment.md](../Assignment.md).

## 1. Source and interpretation

The user identifies `Copy of 2026 Hackathon Fact Sheet Template.md` as the corrected source, replacing the previously supplied PDF. It names FinVerse, submitted by Arquillano, Aaron J., and includes a handout dated 4 November 2026. Its SHA-256 is `9e86f9c51723008e79e1cb6ae8530ec969d95c288a0f5488d3d182e77c666c8a`. The original remains outside Git. This plan derives requirements from that selected team fact sheet; it does not establish additional competition-wide rules, scoring weights, a pitch length or institutional policy.

The selected constraint is **People; Operations**: DCCPEC staff have limited capacity to assemble a review from fragmented records, documents and assessment spreadsheets. The required customization is to organize human attention around **the next justified action, its evidence and its responsible person**. Existing evidence collection and deterministic affordability remain the basis. A lending-risk score, automated approval or a new model is unnecessary for this requirement.

The fact sheet commits to four working additions on fictional records: a review priority queue, a consolidated evidence/affordability summary, human checking and disposition of source-linked AI concerns, and reviewer assignment with in-app escalation notices. Intended benefits are less repeated navigation, clearer responsibility and earlier attention to material concerns. Review capacity, time saved and household outcomes have not been measured.

This document defines implementation scope and proposed interfaces. [Product](AGAP_Product_Solution.md), [architecture](AGAP_Production_Architecture.md), [delivery](AGAP_Delivery_Plan.md) and the [frontend specification](AGAP_Frontend_Spec.md) are amended alongside it. All appearance and interaction rules belong in [design.md](../design.md#19-planned-priority-review-and-human-escalation--5-november-2026).

## 2. What the current application supplies

Baseline reviewed: main `964ad4bcf36c8958603ea9d770b0de84b5199c1c`, including merged PRs #29-#33. This is a code/document inspection, not a fresh application test or owner acceptance.

| Existing capability | Reuse | Gap for the selected constraint |
| --- | --- | --- |
| [Fictional application list](../src/features/applications/ApplicationsPage.tsx) and [case status](../src/app/caseStatus.ts) | Ana/Ben/Cora, search/status filters and current record versions | Fixture-order list and coarse status; no substantiated priority, reason, next-action or escalation model |
| [Server intake list](../src/features/applications/IntakePage.tsx) and [application service](../apps/api/src/modules/applications/applications.service.ts) | Scoped records, bounded paging, existing officer intake assignment | ID-order paging is not priority ordering; intake assignment is administrator/fresh-MFA officer assignment, not preparing-officer reviewer escalation |
| [Evidence/affordability workspace](../src/features/workflow/WorkflowPanel.tsx) | Source handling, human fact changes, checked results and immutable assessment history | Evidence and assessment already share a page in the newer server slice, but there is no concise decision-oriented review summary or queue-wide projection |
| [Fictional review rules](../src/domain/review.ts) and [decision service candidate](../apps/api/src/modules/decisions/BACKEND.md) | Recommendations, current-basis checks, saved snapshots, separate human decision | Need concern/escalation guards and reviewed connections; existing module code does not establish connected production approval |
| [Monitoring support workflow](../apps/api/src/modules/monitoring/README.md) | Proven patterns for histories, versions and guarded retries | This handles member payment help and follow-ups. It must not be renamed or reused as the application underwriting queue |
| Shared controls, workspace tokens and Gabay presentation | Existing visual hierarchy and accessible controls | Focused additions to the operational workspace; no landing redesign or dependency needed |

The fact sheet's statement that evidence and affordability are separate describes the team's problem framing. The newer server implementation already places them on one page. Build the missing summary/orchestration rather than rebuilding the existing calculations or claiming all evidence functionality is absent.

## 3. Routing and priority rules proposed for implementation

### Routes and overlapping conditions

Keep workflow readiness, attention priority and final decision as separate fields. Derive one primary next-action route while retaining every applicable blocker and source. Proposed primary-route precedence is escalated review, needs clarification, awaiting concern check, then ready for approval. This precedence is an implementation proposal, not an extra organizer rule. It ensures a confirmed material concern remains visible even when the same case also lacks information.

| Route from the fact sheet | Condition | Next actor/action |
| --- | --- | --- |
| Needs clarification | Required information is missing, conflicting or stale | Preparing officer obtains clarification; records source-linked correction or confirmation |
| Awaiting concern check | A source-linked AI concern remains unchecked | Preparing officer confirms, corrects or dismisses it with a reason; checking does not itself verify the source |
| Escalated review | A current, human-confirmed material affordability/policy concern remains unresolved | Preparing officer assigns an eligible reviewer; reviewer investigates and records a disposition |
| Ready for approval | Required evidence and assessment are complete/current; recommendation matches the selected offer and basis; blocking concerns are resolved | Separate authorized officer inspects the current basis and makes the lending decision |

Do not force drafts, missing recommendations, unavailable producers, pending assessment or an unreviewed deterministic finding into one of these four labels. Use a supporting preparation/unavailable state with a specific next action until its prerequisites exist. Recorded decisions remain a separate terminal/history view; a later material change shows renewed-review requirements without deleting the decision.

Readiness is a conjunction of prerequisites, never the absence of a red badge. A dismissed AI concern cannot clear a failed affordability calculation, missing fact, conflict restriction or policy check. A reviewer disposition can require more information, record resolution supported by changed evidence, or refer to a separately authorized policy exception. Nonwaivable gaps stay blocked. Escalation review is distinct from final approval; completing it does not approve the application or make the applicant risk-free.

### Queue order

Start with two deterministic attention groups: unresolved substantiated material concerns first; all other active applications second. Within each group use the original queue-entry timestamp ascending, then application ID ascending for exact ties. More severity bands require a later explicit rule proposal; do not invent weights, AI confidence scores, demographic proxies or monetary cutoffs.

For new submitted applications, proposed `queueEnteredAt` is the first submission time. For existing fictional cases, use their recorded received date and label that basis rather than inventing historical submission events. Preserve it across corrections, checking, assignment and acknowledgment; show assignment age separately. Display the explicit as-of time in Asia/Manila. Age helps order work; it is not proof of financial urgency. No service-level target or maximum review time has been supplied.

An unchecked AI suggestion can block readiness but cannot promote a case into the substantiated-priority group. Substantiation requires a current source/calculation basis plus a recorded human confirmation of materiality. Every queue row explains why it appears in its position. Filters and ranking apply across the authorized cohort before pagination. Sorting only the loaded ID page would miss higher-priority applications.

For the small fictional demo, sort the complete in-memory fixture cohort. The future server queue needs a coherent versioned read or snapshot-bound cursor containing the ordering tuple and filter/scope identity; refresh starts a new read. Changing priorities during paging must not silently skip or duplicate cases. A delayed/unavailable producer shows unavailable readiness and cannot manufacture an empty or ready queue.

## 4. Proposed records, ownership and commands

These are written proposals only. Robert reviews canonical changes with consumers before editing `src/domain/types.ts`, shared schemas/client, fixtures or app state. Reuse existing money/date/source types; do not create another case registry, financial calculator or AI adapter.

| Proposed record/projection | Minimum information | Accountable boundary |
| --- | --- | --- |
| Review summary | Application/offer IDs, application and material-input versions, assessment/policy/recommendation references, as-of/horizon, availability, primary route, all blockers, reason/source references, owner/next action and queue-entry basis | Robert composes application projection through public owner ports; source facts and calculations remain Aaron's, decision basis remains Benedict's |
| Concern and checking event | Stable ID, application, type, manual/checked-rule/AI/simulated origin, source ID/version or assessment reference, candidate text, material basis, pending/confirmed/corrected/dismissed state, actual actor/time/reason and superseded reference | Aaron, EVD-01/CRD-01/AI-01; keep current source and verification semantics |
| Escalation and review events | Confirmed concern references, assigned reviewer, eligibility basis, assigner/time/reason, open/under-review/disposition state and exact reviewed basis | Benedict, DEC-01; review never patches evidence or a financial result |
| In-app notice and acknowledgment | Escalation/event/recipient IDs, created time, read/acknowledged time, authorized destination and superseded/reassigned status | Robert's notification infrastructure consumes Benedict's events; acknowledgment changes only notice state |

Proposed reads: review queue; application summary; concern/check history; eligible reviewer projection; escalation history; current recipient's notices. Proposed commands: check concern, assign/reassign escalation, record reviewer disposition, acknowledge notice. Public route names and executable versions remain unassigned until contract review; no new endpoint is implemented here.

Concern correction links to the existing evidence correction path rather than silently changing accepted facts. Changed source, offer, assessment, applicable policy or material input invalidates affected pending concern checks/dispositions/readiness and requires renewed review. Earlier concern and decision history remains inspectable. A notice acknowledgment is workflow metadata and does not invalidate a financial assessment. Concern/escalation actions use their own concurrency versions and bind to material input versions, so an acknowledgment cannot accidentally stale an otherwise current recommendation.

For the fictional demonstration, extend the existing demo record/repository only through Robert's reviewed proposal. Persist review actions and notices through that existing browser persistence boundary and verify reload behavior. Give older records an explicit migration/default that means no recorded concern review, never automatic clearance. Preserve old decision snapshots and their calculation versions. Simulated actor switching demonstrates routing only and must not assert real authorization.

The production migration uses source-owned evidence and decision persistence with server-computed projections. Commands require current scope/assignment/eligibility, expected version, durable same-key retry and immutable audit history. Assignment and its event commit atomically; an outbox consumer deduplicates notices by event/recipient. Lost responses cannot create two escalations or notices. Reassignment/revocation removes old recipient access; failed delivery stays visible to the assigning officer. No worker writes another module's tables. The approved single transaction/locking protocol must protect source and decision basis through consequential actions.

Existing intake officer assignment remains an administrator/fresh-MFA operation. The preparing-officer escalation operation is a distinct DEC-01 command and cannot weaken that boundary. Production reviewer eligibility must establish active same-organization/branch access, relevant authority and conflict clearance, excluding the preparer from final approval. When no reviewer is eligible, retain the concern, show unassigned escalation and a recoverable next step; do not select an administrator or bypass authority by default.

## 5. Incremental implementation sequence

The first deliverable is the bounded fictional demonstration specified in the fact sheet. Server/production integration follows through existing owner gates. Do not add live inference, training completion, full 5C scoring, goals, a new notification channel or payment changes as prerequisites for showing this selected challenge.

| Order | Existing tasks/owner | Concrete handoff and exit evidence |
| --- | --- | --- |
| 1. Agree the behavior and contract | Robert: PLN-05/FND-03/SHOW-01; Aaron and Benedict review their projections; Earl reviews expected paths | Accept route precedence, materiality criteria, queue-entry basis and field/state proposal. Record actual consuming-owner responses, affected versions and remaining effort before canonical edits |
| 2. Supply deterministic basis and concern checking | Aaron: EVD-01/CRD-01/AI-01; Benedict: DEC-01 readiness guards | Reuse current calculations and source states. Persist human check reasons and version bindings. Supply missing/conflicting/stale and unchecked-concern tests; actual AI runtime is optional and samples are labeled simulated |
| 3. Compose queue and case summary | Robert: applications/shared shell, FND-03/SHOW-01 | Render the complete fictional cohort with reasons, all blockers, responsible person and next action. Verify stable ties, unknown states and selected-offer/horizon consistency. Reuse evidence/comparison detail via source links |
| 4. Connect escalation and notice | Benedict: DEC-01 events/assignment/disposition; Robert: shared demo persistence and in-app notice infrastructure | Existing simulated reviewer receives one actionable notice; acknowledgment leaves the concern open; reassignment, disposition, reload and material-edit rechecking preserve history. Approval guards consume the same current readiness basis |
| 5. Verify and package the challenge demonstration | Earl: independent SHOW-01 workflow evidence with existing EVAL-01 practices; all owners supply tests; Robert integrates | Run the scenario matrix below, full required feature checks, screenshots and an observed fictional walkthrough. Update Working labels only for demonstrated additions; record any remaining planned portion honestly |
| 6. Migrate to connected server operation | Existing FND-03/DEC-01/EVD-01/CRD-01/SHOW-01/OPS-01 owners | Reviewed contracts/client/routes/migrations, real roster/authority, scoped projections, transaction guards, replay/deduplication and private notice delivery. Production release retains institutional controls and acceptance |

Robert owns the application queue and summary composition in `src/features/applications/` and the applications API boundary; Aaron retains source facts/calculations and evidence concern controls; Benedict retains decision/escalation controls and the existing `src/domain/review.ts` rule boundary. Do not create a second readiness evaluator in each screen: the queue, summary and consequential decision guards must consume the same reviewed rule result appropriate to their data mode. Any shared pure-rule extraction needs a separate agreed path proposal. Earl verifies independently; HLT-01 remains the separate payment-help queue.

This is additional first-demonstration work with **Pending** incremental estimates, not work assumed to fit inside the historical 16 units each/64 total. Preserve existing task owners, stages, prerequisites, supplied work and package statuses. Sequence the challenge demo first within available hackathon capacity; any change to earlier presentation commitments or budgets requires a recorded owner impact review. The complete lending destination, research, goals and numerical 5C work remain assigned at their existing stages. No deadline or equal-hours estimate is inferred.

## 6. Demonstration and acceptance matrix

Use canonical [Ana/Ben/Cora](../src/demo/cases.ts) and the independent historical [calculation oracles](AGAP_Product_Freeze.md#5-the-fictional-demonstration). New scenario metadata references those records; it does not copy or change their amounts. Keep demonstration actions reversible through the existing reset boundary.

| Case/check | What judges or tests must observe |
| --- | --- |
| Ana: conflict then permitted alternative | Both income sources remain inspectable. Officer correction and current reassessment precede a current recommendation. The original timing shortage remains visible; only a supported resolution using the permitted alternative can support readiness. Readiness still awaits separate approval |
| Ben: material affordability concern | Human confirms the current deterministic shortfall and assigns eligible review. It ranks ahead of comparable nonmaterial cases; notice links to the same concern/basis. Moving a due date or acknowledging the notice cannot clear the overall shortfall |
| Cora: missing information | Clarification lists missing items and responsible officer; complete affordability values stay unavailable. Silence or missing evidence is not a zero, fraud finding or automatic decline |
| Simulated AI concern | Clearly labeled simulated source-linked suggestion blocks readiness. Officer confirms, corrects or dismisses it with a saved reason. Confirmation can create a material escalation; dismissal cannot override an independent failed check |
| Multiple simultaneous concerns | Escalation, evidence gaps and unchecked suggestions all remain visible even when one determines the primary next action |
| Ordering and waiting | Equal-priority cases follow original waiting time and stable ID ties; corrections/acknowledgment do not reset age. The server version must test a higher-priority record beyond the first underlying ID page |
| Stale and historical basis | Material edit blocks current readiness and requires renewed checking/recommendation as affected. Previous review actions, exact source/offer references and saved decisions remain unchanged |
| Saved actions and failures | Reload preserves checks, assignments, notices and acknowledgment separately. Failed/uncertain writes retain draft/key; retries do not duplicate events. A failed read after confirmed save does not make the write uncertain |
| Authority and privacy | Demo actions remain explicitly simulated. Server phase denies self-approval, wrong scope, revoked/ineligible reviewer and stale/replayed unauthorized disclosure; missing eligible reviewer remains visibly unassigned |
| UI and completeness | Keyboard/source links, 320px, tablet, desktop, 200% zoom, empty/loading/error/unavailable/stale states and all reasons remain usable. No batch approval or color-only priority |

Feature integration requires `npm run check`, `npm run test:e2e`, relevant calculation/workflow/DB tests and inspected screenshots; code changes also run `graphify update .` if available. Documentation-only PLN-05 uses link and consistency checks. A visible prototype, stored simulated action or a passing test is not production authorization or proof of impact.

For evaluation, compare the same fictional review task with the present multi-section flow: record participant count, task completion, navigation/duplicate entry, time to identify the next action, missed concerns, inappropriate readiness/escalation and correction burden. Predefine expected routes with an independent reviewer. Report observed values and limitations; do not pre-fill a percentage saving or claim a real avoided default. Separately inspect whether old nonpriority cases become neglected; the proposed ordering alone does not prove an acceptable waiting-time outcome.

## 7. Decisions still requiring review

Before implementation, agree the proposed route precedence, demo materiality/reason mapping, original waiting-time anchor, record migration and actual incremental capacity. Before server activation, additionally agree the reviewer roster/authority/conflict and reassignment rules, evidence freshness and applicable exception policy, producer locking protocol, queue snapshot/paging approach, notice retention/privacy and release evidence. Actual institutional thresholds, eligibility or time targets cannot be supplied by AI or copied from fictional cases.

These unresolved inputs do not prevent a clearly labeled fictional implementation. They prevent presenting that demonstration as an institutionally authorized live review system. No document receipt, planning amendment or repository publication substitutes for receiving-owner or institutional acceptance.
