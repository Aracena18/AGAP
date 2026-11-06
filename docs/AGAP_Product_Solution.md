# AGAP product solution and feature priorities

AGAP helps a cooperative make and manage loans while keeping the member's ability to meet everyday needs visible before and after borrowing.

The central question is: **Can this member manage the offered repayments while meeting everyday needs, and what should staff do when the evidence or circumstances change?**

This document defines the intended product. [Verification](AGAP_Verification.md) records what has been checked; [architecture](AGAP_Production_Architecture.md), [frontend behavior](AGAP_Frontend_Spec.md), and [team status](../Assignment.md) describe the implementation and remaining work. Demonstration records and transactions are fictional.

## Reported problem and research hypothesis

Reported concerns include incomplete repayment-capacity checks and approvals influenced by personal relationships. These require partner validation; they are not established findings of misconduct. AGAP responds with relevant evidence, explicit affordability, separate preparation/approval, disclosed conflicts, and preserved review history.

The financial-health hypothesis is that monthly budgets can overlook school costs, repairs, farm inputs, and other irregular expenses. Sussman and Alter's experiments concern underestimation of exceptional expenses; applying that mechanism to cooperative lending is a proposed extension, not a demonstrated Philippine borrower outcome. [Original research](https://w4.stern.nyu.edu/facdir/atakos/mktgfaculty/aalter/exceptionalexpenses.pdf)

AI may suggest relevant questions from approved source excerpts. A person confirms relevance, amount, dates, and recurrence assumptions before calculation. Historical spending does not establish a future expense. Compare this assistance with an ordinary annual-expense checklist before claiming added value.

## Core workflow

Member or assisted application → evidence and clarification → confirmed household needs → deterministic repayment scenarios → officer recommendation → separate human decision → accepted terms → controlled disbursement → repayment/accounting → support and follow-up.

| Priority | Capability | Supplied prototype | Remaining boundary |
| --- | --- | --- | --- |
| 1 | Member application and evidence | Own-record intake, private evidence workflow, source-linked facts/corrections, and explicit confirmation | Processing services/configuration and approved institutional verification alternatives |
| 2 | Household cash-flow assessment | Shared integer-centavo engine, explicit horizons and dates, irregular costs, monthly segments, and incomplete states | Approved institutional policy and independent acceptance of live configurations |
| 3 | Loan-option comparison | Explicit permitted offers, net proceeds, all repayments/fees, financing cost, and lowest dated cash balance | Complete approved product catalogue and servicing methods |
| 4 | Accountable review | Priority queues, human concern checking/escalation, current-input guards, separate approval, and immutable decision/acceptance history | Institutional authority, materiality/recusal rules, and representative workflow evaluation |
| 5 | Member support | Own-loan views, reminder preferences, confirmed payment-help requests, scoped staff responses/tasks, and posted-position freshness | Broader financial-health evaluation, external delivery, and authorized contractual amendments |

The alternate connected-lending mode supplies current staff review, exact-term member acceptance, and pending origination. It cannot run alongside the pilot. The gated server pilot connects approval, member acceptance, principal-only simulated release/repayment, actual database journals, reconciliation, and support. Its explicit fictional product has zero interest, fees, and grace; exact scheduled principal repayments are the supported path. It does not demonstrate real fund transfer, general partial-payment allocation, or the full production product. The browser Ana/Ben/Cora examples remain a separate review demonstration.

## Trust, affordability and inclusion

- Source provenance, member confirmation, file clearance, independent verification, and approval are different events. AI cannot establish document authenticity or personal honesty.
- More documents or assets do not automatically increase borrowing capacity. Restricted assets/share capital are not spendable household cash. Business income needs supported net costs and timing.
- Use approved alternatives and assisted access for members without conventional payslips or credit files. Missing information remains unknown; it is never an adverse character inference or an invented zero.
- Collect only purpose-relevant information. Broad social-media/contact access, facial lie detection, emotion-based eligibility, and demographic proxies are excluded.
- Show full contractual costs separately from the modeled cash-flow horizon. Preserve amount period, gross/net basis, payroll deductions, explicit cash dates, and whether the horizon covers the relevant needs.
- A positive monthly total can hide a dated shortage. Moving a payment date cannot repair an overall shortfall. No intraday or future-period guarantee follows from an end-of-day model.

The [policy clarification register](AGAP_Policy_Clarification_Register.md) records unresolved source requirements, period conventions, fees, and accounting mappings. No workbook assumption or fictional threshold becomes institutional policy automatically.

## Priority review and human escalation

