# UI-01 annotation cleanup and local preview verification

26 October 2026, Asia/Manila. Robert's `codex/ui-review-cleanup` branch starts at member-platform candidate `4577c850dcca44393f5978648bb861e3bf390656`. The user approved all seven annotation fixes and password-only local seeded-administrator access, with MFA retained for sensitive staff actions. [Assignment.md](../Assignment.md) is the sole status tracker; [design.md section 11](../design.md#11-annotation-cleanup-and-shared-account-controls--26-october) is the UI authority. The [authentication proposal](AGAP_UI_Auth_Proposal.md) preceded interface changes.

## Annotation outcomes

| Comment | Supplied change |
| --- | --- |
| 1 — wordy welcome | One heading, Apply / Track / Get help icon row, Sign in and expandable Need access? guidance |
| 2 — demo link placement | Member / Staff / Review demo navigation in the shared header selector; duplicate card/footer links removed |
| 3 — redundant list copy | One application heading, existing search/filter/table/date context and a concise demo/save notice; subtitle and three-case guide removed |
| 4 — crowded header | AGAP, workspace selector and actual account button; simulated roles/reset moved under Demo tools |
| 5 — case identity alignment | Name/ID/occupation/status grouped left; requested amount/term aligned right and stacked on phones |
| 6 — evidence hierarchy | Label/amount, status/source/cash date, expandable effective date, visible deduction treatment and concise warnings; full sources and history preserved |
| 7 — nonfunctional avatar | Actual staff/member account menus with keyboard controls and real server sign-out; review routes require a staff session |

The seeded local account remains `administrator` / `Fictional-training-123!`. Password-only preview is explicitly enabled in the private local environment, not in the default sample or production. It selects a separate marked fictional Keycloak client at signed assurance level 1. The existing MFA client/member flow remain unchanged. Explicit staff MFA step-up verifies signed level 2, rotates the session and returns to the saved allowlisted route. Assignment/revocation still reject single-factor sessions, and no command is automatically replayed.

Migration 011 adds requested assurance and return navigation to one-use OAuth state. Cookie/session JSON contracts remain version 0.2.0. The idempotent setup command was run twice against the existing fictional realm without a database reset or credential deletion. The local API and web preview now run from this worktree at the existing 4100/5174 ports, with the existing `agap-member-platform-dev` database/identity containers.

## Verification

| Check | Evidence |
| --- | --- |
| Application checks | Passed `npm run check`: lint, generated-contract drift, web/API builds, **126 domain/UI tests** and **88 actual PostgreSQL backend/contracts tests** |
| Browser checks | **29 Chromium tests passed** in the full suite, covering the original financial review, real staff/member intake and UI cleanup; new assertions cover authenticated entry, menu keys/dismissal, account logout, Back after logout, client expiry and annotated 320px/1101px layouts |
| Real local provider | [Password-only preview and explicit MFA step-up](AGAP_UI_Preview_Identity.json) passed against Keycloak 26.4.7, including denial before MFA, self-revocation guard after MFA, real account-menu logout and removal of only the temporary authenticator |
| Existing MFA walkthrough | [Staff MFA walkthrough with the shared header](AGAP_UI_Staff_MFA_Identity.json) passed; original required actions restored and temporary credential removed |
| Member preservation | Signed member-protocol and real member-API/browser tests pass. The optional real-member provider walkthrough refused an already enrolled member, whose authenticator was preserved; no new real-member provider pass is claimed |
| Documentation audit | Passed: 180 local links/anchors across 10 changed Markdown documents, unchanged provisional owner budgets and protected source/evidence checks |
| Financial preservation | Canonical types, fixture registry, deterministic engine/domain rules, historical calculation oracles, dependency lockfile and original identity/restore JSON evidence unchanged |
| Code navigation | `graphify update .` completed. Optional SQL parser is absent and the contracts barrel has partial parsing; the graph is not evidence of SQL correctness |

Browser verification uses `AGAP_E2E_WEB_PORT=5184 AGAP_E2E_API_PORT=4111 AGAP_UI_SCREENSHOTS=1` so it does not stop the user's 5174 preview. Its API uses only the dedicated fictional `agap_test` database. Logout tests have an isolated session so parallel tests retain access. The existing tests that deliberately replace a hash outside router history still emit React Router's known navigation warning; router links and Back/Forward cancellation remain tested.

Menu tests also verify Tab/Shift+Tab document order, Escape focus return, outside dismissal, correct staff/member logout endpoint and CSRF token, cancellation of an unsaved-form warning, already expired sessions and a deliberate retry after uncertain logout. Accessibility checks retain the visible initials/source titles in accessible names. Financial results and recorded snapshots are not rewritten for presentation.

## Replacement screenshots

| Screen | Desktop | Phone |
| --- | --- | --- |
| Member welcome | [1101px](screenshots/ui-review-cleanup/member-welcome-1101.png) | [320px](screenshots/ui-review-cleanup/member-welcome-320.png) |
| Applications | [1101px](screenshots/ui-review-cleanup/applications-1101.png) | [320px](screenshots/ui-review-cleanup/applications-320.png) |
| Case and evidence | [1101px](screenshots/ui-review-cleanup/evidence-1101.png) | [320px](screenshots/ui-review-cleanup/evidence-320.png) |
| Actual account menu | [Sign out control](screenshots/ui-review-cleanup/account-menu-1101.png) | Same shared keyboard/touch control |

These are implemented examples supplied for user review, not a claim of representative-user acceptance. Financial business services, model training/inference and institutional deployment remain the existing owners' outstanding work. The explicit annotation request authorized presentation-only changes in Aaron's evidence feature; it did not transfer domain ownership or change team capacity estimates.

## Publication boundary

Delivery branch: [`codex/ui-review-cleanup`](https://github.com/Aracena18/AGAP/tree/codex/ui-review-cleanup), pushed without creating or merging a PR. Preserve the original member-platform worktree's uncommitted verification note and existing PR/issue descriptions. The existing push workflow filters `main` and `feat/**`; a `codex/**` branch without a PR does not schedule that workflow. Local verification is reported separately, and no remote application-check pass is claimed. Main and earlier candidate branches are not merged by this revision.
