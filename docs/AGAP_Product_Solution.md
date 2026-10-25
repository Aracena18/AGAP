# AGAP product solution and feature priorities

**Planning baseline:** 25 October 2026, Asia/Manila. This revision incorporates member-phone access, AI-assisted financial-health review and assigned Qwen/explainable-model training.

**Confirmed direction:** a complete lending system, including disbursement, repayment processing, accounting, and financial-health follow-up; four developers; free software and a free development setup.

**Status:** target product plan. The fictional review demo and Robert's separate staff-intake review candidate are the implemented baseline; the member portal, AI workflow and financial business modules described here remain planned. This is not partner policy approval or production certification.

## 1. Product promise and authority

AGAP helps a cooperative make and manage loans while keeping the member's ability to meet everyday needs visible before and after borrowing.

The central user question is: **Can this member manage the offered repayments while meeting everyday needs, and what should staff do when the evidence or their circumstances change?**

### Reported problem and research hypothesis

The user reports insufficient repayment-capacity checks and concerns about approvals influenced by personal relationships. Treat these as reported concerns for partner validation, not findings of misconduct or established causes of every unpaid loan. AGAP addresses them through relevant evidence, explainable affordability, separate preparation/approval, disclosed conflicts and recorded exceptions.

The lead financial-health hypothesis is **overlooked irregular expenses**: a member can supply genuine documents while a monthly budget misses school costs, repairs, farm inputs or other nonmonthly needs. Sussman and Alter's consumer experiments found underestimation and narrow categorization of exceptional expenses. Applying that mechanism to cooperative affordability is a proposed extension, not a demonstrated Philippine borrower outcome. [Original research](https://w4.stern.nyu.edu/facdir/atakos/mktgfaculty/aalter/exceptionalexpenses.pdf)

AI may identify candidate costs in approved records or a member's account and ask focused questions. The member confirms relevance, amount, date and any recurrence assumption; recorded independent verification remains separate. The deterministic engine then compares permitted scenarios over an explicit horizon. Historical spending does not establish a future expense; uncertain events remain labeled scenarios. Validate this against an ordinary annual-expense checklist before claiming AI adds value.

The full workflow is:

Member phone or assisted application → evidence and credit investigation → confirmed household needs, including irregular expenses → repayment scenarios → officer recommendation → authorized human decision → accepted loan terms → controlled disbursement → repayment and accounting → financial-health review and human follow-up.

This document governs the target product. It supersedes the prototype-only scope and backend-planning gate in the [earlier product freeze](AGAP_Product_Freeze.md). That document remains the historical problem record and the independent arithmetic oracle for the existing fictional cases. [design.md](../design.md) remains the sole UI/UX authority. The [production architecture](AGAP_Production_Architecture.md) defines technical boundaries; the [delivery plan](AGAP_Delivery_Plan.md) defines owned paths and dependencies. [Assignment.md](../Assignment.md) records named owners and active task progress.

Architecture planning and product definition proceed now. Existing code remains a fictional browser implementation until the production components are built and independently evaluated. Do not describe a target feature as already available.

## 2. Hackathon priorities

The official event describes practical, responsible solutions grounded in partner needs, financial health, inclusion, and data protection, and asks for a working prototype or interactive mockup. Our feature ordering below is the team's interpretation of those objectives, not an official scoring rubric. The published event dates are 4–6 November 2026. [APRU event requirements](https://www.apru.org/event/2026-hackathon-financial-health-frontiers/)

Presentation priority does not remove the confirmed full-lending scope. It determines what the audience must understand first and which complete paths the team builds first. Foundation work for security and money integrity starts alongside the visible features.

