# CL1: authoritative lending integration foundations

5 November 2026 · Baseline `cdea4be` · Isolated branch `feat/connected-lending-cl1`

The user requests sequential implementation of CL1–CL8 in the [connected-lending plan](../../../AGAP_Connected_Lending_Implementation_Plan.md). This record concerns CL1. Existing FND-03/EVD-01/CRD-01/DEC-01/PAY-01/GL-01/ACC-01 ownership remains unchanged. It records actual AI engineering work, not another teammate's acceptance or institutional approval. [Assignment.md](../../../../Assignment.md) remains the tracker.

## Candidate behavior

- Contract candidate 0.4.0 adds a dated checked-scenario variant. It preserves the saved workflow result, all monthly segments/daily balances, actual/minimum checks and full contractual costs. Its legacy monthly field is explicitly null; the UI displays horizon and individual segments without averaging.
- `workflow-decision-basis/v1` commits the exact immutable assessment input using canonical SHA256, complete original facts/revisions/occurrences/coverage/net-deduction semantics, actual staff/member confirmation identities, the full published policy including separate-fee dates, and bounded source commitments. Statements have a checksum of exact UTF-8 statement text and no invented original-file checksum. Documents retain actual original and derived-text identities/hashes. Clearance and independent verification remain distinct.
- `decision-snapshot/v2` is additive. Historical v1 contexts/snapshots retain their original fields, decoder, canonical text, checksums and documents. New migrations expand allowed formats without rewriting historical records. Dated projections must match their preserved original scenario; mandatory checks are never converted into overridable checks.
- Credit's actual producer reads the saved assessment/input and actual confirmations through a staff-only function on the caller transaction. It checks current application/input, facts, source/date/version/text/retirement and published policy bindings. It does not use test context tables, client authority or a second financial calculator.
- Lending configuration is explicitly fictional and principal-only, with scoped registered identities, one separate reviewer, one financial authorizer, a separate preparer, limits, explicit validity, source-review requirements and component/mapping versions. Unsupported interest/fees/net-withholding products remain unavailable. The dedicated operator publisher checks the input's actual checksum, rejects production/real-record mode and requires active scoped roles/accounts. No institutional policy or real-execution format is invented.
- Conflict declarations are immutable, actor/input-specific records. Missing declarations remain unavailable. Actual separate reviewer, role/activity/branch and participant currentness are checked before consequential actions. Public declaration/readiness commands and screens belong to CL2.
- Application transitions validate the persisted recommendation/decision/acceptance and increment only the aggregate version. Material input version is not fabricated by workflow actions. Member acceptance uses its existing narrow event/revision bridge, with current ownership before saved-response replay.
- Member currentness exposes only safe hashes/versions/eligibility. Financial release uses an internally authorized currentness proof and the exact persisted member acceptance/document. Repayment authority/component lookups do not reload household affordability. No private staff snapshot/input/configuration is granted to a member.
- Monetary display uses integer/BigInt quotient and remainder, preserving every centavo even at the maximum safe value. Ordinary formatting is retained; invalid/unsafe amounts are rejected rather than rounded or shown as zero. Previously saved document bytes/hashes are not regenerated.
- A discovered source-date bug is corrected: PostgreSQL calendar dates are selected as text rather than converted through JavaScript UTC, which previously shifted a Manila November 1 source to October 31. Previously stored assessment inputs remain immutable; an old inconsistent source commitment requires reassessment.

The new producers are not registered as public decision/money endpoints in this batch. Broad capability defaults stay unavailable. CL2–CL6 must connect and demonstrate normal navigation, readiness, public safe DTOs, trusted fictional movement intake, receipts and support. A service-level integration test is not that complete browser journey.

## Writer and lock protocol

Connected staff/member coordinators explicitly use READ COMMITTED, overriding any repeatable-read connection default so a pre-fence query cannot pin a stale publication snapshot. They acquire a transaction-scoped organization advisory fence **before** actor/link/session guards, accounting periods, application/loan/command locks and business-event locks. New authoritative producers require an internal coordinator marker; an unguarded coordinator fails unavailable. This deliberately coarse first fictional-release protocol serializes short participating transactions within one organization and allows different organizations to proceed independently. It is not evidence of operational throughput acceptance.

Use the same fence for financial-input edits/verification/assessment, application metadata/assignment, lending configuration publication, staff/member provisioning/revocation and source retirement/worker state publication. The operator policy/configuration publishers and short evidence-worker transactions participate. External file/scanner/OCR/model/provider I/O remains outside these transactions. Source checks are not protected merely by locking an old immutable policy row; publication of a newer version also participates.

