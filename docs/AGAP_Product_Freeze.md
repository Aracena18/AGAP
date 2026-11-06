# AGAP historical product freeze

**Date:** 20 October 2026, Asia/Manila  
**Team:** FinVerse, University of Mindanao, Team ID 53  
**Partner context:** DCCPEC Multipurpose Cooperative  
**Product:** AGAP — Financial Health Loan Review  
**Status:** Working product baseline for hackathon design and build planning, established at the team's request. This records product scope; it does not claim partner adoption, production readiness, or measured impact.

> **Superseded scope, 20 October 2026:** The user subsequently directed a complete lending product, including disbursement, payments, accounting and financial-health follow-up, with hackathon features prioritized first. The [product solution](AGAP_Product_Solution.md), [production architecture](AGAP_Production_Architecture.md) and [delivery plan](AGAP_Delivery_Plan.md) now govern new planning. Prototype-only scope exclusions and the requirement to defer backend planning no longer govern that work. Preserve this document as the historical problem/demo baseline and independent fictional arithmetic oracle; none of its scenarios establishes real policy or production readiness.

## 1. Decision and problem

Commit to one workflow: preparing a loan application for a well-supported human decision, with the member's ability to meet everyday needs visible throughout the review.

**Frozen problem statement:** Loan officers and approvers must assemble information across documents, spreadsheets, and existing systems. Incomplete or conflicting information, difficult repayment-capacity assessment, and inconsistent handling of exceptions can weaken the connection between the member's circumstances, the officer's assessment, and the eventual lending decision. This creates repeated work and a risk of unsuitable repayment commitments.

**Product promise:** AGAP helps staff verify the information behind a loan review, examine repayment options against household cash flow, and carry the evidence and reasoning into an accountable human decision.

**Pitch:** “AGAP helps cooperatives review loans with the member's everyday financial life in view: check the evidence, examine repayments, and explain the decision.”

The product is intended to help prevent avoidable repayment mismatches while reducing review and handoff effort. These are intended benefits to evaluate, not achieved outcomes.

## 2. Evidence and assumptions

The team has confirmed in conversation that the discussed information problems, assessment difficulties, and policy-override problems exist at its partner. Use that confirmation as problem evidence; another discovery meeting is not a prerequisite to design or prototype work.

The rough meeting transcript supplies supporting context:

- Approximately 08:05–09:22: loan officer, committee, and manager review responsibilities.
- Approximately 27:47–31:18: capacity spreadsheet, net income, money left for family needs, and concerns about assessments and approvals.
- Approximately 34:22–47:48: fragmented member information, supporting records, software changes, and staff difficulties.
- Approximately 55:59–58:30: participants associate later repayment problems with credit investigation, assessment, and changes in lending practices.

The transcript is an automatic Cebuano/English draft with uncertain passages and unassigned speakers. Participant explanations are not proof of causation. Do not use the uncertain “70%” past-due figure as a baseline, or describe possible favoritism as an established finding.

Exact policy thresholds, permitted alternative terms, approval permissions, current export formats, frequency of problems, and baseline staff effort are not established. Prototype policy and offers will be explicitly fictional. Operational details can refine the design without reopening the core product choice.

This baseline supersedes the early-warning/member-follow-up direction in the older proposal and validation brief for new prototype planning. Preserve those documents as historical records. No organizer submission or Finverse result has been changed by this document.

## 3. Users and first-use boundary

- **Primary user:** Loan officer preparing the review and recommendation.
- **Supporting user:** Bookkeeper or cashier clarifying the relevant existing obligation or payment information.
- **Decision user:** Authorized committee reviewer or manager, represented by a clearly labeled demo reviewer role.
- **Beneficiary:** Member applying for a loan, participating through a staff-assisted conversation and a plain-language explanation.

The prototype starts with one application and ends with a recorded human review decision, its explanation, and a review date. It uses entirely fictional data. A focused application workspace will sit alongside the cooperative's existing process; a later integration decision follows discovery of the actual available interfaces.