| Rank | Key feature | Essential functions | What the presentation must establish |
| --- | --- | --- | --- |
| 1 | Member application and evidence | Phone application with an assisted route; reusable current records; AI candidate extraction; source-linked income, expenses, debts and relevant assets; CI/issuer checks; documented corrections | Uploading a document, confirming its extracted text and independently checking a claim are distinct events |
| 2 | Repayment and household cash-flow assessment | Confirmed regular and irregular needs; deterministic remaining money and dated shortages; explicit horizon and assumptions; full loan cost | A positive monthly total can conceal a timing shortage or an omitted nonmonthly expense |
| 3 | Available loan-option comparison | Compare only permitted amounts, terms and dates; show net proceeds, instalments, fees, full repayment and financing cost together | A practical alternative can address a timing mismatch; moving a date cannot fix an overall shortfall |
| 4 | Accountable human decisions and explanations | Recommendation; separate preparer/approver; declared conflicts and reassignment; configured authority and exceptions; immutable evidence; reviewed plain-language explanation | An officer cannot approve their own case or silently replace the evidence supporting a decision |
| 5 | Member loan access and financial-health support | Own-loan status, reminders and payment-help requests; dated check-ins about essentials, additional borrowing and strain; staff review and authorized amendments | Paying on time and maintaining household wellbeing are different observations; a help request does not itself amend a loan |

All five are core product features. Rank 5 extends the current small follow-up note into a genuine, consent-aware review workflow; it must not be presented as already implemented monitoring.

### Implemented baseline versus target

| Capability | Existing browser implementation | Target work still needed |
| --- | --- | --- |
| Member access | No member login or member portal; separate staff intake review candidate | Own-record identity linkage, phone application/status/dashboard, reminder preferences and payment-help UI, all owned by Robert |
| Evidence and AI | Fictional source excerpts, conflicting/missing facts, corrections and history; no live AI | Controlled uploads, candidate extraction/clarification, member-confirmed irregular costs, independent verification and server persistence |
| Assessment/comparison | Checked one-cycle cash flow and costs for explicit fictional offers | Approved product/schedule generation, configurable institutional rules and authoritative server runs |
| Decisions/explanations | Browser role demonstration, saved snapshots and deterministic member brief | Real identities/permissions, approval limits/quorum, member acceptance and durable server history |
| Financial-health follow-up | Small follow-up date/note | Dated check-in responses, repayment position, review tasks and recorded staff actions |
| Disbursement, repayments and accounting | Not implemented | Complete controlled money path, loan subledger, double-entry GL and reconciliation |
| Production operations | Fictional browser persistence plus a separate platform/intake review candidate and local verification | Remaining security, full identity/offsite restore, observability, financial migration and institutional release evidence |

### Member phone channel

Robert exclusively owns the member-facing web experience and member-access facade. Members can **Apply for a loan**, **Track my application**, **View my loan**, and **Get payment help**. Other owners supply their domain APIs and staff screens. Start with a responsive web experience using the existing design system; a native app is not a first-demo requirement.

Reuse relevant records with visible source dates and a changed-circumstances check. One account setup does not make income or expenses permanently current. Ask only necessary questions; do not require everyone to supply land titles or every grocery receipt. Approved alternative evidence and staff-assisted access remain available. No document-count reward, opaque character score or automatic increase in borrowing capacity is introduced.

First-demo reminders use confirmed due dates and in-portal notices. External SMS/email/push delivery is a separately configured channel with preferences, delivery evidence and verified operating costs; simulations must be labeled. A dashboard distinguishes posted repayment facts, member-reported circumstances, pending information and the next action rather than issuing an unsupported healthy/unhealthy verdict.

## 3. Operational features required for the complete product

These support the five core features and are mandatory before AGAP becomes the system of record for real lending.

| Area | Release requirement | Boundary |
| --- | --- | --- |
| Access and administration | Real accounts, MFA for privileged actions, scoped permissions, separate preparer/authorizer identities, staff access revocation | The existing demo-role selector provides none of these protections |
| Member and application management | Linked member identity, own-record phone access, application creation, purpose, requested product, disclosures/consent, assignments, status and correction history | Member access is distinct from staff permissions; the member portal and an assisted route are both target channels |
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

More relevant, reliable evidence improves the basis for review; it does not automatically increase a loan limit. An asset or farm title is not household spendable cash. Farming/business income requires supported net amounts, costs and timing. Approved source/issuer checks and CI findings are recorded with limitations; AI cannot declare a scan true or a person dishonest.

