# Response guidance — implementation proposal

5 November 2026, Asia/Manila. User-authorized implementation of the reviewed response plan; base `785d455`, branch `codex/ai-response-guidance`. This proposal precedes canonical edits.

Robert supplies additive guidance schemas/client operations and member/shared presentation. Evidence persistence and staff adapters remain Aaron's domain; this isolated integration candidate does not edit any existing worker checkout or transfer ownership. Benedict's model payload, inference budgets, release gates and saved decisions are unchanged. Receiving-owner acceptance from Aaron/Benedict and Earl's independent usability/model evaluation remain pending; agent checks are technical review, not those people's approval.

- New member/staff application guidance reads return versioned typed questions tied to existing draft/source/text versions, proposed values, freshness and permitted actions. Existing workflow and model response shapes remain compatible.
- New scoped clarification commands store answered/unknown/declined events separately from facts and draft acceptance. A guidance revision protects concurrent answers; application/source versions protect changed context. Stable keys reconcile uncertain writes. No financial input version changes until the existing explicit fact-review command.
- Source changes retain old events but invalidate their current applicability. Previously answered/declined questions remain inspectable, not repeatedly requested. Qualitative staff concerns never automatically become member requests.
- One focused typed question at a time; member language differs from staff detail. Final confirmation uses the existing canonical fact-review command; incomplete responses route to staff without fabricated values.
- Immutable clarification history uses existing scoped transaction/security boundaries. Model extraction, calculation, verification and human decision authority remain separate.

Verification and actual completion belong in the existing tracker/UI verification records. No real-record deployment, model promotion or representative acceptance is implied.

Technical review refinement: existing WorkflowDraftReview adds optional guidanceVersion for compatibility with untouched drafts. Once a draft has saved clarification events, final confirmation must provide the current guidance revision; the application row lock checks that revision atomically before financial input changes. Omitting it cannot bypass renewed review. Explicit question refresh retains unfinished input; transient read errors preserve that form, while access denial clears it.