## 4. Frozen prototype capabilities

### A. Review the evidence

Load a seeded fictional application, or enter facts through a simple form. Link important income, expense, obligation, and offer figures to their source and effective date. Keep document-supported, member-reported, conflicting, and missing information distinguishable.

Staff resolve a conflict by selecting or entering the applicable value and recording the supporting reason. Retain the earlier value and source in the case history. The product highlights discrepancies; it does not establish authenticity merely because a value appears in a document.

Relevant corrections feed the same review workspace, avoiding repeated entry within AGAP. Direct core-system writeback, universal document ingestion, and a full reconciliation engine are outside this prototype.

### B. Examine repayments and everyday cash needs

Use deterministic calculations to show money available over a dated cash-flow period after recorded essential expenses, existing obligations, and the proposed repayments. Display the opening spendable balance and calculation assumptions. Count obligations deducted from take-home pay only once.

Show monthly remaining money, dates with modeled cash shortages, and the supporting cash movements. These are scenario outputs, not default probabilities or a comprehensive financial-health score. Missing inputs remain explicit; they are not silently treated as zero or converted into a negative label about the member.

Compare the requested offer with an explicitly available alternative. Show principal, net amount received, repayment amounts and dates, term, fees, total repayment, and total financing cost for each. A lower instalment must not hide a longer term or higher total cost. Changing the date does not fix an overall income shortfall.

Members can correct the circumstances recorded about them through the staff-assisted review. A declined contextual question is recorded as unavailable information, not evidence of bad character or unwillingness to repay.

### C. Carry the assessment into the human decision

Prepare a shared review containing sources, unresolved questions, cash-flow scenarios, the officer's recommendation, and relevant demo-policy checks.

The reviewer records a decision and rationale. Departing from the officer's recommendation requires a visible explanation. Departing from a configured policy additionally requires an explicit exception record identifying the policy, departure, reason, and authorized reviewer. Critical evidence gaps produce an “incomplete review” state rather than a fabricated affordability conclusion. A reviewer can return a case for clarification.

Freeze the evidence and calculation version referenced by a recorded decision. Later edits mark the assessment as needing renewed review, preserving the earlier decision context. Recordkeeping supports accountability; enforcing real policy remains an institutional responsibility.

### D. Explain the result and preserve a follow-up point

Generate a printable staff review and plain-language member explanation: which option was considered, its full cost, the assumptions used, remaining concerns, and the recorded next step. Include a review date and a small field for a subsequent fictional member check-in. This is a checkpoint for later outcome assessment, not a new collections module.

### Four main screens

1. **Applications:** the three fictional cases and their review status.
2. **Evidence and circumstances:** source-linked facts, unresolved questions, and corrections.
3. **Repayment comparison:** dated cash flow, requested and alternative offers, and costs.
4. **Decision and explanation:** reviewer action, exceptions, versioned history, printable brief, and follow-up checkpoint.

### Role of AI

Use AI only to draft a short, source-linked explanation from the structured fictional case and checked calculation results. Staff review the draft before it becomes part of the decision record. AI does not calculate authoritative financial figures, infer missing circumstances, score character, approve loans, or invent available products.

A deterministic template produces the same essential review when AI is unavailable. The demo must remain usable in that condition. AI provider choice and service architecture belong to the implementation design; no real member information is required or sent to AI for this prototype.

### Scope exclusions

Exclude predictive default models, automatic approvals, automatic restructuring, live disbursement or collection, credit-bureau access, member mobile apps, full accounting, core-system migration, cross-institution data sharing, and a general-purpose chatbot. These are not needed to demonstrate the frozen workflow.

## 5. The fictional demonstration

All people, figures, offers, policies, and events below are invented for demonstration. None are DCCPEC policy or member records. The case exercises the product rather than proving that a similar incident occurred at the partner.

### Main case: Ana