One application may need clarification, AI concern checking, and escalation simultaneously. Human-substantiated material concerns and unresolved material escalations precede other cases; original submission time and stable ID break ties. Ranking covers the authorized cohort before paging. An active recommendation takes precedence over the requested offer when determining the reviewed basis.

**Ready for approval** requires complete/current evidence and assessment, a current recommendation, checked AI concerns, and resolved escalations. It describes workflow readiness, not repayment probability. Notice acknowledgment does not resolve a concern. Material input, source, offer, or policy changes require renewed review, even when earlier values are restored; earlier actions and decisions remain available.

In the fictional browser demo, monthly-capacity and cash-timing failures block approval and cannot be bypassed by an exception reason. A separate explicit decline may retain those failures after the other required checks. Returning for clarification remains available for incomplete evidence. Production exception permissions require institutional policy.

## Payment help and financial-health follow-up

A member previews the exact message/check-in and explicitly confirms sharing. Assigned staff see the submission-time loan position separately from a fresh authorized current position. Member-visible responses exclude internal notes; revocation/reassignment removes former access.

Paying on time and maintaining household wellbeing are different observations. A help request or health concern does not pause repayment, waive charges, approve relief, or change a loan. A contractual amendment requires a separately assessed comparison, authorized approval, member acceptance, and a new preserved schedule.

## AI-assisted 5C review and explainable handoff

Institution-approved numerical 5C review remains planned. The prototype has two distinct fictional presentations: an unprepared scripted analysis preview with illustrative ratings/risk percentages, and a prepared recording with source-linked narrative findings and no numerical score. Neither is independent predictive evidence or an approved institutional scorecard. Character is limited to documented repayment-related evidence; it is not a personal honesty score. Capacity consumes checked cash flow; Capital, Collateral, and Conditions require relevant supported evidence and explicit applicability.

Before numerical activation, obtain the applicable rubric's source, approval, version, criteria, levels/points/weights, missingness rules, and denominator/rounding method. Deterministic rules calculate scores and publish their trace; Qwen may draft source-linked interpretations and explanations for human review. An aggregate rubric score or model confidence is not a validated repayment probability. Explainable EBM/logistic research remains a separate offline study.

## Member goals, savings and cooperative-product guidance

Goal guidance is planned, voluntary, and separate from loan approval. Members retain consent and choice; declining guidance has no lending consequence. Checked contributions must preserve essentials, existing obligations, explicit horizons, dedicated funds, and unavailable assumptions. Do not invent returns or force savings.

Any product-specific guidance needs an approved catalogue, current costs/risks, reviewed educational content, qualified suitability review, disclosures, and preserved guidance history. Investment drafts remain staff-reviewed. Content, model, goal, or financial changes make earlier guidance stale without erasing it. This extension requires its own evaluation; it is not implemented advice.

## Complete-product requirements

Before real lending, complete approved product/rate/fee/day-count/rounding/allocation rules; separate release authorization; provider/manual movement evidence; partial/late/early/overpayments and reversals; loan subledger and balanced GL; approved mappings, share capital, full financial statements and period close; reconciliation and controlled migration; privacy/retention and secure evidence disposal; scoped identity/recovery; consistent backups including identity/documents/keys; offsite restoration, monitoring, and observed institutional acceptance.

The initial product family is PHP fixed-term installment lending. Revolving credit, foreign currency, and deposit-taking require separate specifications. Payment providers and external notification channels require their own access, costs, and operating evidence. No reduced-default or improved-wellbeing claim is established by synthetic examples or test results.

## Prepared recording and current extensions

The [two-minute walkthrough](AGAP_Demo_Walkthrough.md) uses an explicitly prepared fictional application, stored files with actual file-check status, saved source-bound answers, and deterministic baseline/repair scenarios. An officer saves a recommendation through the existing transaction; the member refreshes to see the saved proposed terms awaiting a separate authorized decision. Earlier takes, recommendations, and statements remain preserved.

The prototype also supplies posted-ledger trial balances, structured clarification with partial unknown/declined answers, source-linked support corrections, and staff-authored check-ins requiring the member's exact confirmation. These are implemented bounded workflows; institutional accounting, advice, privacy/retention, and representative-user acceptance remain separate.

## Presentation journey and proof

Show Ana's evidence correction and timing alternative, Ben's persistent shortfall, Cora's incomplete evidence, renewed review after a material change, and a consented support request. Label simulated people, AI observations, and financial movements. Use the [historical calculation oracles](AGAP_Product_Freeze.md#5-the-fictional-demonstration) for independent expectations and [verification](AGAP_Verification.md) for dated evidence and limitations.
