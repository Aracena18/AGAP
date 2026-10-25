# AGAP product solution and feature priorities

**Planning baseline:** 20 October 2026, Asia/Manila.

**Confirmed direction:** a complete lending system, including disbursement, repayment processing, accounting, and financial-health follow-up; four developers; free software and a free development setup.

**Status:** product and architecture plan, not implemented production capability or partner policy approval.

## 1. Product promise and authority

AGAP helps a cooperative make and manage loans while keeping the member's ability to meet everyday needs visible before and after borrowing.

The central user question is: **Can this member manage the offered repayments, and what should staff do when the evidence or their circumstances change?**

The full workflow is:

Member and application → evidence and credit investigation → repayment scenarios → officer recommendation → authorized human decision → accepted loan terms → controlled disbursement → repayment and accounting → financial-health review and human follow-up.

This document governs the target product. It supersedes the prototype-only scope and backend-planning gate in the [earlier product freeze](AGAP_Product_Freeze.md). That document remains the historical problem record and the independent arithmetic oracle for the existing fictional cases. [design.md](../design.md) remains the sole UI/UX authority. The [production architecture](AGAP_Production_Architecture.md) defines technical boundaries; the [delivery plan](AGAP_Delivery_Plan.md) defines owned paths and dependencies. [Assignment.md](../Assignment.md) records named owners and active task progress.

Architecture planning and product definition proceed now. Existing code remains a fictional browser implementation until the production components are built and independently evaluated. Do not describe a target feature as already available.

## 2. Hackathon priorities

The official event describes practical, responsible solutions grounded in partner needs, financial health, inclusion, and data protection, and asks for a working prototype or interactive mockup. Our feature ordering below is the team's interpretation of those objectives, not an official scoring rubric. The published event dates are 4–6 November 2026. [APRU event requirements](https://www.apru.org/event/2026-hackathon-financial-health-frontiers/)

Presentation priority does not remove the confirmed full-lending scope. It determines what the audience must understand first and which complete paths the team builds first. Foundation work for security and money integrity starts alongside the visible features.

| Rank | Key feature | Essential functions | What the presentation must establish |
| --- | --- | --- | --- |
| 1 | Evidence and verification workspace | Staff-assisted intake; source-linked income, expenses, debts, membership and share-capital records; conflicting/missing evidence; documented verification and corrections | A questionable or incomplete input is visible and can be clarified without labeling a member dishonest |
| 2 | Repayment and household cash-flow assessment | Deterministic monthly remaining money; dated cash balances and shortages; explicit assumptions; missing-data handling; full loan cost | Positive monthly income can still conceal a shortage before payday |
| 3 | Available loan-option comparison | Compare only permitted amounts, terms and dates; show net proceeds, instalments, fees, full repayment and financing cost together | A practical alternative can address a timing mismatch; moving a date cannot fix an overall shortfall |
| 4 | Accountable human decisions and explanations | Recommendation; approval/decline/clarification; configured authority and exceptions; immutable decision evidence; member explanation | Staff can explain what was decided, why, by whom, and from which version of the evidence |
| 5 | Financial-health follow-up | Current repayment status alongside dated member check-ins about essential expenses, additional borrowing and strain; review queue; recorded human next steps | Paying on time and maintaining household wellbeing are different observations |

All five are core product features. Rank 5 extends the current small follow-up note into a genuine, consent-aware review workflow; it must not be presented as already implemented monitoring.

### Implemented baseline versus target

| Capability | Existing browser implementation | Target work still needed |
| --- | --- | --- |
| Evidence | Fictional source excerpts, conflicting/missing facts, corrections and history | Actual controlled uploads, independent verification records and server persistence |
| Assessment/comparison | Checked one-cycle cash flow and costs for explicit fictional offers | Approved product/schedule generation, configurable institutional rules and authoritative server runs |
| Decisions/explanations | Browser role demonstration, saved snapshots and deterministic member brief | Real identities/permissions, approval limits/quorum, member acceptance and durable server history |
| Financial-health follow-up | Small follow-up date/note | Dated check-in responses, repayment position, review tasks and recorded staff actions |
| Disbursement, repayments and accounting | Not implemented | Complete controlled money path, loan subledger, double-entry GL and reconciliation |
| Production operations | Local fictional browser persistence | Server security, backups/restore, observability, migration and institutional release evidence |

