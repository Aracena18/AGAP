# Member platform contract proposal — FND-03

26 October 2026. Robert's implementation proposal, written before canonical edits. The user authorized autonomous work on Robert's assignments. Version **0.2.0 is a candidate**, not a claim of consuming-owner agreement or live readiness. [Assignment.md](../Assignment.md) remains the sole status tracker.

## Member identity and intake

Add a separate `MemberActorContext`, member cookie/session and explicit trusted issuer/subject-to-member linkage. Do not add members to staff roles. Operator-only private reviewed inputs provision/revoke links, preserving verification references and audit; members cannot link themselves by ID, phone or upload. Authenticated member transactions recheck and lock the active link/session, set own-member RLS context and expose only that member's projections. Staff and member sessions do not authenticate each other's endpoints.

Add member-owned application draft creation/read/edit/submission to Robert's existing applications boundary. A member submits no member/organization/officer identity fields. Intake applications may be unassigned until an authorized staff assignment; `assignedOfficerId` therefore becomes nullable. Add a `submitted` intake state; member edits stop after submission, while authorized staff can assign the submitted request. Preserve versions, independent assessment-input versions, idempotency, revision history and uncertain-result retry semantics.

## Domain handoffs and model provenance

Add reviewed typed member-domain ports/projections for Aaron's cleared source uploads/drafts/confirmation and checked options, Benedict's decisions/loans/receipts/acceptance, and Earl's confirmed support submissions. Robert's facade authorizes own records and delegates; it does not implement their financial or evidence rules. Missing implementations return explicit unavailable states/501 errors, never an empty loan list, fabricated approval or successful upload. Tests may inject clearly fictional ports; runtime defaults remain unavailable.

Define source/version-linked draft and confirmation schemas, dated irregular-expense inputs with explicit unknowns/assumptions, and pinned Qwen model/artifact/prompt/schema/evaluation provenance. These are shared interfaces for owners to review, not a trained model, automatic source verification or a second calculation engine. EBM research has no operational member route.

## Portal and reminders

Add generated own-record API methods, server-saved member drafts and versioned reminder preferences. The phone portal presents Apply, Track application, View loan and Get payment help, with source confirmation and cost/acceptance views supplied by domain ports. Due notices require a dated authoritative loan projection; unavailable data cannot become a zero balance or an invented due date. Support submission does not amend terms.

Keep all new migrations append-only; preserve financial fixtures/calculations. Verify real runtime-role isolation, revocation and expiry, signed OIDC flow, CSRF, duplicate/stale commands, original histories, 320px/keyboard/error states and missing-domain behavior before integration. No teammate acceptance or production policy is invented by this proposal.