Ana requests an offer providing **PHP 30,000 net**, repaid through **12 monthly payments of PHP 3,000**: **PHP 36,000 total repayment** and **PHP 6,000 total financing cost**, with no separate upfront fee in this fictional offer. Loan proceeds are reserved for the financed purchase and are excluded from household spendable cash.

An older worksheet lists monthly take-home pay of PHP 28,000. A current fictional payslip and staff confirmation establish PHP 24,000. The discrepancy must be resolved visibly; AI does not pick the correct source.

For the first 30-day repayment cycle, use these inputs:

| Item | Amount | Timing |
| --- | ---: | --- |
| Opening spendable cash | PHP 9,000 | Start of day 1 |
| Rent | PHP 6,000 | Day 5 |
| Existing obligation, not already deducted from take-home pay | PHP 2,000 | Day 7 |
| Proposed repayment | PHP 3,000 | Day 10 |
| Take-home pay | PHP 24,000 | Day 15 |
| Other essential expenses | PHP 5,500 | Day 20 |
| Other essential expenses | PHP 5,500 | Day 28 |

Essential expenses total PHP 17,000. After the source correction, monthly income less essential expenses, the existing obligation, and the new repayment is **PHP 2,000**. With the old income figure, it would appear to be PHP 6,000.

Despite the positive monthly result, the proposed day-10 repayment creates a modeled balance of **minus PHP 2,000** before payday. The fictional policy permits an alternative with payment on day 16 and the same principal, term, instalment, and total cost. That alternative has a modeled minimum balance of **PHP 1,000** and the same end-of-cycle balance of **PHP 11,000**. A positive modeled balance is not a guarantee of affordability or resilience; these inputs omit unreported events and uncertainty.

Demonstration sequence:

1. Open Ana's application and resolve the conflicting income figure with a recorded source and reason.
2. Show the positive monthly remaining amount alongside the pre-payday shortage.
3. Compare the allowed day-16 option, including unchanged full-term cost and the changed cash timeline.
4. Have the human reviewer record a decision. Show that selecting a different recommendation requires a visible reason, and any policy departure requires an exception record.
5. Produce the member explanation and follow-up date. Describe the result as a simulated decision improvement, not an avoided real default.

The key moment is the distinction between a positive monthly total and a dated cash shortage, followed by a permitted human action whose rationale remains visible.

### Two supporting cases

- **Ben — overall shortfall:** Use the same monthly essential expenses, existing obligation, and proposed repayment, but PHP 18,000 income. The result is **minus PHP 4,000 per month**. Moving the payment date cannot remove that gap. Display the shortfall and route to human clarification or discussion of available options; do not manufacture an affordable offer or automatically reject the member.
- **Cora — insufficient evidence:** Income or essential-expense information is incomplete or conflicting. Show what is missing and prepare the next clarification step. Produce no complete affordability result, default probability, or adverse character inference.

## 6. Usefulness, differentiation, and competition judgment

**Usefulness:** The partner problems and team confirmation provide sufficient grounds to build this focused prototype. Its intended everyday advantage is one reusable review that connects evidence, calculations, explanations, and decision responsibility. Actual time saved and adoption remain to be measured.

**Differentiation:** The candidate advantage is a simple cooperative workflow that makes household consequences visible and preserves them through approval, with sources and explicit exceptions. This is a positioning hypothesis. Do not claim that competitors lack the combination, that AGAP is globally unique, or that it is cheaper without evidence.

The market already includes:

