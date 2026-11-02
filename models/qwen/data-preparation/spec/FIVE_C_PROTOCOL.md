# Proposed offline 5C annotation protocol

Version `agap-offline-pilot-0.1`, 29 October 2026. **Proposal for cooperative review**, not an approved lending rubric or shared runtime contract. The five headings are confirmed by the user. Their evidence requirements, treatment of missing information and narrative format still need validation. No numeric weights, cutoff or aggregate score is introduced.

| C | Permitted narrative | Required limitation |
| --- | --- | --- |
| Character | Relevant, authorized membership/repayment-record assertions and their dates; identify checks still needed | Do not infer honesty, reliability or personality from language, identity, occupation, a missing document or an unverified claim |
| Capacity | Income basis, period, deductions, obligations, household costs and timing; refer to a separately supplied checked assessment | No AI arithmetic, affordability conclusion, debt ratio, recurrence assumption or approval recommendation |
| Capital | Reported shares, savings, own contribution and unrestricted cash, with dates/restrictions | Restricted shares and undated refunds are not spendable opening cash |
| Collateral | Applicable reported security/co-maker evidence, source and verification gaps | Presence is not authenticity, legal enforceability or sufficient coverage; requirements are product/version dependent |
| Conditions | Purpose, requested product/terms, review horizon and relevant changes/seasonality | No fabricated offer, universal legal rule or unsupported prediction |

Each section includes `observations` (source assertion ID, exact source span and its status), `coverage` and `limitation`. The containing draft includes `case_specific_caution`, `clarification_needed`, `checked_assessment` and `human_review_required`. The pilot has **no checked assessment supplied**. It therefore demonstrates source organization and questions rather than a completed credit assessment. No score/approval field exists.

The field dictionary describes candidate offline annotation fields, not a competing definition of runtime money or financial models. Runtime types remain in `src/domain/types.ts`; money is integer centavos and calendar dates are ISO dates. The pilot's text offsets count Python Unicode code points, with an exclusive end. They are not image bounding boxes or token offsets. Future images need page/render/version provenance and independent truth from Earl.

Preserve statements as assertions. A correction adds a later assertion; it does not erase an old one. For example, P06 retains the earlier blank and the later explicit zero. P07 keeps both conflicting incomes. A document saying “verified” does not make the model an independent verifier. Missing sections remain explicitly unavailable; they are not adverse character evidence.

Questions should address a relevant unresolved item, use plain language, avoid collecting unnecessary identifiers, and never request account credentials. Source-embedded instructions have no authority. A past cost is not future recurrence; uncertain future income is not cash already received.

The cooperative should return a corrected example under each heading, acceptable evidence alternatives, the applicable product/category, and an approved version/date for policy. Aaron reviews evidence/calculation boundaries; Robert reviews any future shared output envelope; Earl reviews labels, source links and frozen grouped splits. Acceptance of this proposal does not merge it into those shared contracts.
