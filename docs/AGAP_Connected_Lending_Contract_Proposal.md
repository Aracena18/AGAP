# Connected lending: field-level integration proposal

5 November 2026 · FND-03 / EVD-01 / CRD-01 / DEC-01 / PAY-01 / GL-01 / ACC-01 / HLT-01 · Baseline `59351ce`

This proposal supplies the CL1 review input in the [implementation plan](AGAP_Connected_Lending_Implementation_Plan.md). It changes no canonical schema/version, persisted decision format or registered decision/money endpoint. The existing 0.3.0 contract remains executable. Actual consuming-owner acceptance is pending; none is prefilled. [Assignment.md](../Assignment.md) remains the tracker. The user authorizes implementation of the plan; institutional product/authority rules still need their real owners.

## Compatibility decision

New server-backed decisions should consume the complete authoritative [WorkflowAssessment](../packages/contracts/src/workflow.ts) and its immutable input commitment. Keep historical [decision-context](../apps/api/src/modules/decisions/context.ts) records readable with their original codec, figures and hashes. Do not flatten multiple cash dates or replace a horizon total with an inferred monthly result to fit older DTOs.

Proposed internal format name: `workflow-decision-basis/v1`; proposed persisted decision envelope: `decision-snapshot/v2`. These are review identifiers, not activated wire formats. Robert selects the canonical release/version and upgrade strategy with consumers before adoption.

| Field group | Proposed content | Authority / verification |
| --- | --- | --- |
| Application | Existing server application identifier, organization/branch/member, assigned officer, aggregate version and assessment-input version | Robert's application producer; never client authority |
| Exact assessment | Existing complete/incomplete WorkflowAssessment, engine, policy and input versions, exact reviewed horizon, all scenario checks and supplied totals | Aaron's saved assessment; check currentness before new consequential commands; never recalculate an old decision |
| Input commitment | Assessment ID plus SHA256 of its exact canonical immutable input snapshot; protected source/fact/policy bindings | Producer-owned read on the caller transaction. Hash equality establishes identity, not financial correctness |
| Facts | Existing WorkflowFact records: original ID/revision, relevance, explicit unavailable amount, every confirmed cash date, coverage, gross/net/period/deduction semantics and confirmation provenance | Aaron; retain source links and correction history. No fact splitting/averaging or inferred recurrence |
| Source commitments | Source/version/kind/date; original file checksum where one exists; statement-text checksum for an immutable statement; derived text/version checksum where applicable; retirement/clearance and independent-verification result | Aaron/Robert storage boundary; do not invent a document hash for a statement or treat file clearance as issuer verification |
| Policy and terms | Exact published policy ID/hash and selected permitted offer with all contractual installments, separate-fee amounts/dates, principal/net proceeds and validity | Aaron's product policy; copies of already supplied figures only. Missing financial conventions remain unavailable |
| Financial checks | All monthly segments, full-horizon net, minimum dated balance, shortages, actual/minimum values and stable check IDs; explicit mandatory versus policy-authorized exception treatment | Aaron owns check semantics; Benedict enforces approved human-decision policy without a second calculator |
| Lending authority | Versioned applicable policy reference, scope, participating identities/roles, active state, limits/quorum, exceptions and decision validity | Robert identity primitives + Benedict lending semantics + actual institution policy. No administrator shortcut or guessed limits |
| Conflicts | Per-participant current declaration/restriction and recusal/reassignment reference | Explicit human/institutional record. Missing declaration is unavailable, never automatically clear |
| Review readiness | Current human evidence-currentness confirmation; applicable source-linked concerns/checks; assigned escalation/disposition references and versions | Domain-owned projections. Manual fallback is explicit; no fabricated AI execution/check or clearance |
| Recommendation | Existing persisted recommendation identity/preparer/time, selected assessment/offer/material bindings | Benedict's actual stream; current recommendation ID cannot come from request JSON |
| Explanation/terms proof | Exact reviewed explanation/document bytes, document version/checksum, preview actor/request/basis hash and technical expiry | Benedict. Technical preview expiry differs from policy validity; no post-approval regeneration |