| Official comparator | Relevant overlap | Implication |
| --- | --- | --- |
| [Origence](https://origence.com/solutions/automated-loan-decisioning/) | Configurable lending policies, scenarios, and audit history | Rules and explainability alone are not novel. |
| [Ocrolus Analyze](https://docs.ocrolus.com/docs/analyze) | Financial calculations, source tracing, and adjustments | Source-linked financial review is established. |
| [C&R Software](https://www.crsoftware.com/credit-risk-management) | Affordability, governed decisions, customer actions, and workflow history | Even broad combinations of assessment and accountability are established. |

The strongest evidence of advantage would be the partner performing the same fictional task more easily and reaching a better-supported next action than with its current process. An enhanced spreadsheet is a legitimate comparison, not just large commercial platforms.

**Competition judgment:** This is a credible entry direction, not a prediction of winning. It fits the published emphasis on partner needs, practical use of data/AI/policy, and household financial health. No verified final-round scoring weights or evaluation of rival entries is available here. A polished, reliable demonstration and honest evidence matter more than a claim of being first. [Official event requirements](https://www.apru.org/event/2026-hackathon-financial-health-frontiers/)

For planning, map the revised scope to **Inconsistent & Unreliable Data**, **Missing Contextual and Subjective Data**, and **Difficulty Applying Data Insights to Real-World Decisions or Interventions**. These are the team's proposed categories, not a newly generated Finverse recommendation or an amended submission.

## 7. What the prototype must prove

Acceptance checks for the subsequent build plan:

- Ana's corrected monthly result, negative pre-payday balance, alternative minimum balance, ending balance, and full-term costs match the independent arithmetic above.
- Ben remains in overall shortfall when the date changes. Cora retains an incomplete state when essential inputs are unknown.
- Existing obligations are not deducted twice when take-home income already incorporates them.
- Every important figure and explanation can be traced to a fictional source or a labeled member statement. Corrections preserve the old value and rationale.
- A decision records the actual scenario, reviewer, reasoning, and any policy exception. Editing relevant inputs makes the assessment require renewed review.
- The member explanation includes costs, assumptions, and unresolved concerns; no scenario is labeled a guarantee of future wellbeing.
- The full scripted journey works using the deterministic explanation when AI is unavailable. Generated drafts introduce no unsupported figures, causal claims, or product terms.

For a staff evaluation, record completion time, steps, repeated entries, clarification requests, missed issues, and whether the user reaches an appropriate next action. Compare the same fictional cases with the current process; disclose participant count and that results are a small usability exercise. Do not pre-fill a claimed percentage saving.

Actual financial-health impact requires later, separately authorized follow-up. Candidate member outcomes include ability to meet essential expenses, additional borrowing needed to make payments, understanding of terms, and financial strain. Monitor exclusion and additional application burden as well as arrears. Collection or repayment performance alone does not establish wellbeing. [CGAP financial-health framework](https://www.cgap.org/research/publication/measuring-financial-health-framework)

## 8. Handoff to system planning

The next deliverable is a technical design and build plan for the four screens, shared case record, deterministic cash-flow and offer calculations, review history, explanation generation, and fictional demonstration fixtures. Select the stack, persistence, demo role handling, and delivery milestones in that plan rather than treating them as decisions already made here.

Resolve remaining implementation questions using fictional defaults where needed, clearly separated from live partner policy. Freeze this problem and workflow through the hackathon; reopen them only if concrete evidence shows that the core workflow is unusable or conflicts with organizer requirements. Additions that do not support this workflow go to a later backlog.

The public event dates are **4–6 November 2026**, giving 15 calendar days from this baseline to the opening day. Use a small reliable demonstration as the planning target, subject to any newer instructions the team has received. [Official event timeline](https://www.apru.org/event/2026-hackathon-financial-health-frontiers/)

### Source record

- [Meeting recording](https://drive.google.com/file/d/10Kl1eMc7QQFbWZNbFgjkzHYDTBR6DRVn/view) (source access may be restricted).
- Rough transcript: privately supplied MacArthur Highway meeting transcript (not bundled).
- Historical team brief: [AGAP_Partner_Validation_Brief.md](AGAP_Partner_Validation_Brief.md).
- Current team direction: prioritize the problem, permit an AGAP pivot, use confirmed partner issues, and freeze a buildable hackathon product.
- External primary sources linked above were checked on 20 October 2026. Advertised competitor features establish overlap, not comparative performance.
