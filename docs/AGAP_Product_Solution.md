# AGAP product solution and feature priorities

## Priority review demo amendment — 5 November 2026

PRV-01 adds a fictional browser priority queue and review summary. One application can need clarification, AI concern checking and escalated review simultaneously. Substantiated material concerns and unresolved material escalations precede other cases; original submission date and application ID break ties. The active offer is the current recommendation, otherwise the requested offer. Other offers remain inspectable in comparison.

Mara explicitly confirms that evidence applies to the modeled period, checks the source-linked simulated AI observation and assigns escalations to Luis. Luis receives an in-app notice, investigates, records the next action and verifies resolution after passing checked results. Notice acknowledgment does not resolve a concern. Complete/current evidence and assessment, a current recommendation, checked AI concerns and resolved escalations are required for **Ready for approval**, which describes workflow readiness and makes no repayment guarantee.

For this fictional demo, the existing monthly-capacity and cash-timing failures are strict approval blockers: exception reasons cannot bypass them. This supersedes the older demo exception workflow, not production exception policy. A separate explicit decline can retain the failure after evidence/currentness/AI/recommendation and assigned investigation checks. Return for clarification remains available with incomplete evidence. Financial calculations and fictional thresholds are unchanged; AI checks never supply financial facts or decide loans.

Material changes, including restoring earlier values or switching back to an earlier offer, require renewed review without deleting earlier actions or snapshots. Workflow-only actions do not increment the financial case version. The existing three fictional cases and two simulated people are reused; no API, production authorization, reviewer roster or live AI execution is added. Capability status and demonstration evidence are recorded in [PRV-01 verification](AGAP_Priority_Review_Verification.md). Additional effort remains Pending outside the existing core estimate.
**Selected constraint planning baseline, 5 November 2026:** the user-supplied corrected fact sheet adds priority review and human escalation to the hackathon presentation. The [PLN-05 implementation proposal](AGAP_Priority_Review_Plan.md) preserves the pre-implementation code inspection, proposed scope and larger integration requirements. PRV-01 above supplies the user-confirmed, demonstrated fictional browser slice. Production integration and receiving-owner/representative acceptance remain pending; the complete lending destination and earlier assigned work are retained.

**5C revision:** 29 October 2026. Adds planned evidence-based institution-rubric scores, explanations and handoff; numeric policy configuration is unresolved and no repayment probability is claimed.

**Goals revision:** 29 October 2026. The member-goal, savings and cooperative-product guidance below is user-requested target scope, not implemented advice or an approved product catalogue.

**Planning baseline:** 25 October 2026, Asia/Manila. This revision incorporates member-phone access, AI-assisted financial-health review and assigned Qwen/explainable-model training.

**Confirmed direction:** a complete lending system, including disbursement, repayment processing, accounting, and financial-health follow-up; four developers; free software and a free development setup.

**Status, 26 October:** target product plan with a supplied platform/member-intake candidate. Own-record application drafts/submission, separate member access, reminder preferences and the portal facade/screens are implemented in that candidate. Source verification, AI inference, checked offers, decisions, loans and health/support records still await their owners; those ports default to unavailable. [Verification](AGAP_Robert_Member_Verification.md) separates real intake from simulated domain rendering. This is not partner policy approval or production certification.

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

All five are core product features. Goal-based guidance below adds a planned financial-health capability; it does not displace these five priorities or fit inside their existing first-demo estimate. Rank 5 extends the current small follow-up note into a genuine, consent-aware review workflow; it must not be presented as already implemented monitoring.

### Implemented baseline versus target

| Capability | Existing browser implementation | Target work still needed |
| --- | --- | --- |
| Member access | Supplied 0.2.0 candidate: linked own-record access, phone application drafts/submission/status and reminder preferences; domain screens have explicit unavailable defaults | Connect actual evidence, decision, loan and support services; representative member review and remaining production controls, with phone UI owned by Robert |
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

### Supplied policy and cash-flow sources — 2 November 2026

