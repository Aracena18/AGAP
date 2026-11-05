# Experiment F fictional lifecycle compatibility proposal

5 November 2026. Authorized by the user's implementation request in this chat.
Tasks: QWN-01, AI-01, EVD-01, CRD-01, DEC-01, PAY-01, PLN-05,
FND-03 and SHOW-01. This proposal precedes executable contract changes.

## Scope and ownership

Implement a fictional principal-only end-to-end pilot and the selected PLN-05
staff-capacity workflow. Robert retains shared registration/client/configuration,
member UI and tracker ownership. The coordinated task assigns model/service work
to the Qwen slice, concern/review UI and persistence to the review slice, and
decision/servicing producers to the lifecycle slice, each in an isolated worktree.
These are implementation assignments, not independent owner or institutional
acceptance. Existing records, manifests and migration checksums remain intact.

## Additive contracts

Add separately versioned canonical schemas for qualitative model review,
priority review/concern/escalation/notices and the fictional lifecycle gateways.
Register exports, generated OpenAPI/client and capability flags centrally only
after their schemas and consuming services agree. Existing 0.2/0.3 responses and
historical snapshots retain their meaning. New decision snapshots preserve full
WorkflowAssessment and WorkflowFact semantics; no flattening of dates or horizon
totals into legacy monthly fields is allowed.

Experiment F reviews a question and 1–12 exact authorized excerpts. Its six-field
payload retains issue_code, evidence, finding, clarification_question,
review_status and loan_decision:null. It cannot supply financial fact inputs.
The single Qwen integration exposes baseline extraction and F review capabilities
with distinct prompt/schema/artifact provenance and one generation lock. A
checksum-bound fictional candidate configuration is explicitly unapproved and
is denied in production/real-record mode. Existing accepted-release checks stay.

Reviews bind source/text versions and exact submitted spans. The server resolves
source text; browser quotes, actors, materiality, authority or settlement are not
trusted. Concern checks retain actor/reason and material input bindings. Material
source changes stale review decisions; notice acknowledgment changes only notice
metadata. Queue, summary and consequential guards consume one readiness result.
Use PLN-05 precedence and two-group/waiting-time/ID order before pagination.

Decision/member acceptance and principal-only servicing use authoritative owner
ports, real authentication and fresh MFA, existing unit-of-work/replay boundaries,
and append-only history. Trusted simulation observations are server-generated and
cannot activate real money movement. Preserve identity -> material/config guards
-> accounting period -> ordered application/loan -> command/event lock order.
Producer reads must not acquire application row locks ahead of period locking.

## Runtime and verification

New workflows default off and activate only in an explicitly fictional pilot.
Add migrations rather than editing applied SQL. Register services/controllers
and member facade subsets centrally; never register test producer fixtures.
No model failure disables manual entry or clears financial/authority blockers.

The Azure pilot is one temporary A100 BF16 VM in Australia East, subject to renewed
sign-in, actual credit/quota and compatibility checks. Credits only; no upgrade,
paid fallback, public document/model/database listener or real records. Initial
sessions are at most two hours, four allocated GPU hours total, forecast below
the lesser of USD30 and available credit including ancillary resources.

Required evidence: canonical generation check; real DB/HTTP/browser lifecycle and
queue/privacy/retry/rollback tests; unchanged financial oracles; actual model and
scanner/OCR execution where available; baseline/F parity and failure evidence;
full npm checks/e2e, screenshots, graphify and truthful external blocker records.
Independent evaluation/receiving-owner acceptance remains pending until supplied.
