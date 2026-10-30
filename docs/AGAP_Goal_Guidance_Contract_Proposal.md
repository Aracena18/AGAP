# Goal and guidance contract proposal — FND-04

30 October 2026, Asia/Manila. Robert's field-level proposal for the existing goal-guidance scope, based on main `266379ac293572de91a603a72c1a01750a1c3101`. **Status: ready for receiving-owner review; no executable contract, route, service, database, UI or model changes.** Contract 0.2.0 remains a candidate. Preparing this proposal before FND-03 acceptance does not authorize dependent implementation or expand the stage 2 budget.

The [product requirements](AGAP_Product_Solution.md#member-goals-savings-and-cooperative-product-guidance), [architecture](AGAP_Production_Architecture.md#goal-guidance-flow-and-proposed-fnd-04-boundary), [delivery ownership](AGAP_Delivery_Plan.md#additional-goal-guidance-packages) and [design](../design.md#11-planned-goals-savings-and-product-guidance-29-october-2026) govern behavior. [Assignment.md](../Assignment.md) is the sole status tracker. This document supplies proposed contract semantics, not a second UI guide or policy catalogue.

## Common proposal conventions

Both this proposal and [FND-05](AGAP_5C_Review_Contract_Proposal.md) reuse the canonical [schemas](../packages/contracts/src/schemas.ts), [ports](../packages/contracts/src/ports.ts), generated client/operations and normal command semantics when implementation is agreed. The record/operation names below are proposals, not exported TypeScript symbols or registered HTTP routes. Do not allocate an executable version number in documentation or add competing schema files.

| Existing primitive or boundary | Proposed use |
| --- | --- |
| `Id`, `Version`, `Currency`, `CalendarDay`, `Instant` | Server-owned identities/revisions; PHP; calendar planning dates versus recorded instants |
| `FactValueSchema`, `MoneyAmount`, `SignedMoney` | Recorded or explicitly unavailable input money; nonnegative amounts versus signed checked balances. Every monetary value is integer centavos within safe bounds; no missing-as-zero conversion |
| `SourceReferenceSchema` | Authorized source ID/version/excerpt and optional page; a recorded member answer needs its own source reference, not an invented document citation |
| `ModelArtifactSchema` | Exact base/artifact/prompt/schema/dataset/evaluation origin for an actual model draft; it is provenance, not proof of runtime eligibility or capability accuracy |
| `MemberActorContext`, `ActorContext` and their unit-of-work boundaries | Server-established member scope or an explicitly authorized staff operation; client-supplied member/organization/reviewer IDs cannot grant authority |
| Command receipts, version preconditions and stable idempotency | Reuse the existing command/retry/error envelope. Same-key/same-input retries replay one result; changed-input key reuse conflicts; an old expected version cannot overwrite a new plan |
| Available/unavailable service views | Missing implementations, unknown facts and an empty authorized result have different meanings. Preserve the established unavailable response instead of fabricating a successful write or a zero balance |

Members authorize their own records through current linkage on every read/write/download. Staff assistance uses an explicit authorized staff operation, recorded assisting actor and member-confirmed choices; it must not impersonate a member or inherit advisory authority from an administrator role. The precise assisting/advisory permission mapping is a receiving-owner and institutional input; do not invent a new role or default permission.

Existing `AiDraftSchema` carries one source and a monetary fact value. Do not overload it with multi-source guidance or rubric results: the later domain-specific envelopes reuse source/provenance primitives and checked-run references after review. A score never goes into a money fact field.

## Proposed records and ownership

| Record | Required fields and meaning | Authoritative owner |
| --- | --- | --- |
| Goal revision | `id`, `version`, server-bound member, member-selected `purpose`, `target` using FactValue, nullable `targetDate` with explicit unresolved issues, flexibility/priority, `state`, recorded/confirmed dates and source-linked `dedicatedFunds`. Purpose includes emergency, planned expense, travel, leisure and member-defined text without moral labels | Earl, monitoring/GOL-01 |
| Guidance choice revision | Goal reference/version, notice/purpose version, selected permitted data reuse/sharing, member confirmation, assisting actor if any, effective/withdrawn time and next permitted use. This records voluntary choices; it is not a blanket privacy waiver or a loan-eligibility signal | Earl, monitoring |
| Household basis | Immutable `basisId`/hash, as-of date, modeled start/end, accepted fact/source versions and confirmation dates, relevant dated loan-position freshness, explicit reserve/recurrence assumptions and known issues. Distinguish confirmed absence of a loan from unavailable servicing data | Source-owned projections; Aaron binds the credit planning run |
| Planning allocation | Goal/fund reference, accessible amount, source/date, existing commitment/reserve reference and treatment. A planning earmark reduces unallocated discretionary funds once; it is neither a bank hold nor a journal. Alternative scenarios are mutually exclusive comparisons, not simultaneous commitments | Aaron, credit/CRD-02; Earl references the chosen plan |
| Checked planning run | `id`, basis/goal/choice revisions, engine version, as-of/horizon, member-confirmed contribution dates, explicit `returnAssumption`, catalogue versions only if needed, calculation trace, issues and result below. Exact money/date outputs belong to credit | Aaron, credit |
| Catalogue version/candidate | Institution/product/version/source, approval/effective/expiry state, availability/eligibility, minimums, dated fees, contribution/withdrawal rules, liquidity/lockup, capital-loss risk and reviewed return disclosures. Absence of a catalogue does not block a no-product baseline | Aaron, products/credit |
| Guidance draft | `id`, goal/choice/basis/run references, origin (`model`, `template`, `simulated`), eligible model provenance when origin is model, approved content versions, relevant catalogue references, source/figure references, explanation/questions and draft/review/publication state. Unsupported statements require correction/rejection; source/schema validity alone is insufficient semantic review | Earl, monitoring; calls Aaron's single adapter |
| Suitability review | Draft/run/goal/basis/catalogue/content versions, product scope, reviewer and server-checked advisory permission, review outcome/reasons, alternatives including no action, risks/costs and validity/review date. Member horizon/liquidity/loss-preference inputs must be current and proportionate; unavailable required inputs prevent personalized product advice | Earl, monitoring with an institution-authorized reviewer |
| Plan choice/progress event | Goal revision, chosen current run/guidance, member acknowledgment or pause/withdraw/revision choice, recorded actor/time; progress uses explicit money availability, source/as-of date and `member_reported` versus linked external record origin. Reported progress is not a posted deposit or measured wellbeing outcome | Earl; Robert displays the own-record projection |

The first slice enforces one active goal under concurrent commands. Draft unknowns may be saved without generating a complete plan. A target/date changes only through a recorded member choice; a service must not adjust it silently to obtain a feasible result. Pausing/withdrawing stops the applicable voluntary processing/sharing without rewriting historical review records; retention/deletion follows separately approved rules. Multiple active goals and pooled allocations need later explicit allocation acceptance before activation.

## Checked result and publication states

Keep three independent dimensions: goal lifecycle (`draft`, `active`, `paused`, `withdrawn`, `completed`), planning result and guidance review/publication. A chosen plan is not a financial transaction; a reported completed goal is not proof of a balance or household outcome.

| Planning result | Allowed output |
| --- | --- |
| Incomplete | Nonempty field/source/date issues; unavailable affected contribution/completion values. Retain confirmed partial facts without assuming recurrence, future income, available loan position or zero fees |
| Infeasible under recorded assumptions | Checked required versus modeled-available contributions, dated shortfalls and reasons where determinable; no invented affordable option, target/date change or guarantee |
| Conditional scenario | Required versus modeled-available contribution schedule, protected needs/reserves, dated cash effects, projected completion, assumptions and limitations. An already-met target explicitly allows zero remaining contribution without dividing by zero; zero future contribution dates cannot fund a positive gap |

The first baseline uses an explicit no-return assumption; it must not serialize missing product-return data as a known zero. Any later uncertain-return scenario states inputs, fees/liquidity/loss conditions and horizon separately, and cannot require promised gains to conceal a cash shortage. Longer horizons need explicit future movements/recurrence assumptions. Independent expected results must cover centavo remainder, duplicated reserves/payment, restricted capital, shared balances and dates beyond the original one-cycle oracle.

General budget/goal drafts may be member-visible with a draft label and correction route. Personalized investment draft bodies are **staff-only** until the scoped suitability review passes for the current versions. Pending member projections expose only review status and neutral approved educational/product facts. A chosen plan never opens an account, takes deposits, executes investments, transfers money or changes a loan. Member goal choice, leisure purpose, refusal or silence does not become credit/support ranking data.

Propose distinct `reviewRequirement` (ordinary draft or investment suitability), `reviewStatus` (not required, pending, accepted or declined) and current/stale/expired validity. The backend derives the requirement from the actual requested content and approved catalogue classification, not a model/member-supplied flag; investment suitability cannot be not-required. Derive the member projection from those checked states instead of accepting a client-authored publication state. Accepted but stale/expired investment advice cannot be selected as current advice; historical snapshots retain their original review and limitations.

## Proposed operations and transaction boundaries

| Operation | Actor/input and result | Boundary and required checks |
| --- | --- | --- |
| Save goal/choices; pause/withdraw; record progress | Linked member or explicitly authorized assisting staff; expected version, bounded changes, notice/confirmation and stable command key → canonical receipt/current own-record goal | Earl owns records; Robert's facade establishes scope and delegates. Enforce one active goal and distinct unavailable progress; no servicing/accounting writes |
| Calculate goal scenario | Authorized current goal/choice and immutable source-owned basis, contribution dates, horizon, allocations and explicit return assumption → checked run/result/trace | Aaron's same engine. Validate basis/current versions and all independently required amounts/dates; expose incomplete/infeasible/conditional result without allowing caller-authored calculated outputs |
| Read approved catalogue candidates | Current run and proportionate product preferences → available approved candidates, known none, or unavailable catalogue | Aaron checks current institution/product scope, fees/liquidity/risk/expiry; no default product steering or assumed catalogue |
| Prepare guidance draft | Minimum authorized checked context and approved references → bounded validated draft or template/unavailable response | Earl owns prompts/validation; capture basis in a short authorized transaction, call AI outside database/financial locks, then re-enter to recheck basis and save. Changed basis yields stale/renewed review, not a current accepted draft |
| Review product-specific advice | Appropriately authorized reviewer, exact draft/basis versions and reason → recorded review outcome with scope/validity | Earl verifies actual advisory permission and current suitability inputs; no member self-review, implicit admin authority or model-based approval |
| Read/choose current plan or guidance | Linked member, current own-record projection and acknowledged version → recorded voluntary choice | Robert applies a member-safe allowlist; omit unreviewed investment body/staff notes. Recheck current source/goal/position/catalogue/content versions and review expiry on reads/choice, not only eventual invalidation events |

Only the owning module writes its tables. Share the appropriate existing transaction for each command; domain deduplication and current-version checks are required even behind the facade. Failed/unknown submissions use existing original-key retry semantics. A service-unavailable response cannot be represented as a successful choice, contribution or review.

Material changes invalidate affected pending runs/drafts/reviews through source/version checks and recoverable stale states. Keep immutable chosen/historical snapshots and reasons; no global case-version change for an ordinary reminder preference or voluntary goal edit. Household changes affect loan review only when separately adopted through the existing evidence workflow, not by silently copying a goal record into credit facts.

## Receiving-owner review and acceptance examples

| Owner | Concrete review input needed before canonical implementation |
| --- | --- |
| Robert | Agreed FND-03 base, member-safe read/write projections, generated contract/client/version plan and permissions/error registration; protect own-record/revocation and private drafts |
| Aaron | Planner basis/trace and engine binding, allocation conservation/rounding/horizon rules, unavailable servicing/catalogue treatment and approved product fields; no actual product/fee default is supplied here |
| Earl | Goal/consent/progress and suitability-review state semantics, authorized advisory mapping, reviewed content/expiry/retention and independent planning/guidance expectations |
| Benedict | Bounded QWN-02 inputs/outputs and artifact provenance, extraction/other-capability regression and supported source/figure explanations; no separate provider transport |

Proposed future tests: two members cannot read/choose each other's goal; revoked links cannot retry a write; concurrent goal creation preserves the active-goal limit; same-key retries produce one choice; one balance cannot fund two commitments; reserve plus payment is not double deducted; missing loan/fee/date data stays unavailable; unreviewed/stale investment bodies never serialize to a member; expiry/source changes prevent selection of old advice; pause/withdraw/refusal has no lending consequence; AI failure preserves template/manual use. Reviewers set expected arithmetic independently of the engine under test. Relevant feature/DB/browser/accessibility checks and screenshots become required when runtime/UI implementation changes.

All receiving-owner and institutional acceptances are **pending**. Do not create signed review records, frozen training labels or a permission mapping on behalf of others. FND-04 proposal preparation is separate from the [FND-03/SHOW-01 registration draft PR #18](https://github.com/Aracena18/AGAP/pull/18), which is not required as a hidden prerequisite for reading this proposal. Actual canonical implementation waits for agreed contracts, institutional inputs and the existing staged capacity review.
