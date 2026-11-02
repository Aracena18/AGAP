# Source sufficiency assessment

**Conclusion:** the supplied cooperative materials are a good foundation for **dataset fields and workflow context**, but not a sufficient supervised-training corpus. They contain blank forms and policy text, not independently reviewed borrower interviews, complete 5C narratives or source-linked gold labels.

Eight files were inventoried locally. The application DOCX/PDF pair is one logical form in two formats. The large operations manual includes 20 operational templates in addition to its policy material. Source IDs, exact file hashes and limitations are in the [inventory](../sources/cooperative_inventory.json); originals are not redistributed in the preparation branch.

| Source material | Useful structure | Remaining limitation |
| --- | --- | --- |
| Application (COOP-02/03; manual XIX) | Membership, share/savings/refund, income source, requested amount/term/frequency, purpose, security | No detailed household expenses or timed cash-flow history; duplicate render does not add an observation |
| Manual credit investigation (XXVII) | Identity/address/income checks and investigation context | Specifically community co-maker Option B; not a universal borrower interview; no completed records |
| Consolidated evaluation (XXIX) | Checks, income/obligations, net/DTI fields and separate approval stages | Blank values; incomplete approved ratio rules and no worked 5C narrative |
| Schedule and disbursement templates (XXVIII/XXX) | Dates, scheduled components, deductions and net release | No approved populated schedule/calculation oracle; these are engine responsibilities |
| Salary/undertaking/hold-out/note (COOP-04–07) | Proposed security, restrictions, terms and contractual context | Some clauses conflict or require product/context clarification; credential/enforcement instructions excluded from AI targets |
| Post-collection evaluation (XXXVII) | Dated loan-position/history fields | No observed repayment labels or valid future-default target supplied |
| Privacy consent (COOP-08) | Existing lending/data-sharing categories | External AI processing/fine-tuning permission is not established by this template |

The [14-gap register](gaps.csv) covers household expense categories, gross/net/business distinctions, time and variability, missing/conflicting assertions, current-source checks, 5C narratives, collateral applicability, languages/images, independent evaluation and processing permissions. The [11-question policy register](policy_questions.csv) records discrepancies without choosing an authoritative interpretation.

The public supplement fills **structural and contextual gaps**, not missing borrower facts. CFPB tools provide relevant income/expense/debt/timing categories; BSP education and a CDA training report provide Philippine context. No reviewed public source supplies DCCPEC-approved interview answers or 5C labels. The audited Gretel sample is therefore excluded from core training rather than being assigned misleading loan outcomes.

The pilot provides 12 authored scenario families and 60 proposed task labels to make review concrete. P01 and P09 contain source observations under all five headings; other cases intentionally expose missing headings. All checked financial assessments remain unavailable. These are evidence-organization and clarification examples, not complete credit assessments. They require source/terminology and expert correction before training eligibility is considered.

Remaining material to obtain from the cooperative is small but essential: correct dated policy/product versions, accepted evidence alternatives, a corrected 5C format, and fictional worked cases with source documents and officer explanations. Do not substitute public national averages, generic credit outcomes or model-generated ratings for those missing approvals and labels.