Store bounded source commitments and authorized references rather than duplicating every OCR page into new member-facing terms. Private review snapshots stay private; retained original assessment/source records must remain retrievable under approved retention rules. New versioned snapshots must include enough provenance to verify their commitments without exposing internal conflict/authority details to members.

## Producer operations to agree

| Producer operation | Proposed guarantee | Required tests |
| --- | --- | --- |
| Guarded workflow decision basis | Uses Aaron's owner API within the supplied transaction; validates complete current assessment, source/fact/policy/offer versions and references the immutable saved input | Multi-date, beyond-cycle, separate fees, gross/net/deduction, missing versus zero, verification and retirement changes |
| Current authority/conflict projection | Loads actual applicable scoped records and protects all participating writers through commit | Revocation/reassignment/config change during decision or release; no conflict declaration; insufficient quorum |
| Application transition | Owner operation preserves aggregate/input-version meanings and records allowed transition/history on the caller transaction | Workflow-only changes do not fabricate financial changes; material edits invalidate current review; stale/concurrent transitions fail |
| Member acceptance guard | Returns only own-member application/version/status, current material/recommendation and participant-clearance bindings | Current access precedes saved-result replay; new attempts check exact approved terms; no staff snapshot leakage |
| Release/financial configuration | Reuses stored accepted basis and applicable execution/component/account mappings; repayment financial guard does not reload household affordability | No second release; no unsupported fee or silent zero; future approved product changes preserve original contract |
| Support-position read | Checks current assigned support purpose and the loan/member/organization binding, returning dated posted facts plus freshness | Officer cannot gain cashier powers or another member's position; old captured submission view remains intact |
| Reporting inventories | Both servicing and ledger enumerate independently under the caller's authorized repeatable snapshot, with explicit completeness | Orphans/mismatches, concurrent commits, historical unknown recording times and coherent large-cohort paging |

Do not return consumer-shaped packets from HTTP JSON, read test context tables in production or cast a member/officer into another principal. A missing producer remains unavailable. The common transaction protocol must resolve source/config/identity locks and preserve accounting period → servicing application/loan → command ordering before connection; publishing interface types alone does not implement it.

## HTTP and client boundary

Reuse the [existing operation register](../packages/contracts/src/operations.ts) and generated-client mechanism. The member decision/acceptance routes already exist as facade operations; their default domain remains unavailable until an accepted producer/service is configured. Do not add a second parallel acceptance endpoint or a browser-supplied verified flag.

Before registering staff recommendation/decision/loan commands, propose public DTOs for the existing local [staff decision views](../apps/api/src/modules/decisions/staff-views.ts) and [loan workspace](../apps/api/src/modules/servicing/money-context.ts). They need explicit safe projections; private command bodies, original provider evidence and full staff snapshots are not automatic HTTP DTOs.

The record operation needs an exact preview proof. Propose a canonical request envelope containing `previewId` and the existing human decision request; do not remove preview validation to fit the older DecisionCreate request. Publish workspace, immutable history/document and preview operations with reviewed path names and normal scope/version/idempotency/error conventions. New public route names and canonical release remain unassigned pending that review.

Acceptance command semantics are already prescribed by the decision service: current identity/own-record authorization → exact committed retry resolution → current-term checks for a new attempt → one transaction. The CL0 continuation repairs the facade's incorrect read-before-command preflight and tests that ordering against actual decision persistence through HTTP; it does not enable a production decision producer.

The current Capabilities response already permits arbitrary module names. Additive namespaced entries identify delivered bounded slices (`servicing.member_loan_reads`, `accounting.principal_reconciliation`, `monitoring.payment_help`, `monitoring.follow_ups`) while broad unfinished module entries remain contract-only. These describe implemented application support, not actor permission, records present, institutional approval or production readiness. No schema/version change is required for these additional entries.

## Migration, fixture and review gate

Implement new codecs/additive database structures only after the technical field review. Never update existing immutable JSON bodies, document bytes or saved checksums to retrofit the new format. Test old histories, new histories and exact retries across upgrade; retain the historical reader and original terms. Support rollback by disabling new writes and retaining compatible data/codecs, not by deleting financial history.