## 3. Operational features required for the complete product

These support the five core features and are mandatory before AGAP becomes the system of record for real lending.

| Area | Release requirement | Boundary |
| --- | --- | --- |
| Access and administration | Real accounts, MFA for privileged actions, scoped permissions, separate preparer/authorizer identities, staff access revocation | The existing demo-role selector provides none of these protections |
| Member and application management | Member identity, application creation, purpose, requested product, disclosures and consent records, assignments, status and correction history | Staff-assisted web use is sufficient for the first release; a member app is a later channel |
| Loan products and policy | Versioned terms, approved calculation methods, eligibility requirements, verification alternatives, approval limits and exception permissions | No fictional threshold silently becomes institutional policy |
| Loan origination | Preserved approved offer, member acceptance, required documents, validity dates and release prerequisites | Approval does not establish member acceptance or prove that funds were delivered |
| Disbursement | Prepared and separately authorized release; cash/bank vouchers; optional payment-provider adapter; confirmation and reconciliation | A timeout or unknown transfer result cannot trigger an automatic second transfer |
| Repayment processing | Receipts, partial/late/early payments, allocation, overpayments, reversals, refunds and updated statements | Unconfirmed or duplicated payment events do not reduce debt twice |
| Loan servicing | Due schedules, balances, accruals under approved rules, arrears, authorized restructuring, settlement and write-off/recovery records | A restructure creates a new approved schedule and keeps the old one; it never rewrites history |
| Accounting | Double-entry general ledger and loan subledger, chart of accounts, approved posting rules, cash/bank reconciliation, period close, trial balance and financial statements | Lending accounting is in scope; payroll, inventory and other multipurpose-cooperative business applications are separate products |
| Member share capital | Source-linked balance for eligibility; contributions and permitted refunds with accounting entries and approvals | Share capital is not automatically spendable household cash or permission to offset a debt |
| Operations | Durable storage, backups and restore drills, monitoring, audit/access history, incident procedures and migration reconciliation | Free hosting does not demonstrate these requirements by itself |

The first supported product family is PHP-denominated, fixed-term instalment lending. Exact rate methods, accrual conventions, penalties, holidays, allocation priorities, insurance, guarantees and collateral requirements need documented institutional decisions before live configuration. Revolving credit, foreign currency and deposit-taking products require their own approved specifications.

Payment processing includes controlled manual cash/bank workflows as well as provider-backed workflows. A manual voucher records an actual externally executed movement; it is not an electronic transfer. The presentation must identify which mode is demonstrated. Provider access, contracts, settlement behavior and transaction fees are separate from the free software stack.

## 4. Trust, affordability and inclusion

AGAP verifies individual claims and records their supporting evidence. It does not produce a truthfulness or character score.

- Evidence provenance and verification are separate: a document can exist without its issuer having been confirmed.
- Record the verification method, verifier, date, result and limitations. A mismatch produces a clarification task; fraud is not automatically established.
- Use relevant cooperative repayment records. External bureau information is a separately authorized integration, with provenance, access restrictions and a correction route.
- Allow approved alternatives for applicants without conventional payslips or a bureau history. Missing evidence is uncertainty, not proof of dishonesty.
- Collect only the information needed for the declared purpose. Do not require broad social-media access, contacts or lifestyle data.
- Facial lie detection, emotion-based eligibility, social-media character scoring, automatic adverse decisions and predictive default scoring are excluded from this product baseline.

