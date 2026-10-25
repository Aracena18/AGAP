# Evidence worker

Read AGENTS.md and docs/AGAP_Frontend_Spec.md, then this brief. No subagents. Own only `src/features/evidence/`, `src/domain/evidence.ts`, and `src/domain/evidence.test.ts`. Other workers own comparison and decision; root owns all shared modules. Commit your work on your assigned branch.

Inputs: shared CaseRecord/FactCorrectionInput/DemoActor types; fictional createDemoCases(); shared Button/Badge/Notice/Money; shared CSS tokens/global utility classes; `useWorkspace()` supplies actor, role and async saveCase(record).
Produce default `EvidencePage({ record }: { record: CaseRecord })`, plus:
`applyCorrection(record: CaseRecord, input: FactCorrectionInput, actor: DemoActor, at: string): CaseRecord`.
Throw readable validation errors. Officer only. No mutation of input; increment record.version; retain old/new fact and source in corrections; retain decisions unchanged so current version is stale. Validate finite safe nonnegative integer money, valid date, source reference, source kind (document-supported cannot use statement), reason required; missing value remains null and source null.

UI: use compact page heading, main evidence facts grouped into income, everyday expenses, existing obligation and opening balance, source detail panel alongside. Show source/date/status. Conflict UI clearly compares old ₱28,000 worksheet and current ₱24,000 payslip; user explicitly chooses/edits, source, status, effective date and reason before saving. Selecting current source should help fill current candidate value/date, not auto-resolve. Inputs use PHP units; convert exactly to centavos, reject more than 2 decimals. Read-only reviewer role with explanation of role-specific actions. Per-field errors, no reliance on alerts only. Corrections history expandable and source text readable. All documents fictional. Missing Cora income can be clarified with a member statement; offer existing statement source. Keyboard accessible. Save errors visible.

Use shared components; feature CSS Module owns only layout. Source panel width ~330px; stack under main at narrower widths. Financial numbers aligned. Navigation action to `../comparison` only after complete evidence, otherwise display relevant pending action without trapping navigation. Routes are /applications/:id/evidence|comparison|decision. Parent shell supplies member identity and navigation.

Tests first for financial input correction, required reason, immutable history and snapshot, invalid data/role/source/date. Add a focused React interaction test (mock useWorkspace; use MemoryRouter for links) if practical. Do not change dependencies/config/shared types. Use real domain behavior. Run targeted tests and report whole-suite status; known root work may be changing storage.

Coordinate via root for contract problems. Review your diff. Report commit hash, owned files, tests, and remaining concerns. Do not touch root working tree or cherry-pick others unless root instructs.
