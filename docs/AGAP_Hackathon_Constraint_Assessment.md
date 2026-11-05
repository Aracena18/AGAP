# AGAP: current solution against the hackathon constraints

**Assessment:** 5 November 2026, Asia/Manila, for the 6 November pitch. **Tasks:** PLN-05 follow-up / SHOW-01 evidence packaging, Robert. **Inspected baseline:** main `64b3cea6a68cfd4cf1d8fe3f2d85a833bd8042a0`.

**Finding:** All four additions promised in Part B work in the bounded fictional browser demonstration: priority queue, consolidated summary, human checking of source-linked simulated AI concerns, and assigned escalation with saved in-app notices. A connected server implementation also exists in the default-off fictional pilot. This addresses the prototype workflow requirement. It does **not** establish that DCCPEC's staffing constraint has been eliminated, review time has fallen, or members experience fewer essential-needs shortfalls.

## 1. Sources and interpretation

The two attachments are preserved byte-for-byte under [sources/hackathon-2026-11-05](sources/hackathon-2026-11-05/README.md):

| Attachment | Repository copy | Role |
| --- | --- | --- |
| `Copy of 2026 Hackathon Fact Sheet Template (2).md` | [FinVerse fact sheet](sources/hackathon-2026-11-05/FinVerse_Fact_Sheet.md) | Partner problem, impact chain, safeguards, KPIs, reach scenarios, business assumptions and demo status |
| `Copy of 2026 Hackathon Fact Sheet Template (1).md` | [Part B and system-change handout](sources/hackathon-2026-11-05/FinVerse_Constraint_and_Handout.md) | Selected People/Operations constraint, four promised additions, review paths and demonstration boundary |