Eligibility requirements, cash-flow results and human decisions are distinct outputs. A policy check may pass while uncertainty remains. A policy exception cannot fabricate a missing value, bypass a legal restriction or create approval authority.

## 5. Calculations and the role of AI

Financial calculations remain deterministic and versioned. Preserve the established money, date, double-deduction and cost rules in the [frontend specification](AGAP_Frontend_Spec.md) and the executable [domain modules](../src/domain/assessment.ts). The production service will become authoritative; the client displays its checked results.

The current one-cycle household model is not a full-term forecast. Production comparisons must state their horizon. Future recurring movements, variable income and stress scenarios require explicit inputs and assumptions; they cannot be inferred as facts. Full-term loan costs use the contractual schedule.

AI may draft a source-linked explanation and, in a separately implemented extraction workflow, suggest candidate document fields. Humans accept extracted facts and review explanations. AI never calculates authoritative money figures, chooses the true source, determines eligibility, authorizes a payment, posts a journal or makes a lending decision.

Deterministic explanations are required. AI is an enhancement with a measured evaluation, data-processing review and an off switch; its availability or price must not block the complete product. Do not label a template as an AI response or promise an unverified free production AI service.

## 6. Presentation journey and proof

Use the existing fictional fixtures; retain their independent expected amounts in the earlier freeze rather than duplicating them in a new fixture registry.

1. Introduce the partner's confirmed information and review problems. Explain the intended member benefit without claiming measured impact.
2. Open Ana's conflicting income evidence. Show both sources and the staff correction with its reason.
3. Show monthly remaining money beside the original pre-payday cash shortage. Compare the permitted alternative and unchanged full cost.
4. Record a human recommendation and reviewer decision. Inspect the saved evidence version and printable member explanation.
5. When implemented, show a controlled fictional disbursement, repayment and balanced journal. Clearly label sandbox or simulated provider activity.
6. When implemented, show a later fictional check-in where repayment is current but essential expenses have become difficult; staff record a support/review action. No automatic restructure or invented diagnosis.
7. Briefly use Ben to demonstrate overall shortfall and Cora to demonstrate missing information and clarification.

This is a proposed presentation sequence; no official pitch length or final-round scoring weights have been supplied. Shorten the delivery to the confirmed organizer format when available.

Acceptance evidence must distinguish:

| Evidence | What it supports | What it does not establish |
| --- | --- | --- |
| Independent calculation and workflow tests | Results match the specified inputs and transition rules | Truth of member statements or future repayment |
| Observed staff exercises | Whether participants can use the workflow and reach an appropriate next action | Population-wide benefit or production readiness |
| Fictional before/after scenarios | How the intended mechanism can improve a decision | A real avoided default or financial-health improvement |
| Posting and reconciliation tests | Money events preserve ledger integrity under retries and reversals | Regulatory acceptance or correct unapproved accounting policy |
| Security and recovery evaluation | Evidence for tested controls and restoration targets | A guarantee against every incident |

Measure completion time, repeated entry, missed discrepancies, inappropriate actions and applicant burden in the staff exercise. Later real-world evaluation also needs member outcomes such as ability to meet essentials and additional borrowing to make payments; repayment performance alone is insufficient.

## 7. Phases and readiness

1. **Architecture and contracts:** agree module ownership and critical invariants; encode API/database contracts; identify unresolved institutional policy.
2. **Hackathon delivery:** build and demonstrate the five core features in a connected, honest journey; add the smallest complete disbursement → repayment → journal path that passes its integrity checks. Missing paths remain explicitly planned.
3. **Complete product implementation:** finish all operational requirements, adverse cases, reports, policy configuration and migration tools. No phase is treated as production-ready by its name.
4. **Controlled institutional deployment:** requires documented policy/accounting approval, operational ownership, security/recovery evidence, reconciled opening data, user evaluation and confirmed permissions for real data and payment connections.

The event date is a presentation constraint, not evidence that full production readiness can be reached by that date. Building in phases preserves the confirmed complete-product destination.