M1 may configure one explicitly fictional principal-only product and a fictional policy/roster with separate authenticated participants. It must not rewrite Ana's historical interest-bearing offer, grant authority through the demo-role selector or become a production default. Existing money formats permit simulation only. M2 needs reviewed real-execution formats/intake, approved component rules and the institution's actual configuration before real operations.

| Actual review required | Decision to record | Current state |
| --- | --- | --- |
| Robert + Aaron + Benedict | Lossless assessment/input/source/terms representation and upgrade codec | Pending; technical proposal supplied |
| Robert + Aaron + Benedict + Earl | Shared writer/lock/version/event protocol and financial component boundaries | Pending; no agreement invented |
| Robert + Benedict | Public staff/member DTOs, preview proof and acceptance replay contracts | Existing replay boundary corrected/tested; new DTO/producer adoption pending |
| Benedict + Earl + Robert | Purpose-limited support position, reporting inventory completeness and permitted financial operations | Pending |
| Actual cooperative policy/accounting authority | Selected operational product, limits/quorum/validity/overrides, accounting/allocation/execution rules | Pending; fictional development can continue |

Approval records must name the actual reviewer, date, exact commit/contract version, accepted scope and remaining changes. Neither authorship of this proposal nor an AI technical review supplies another person's acceptance. No messages were sent to teammates and no institutional sign-off is claimed.


## CL1 technical adoption candidate — 5 November 2026

The user's subsequent request authorizes sequential implementation. The [CL1 candidate](tasks/production/connected-lending-cl1/IMPLEMENTATION.md) adopts the proposed lossless `workflow-decision-basis/v1` and `decision-snapshot/v2` identifiers, with canonical candidate 0.4.0. It retains the original v1 decoder and hashes. The dated scenario keeps common checked totals but explicitly nulls the legacy monthly figure, attaches the full original workflow scenario, and verifies aliases against that original. The private basis commits full saved inputs/facts/policy, bounded source commitments and actual confirmation provenance; it does not split cash dates or copy OCR pages into member terms.

The AI technical implementation/review is recorded against the isolated CL1 branch. It is not Robert/Aaron/Benedict/Earl's receiving-owner approval; those rows above remain pending until the named people actually review the version. New public DTO/route adoption, consequential review-readiness and normal-navigation gates remain CL2–CL6 work. The first configuration format is explicitly fictional/principal-only/simulation-only and cannot be represented as the later approved operational product. The documented coarse organization fence is an M1 correctness protocol requiring consistent registration and later throughput verification, not a measured production scaling claim.


## CL2 public review contract proposal — 5 November 2026

The [CL2 brief](tasks/production/connected-lending-cl2/IMPLEMENTATION.md) selects the existing safe workspace/history/brief/preview DTOs for canonical adoption and an explicit `{previewId, decision}` record envelope. It proposes normal scoped staff routes plus separate currentness/conflict/concern/assignment/disposition and own-recipient notice operations. New `connected-review/v2` metadata binds the actual monotonic review revision and immutable full-basis confirmation; historical v1 metadata remains readable without added defaults. Manual fallback is explicit and never substitutes for an unexecuted AI check. Concern dismissal or notice acknowledgment cannot override financial rules or complete escalation review. The brief supplies exact operation names and transaction/verification requirements before canonical edits. Actual named-owner acceptance remains pending.


## CL3 member terms and origination proposal — 5 November 2026

The [CL3 brief](tasks/production/connected-lending-cl3/IMPLEMENTATION.md) selects a separate checksum-verified own-member saved-document DTO and endpoint, optional narrow facade port, actual decision/acceptance registration, opening-version-bound acknowledgment and safe cashier-only pending-origination creation returning only a command receipt. Historical member projections remain unchanged; source-document routes are separate. Actual document identity and verified UTF-8 bytes precede new member acknowledgment; original successful retries remain recoverable after later changes. No member-selected financial actor, private authority packet, active posted balance or proof of funds is introduced. The existing fictional-only switch and pending institutional/receiving-owner gates remain.