- Evidence provenance and verification are separate: a document can exist without its issuer having been confirmed.
- Record the verification method, verifier, date, result and limitations. A mismatch produces a clarification task; fraud is not automatically established.
- Use relevant cooperative repayment records. External bureau information is a separately authorized integration, with provenance, access restrictions and a correction route.
- Allow approved alternatives for applicants without conventional payslips or a bureau history. Missing evidence is uncertainty, not proof of dishonesty.
- Collect only the information needed for the declared purpose. Do not require broad social-media access, contacts or lifestyle data.
- Facial lie detection, emotion-based eligibility, social-media character scoring, automatic adverse decisions and predictive default scoring are excluded from this product baseline.

Eligibility requirements, cash-flow results and human decisions are distinct outputs. A policy check may pass while uncertainty remains. A policy exception cannot fabricate a missing value, bypass a legal restriction or create approval authority.

Record relevant conflict declarations and apply institutional reassignment/recusal rules. The case preparer cannot provide final approval, and a conflicted reviewer cannot authorize a case while an applicable restriction remains unresolved. Preserve reasons, exceptions and approver identity for authorized audit. These controls reduce opportunities for individual bypass; they do not establish the absence of undisclosed relationships or collusion.

## 5. Calculations and the role of AI

Financial calculations remain deterministic and versioned. Preserve the established money, date, double-deduction and cost rules in the [frontend specification](AGAP_Frontend_Spec.md) and the executable [domain modules](../src/domain/assessment.ts). The production service will become authoritative; the client displays its checked results.

The current one-cycle household model is not a full-term forecast. Production comparisons must state their horizon. Future recurring movements, variable income and stress scenarios require explicit inputs and assumptions; they cannot be inferred as facts. Full-term loan costs use the contractual schedule.

The planned AI workflow may suggest source-linked document fields, questions about missing/conflicting information, candidate irregular expenses, explanations of checked results, and summaries of member-reported difficulty. One reusable provider adapter serves domain-owned workflows. Members/staff confirm drafts before they become facts or shared requests; accepted financial facts still retain their source and verification status. AI never calculates authoritative money figures, chooses the true source, determines eligibility, authorizes a payment, posts a journal or makes a lending decision.

Confirmed irregular costs enter the same calculation engine without duplicate counting. An extended household projection requires explicit dated inputs covering the expense, a visible horizon and stated recurrence assumptions; the existing one-cycle demo remains unchanged. A missing amount/date blocks a complete affected scenario rather than becoming zero. A monthly reserve view and its eventual cash payment cannot both be deducted as separate spending.

Deterministic explanations are required. AI is an enhancement with a measured evaluation, data-processing review and an off switch; its availability or price must not block the complete product. Do not label a template as an AI response or promise an unverified free production AI service.

### Assigned model training

The [model training plan](AGAP_Model_Training_Plan.md) specifies two main model families and one comparison baseline. **Benedict owns QWN-01: Qwen3.5-2B LoRA fine-tuning** for source-linked document extraction and overlooked-expense questions. **Aaron owns XAI-01: EBM training plus logistic regression** for a separate offline emergency-funds research experiment. Aaron retains the single runtime AI adapter under AI-01; Qwen training does not transfer evidence/credit ownership.

Earl owns verifiable synthetic documents, independent truth, grouped train/validation/holdout splits and final model comparisons. Application/presentation fixtures stay fictional. The candidate Philippine Findex survey is a distinct offline research source, subject to access/codebook review; it is not cooperative loan-outcome data or application fixtures. EBM explains associations with reported emergency-fund difficulty, not causes, future default, member eligibility or a credit/health score. Its outputs do not enter operational assessments, approval, member screens or support ranking.

Robert owns shared model contracts/dependencies, runtime wiring and evidence packaging. Free cloud GPU availability, reproducible training and a held-out comparison are dependencies, not completed capabilities. Evaluate pretrained Qwen before LoRA; deploy a tuned artifact only if reviewed evidence supports it. Keep manual/checklist/template fallback, including when training is unfinished or shows no gain.

### Payment help and financial-health follow-up

