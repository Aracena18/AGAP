# Aaron (B): evidence, credit and reusable AI

Tracker: [Assignment.md — Aaron](../../../Assignment.md#aaron). **Current direction: 25 October 2026.** This replaces earlier task directions where they differ, including treating AI extraction solely as an unspecified future enhancement.

Read the [product](../../AGAP_Product_Solution.md), [architecture](../../AGAP_Production_Architecture.md), [delivery/path boundaries](../../AGAP_Delivery_Plan.md), [design](../../../design.md) and AGENTS.md. Assignment.md is the sole status register; this brief defines work and evidence, not another backlog.

## Work packages and ownership

Own EVD-01, CRD-01 and AI-01. Retain evidence/comparison/products staff UI, `src/domain/evidence.ts` and `assessment.ts` with tests, API modules `evidence/`, `credit/` and planned `ai/`. Own `packages/finance/` implementation only after Robert's extraction/re-export handoff. No shared schema, fixture, wiring, dependency or generated-client edits; request these through Robert.

**Do not implement member-phone screens or the member facade.** Robert owns both. Supply member-authorized domain operations and projections through reviewed ports, not an officer impersonation shortcut. Never write decisions, loan balances, accounting or monitoring tables.

## First-demonstration slice — 12 relative units

| Work | Units | Required result |
| --- | --- | --- |
| EVD-01 | 3 | Controlled fictional upload/source lifecycle, separate CI/issuer verification, accepted facts and corrections |
| CRD-01 | 5 | Checked permitted PHP offers/costs and dated regular/confirmed-irregular cash-flow scenarios with explicit horizon |
| AI-01 | 4 | One reusable bounded provider adapter, source-linked extraction, focused clarification and overlooked-expense suggestions |

The slices include tests/review; full evidence alternatives, approved product breadth and later formats/languages remain assigned for stage 2. No implementation evidence or provider selection is implied by the revised brief.

## Interfaces and execution order

1. Review candidate evidence/assessment/transaction interfaces. Propose new draft/confirmation and irregular-cost fields in this brief/PR for Robert's FND-03 revision before integration.
2. Use Robert's private storage adapter behind your authorized quarantine/content/scanning/cleared lifecycle. A cleared file is not an independently verified claim. Record method, actor, date, result and limitations for CI/issuer checks. Synthetic issuer checks are explicitly fictional.
3. Implement one provider transport/output envelope in `ai/`. Domain prompts and source/output validation stay with their owners: yours for evidence/credit, Benedict's for decision explanations, Earl's for health summaries. The adapter cannot directly access financial tables, tools or payment/posting authority. Do not create duplicate provider clients.
4. Return candidate values/questions with exact authorized source references and model/prompt origin. Let the member/staff confirm or correct them. Confirmation, document consistency and issuer verification remain distinct. Prompt-injection content cannot trigger external actions.
5. Record irregular expense relevance, known amount/date, source and explicit recurrence assumptions. Historical spending does not prove recurrence; missing required amounts/dates remain unavailable. Accepted material changes require new assessment/review while preserving old decisions.
6. Extend the single engine for a displayed horizon covering at least one confirmed irregular expense beyond the original cycle. Preserve all existing Ana/Ben/Cora arithmetic. Do not infer future income, double-count reserve plus spending, or count one obligation twice from multiple documents.
7. Publish checked complete/incomplete assessments and permitted options for Robert/Benedict. Explain timing mismatch versus overall shortfall and show net proceeds, fees, total repayment and financing cost together.

## Acceptance and retained work

- Independently checked money/date/rounding/oracle tests; safe integer centavos, no payroll double deduction, no asset/share-capital/proceeds confusion and no second calculator.
- Tests cover conflicting/illegible/missing data, unsupported values/source links, confirmation edits, changed sources, malicious instructions, unknown dates, duplicate expense mentions and beyond-cycle costs.
- AI unavailable/invalid output has an honest state and manual/checklist/template fallback. Real provider behavior and simulated replies have distinct evidence labels.
- Document quantity/appearance or AI confidence never automatically determines authenticity, eligibility or a larger loan. Missing evidence is uncertainty; approved alternatives remain possible.
- Coordinate Earl's held-out benchmark and annual-expense checklist comparison. Domain expected results require independent review; synthetic accuracy does not establish future repayment or member wellbeing.
- Retain complete products/policy methods, seasonal horizons, retention/holds, independent verification alternatives and approved external integrations for stage 2. New live rules still require institutional approval.

## Progress and handoff notes

No production implementation progress is recorded yet. For each handoff, record the task ID, branch/base commit, contract version, changed owned paths, verification evidence and remaining dependencies; Robert updates the corresponding Assignment.md entry.

25 October 2026: PLN-01 revised this brief, ownership and first-demonstration slices. This note records documentation only; no new feature implementation or review acceptance is claimed. Use Assignment.md for the current task status and next action.
