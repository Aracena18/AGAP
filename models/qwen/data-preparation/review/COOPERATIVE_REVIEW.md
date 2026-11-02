# Cooperative validation packet

This packet is ready for **review of structure and candidate examples**, not ready for fine-tuning. The supplied eight files provide useful application, membership, security and workflow structure, but mostly blank templates rather than completed examples. The manual also contains credit investigation, consolidated evaluation, amortization, disbursement and post-collection forms; those structures were included in the inventory. The DOCX/PDF application pair represents one logical form, not two independent observations.

## Material to review

| Material | Review requested |
| --- | --- |
| [Source inventory](../sources/cooperative_inventory.json) | Confirm correct approved versions and permitted project use |
| [Field dictionary](../spec/field_dictionary.csv) | Mark relevant/irrelevant fields and acceptable evidence alternatives; correct terminology |
| [5C protocol](../spec/FIVE_C_PROTOCOL.md) | Confirm headings, expected narrative and evidence limits; provide corrected fictional worked examples |
| [Policy questions](policy_questions.csv) | Resolve each discrepancy with authoritative document/version and context |
| [Gap register](gaps.csv) | Confirm missing household-income/cost/timing requirements and product applicability |
| [Printable casebook](CASEBOOK.html) | Review the visible source and every proposed response; reject invented or unnecessary questions |
| [Annotation sheet](annotation_sheet.csv) | Record individual task corrections, checks, reviewer and date; do not mark a whole corpus accepted without examining targets |

Open `CASEBOOK.html` in a browser and use Print → Save as PDF if a shareable review copy is needed. The source IDs and task IDs match the annotation sheet. All cases are visibly fictional; examples of missing data and disagreement are intentional.

For each task, use disposition `accept`, `revise` or `reject`. Explain corrections in plain language and identify the source supporting any replacement fact. Complete `source_check`, `5c_check` and `boundary_check` with `pass`, `fail` or `not_applicable`, plus reviewer and ISO date. Leave items pending if authority or evidence is unresolved. These review entries do not automatically promote examples to training eligibility.

Please check that questions are understandable and necessary; amounts/dates match the visible source; missing values stay unavailable; payroll obligations are not counted twice; old/expected income is not current cash; no personality verdict is inferred; restrictions and product applicability remain explicit; and a 5C draft does not supply an approval, computation or authenticity verdict.

## What public sources can and cannot close

The six [CFPB household-finance tools](https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/) provide useful structural ideas for cash receipts, expenses, dates, debts and non-monthly events. Their question categories are adapted into original fictional examples. They do not provide local member facts, applicable loan policy or completed 5C labels. No US benefit program or numeric threshold is imported.

For local context, [BSP's education index](https://www.bsp.gov.ph/Pages/InclusiveFinance/FinancialEducationLearningModules.aspx) covers planning, budgeting and debt management. A [CDA training report](https://cda.gov.ph/updates/csf-cooperatives-elevate-expertise-on-loan-evaluation-and-credit-appraisal/) describes the same five C headings in a CSF-cooperative training setting. These are contextual references, not an approved DCCPEC rubric or labeled dataset; their source text is not copied into the pilot.

A small [Gretel public synthetic-finance dataset](https://huggingface.co/datasets/gretelai/synthetic_pii_finance_multilingual) sample was audited. It has synthetic foreign document types and PII-span labels; these do not fill the missing officer-assessment labels. Its metadata audit is retained for traceability and the rows are excluded from this pilot. We have not relabeled loan outcomes from public credit datasets as expert assessments.

## Completion criteria for the next release

The cooperative returns resolved or explicitly deferred policy questions, an accepted field/question structure, corrected fictional examples across all five Cs, and dated review entries. A policy question that remains deferred must remain outside training targets that assert a definite rule. A sample with unresolved contradictory facts may remain as a reviewed **clarification** example, rather than being given an invented answer.

Benedict incorporates corrections in a versioned candidate release. Earl accepts corpus ownership, adds independent scenarios/documents, checks labels against the underlying fictional truth and freezes grouped training/validation/holdout manifests. Robert/Aaron review any shared extraction/provenance or 5C output extension before integration. These are distinct reviews; cooperative policy validation does not substitute for independent model evaluation.

For expansion, an initial planning range is 100–200 diverse fictional families with multiple tasks per family, adjusted after review and baseline errors. This is an effort estimate, not a statistically sufficient sample-size claim or model-quality guarantee. Include salaried, self-employed and seasonal income, clear and incomplete records, corrections, zero/unknown distinctions, costs across time and applicable security alternatives. Do not scale one template into hundreds of near-duplicate rows and call that diversity.

No training or Colab GPU session is necessary to review this packet. Once the corrected corpus and splits are accepted, run the pretrained baseline before a small L4 LoRA experiment. Keep final holdout labels outside the trainer's workspace.