The member can report an income change or difficulty meeting essentials and preview/edit what will be shared. Monitoring records the confirmed request and assigns staff review. Staff discuss only institutionally permitted options, such as a due-date change, temporary arrangement, authorized restructuring or an available assistance/referral pathway. These options remain unconfirmed institutional inputs until the cooperative approves them.

Servicing calculates the proposed schedule/cost effects using the approved engine and recorded loan position. An authorized person approves the amendment, the member accepts it, and a new effective schedule preserves the original. A pending request does not pause interest/fees, change balances or promise relief. Staff consider both household needs and the cooperative's approved servicing/accounting constraints. Declined or missing check-in answers remain unavailable and do not imply dishonesty or good/bad financial health.

## 6. Presentation journey and proof

Use the existing fictional fixtures; retain their independent expected amounts in the earlier freeze rather than duplicating them in a new fixture registry.

1. Introduce the partner's confirmed information and review problems. Explain the intended member benefit without claiming measured impact.
2. Open Ana's conflicting income evidence. Show both sources and the staff correction with its reason.
3. Show monthly remaining money beside the original pre-payday cash shortage. Compare the permitted alternative and unchanged full cost.
4. Record a human recommendation and reviewer decision. Inspect the saved evidence version and printable member explanation.
5. When implemented, show a controlled fictional disbursement, repayment and balanced journal. Clearly label sandbox or simulated provider activity.
6. When implemented, show a later fictional check-in where repayment is current but essential expenses have become difficult; staff record a support/review action. No automatic restructure or invented diagnosis.
7. Briefly use Ben to demonstrate overall shortfall and Cora to demonstrate missing information and clarification.

The updated target journey adds a phone application, a confirmed irregular expense beyond the original review cycle, a blocked self-approval/conflict restriction, and a member-requested payment-help handoff with staff response. The first contractual hardship amendment is retained for stage 2 under Benedict, making room for Qwen training. Demonstrate these only after implementation; preserve Ana/Ben/Cora and their original arithmetic. External issuer checks use an explicitly fictional registry in the synthetic demonstration, not a claim to authenticate real payslips or land titles.

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

Use a verifiable synthetic evaluation corpus with source documents/statements, separate ground truth, known conflicts/unknowns, and independently checked expected calculations. Keep held-out cases separate from prompt tuning and reference the canonical fixtures instead of copying them into a second registry. Compare AI with a simple annual-expense checklist and manual/form-based check-in. Report extraction/source accuracy, missed costs, unsupported assumptions, confirmation/correction effort, latency and appropriate staff handoff. Synthetic results establish behavior on those cases; they do not establish real borrower outcomes, default prediction or population-wide fairness. Earl owns the corpus/evaluation, with each domain owner supplying independently reviewable acceptance evidence. Add pretrained-versus-tuned Qwen comparison with untouched template/scenario families. Present EBM versus logistic regression separately as exploratory research with missingness/weight/leakage controls, uncertainty and no member-level lending inference; details are in the model training plan.

## 7. Phases and readiness

1. **Architecture and contracts:** agree module ownership and critical invariants; encode API/database contracts; identify unresolved institutional policy.
2. **Hackathon delivery:** prioritize one connected phone/evidence/expense-discovery → checked options → accountable decision → controlled disbursement/repayment/journal → payment-help journey. Use the 16-unit-per-owner slice budgets (64 total, expanded from 48 after adding training/evaluation) in [Assignment.md](../Assignment.md); first contractual amendments remain in stage 2 and missing paths remain explicitly planned. The budgets are provisional remaining-effort estimates, not proof of equal hours or completion dates.
3. **Complete product implementation:** finish all operational requirements, adverse cases, reports, policy configuration and migration tools. No phase is treated as production-ready by its name.
4. **Controlled institutional deployment:** requires documented policy/accounting approval, operational ownership, security/recovery evidence, reconciled opening data, user evaluation and confirmed permissions for real data and payment connections.

The event date is a presentation constraint, not evidence that full production readiness can be reached by that date. Building in phases preserves the confirmed complete-product destination.
