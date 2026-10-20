# Decision worker

Read AGENTS.md and docs/AGAP_Frontend_Spec.md then this brief. No subagents. Own `src/features/decision/`, `src/domain/review.ts`, `src/domain/explanation.ts`, and corresponding tests. Shared types/CSS/config belong to root.
Produce default `DecisionPage({ record }: { record: CaseRecord })`.
Domain functions:
`makeRecommendation(record, offerId: string, note: string, actor: DemoActor, at: string): CaseRecord`
`validateDecision(record: CaseRecord, input: DecisionInput): DecisionValidation`
`recordDecision(record, input, actor, at): CaseRecord`
`recordFollowUp(record, reviewDate: string, note: string, actor, at): CaseRecord`
`buildExplanation(snapshot: DecisionSnapshot): ExplanationDraft`.
Use explicit types in implementation. Root will send assessment implementation commit to cherry-pick; assessment interface is assessCase(record). You can start UI/domain tests meanwhile, but use the real assessment before declaring complete. Commit review/explanation modules before final UI and send hash to root for comparison worker.

Rules:
- recommendation officer-only, available offer, complete assessment, required note; increments case version and stamps resulting version. Does not mutate original or snapshots.
- final decision reviewer-only; mandatory rationale, valid reviewDate >= record.periodEnd, explanationReviewed. Approve/decline require complete assessment and current officer recommendation. Return permits incomplete case and no recommendation; requires clarification rationale.
- approving different offer, declining officer recommendation, or returning it requires departure reason where a current recommendation exists.
- approval of failing policy checks requires explicit exception for each failing ID (monthly-capacity, cash-timing) with nonblank reason. Critical evidence gaps cannot be overridden. Only available offers. Explain validation by field.
- frozen snapshot contains evidence, sources, offers, recommendation, input, assessment, recordedAt and reviewer. Build template explanation then preserve it on snapshot. source references use source IDs.
- recordFollowUp saves valid date and small note; doesn't revise evidence/snapshot.
- subsequent evidence/recommendation versions visibly mark old decision as needing review; printable historical snapshot remains unchanged.
- Don't present browser recordkeeping or demo role switch as secure authentication/audit.

UI: recommendation/assessment summary then reviewer form. Show officer role message plus useful read-only info; global role switch in shell.
Outcome radios approve/decline/return, chosen offer when applicable, rationale, conditional departure and policy exception fields, review date, preview template explanation, explicit reviewed checkbox, final record button. Text must explain actual unavailable prerequisites. Return must remain usable for Cora.
After record show printable member brief with full offer cost, assumptions, source citations, concerns, next step, review date; staff details/history available. Print uses saved snapshot only, all screenshell hidden in print. Historical decision selector if multiple; old version clearly dated and labeled. Follow-up note form below, hidden in print.
Template is deterministic, labeled. No AI mock badges or API. Include cash timing vs monthly difference; no guarantee/avoid-default claim. Print source titles/dates not unresolved IDs alone.
Shared Button/Badge/Notice/Money, CSS Module, semantic labels and errors. Context useWorkspace supplies role, actor and async saveCase. Props record:CaseRecord. Parent shell/member nav owned by root.

Test first: required rationale/departure/exception, unavailable offer, no override of incomplete data, role checks, stale recommendation, deep snapshot immutability, template costs/source mapping/return wording, follow-up does not change prior explanation. Test real assessCase once root supplies it. Run targeted and full suite; report commits/tests/concerns.