Repeatable-read reconciliation uses its separate snapshot coordinator and cannot acquire the connected write marker. It may record report metadata but does not mutate source financial facts. Financial finalization still acquires the accounting period before servicing application/loan/command locks. The internal currentness projection takes no early application row lock on that path. Existing accounting period/configuration guards remain effective.

Before public connection, shared registration must use the guarded coordinator consistently for every participating API writer, including identity revocation and member evidence. Operator SQL outside the reviewed writers must follow the same fence/order; raw owner credentials are not an application API. CL1 tests exercise actual PostgreSQL waiters and material changes, not a mock boolean `verified` packet.

## Verification record

Environment: Node 24.12.0, PostgreSQL 18 in dedicated Compose project `agap-connected-cl1`, localhost port 55439, fictional records only. The final checks use the worktree's own locked dependencies installed with npm 11.9.0. Dependency/lock files are unchanged. Draft migrations are tested on freshly recreated temporary database storage, not by editing recorded development/production migration history.

Targeted tests have demonstrated:

- An independent two-month oracle preserves four income cash dates, one irregular expense, confirmed zero obligation, monthly 430,000/547,000 centavos, horizon 977,000, closing 1,177,000 and a separately dated 3,000-centavo fee in the codec test.
- Actual service/DB inputs for the principal-only product yield monthly 430,000/550,000, horizon 980,000 and closing 1,180,000 centavos. Actual source dates and confirmation identities match the saved input.
- Missing clearance, missing transaction guards, another member, premature origination and policy replacement fail safely; a committed authorized acceptance retry still returns its saved receipt.
- Separate preview/approval and member acceptance create one actual pending origination; actual component lookup plus the existing money/GL services produce one balanced fictional release journal.
- Private member reads stay private and the new path works with a non-superuser migration/definer owner under FORCE RLS. An actual PostgreSQL advisory-lock waiter observes a policy replacement only after its writer commits, then marks the previous assessment stale.

`npm run check` passes: lint, generated-contract consistency, web/API builds, **241 frontend/domain**, **663 platform/backend** and **91 evaluation-tooling** tests, plus evaluation typecheck. The final normal browser run passes **98 cases**; all four presentation-only cases also pass separately with the guarded fictional identity server on verified-free localhost 58080. The production audit reports **zero vulnerabilities**. The actual synthetic Docker context test retains seven necessary inputs and excludes 25 private/local inputs.

Initial full checking detected an RLS-helper permission dependency in existing non-superuser evidence-worker tests; moving the helper into its owning evidence schema and granting the required bounded execution resolves it. Worker and producer suites now pass together, including the full final check. A first browser run used parent-checkout dependencies and could not serve its intended fonts; that run is not used for visual acceptance. The final run uses local locked dependencies, explicitly verifies Google Sans loading, has no font serving warning, and tests browser-safe schema imports after isolating server-only hashing. No test is weakened to conceal a defect.

Actual inspected captures:

- [Decision preview, 320px](screenshots/simulated-decision-320.png) and [1366px](screenshots/simulated-decision-1366.png): explicitly labeled **UI simulation**, not a connected decision journey. Browser assertions also cover 820px and a 683px effective zoom viewport, keyboard-accessible existing controls, no page overflow and zero automated accessibility violations.
- [Own-member evidence, 320px](screenshots/member-evidence-320.png), [staff evidence, 320px](screenshots/staff-evidence-320.png) and [1366px](screenshots/staff-evidence-1366.png): actual API/database fictional browser harness. These do not claim new public decision/payment availability.

The suite regenerated three historical evidence captures; they are copied into this task's evidence directory and the original tracked images are restored byte-for-byte. Source-date and exact-centavo regressions, currentness after retirement/revocation, explicit READ COMMITTED despite a different connection default, full beyond-horizon contractual costs and frozen evaluation-pack hash verification are included. Remote source verification remains pending the actual exact-commit run.

`graft` and `graphify` are unavailable on PATH; navigation uses `rg`. No graph update is claimed. The frozen evaluation extraction interface remains explicitly pinned to 0.3.0, rather than being relabeled by a newer lending API version. The original public review pack still verifies byte-for-byte. Research artifacts, private model mappings and model selection are untouched.

## Remaining gates

Actual Robert/Aaron/Benedict/Earl receiving-owner acceptance remains pending. The user authorizes implementation, but this AI work cannot record another person's review. CL7 still needs actual approved product/rate/fee/allocation/quorum/execution rules; CL8 needs genuine deployment/security/recovery/model runtime and institutional release evidence. No live funds, production readiness or cooperative approval is claimed.
