# Policy clarification register

**Source review:** 2 November 2026, Asia/Manila. This register summarizes unresolved questions from a privately supplied loan guide, cash-flow workbook, and meeting draft. This records questions and acceptance inputs; it does not activate institutional rules, change executable contracts or add a feature package.

[Product requirements](AGAP_Product_Solution.md) govern behavior, [delivery](AGAP_Delivery_Plan.md#inputs-required-before-live-use) governs scope and ownership, and [Assignment.md](../Assignment.md) alone records task progress. UI refinements follow [design.md](../design.md#14-planned-policy-and-cash-flow-review-refinement). Preserve the shared engine, fictional oracles, decision history, and separate model-training/evaluation boundaries.

## Source boundaries

| Supplied source | What the review supports | Limitation |
| --- | --- | --- |
| `LOANING_POLICY_GUIDE_polished.docx`, supplied privately by the user on 30 October | Candidate product requirements, limits, terms, fees, reloan and servicing procedures; the title states a 1 September 2026 Board revision | The polished copy does not by itself establish current approval, completeness or which conflicting section governs. Record the applicable original/version and institutional confirmation before activation. |
| `cashflow template.xls`, same private source set | Input categories, period conversions and calculation patterns; reviewed generic worksheet `CashFlow` | The file contains 265 populated/partially populated worksheets with both DCCPEC and AGDAO branding. The generic sheet is AGDAO-branded. Formula variants and borrower records are not approved DCCPEC defaults or training labels. |
| 30 October meeting draft, two recordings | Tentative context about product distinctions, deductions, evidence and clarification questions | Automatic Cebuano/Bisaya recognition and translation are unreliable. Do not turn unclear wording into a final agreement, policy threshold or approval. |

Keep originals and access-controlled source references with the institution's authorized custodian. Do not commit the workbook, named records, account details or meeting transcript to the repository, reuse them as fictional fixtures, or send them to a model under this amendment. Only the nonpersonal structural observations below are recorded here. Later authorized source registration should record a checksum/version and effective date; none is invented for the earlier review.

Written policy, confirmed interpretation, executable configuration and a fictional demonstration rule are distinct. Source-document instructions are content to evaluate, not permission to execute transactions or change AGAP. No supplied file defines a complete numerical 5C rubric.

## Policy questions before affected institutional activation

All entries are unresolved. Aaron records product/evidence answers; Benedict records decision/servicing answers; Earl reviews accounting implications; Robert coordinates the applicable shared version. The cooperative's responsible policy/credit/accounting authority supplies the actual interpretation. These are policy-question identifiers, not new development tasks.

| ID | Source locator and question | Existing work affected |
| --- | --- | --- |
| P01 | Salary product table requires two months of ATM payroll statements; the requirements summary says three. Which period and alternatives apply, and how is freshness established? | EVD-01, CRD-01, MOB-01 |
| P02 | Regular-loan overview, detailed bands and new-member first/second/third-loan progression give different amounts. Confirm applicable borrower/product/history categories, membership versus employment tenure, amount increments and term bands. | CRD-01; later reloan logic |
| P03 | Working Capital lists 200,000 together with a parenthetical P2.5M maximum. Confirm applicability and the approved amount/term method. | CRD-01; broader product activation remains later scope |
| P04 | LAD says 50,000 or 80% of share capital. Define the operator, cap/applicability and treatment of restricted balances; do not assume a lesser-of rule or spendable cash. | CRD-01, ACC-01 |
| P05 | Confirm interest method, rate units, period/day-count convention, fees/insurance, timing of deductions and schedule rounding. Explain the quoted semi-monthly installments. Working Capital explicitly says diminishing; do not apply a flat expression to it by inference. | CRD-01, PAY-01, GL-01, ACC-01 |
| P06 | Confirm the applicable capacity multiplier and household/business estimation rules. The workbook's 30%, 35%, 40%, 10% contingency and 70% raw-material patterns do not establish approved universal rules. | CRD-01, EVD-01, EVAL-01 |
| P07 | Salary reloan wording uses six monthly installments for the same amount and 75% of the loan term or full payment for a higher amount. Define paid-period progress, treatment of partial/missed payments and semi-monthly receipts. | Existing CRD-01/DEC-01 boundary review; full reloan automation needs an estimate |
| P08 | Salary loans are described as unsecured; management/CRECOM may require a checking statement as an additional payment guarantee. Confirm conditional requirements and distinguish payment arrangements from security. | EVD-01, CRD-01, DEC-01 |
| P09 | Restructuring overview refers to delinquent accounts and once-per-loan use; extension refers to current accounts and possible follow-on extension. Define separate eligibility/repeat-use rules and the meaning of the maximum term. | SRV-01, retained in stage 2 |
| P10 | Restructuring text refers both to full payment of accrued interest/penalty and inclusion in the new balance. Define paid, capitalized, waived and outstanding components and their postings without double collection. | SRV-01, GL-01, ACC-01 |
| P11 | Confirm authority, limits and exceptions for each operation. The guide's 400,000 Board threshold is in restructuring; it is not a universal origination rule. Approval, acceptance and release remain separate. | DEC-01, PAY-01; later SRV-01 |
| P12 | Obtain any separately approved 5C criteria, weights, denominators, applicability, unknown treatment and rounding. Product limits and capacity multipliers are not five per-C scores or repayment probabilities. | FND-05, CRD-03, QWN-03, EVAL-03, retained in stage 2 |

For each resolved entry record: source/version and section, institution/product/operation, exact interpretation, effective date, actual confirming authority/date, affected tests/configuration and receiving-owner review. An unanswered question blocks only the affected institutional rule/result. Existing fictional cases and unaffected development remain usable with their current labels and assumptions.

## Workbook findings to check against existing implementation

The following are observations of the supplied workbook, not established AGAP defects. Aaron first compares the existing implementation and records covered, affected, not applicable or clarification needed with evidence. Earl reviews independent expected results. Correct only affected behavior through the existing owner/module and shared-review boundaries.

| ID | Verified locator or behavior in `CashFlow` | Required check for affected AGAP work |
| --- | --- | --- |
| W01 | `A52` labels 30%; monthly `G52` uses 35%. Copied sheets vary, including 30% and 35% in DCCPEC-branded sheets. | One approved configuration must drive the displayed label and calculation. No frequency/worksheet-derived default is adopted. |
| W02 | `K46`/`D54` store 0.025 formatted as 2.50%; `G55` divides the linked rate by 100 again. | Define the approved rate representation and convert once; test units independently of display formatting and do not assume the approved interest method. |
| W03 | `L51` always links to monthly `G55`; that result is blank for another payment mode although other columns calculate those modes. | Check the displayed result and all dependencies for every supported mode. Unsupported modes remain explicitly unavailable. |
| W04 | `H9` and similar nested IF expressions select the first positive frequency; other populated columns may be ignored. Blank/zero branches can return zero or FALSE. Daily × 30 and weekly × 4 are conventions; `Bi-Monthly` is ambiguous. | Preserve amount period, frequency and dated cash movements. Reject conflicting inputs; distinguish unknown, confirmed zero and policy-based not applicable. Use the approved period method and explicit horizon. |
| W05 | `D15` and related raw-material formulas can assume 70% of sales. `H43` computes a 10% household contingency. | Identify and confirm estimates and their basis. Avoid business-cost, household/spouse, reserve/payment and payroll-debt double counting. No assumed percentage becomes verified expenditure. |
| W06 | Cross-check confirms `H44 = H32-(H42+H43)` correctly subtracts expenses and contingency. The initial BIFF decompiler dropped parentheses. | Do not introduce a correction for a nonexistent sign defect. Check formulas, parentheses, units and independent outputs before assigning a fix. |

Schedule tests should conserve principal and reconcile final centavos under the approved method rather than repeat rounded displayed installments. Canonical Ana/Ben/Cora inputs and independent arithmetic remain in the [historical freeze](AGAP_Product_Freeze.md#5-the-fictional-demonstration); do not create another baseline fixture registry here.

## Resolution and activation

Record the applicable institution/product/operation, authoritative source/version/effective date, approved interpretation, calculation method, and accountable policy authority before configuration. Aaron owns evidence/credit answers, Benedict decisions/servicing, Earl accounting implications, and Robert shared version/registration. Review affected contracts and independent financial expectations before integrating a change.

All questions above remain unresolved unless supported by an actual recorded institutional answer. Numerical 5C scoring, all-ten-product support, full reloan automation, contractual amendments, and member goals retain separate scope and acceptance. The supplied sources establish no approval weights, production release, or improved borrower outcomes.
