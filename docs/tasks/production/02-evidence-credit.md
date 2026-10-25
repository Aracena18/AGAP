# Aaron (B): evidence and credit

Tracker: [Assignment.md — Aaron](../../../Assignment.md#aaron). Record handoffs in this brief for Robert to incorporate into the central tracker.

Read the [product priorities](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery plan](../../AGAP_Delivery_Plan.md) and root AGENTS.md before implementation. Follow [design.md](../../../design.md) for UI; this brief does not define a second visual system.

## Work packages and ownership

Own EVD-01 and CRD-01. Own the evidence/comparison/products UI, existing evidence and assessment domain modules/tests, and backend evidence/credit modules listed in the delivery plan. Take finance-package ownership only after A's agreed extraction handoff. Do not modify shared types, fixtures, app wiring, generated clients or dependencies directly.

Implement source/file references, fact revisions, nullable/unavailable states, staff corrections and verification attempts. Provenance, file scanning and independent verification are different states. A questionable document is not automatically fraud. Reuse A's authorized document-storage interface.

Implement versioned products, permitted offers and policy checks. Distinguish configured eligibility, calculated affordability and human decision authority. Generate contractual schedules only from approved formula/rounding inputs; retain their versions. Do not infer missing circumstances or manufacture an available alternative.

Keep authoritative calculations pure and deterministic. Preserve integer-centavo/date rules, avoid payroll double deduction, distinguish opening cash from monthly remaining, and show dated shortages plus full-term costs. Explicitly label model horizon and stress assumptions.

## Acceptance and handoff

- Existing independent Ana/Ben/Cora arithmetic remains valid without a duplicate fixture registry.
- Test exact input conversion, rounding residuals, principal conservation, dates/holidays per configured rules, costs/fees, unavailable offers and unsupported/missing inputs.
- Verification/fact changes invalidate affected assessment inputs and keep old decisions intact.
- Compare schedules with equal visibility for monthly remaining and the dated minimum; explain an overall shortfall without presenting a date change as a remedy.
- Publish the checked assessment/offer interfaces and test evidence for C/D. All integration uses A's contract/client; propose interface changes in this brief/PR for Robert to record in Assignment.md.

External credit access, AI extraction and new live product policies need their own approved interfaces and evidence. They are not implicit functionality of a document upload.

## Progress and handoff notes

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.
