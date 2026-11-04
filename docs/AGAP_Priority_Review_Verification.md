# AGAP priority review — PRV-01

5 November 2026, Asia/Manila. User-authorized fictional review-demo implementation on `feat/priority-review-escalation`, base `964ad4b`.

## Internal contract proposal

This proposal precedes shared-type edits and implements the accepted chat plan. Robert retains shared types/state/fixtures/navigation/persistence ownership, Aaron evidence/affordability integration, and Benedict decision guards/snapshots. No receiving-owner or institutional approval is asserted. Public API contracts and production services are unchanged.

Add optional browser `CaseRecord.review` state, containing source-linked simulated AI concerns, dated evidence confirmations and concern reviews, and an escalation with observed checked failures, assignment, in-app notices and append-only investigation/disposition actions. New decision snapshots copy this state; legacy snapshots omit it. Financial evidence basis excludes workflow history, acknowledgments and recommendation notes; escalation context additionally includes the active offer. Workflow actions never increment the financial case version.

The queue derives parallel paths from one assessment/readiness projection. Existing fictional monthly-capacity/cash-timing failures are blocking and cannot be dismissed or bypassed by exception reasons. Mara confirms evidence currentness and checks AI samples. Luis investigates and verifies resolution; a final decline can retain a material failure after all evidence/AI/investigation prerequisites pass. Return remains available for incomplete cases. Closed decisions retain their saved concerns.

Storage v2 migrates validated v1 records without altering their history and retains legacy bytes. Malformed storage remains preserved with explicit memory-only recovery. All new capabilities are **Planned** until browser demonstration and required checks are recorded below.

## Verification

The three real-browser acceptance scenarios pass after demonstrating saved actions and reload. Queue ranking, consolidated review summary, simulated concern checking and assigned escalation/notices are now **Working** in this fictional demo. Representative-user acceptance and institutional/production authorization are not asserted. The Google document is unchanged.

The reload scenario exposed noncanonical object-key ordering after schema parsing. The evidence basis now canonicalizes object keys, and a repository regression checks preserved readiness, notice acknowledgment and resolution after reload. Financial evidence and offer revisions also prevent earlier confirmations/resolutions from becoming current when old values/offers are restored.

### Browser walkthrough

1. Open the application queue: Ben is first; Ana shows clarification and AI checking simultaneously. Expand Concerns and sources or open Review summary.
2. Ana: reconcile income with the current fictional payslip, compare the permitted after-payday schedule and save a recommendation. On Review summary, confirm evidence currentness, check the simulated source discrepancy and assign Luis.
3. Switch to the reviewer role. Acknowledge the in-app notice: the escalation remains open. Verify resolution against the corrected evidence and passing active-offer checks. Reload: readiness and saved notice/resolution remain. The existing keyboard journey separately records and prints the human approval.
4. Change Ana's evidence: currentness, AI checking, recommendation and escalation resolution require renewed review. Earlier findings and actions remain inspectable.
5. Ben: confirm evidence, recommend the recorded offer, assign Luis, acknowledge and investigate. Resolution and approval remain blocked by the shortfall. Decline with current evidence/recommendation and the recorded investigation; reload and find the decision under All applications. Exception reasons cannot bypass the checks.
6. Cora: show missing income and unavailable financial figures, with return for clarification available and no invented zero values.

### Checks

`npm run check` passes lint, generated contract/client consistency, frontend/API builds, **226 application/domain tests, 611 platform/finance/database tests and 91 evaluation tests**. `npm run test:e2e` passes **91 browser tests**, with the four existing presentation-specific cases intentionally skipped in the normal test-server mode. This includes keyboard approval, frozen printing, source navigation, all three new review scenarios, saved-action reload, rejected premature resolution/approval, investigated decline, and 320px/1101px reflow and accessibility checks.

Use Node 24 and the explicit `AGAP_TEST_DATABASE_URL` for the repository's fictional localhost test database; several existing integration tests require this environment variable rather than only the fallback URL. No production database is used. The internal implementation is technically verified and ready for receiving-owner/representative review; those acceptances are not fabricated.

`graft` and `graphify` are unavailable in this environment; indexed navigation/update could not be run. Source inspection used `rg`. Financial formulas, public API contracts, production services and unrelated local documents are unchanged. Incidental regeneration of older evidence-workflow screenshots by the browser suite was discarded; the eight scoped captures below are retained.

### Captured evidence

The captures show actual fictional UI states after the capabilities were demonstrated and labeled Working. Keyboard navigation, source tracing, original financial oracles, frozen printing, storage migration/fallback and 320px accessibility/reflow are exercised by the application and browser tests. Screenshots were visually inspected; automated checks do not establish representative-user acceptance.

| Screenshot | Demonstrated behavior |
| --- | --- |
| [Priority queue](screenshots/priority-review/queue-desktop.png) | Ben first; Ana has simultaneous paths; named next actions and source expansion |
| [Ana ready, desktop](screenshots/priority-review/ana-ready-desktop.png) | Current evidence, checked AI concern, permitted offer and verified resolution survive reload |
| [Ana at 1101px](screenshots/priority-review/ana-summary-1101.png), [Ana at 320px](screenshots/priority-review/ana-summary-320.png) | Readable summary, figures, source links and actions at both review widths |
| [Ana renewed review](screenshots/priority-review/ana-renewed-review-320.png) | Changed evidence invalidates readiness while preserving earlier history |
| [Ben notice at 320px](screenshots/priority-review/ben-notice-320.png) | Assigned reviewer receives a usable in-app notice on a phone |
| [Ben investigated](screenshots/priority-review/ben-investigated-desktop.png) | Receipt and investigation do not remove failed checks; attempted premature resolution is rejected |
| [Cora clarification](screenshots/priority-review/cora-clarification-320.png) | Missing income retains unavailable affordability values and the clarification action |