The [policy clarification register](AGAP_Policy_Clarification_Register.md) refines existing evidence, credit and human-review requirements using the privately supplied guide/workbook. Record institution/product/operation, source and effective policy versions, approved requirements/alternatives and calculation conventions before activating the affected institutional configuration. Product eligibility, complete household cash flow and human authorization remain separate outputs. Checking/payment guarantees are distinct from collateral. Source status, income period/gross-net basis, deduction inclusion and accessible versus restricted resources remain explicit; unclear policy or critical inputs yield clarification/unavailable results.

Review source formula findings against existing code before assigning a defect. Preserve the single engine, canonical fictional oracles and historic decisions; no workbook percentage, period shortcut, business-cost estimate or fee method becomes a default by this amendment. Use independent rate-unit, period, double-counting and final-centavo checks for affected behavior. Product-specific checklist refinements follow [design.md](../design.md#14-planned-policy-and-cash-flow-review-refinement) and shared-contract review. All-ten-product coverage, full reloan automation, servicing amendments, goals and numerical 5C review retain their current stages/estimates; the files provide no approved 5C weights. Follow the [ongoing-work checkpoint](AGAP_Policy_Clarification_Register.md#ongoing-work-checkpoint) before committing additional scope. This is planned refinement, not implemented policy or a verified operational release.

## 4. Trust, affordability and inclusion

AGAP verifies individual claims and records their supporting evidence. It does not infer truthfulness or personality scores. The planned 5C Character category below is restricted to documented repayment-related evidence under an approved institutional rubric; it is not a judgment of personal honesty.

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

### AI-assisted 5C review and explainable handoff

The [FND-05 contract proposal](AGAP_5C_Review_Contract_Proposal.md) translates these requirements into proposed records/operations for team review; it changes no numeric policy or executable interface.

The user requests an assessment after document/answer analysis, organized by Character, Capacity, Capital, Collateral and Conditions, with per-category percentages, supporting explanations and a staff handoff. Add this as a planned institution-rubric review, with AI-assisted evidence analysis, deterministic scoring and human review. It is not an implemented scoring model or a repayment-probability estimate.

| Category | Relevant review basis and limits |
| --- | --- |
| Character — repayment-related evidence | Authorized repayment records and documented verification findings under defined criteria; no inferred honesty, personality, emotion, appearance, writing-style or social-media score |
| Capacity | Confirmed income, essentials, debts and proposed payments; dated shortages and full costs remain visible alongside any rubric result |
| Capital | Source-linked relevant resources, member contributions and commitments with availability/restrictions; assets or share capital are not automatically spendable cash |
| Collateral | Product applicability, verified ownership/valuation and recorded restrictions/security requirements; not applicable is distinct from missing or failed |
| Conditions | Documented purpose, permitted terms and relevant dated household/business circumstances; no invented future income or unsupported market forecast |

**Rubric provenance before numbers:** research published financial-institution practice, identify its institution/product/jurisdiction/date and distinguish educational descriptions from actual operative policies. Obtain the cooperative's approved applicable criteria, rating levels, points/weights, denominator/rounding, required evidence, exceptions, applicability, missing-data treatment, thresholds and version. The public five-Cs framework is not a universal scoring formula. Published [CDA/Landbank training](https://cda.gov.ph/updates/csf-cooperatives-elevate-expertise-on-loan-evaluation-and-credit-appraisal/) supports the framework in a CSF-cooperative context, not a DCCPEC scorecard; the [SBA overview](https://www.sba.gov/blog/2018/2018-05/five-factors-impact-your-business-credit/) describes lender variation in business-credit assessment, not Philippine eligibility rules. No researched source currently supplies an approved AGAP numerical rubric. Until configured, show evidence/findings and **Rubric score unavailable**, never made-up percentages. A fictional test/demo rubric requires explicit labeling and independent expected results; its weights cannot be described as institutional practice or validated repayment probabilities.

**Assessment flow:** Qwen drafts source-linked 5C findings, identifies conflicts/gaps, suggests which defined criterion a fact supports and asks focused questions. Source confirmation and independent verification remain separate. Objective criteria use confirmed facts and checked calculations; discretionary ratings require an identified staff acceptance/correction before they contribute to a reviewed score. The credit service, not Qwen, computes each configured rubric percentage and its trace using deterministic fixed-point score units, explicit rounding and the applicable denominator. Preserve draft versus reviewed status. Missing critical evidence blocks the affected score/assessment; do not give it zero, silently shrink the denominator or mark it not applicable. Show applicability and evidence completeness separately. Do not combine the five percentages into an overall score or outcome unless an approved aggregation rule defines it, and never let an aggregate hide missing facts, a cash shortage, authority restrictions or required policy exceptions.

A label such as **Capacity: institution-rubric score (%)** states the rubric version, relevant offer, as-of/horizon, reviewed status and limitations. It is neither a percent honest, AI-confidence percentage, nor the chance of repaying. AI analysis alone does not calibrate probability. A future repayment/default probability requires a separately approved outcome/horizon, representative authorized outcome data, leakage controls, independent calibration/discrimination and subgroup/operating review; the current synthetic cases and emergency-fund EBM do not provide those labels or validation. That predictive work remains outside this addition.

**Explainable output and handoff:** retain a machine-checkable trace of criteria, accepted evidence/source dates, thresholds/weights, awarded/possible points, arithmetic, missing items and applicable exceptions. Qwen may express that supplied trace in plain language, with references and no invented factors, causation or reasons. A generated rationale or hidden reasoning transcript is not evidence that a score is valid. Rule traces explain rubric scores; an actual trained predictive model would require an appropriate explanation method and a separate reviewed design. Current EBM/logistic research stays offline and is not repurposed as a 5C model or as an explainer for Qwen's judgment.

The officer receives original authorized sources/member answers, draft/reviewed findings, per-C results or unavailable states, unresolved questions, checked repayment scenarios and a concise source-linked handoff. The officer records their own recommendation; a separate authorized reviewer decides with their own reasons. Relevant source, offer or rubric changes invalidate pending results and require renewed review while retaining historical snapshots. Missing credit history or inapplicable collateral is not automatically dishonesty or rejection; approved alternatives and clarification remain available. An AI draft, rubric score or high total never constitutes approval, document authentication or a financial-health guarantee.

FND-05 (Robert), CRD-03 (Aaron), QWN-03 (Benedict) and EVAL-03 (Earl) are additional unestimated stage 2 packages. Robert owns shared contracts/integration, Aaron the credit rubric/rules and staff 5C view, Benedict the same Qwen family's bounded analysis/explanation adaptation and decision-handoff integration, and Earl independent corpus/protocol/validation. The first-demo budgets and the separate goal-guidance tasks remain intact; an earlier labeled fictional illustration needs explicit capacity review and its checks. No live scoring, actual weights, model promotion or contract changes are implemented by this plan.

### Member goals, savings and cooperative-product guidance

The [FND-04 contract proposal](AGAP_Goal_Guidance_Contract_Proposal.md) translates these requirements into proposed goal/planning/guidance records and operations; review does not activate a product or implement this journey.

The member may voluntarily ask AGAP how to work toward an emergency fund, a planned expense, travel, leisure or another personal goal. AGAP reuses only relevant, authorized records with visible dates and a changed-circumstances check; old application data is not permanently current. Declining guidance, choosing a leisure goal, changing a priority or pausing a voluntary plan must not affect loan eligibility, collections treatment or a character/health score.

**Member journey:** choose a goal and target/date → confirm current household information and existing goal funds → inspect checked contribution scenarios → review a source-linked Qwen suggestion → choose, revise or pause a plan → revisit it when circumstances change. Staff assistance and a deterministic checklist/template remain available. The first slice supports one active goal; simultaneous goals require explicit allocation and protection against reusing the same money.

| Required information | Treatment |
| --- | --- |
| Goal purpose, target, deadline/flexibility and priorities | Member-selected; a deadline or target changes only with member agreement |
| Existing dedicated savings and accessible balances | Source/date and accessibility recorded; do not count restricted share capital, purchase-reserved loan proceeds or money allocated elsewhere as freely available |
| Income, essential expenses, debts, effective loan repayments and irregular needs | Confirm freshness, dates, sources and recurrence assumptions; retain existing verification distinctions |
| Contribution dates, modeled horizon and liquidity/emergency reserve | Explicit dated inputs and an institutionally reviewed/member-confirmed reserve policy or amount; a monthly surplus alone is insufficient |
| Product preferences, investment horizon, access needs and willingness/ability to bear loss | Collect proportionately when product-specific guidance is requested; unknown information prevents that guidance |

**Checked planning:** Aaron extends the same deterministic finance engine under CRD-02; Qwen does not compute the authoritative contribution, completion date, product return or affordability result. The no-return baseline states its assumption explicitly rather than treating an unknown return as a known zero. For that baseline, compute the target gap from confirmed funds dedicated to the goal and distribute it over the member-confirmed contribution dates in integer centavos, with a final remainder adjustment. Show required versus modeled-available contributions, dated shortages, protected needs/reserves, projected completion and assumptions. A result is incomplete when required data is unavailable, infeasible under the recorded assumptions when the requested plan cannot fit, or a conditional scenario when the checks pass. No state guarantees future affordability, investment suitability or goal completion. The original one-cycle demo does not establish a year-long plan; longer projections require explicit future movements and recurrence assumptions covering the displayed horizon.

Earmarking or transferring savings must not fabricate spending or income. Track the effect on accessible discretionary cash without counting a reserve and its eventual payment twice. The same balance cannot simultaneously fund an emergency reserve and a second goal. Required fees use approved dated rules. Missing fees, liquidity restrictions or required assumptions block the affected product scenario. Variable returns are uncertain labeled scenarios, never required gains that make an otherwise infeasible plan appear feasible. Protect essential needs and current obligations; do not recommend borrowing or cutting necessities to fund a goal, or investing money required for essential or near-term commitments. When cash is insufficient, explain the gap and offer goal revision or an authorized support route.

**Qwen suggestions:** using confirmed facts, checked planning results and reviewed educational material, Qwen may propose a next step, explain a candidate contribution/date, ask what is missing and draft a member-specific savings or cooperative-investment suggestion. Every amount/date/product claim references its checked result or approved catalogue source. Display the basis, limitations and available alternatives; the member can correct or decline it. Language generation is not an independent suitability finding. Loan-approval recommendations remain outside the AI scope.

**Cooperative products:** use only a versioned, institutionally approved catalogue with eligibility, current availability, minimums, fees, contribution/withdrawal rules, lockups, liquidity, capital-loss risks and approved return disclosures. A positive cash-flow result alone does not establish suitability. Source-linked share capital, withdrawable savings and investment products retain their distinct legal/accounting and access characteristics; dividends/returns are not guaranteed or automatically spendable. Institutionally permitted products, advisory authority, disclosures and any required local permissions must be confirmed before activation. Do not presume a cooperative offers a product, recommend an unavailable product, rank by promised return or commission, or steer a member into a cooperative product by default. General educational discussion remains available when there is no eligible approved product.

A product-specific investment recommendation requires a recorded suitability review by a person authorized by the cooperative for that product and function before the personalized recommendation is shared with the member. Investment drafts remain staff-only until that review; the member sees review status and neutral educational/product information. General budget/goal drafts may be shown with an explicit draft label and correction route. A reviewed suggestion includes the selected catalogue version, relevant alternatives including no action, reasons, risks/costs, reviewer and validity/review date. Updated material inputs or product terms make an outstanding suggestion need renewed review while preserving the earlier record. No AI can approve a purchase, execute a transfer, open an account, take deposits or change a loan. Any actual savings/investment transaction uses the cooperative's separately approved process; this feature is planning and advice support, not a new investment-execution or deposit-taking system.

Earl owns GOL-01 goal/guidance records, staff review and follow-up; Aaron owns CRD-02 calculations/catalogue filtering and the existing AI adapter; Benedict owns QWN-02 guidance adaptation; Earl independently evaluates it under EVAL-02; Robert owns FND-04 contracts and MOB-02 member UI/facade. Use the existing owned modules and one provider adapter. Record these additional packages separately in Assignment.md. They are stage 2 by default and unestimated; an earlier fictional goal slice may be demonstrated only after an explicit owner capacity re-estimate and its checks. Do not silently add them to the current 64-unit first-demo commitment or make them a prerequisite for the existing core journey.

Measure comprehension, correction burden, plan usefulness and whether voluntary goals remain manageable alongside essentials, as well as unsupported claims, unsuitable product suggestions, sales pressure and extra application burden. Synthetic plans and a goal saved in the UI do not prove money was saved or wellbeing improved. Reuse of document-extraction evaluation does not release goal guidance: the [model training plan](AGAP_Model_Training_Plan.md#6-goal-guidance-training-extension-29-october-2026) requires separate reviewed examples and an independent gate. [BSP educational modules](https://www.bsp.gov.ph/Pages/InclusiveFinance/FinancialEducationLearningModules.aspx) provide candidate material for local review; [Investor.gov risk-tolerance education](https://www.investor.gov/introduction-investing/investing-basics/save-and-invest/gauge-your-risk-tolerance) explains the relevance of goals, time horizon and loss tolerance. Neither source approves a local product or replaces institutional suitability/permissions review.

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

The goal-guidance extension has separate unestimated packages and release evidence; first-demo budgets do not cover it. A planning-only illustration must be labeled planned or simulated until its implementation and guidance gates pass.

The event date is a presentation constraint, not evidence that full production readiness can be reached by that date. Building in phases preserves the confirmed complete-product destination.

## Evidence milestone candidate — 3 November 2026

The user-approved evidence/AI-extraction/affordability milestone now supplies the candidate described in [delivery evidence](AGAP_Evidence_Workflow_Delivery.md), with canonical 0.3.0 contracts. Member statements/documents, untrusted AI suggestions, human confirmation/correction, independent verification and deterministic assessment remain distinct. Missing dates/amounts/basis/coverage are unavailable; future cash movements require explicit confirmation. Monthly remaining, horizon totals, dated balances and full contractual cost remain separate. Production policy/offer/fee dates, household loan-proceeds treatment and the basis of remaining-money thresholds must be explicitly configured and approved; no fictional configuration becomes a real default.

The technical candidate includes manual fallback and persistence, while actual model evaluation, scanner/OCR/container/cloud deployment evidence, institutional rules/recovery/acceptance and the [hosting budget](AGAP_Hosting_Cost_Proposal.md) remain production gates. Approval, disbursement, repayments, accounting reports, goals, EBM research and numerical 5C scoring retain their later milestones. Task status remains in Assignment.md; this amendment does not claim complete production delivery or independent approval.

## Selected constraint: limited review capacity — 5 November 2026

The corrected team fact sheet selects **People; Operations**: limited staff capacity to assemble fragmented evidence and assessments. AGAP must make the next justified review action, its sources and its responsible person visible. Add a deterministic priority queue, a concise combined review summary, human checking/disposition of source-linked AI concerns, and reviewer assignment with in-app escalation notices. The newer evidence workspace already combines evidence and affordability sections; the missing work is summary, routing and ownership, rather than another calculator.

Use the four review paths: **Needs clarification**, **Awaiting concern check**, **Escalated review**, and **Ready for approval**. Keep all overlapping blockers visible. Confirmed current material concerns receive attention first; otherwise comparable applications follow original waiting time. Unchecked AI concerns block readiness but cannot establish urgency or materiality by themselves. Missing/currentness/assessment/recommendation and blocking-concern prerequisites must all be satisfied before readiness. Preparation/unavailable and recorded-decision states remain explicit. A dismissed suggestion cannot clear an independent failed check; acknowledgment of a notice does not resolve a concern. Material evidence changes require renewed current-basis review while preserving historical decisions.

The preparing officer assigns an escalation to an eligible reviewer. This operation is separate from existing administrator-controlled intake officer assignment. Final approval remains a separate authorized human action with the existing conflict/authority controls; readiness is no repayment or risk-free guarantee. Keep the payment-help queue separate from this application-review queue.

For the bounded hackathon demonstration, reuse fictional Ana (conflict, correction and readiness), Ben (confirmed shortfall and escalation), Cora (clarification) and an explicitly simulated source-linked AI concern. Preserve canonical amounts and use existing simulated officer/reviewer roles, saved review actions and manual fallback. Production authorization, actual reviewer roster and live AI execution remain separate integration work. Show Planned until each addition works and is verified. There is no measured review-time limit or time-saving claim. Incremental effort is Pending beyond the historical 64-unit baseline; full lending, existing training/research and stage 2 goals/5C assignments remain intact. See the [sequence and acceptance matrix](AGAP_Priority_Review_Plan.md#5-incremental-implementation-sequence).