Statements such as “we will build” and the handout's “Planned” label are dated source claims, not new instructions to implement features or rewrite submissions. This assessment responds to the user's request to compare them with the current system. The Part B bytes match the corrected source hash already recorded in [PLN-05](AGAP_Priority_Review_Plan.md#1-source-and-interpretation).

The [current product solution](AGAP_Product_Solution.md) governs target behavior; [architecture](AGAP_Production_Architecture.md), [delivery plan](AGAP_Delivery_Plan.md), [design](../design.md), [frontend specification](AGAP_Frontend_Spec.md) and [Assignment.md](../Assignment.md) retain their authority. This is an evidence assessment, not another task tracker, numerical policy, design guide or fixture registry. External statistics and third-party studies linked inside the attachments have not been independently reverified in this audit; no external prevalence, market-size or price claim is certified here.

## 2. Current solution in pitch language

AGAP helps cooperative staff connect source evidence, household cash timing, permitted repayment options and an accountable human decision. The priority queue identifies the next justified action and who should perform it. Staff clarify missing or conflicting information, inspect checked affordability and full costs, check AI suggestions, and assign substantiated material concerns to a reviewer. Readiness still awaits a separate lending decision. Material changes reopen review while retaining earlier actions and decision snapshots.

There are two distinct demonstrations:

| Mode | What exists | How to describe it |
| --- | --- | --- |
| Three-case review demo | Ana/Ben/Cora; simulated Mara/Luis roles; source-linked simulated AI concern; browser persistence; working queue, summary, checking and escalation | “Working on fictional cases with simulated review roles and AI concerns.” |
| Connected fictional pilot | PostgreSQL/API queue and histories, eligible-reviewer checks, scoped notices, current-basis decision guards, member acceptance and principal-only simulated money/GL/support path | “Implemented and locally tested behind an explicit fictional-pilot switch.” |

The pilot defaults off and requires enabled evidence, fictional development/test records and normal sign-in; presentation/password-only shortcuts are refused. Its activation is not production approval. The complete lending product remains the destination, with broader product, servicing, accounting, security and institutional acceptance work retained. See [pilot delivery and limits](AGAP_Experiment_F_Pilot_Delivery.md) and [configuration guards](../apps/api/src/platform/config.ts).

## 3. Part B: requirement-by-requirement result

**Implemented** below means supplied prototype behavior with code/test evidence. It does not advance package acceptance in Assignment.md or establish partner adoption.

| Constraint or promised behavior | Assessment | Evidence and practical limit |
| --- | --- | --- |
| Staff cannot easily identify the next application needing attention | **Implemented for the demo; server pilot supplied** | [Queue rules](../src/domain/priorityReview.ts), [application queue](../src/features/applications/ApplicationsPage.tsx) and [server queue](../apps/api/src/modules/reviews/reviews.service.ts). Material concerns precede other cases; original waiting time and ID break ties. No measured throughput or staffing improvement. |
| Consolidated evidence and affordability summary | **Implemented** | [Browser summary](../src/features/review/ReviewSummary.tsx), [connected review page](../src/features/reviews/PriorityReviewPage.tsx): current blockers, source links, selected offer, monthly remaining, lowest balance, full repayment/cost and next action. Detailed evidence remains inspectable. |
| Missing/conflicting/currentness issues follow clarification | **Implemented** | Cora retains unavailable results; Ana's conflicting pay needs a recorded correction. Currentness is a distinct review step. Neither absence of data nor a declined answer becomes zero or dishonesty. [Browser tests](../tests/priority-review.spec.ts), [server readiness](../apps/api/src/modules/reviews/readiness.ts). |
| Source-linked AI concerns require human confirmation, correction or dismissal | **Implemented checking workflow** | Reasons and source bindings are retained. A dismissed suggestion cannot clear an independently failed financial check. The three-case sample is explicitly simulated; model quality remains a separate gate. [Domain tests](../src/domain/priorityReview.test.ts), [server tests](../apps/api/src/modules/reviews/reviews.test.ts). |
| Substantiated urgency first; otherwise waiting time | **Implemented deterministic ordering** | Browser uses checked fictional material failures/unresolved escalations. Server priority requires current human-confirmed material concerns and ranks the authorized cohort before snapshot-bound paging. Unchecked AI output alone cannot confer material priority. Server limit: 500 active applications per snapshot; this is not load-tested production capacity. |
| Preparing officer assigns an eligible reviewer and sends an in-app notice | **Implemented in both bounded modes** | Browser assigns Luis; server checks the current eligible roster and rejects self/ineligible assignment. Server notice and escalation are saved transactionally. No real DCCPEC roster/authority is adopted. [Review service](../apps/api/src/modules/reviews/reviews.service.ts). |
| Notice receipt must not resolve the concern | **Implemented and freshly checked** | Acknowledgment does not change the financial basis or establish resolution. Ben remains blocked after receipt. A reviewer disposition is separate from the final lending decision. |
| All overlapping concerns, ownership and pending actions remain visible | **Implemented** | Ana can show clarification, AI checking and escalation together. Server uses one primary route plus all blockers. A single label does not erase other pending work. |
| Ready cases await separate human approval | **Implemented prototype guards** | Evidence/assessment/recommendation and concern prerequisites feed readiness; the pilot consumes the same guard for consequential actions. Failed financial checks cannot be cleared by an AI dismissal or notice receipt. Browser roles are a simulation, not authentication. |
| Material changes trigger renewed review and preserve history | **Implemented and freshly checked** | Changed/restored evidence or offers cannot resurrect old clearances. Reload retains saved actions and old decisions. Versioned server concerns and immutable events preserve their earlier basis. |
| Judges can see Ana, Ben and Cora paths working | **Verified again on this baseline** | Three fresh Chromium scenarios pass, including saved-action reload, Ben's blocked premature resolution/approval, investigated human decline and Cora's unavailable figures. Existing [PRV-01 captures](AGAP_Priority_Review_Verification.md#captured-evidence) illustrate these paths. |
| Less repeated work and improved real-world review capacity | **Unmeasured** | Navigation/coordination mechanisms exist; no observed DCCPEC comparison establishes minutes saved, fewer errors or acceptable alert burden. This is the central remaining People/Operations validation. |

The original “no review priority queue” and “four additions Planned” passages describe the earlier baseline. They should not be presented as current absence. The fact sheet's newer “verified on three fictional cases” wording is supported. Earlier planning-only statements about all server integration remaining pending are also superseded for the supplied fictional pilot, while actual owner/institutional acceptance remains pending.

## 4. Wider fact-sheet constraints and remaining gaps

| Topic | What is addressed now | What remains open / owner boundary |
| --- | --- | --- |
| Repaying on time can still leave essentials uncovered | Deterministic dated balances accompany monthly remaining and full costs. Ana demonstrates a timing shortage; Ben demonstrates an overall shortfall. [Historical independent oracles](AGAP_Product_Freeze.md#5-the-fictional-demonstration) remain authoritative. | No actual reduction in shortfalls or defaults established. Aaron owns CRD-01; Earl measures outcomes with partner participation. |
| An unsuitable buffer may exclude or underprotect members | Server policy supports `minimumBalanceCentavos`; the [finance engine](../packages/finance/src/workflow-assessment.ts) compares it with the modeled minimum. | **Partial.** No agreed DCCPEC buffer or complete member buffer/preference capture flow. The three-case demo uses its existing zero-minimum fictional check. Institutional rule approval remains necessary; no silent threshold change is warranted. |
| Irregular earnings, limited documents and overlooked expenses | Recorded statements/manual entry, source correction, unavailable values, explicit dated facts and structured clarification support the mechanism. Saved unknown/declined answers and assisted check-ins now exist. | **Partial.** Approved alternative-evidence rules, representative testing and exclusion/burden measurement are pending. General confirmed-expense recalculation is not proof of the planned interactive expense-shock tool. Aaron/Robert own evidence/member integration; Earl evaluates. |
| AI availability and reliability | Manual/checklist/template fallback; source-bound human checking. Repository delivery evidence records actual Experiment F CPU execution, including accepted and rejected outputs. | **Partial.** CPU execution was an offline compatibility probe; the temporary VM was removed. GPU deployment, independent evaluation/promotion and dependable end-to-end live application inference remain open. Do not present the simulated sample as a live model response. Aaron/Benedict/Earl/Robert retain existing responsibilities. |
| Consent-aware member follow-up | Payment-help sharing preview, check-in answers, staff responses, follow-up tasks/history, dated posted positions and member-confirmed assisted drafts are supplied. | **Partial.** These are collection/support capabilities, not the specified 12-month comparative study. Institutional notices/retention/assistance and receiving-owner acceptance remain pending. Earl/Robert own monitoring/member integration. |
| Essential-shortfall KPI | Relevant check-in questions exist. | **Not implemented as the fact-sheet outcome measure.** No standard-review comparison cohort, baseline, unique-person 12-month denominator, response/approval-rate reporting or demonstrated causal benefit. Current summary explicitly counts submissions, including repeat/corrected ones. [Summary UI](../src/features/monitoring/CheckInSummaryPage.tsx). |
| Overdue-installment KPI | Principal-only pilot schedules, posted repayments and positions supply some technical foundations. | **Not implemented as the fact-sheet outcome measure.** No agreed overdue protocol across both groups and 12-month report; full amendment/original-versus-revised schedule handling remains retained servicing work. Benedict/Earl retain PAY-01/SRV-01/HLT-01/ACC-01. |
| Business model, reach and partner continuation | Subscription, reach scenarios and the 4 February 2027 pilot-readiness milestone are documented proposals. | **Unvalidated.** No agreed price, willingness-to-pay evidence, achieved reach or written pilot-readiness decision was supplied. Robert coordinates; Earl contributes the measurement protocol. These are not software defects that a queue can fix. |
| Real cooperative deployment | Local identity/access, persistence and bounded workflow/financial tests exist. | **Not released.** Real authority/roster, institutional policy/accounting/privacy, deployed scanner/OCR, normal-identity acceptance, full recovery/cutover and representative-user evidence remain release gates. Written architecture and passing fictional tests do not settle them. |

### The buffer distinction must be explicit during the pitch

Ana's after-payday option has a modeled minimum of **PHP 1,000**. The fact sheet separately illustrates a **PHP 1,500** buffer, leaving a **PHP 500 gap**. The demo's existing fictional timing rule requires a nonnegative balance, so it can show “Ready for approval” under that rule. This does **not** mean the option meets the illustrative PHP 1,500 buffer or establishes resilient household finances.

Say: **“The permitted date change removes the modeled negative balance at the same loan cost, but the member would still be PHP 500 below the illustrative buffer. Agreeing the buffer and checking suitability remain part of the pilot.”** Do not change the canonical demo threshold or claim the buffer flow is delivered solely to reconcile the presentation.

### What would establish that the staffing constraint is improved?

Run an observed partner exercise comparing the same fictional tasks in the existing process and AGAP, with task order varied where practical. Record participant count, time to the appropriate next action, repeated source lookups/entry, missed blockers, unnecessary escalations, correction effort and whether responsibility is clear. Check irregular-income and limited-document cases for additional burden. These measures test workload and alert quality without presuming a saving. Earl coordinates measurement with Robert and the domain owners; actual staff participation and acceptance are still needed. The later financial-health study separately needs agreed consent, groups, unique-person linkage, follow-up/overdue definitions and missing-response/approval reporting. The 90-day readiness milestone is an opportunity to agree that protocol, not a completed 12-month impact result.

## 5. Corrections to propose for the presentation copy

Original attachments remain unchanged. These are reviewable wording/arithmetic corrections, not changes to an organizer submission or independently verified external claims.

| Source issue | Recommended presentation treatment |
| --- | --- |
| Part B says there is no queue and the four additions will be built; handout says Planned, 4 November | Preserve as the challenge's starting point. Add a dated result: “Implemented and verified on fictional cases by 5 November; partner validation and production release remain pending.” |
| Benchmark row is 34% / 30% / 20%, but resulting cases are 34 / 68 / 102 and the explanation uses 34% throughout | Choose one consistent assumption before use. Keeping the existing explanation/results requires **34% / 34% / 34%**. Keeping the displayed varying percentages instead gives **34 / 60 / 60**. Do not combine them. This checks internal arithmetic only; the national benchmark itself was not reverified here. |
| “68 potential repayment-difficulty cases reached” may be mistaken for 68 beneficiaries improved | Treat as an illustrative exposure/reach estimate under a national proxy, not measured DCCPEC prevalence or shortfalls prevented. Benefit share remains unknown. |
| “10%–20% shortfalls than under standard review” is incomplete and ambiguous | Proposed wording: “We will test whether AGAP-assisted review reduces the share of consenting applicants reporting at least one repayment-related essential-expense shortfall, compared with standard review. Baseline and numeric target remain to be agreed.” If retaining 10–20%, label it a hypothesis and specify relative reduction versus percentage points. |
| Three-year 0 / 48 / 288 scenarios | Arithmetic is internally consistent. Adoption, review share, benefit share and unique-person assumptions remain unvalidated scenarios. They are not achieved impact. |
| “Member outcome tracking planned” may hide newer collection work | Update spoken wording to “Check-in/help collection and staff follow-up are implemented; the comparative longitudinal outcome study is planned.” |
| “A written pilot-readiness of the prototype” | Say “A written pilot-readiness decision is the next milestone.” 4 February 2027 is 90 days after 6 November 2026; it is a target, not an obtained approval. |

## 6. Suggested challenge segment for 6 November

> Our partner's constraint is limited staff capacity to reconstruct loan reviews from scattered records. We built a priority queue and consolidated summary showing the concern, its sources, the responsible person and the next action. Staff check AI concerns before treating them as substantiated; material issues go to an assigned reviewer, and a notice acknowledgment cannot clear them. Ana shows clarification and a permitted timing alternative, Ben shows a shortfall that a date change cannot fix, and Cora stays incomplete until information is available. These paths work on fictional cases. Our next test with DCCPEC is whether they reduce review effort without increasing exclusion, and whether members experience fewer repayment-related shortfalls. The agreed buffer and 12-month outcome evaluation remain open.

Suggested demonstration order; adapt to the organizer's confirmed time limit:

1. **Queue:** open `/#/applications`. Point out Ben's material concern, Ana's overlapping clarification/AI paths, and each next actor/action. [Queue capture](screenshots/priority-review/queue-desktop.png).
2. **Ana:** inspect source conflict, correct income, compare the permitted after-payday option and unchanged full cost. Complete currentness/checking/reviewer steps; reload the saved summary. Explain the buffer distinction above. [Ready summary](screenshots/priority-review/ana-ready-desktop.png).
3. **Ben:** acknowledge the reviewer notice, then show that unresolved financial failures still prevent premature resolution/approval. An investigated human decline remains distinct from automatic rejection. [Investigation capture](screenshots/priority-review/ben-investigated-desktop.png).
4. **Cora:** show unavailable affordability and the clarification path. Missing income is never replaced with zero. [Clarification capture](screenshots/priority-review/cora-clarification-320.png).
5. **Accountability:** edit material evidence to reopen review, retaining saved history. End with the pilot measurement commitment, not an unmeasured percentage benefit. [Renewed-review capture](screenshots/priority-review/ana-renewed-review-320.png).

Use the three-case route as the demonstrated challenge path. The separate server queue is `/#/staff/review-queue` when the fictional pilot is configured and normal sign-in requirements are met; its application IDs are server records, not `AG-001`/`AG-002`/`AG-003`. Test sessions used for automated verification do not demonstrate a normal identity-provider login.

If asked **“Is the constraint fixed?”**, answer: “The prototype workflow additions are implemented. Whether they materially improve staff capacity under real workload is our next partner test.” If asked **“Has financial health improved?”**, answer: “We demonstrate the mechanism on fictional cases; actual household impact has not yet been measured.”

## 7. Evidence and verification scope

Fresh checks on the inspected baseline, isolated branch `codex/constraint-pitch-assessment`:

- **71 tests pass:** `npm test -- src/domain/priorityReview.test.ts src/domain/review.test.ts src/domain/assessment.test.ts`.
- **22 tests pass:** targeted platform run for `apps/api/src/modules/reviews/reviews.test.ts`, `packages/finance/src/workflow-assessment.test.ts` and `apps/api/test/pilot-integration.test.ts`, using a task-only localhost fictional database. Covers scoped queue ranking/paging, source-bound checks, eligible assignment, notice-versus-resolution, stale basis, manual fallback and generated-client pilot decision/money/GL/support integration. Model adapters and session fixtures are explicitly simulated.
- **3 Chromium tests pass:** `npm run test:e2e -- tests/priority-review.spec.ts --workers=1 --trace off`, with dedicated web/API ports and the same isolated test database after the platform run. Covers Ana/Ben/Cora, reload, material-change invalidation and 320px accessibility/reflow assertions. Fresh queue and ready-summary captures were visually inspected; existing committed PRV-01 images are linked above rather than overwritten.

The first browser attempt stopped before tests because the default test database was down. The isolated Compose attempt encountered exhausted Docker network pools; a task-only temporary PostgreSQL container on the existing bridge resolved the environment without touching another task's database. The successful browser run emitted the existing manually changed hash-navigation warning; the frontend specification already documents that limitation. No assertion was relaxed.

This delivery adds source snapshots, assessment and tracker/verification references only. Full `npm run check` and full `npm run test:e2e` are not rerun for this documentation-only follow-up; prior full-feature evidence remains in [PRV-01 verification](AGAP_Priority_Review_Verification.md), [pilot delivery](AGAP_Experiment_F_Pilot_Delivery.md) and [UI verification](AGAP_UI_Review_Verification.md). No new feature is declared integrated. No application code, contract, financial rule, fixture, runtime setting or existing owner task status changes. `graphify update .` is not required because code is unchanged. Publication and fresh technical checks do not establish consuming-owner, representative-user or institutional acceptance.

Documentation audit passes: **44 new local links/anchors**, both original-source byte/hash comparisons and every existing Assignment.md table row preserved across the six Markdown-only changed paths. Authored Markdown passes the scoped staged whitespace check. The unfiltered check reports only the imported Part B's six original Markdown hard-break lines and original final blank line; those bytes are deliberately preserved and independently hash-checked. Source-linked external claims remain outside this audit's verification scope.
