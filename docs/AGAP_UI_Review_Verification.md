# UI-01 annotation cleanup and local preview verification

26 October 2026, Asia/Manila. Robert's `codex/ui-review-cleanup` branch starts at member-platform candidate `4577c850dcca44393f5978648bb861e3bf390656`. The user approved all seven annotation fixes and password-only local seeded-administrator access, with MFA retained for sensitive staff actions. [Assignment.md](../Assignment.md) is the sole status tracker; [design.md section 13](../design.md#13-annotation-cleanup-and-shared-account-controls--26-october) is the UI authority. The [authentication proposal](AGAP_UI_Auth_Proposal.md) preceded interface changes.

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

## UI-04 — focused skill-guided audit — 3 November 2026

Robert implements this user-requested audit and targeted improvement on `codex/ui-skills-audit`, based on `main` at `312c6f8`. Scope is shared account navigation and the member payment-help review. This is a further implementation example, pending representative-user and visual acceptance; it does not complete MOB-01 or any support-domain service. The existing four-owner responsibilities and capacity estimates remain unchanged.

### Findings and supplied corrections

| Priority | Verified finding | Supplied correction and evidence |
| --- | --- | --- |
| P1 | The sharing acknowledgement remained checked after Edit message, allowing a revised request to inherit confirmation of earlier content | Editing or opening another preview clears the acknowledgement. Browser tests check the revised text and confirm that Send request makes no POST until the required checkbox is checked again |
| P2 | Cancelling the unsaved-change sign-out warning closed the menu and left focus on the document body | Selected menu actions restore trigger focus. A browser test activates sign-out with Enter, dismisses the warning and verifies both account focus and the untouched draft |
| P2 | Review request and Edit message left focus on the old action or a removed control | Review focuses the sharing heading; Edit focuses the message field. Keyboard checks cover both 320px and 1366px layouts |
| P2 | A long unbroken request reference expanded its grid item and was clipped by the history card, despite a passing page-width check | Scope wrapping and minimum-width handling to support-history items. The browser test now checks descendant bounds inside the card as well as page reflow; complete text remains displayed |

The existing menu action test also asserts trigger focus after selection. Browser audit tests use a separately provisioned fictional member through the existing fixture helper so the original member logout journey cannot invalidate their session. Existing session expiry/logout, stale/uncertain command, real intake and fictional financial regression tests remain applicable. No new product field, money rule, API/CSRF/idempotency behavior, dependency, canonical fixture or persisted snapshot is introduced.

### Skill use and audit limits

- **Impeccable:** applied its audit, hardening and craft guidance against AGAP's existing Operate interface. The context engine could not finish its release download and was stopped; existing project documents were read directly. No completed Impeccable detector run is claimed.
- **21st.dev:** its CLI reviewed 89 source files and reported one error, three warnings and 24 suggestions. The menu's delegated click handler already operates native menu items with keyboard handlers, so the interactive-div error is not evidence of a missing button. The three autofocus cases are deliberate focus on user-opened forms or the reset dialog. Twenty color suggestions point into the canonical palette itself; four others concern existing shadow/backdrop literals. The final scan repeats the same counts; it is not reported as a clean scanner result. These were reviewed rather than automatically rewritten. The confirmed fixes above come from browser/source inspection, not a claim that every scanner finding is an AGAP defect.
- **React Bits:** reviewed the installed integration skill for motion/component suitability. This pass needs native focus and confirmation controls; no registry component or decorative motion was added. Existing reduced-motion treatment and AGAP primitives remain in use.
- The contributor contract now records how these skills apply when available. `design.md` remains the sole visual/interaction authority; no competing design context, external registry upload, hosted AI generation, new dependency or product capability was created.

| Audit dimension | Scope and limits |
| --- | --- |
| Accessibility | Keyboard focus and native required confirmation checked; automated axe checks cover the exercised preview/history states. No complete WCAG conformance or assistive-technology study is claimed |
| Performance | Existing build and dependency checks; no animation/library added. No new runtime performance benchmark |
| Theming | Existing Google Sans, Material icons, tokens and controls retained; existing shadow/backdrop literals remain a low-priority follow-up |
| Responsive layout | Chromium viewport checks at 320px and 1366px, including a long simulated request reference; descendant bounds check card containment as well as page-level reflow. No physical-device gesture claim |
| Workflow integrity | Edited content requires renewed sharing confirmation; cancelled sign-out preserves the draft; unavailable support remains unavailable and loan terms are unchanged |

No overall health score is assigned from this scoped audit. Representative member/staff review, production service integration and release approval remain separate.

### Verification and screenshots

Passed the final `npm run check`: lint, generated-contract drift, web/API builds, **193 UI/domain tests**, **496 platform/backend tests** and **76 evaluation tests**. Passed all **38 Chromium browser tests** with `AGAP_SKILLS_SCREENSHOTS=after npm run test:e2e`, including four new focused browser cases. The final screenshots were inspected at 320px/1366px; the strengthened containment assertion verifies that long history text is inside its card, not merely hidden from page overflow.

Checked **147 local documentation links/anchors** and `git diff --check`. Protected canonical types, tokens, demo fixtures, finance/contracts, dependency manifests and lockfile are unchanged. Completed `graphify update .`; its optional `tree_sitter_sql` parser remains unavailable and the existing contracts barrel is only partially extracted. Those graph limitations do not substitute for the passing build/database tests.

Verification uses an isolated `agap-ui-skills-tests` PostgreSQL container at port 55440, only the fictional `agap_test` database, and browser ports 5185/4112; other local databases/previews and unrelated untracked files are preserved. An initial full-browser attempt exposed reuse of the original member logout session; the dedicated audit member fixes that fixture interference. Earlier setup attempts lacked the test database and then reached a local disk-space limit; the audit's temporary dependency copy was removed, and final checks used existing installed packages with local fonts/cache.

UI-04 follows the user-authorized direct-main publication workflow with no PR or force push. Local checks are distinct from remote CI; no remote CI pass, consuming-owner acceptance, representative-user acceptance or production release is claimed. The task remains **Ready for review** in the sole tracker.

Implementation/checks commit: `4c8369f119eae1a9033636993427b4b1ce9662d3`. The first normal push was rejected because remote main advanced to `d875ecbd004ebd1ac2899eea19cdfa286bf7e1bb` during verification. Integrated those already-published [Gabay archive](../design-library/README.md) and proposed-palette files unchanged in the isolated worktree. The application, test, contract and dependency trees still match the tested UI-04 commit exactly; the archive expressly defers canonical branding adoption to a separate reviewed task. No existing PR was merged by this audit. This follow-up needs documentation/consistency checks rather than another unrelated application run.

| State | Desktop | Phone |
| --- | --- | --- |
| Sharing preview with renewed confirmation | [1366px](screenshots/ui-skills-audit/after-help-review-1366.png) | [320px](screenshots/ui-skills-audit/after-help-review-320.png) |
| Simulated long-message history | [1366px](screenshots/ui-skills-audit/after-help-history-1366.png) | [320px](screenshots/ui-skills-audit/after-help-history-320.png) |
| Account menu / cancelled sign-out | Shared control | [Menu](screenshots/ui-skills-audit/after-account-menu-320.png), [restored focus and draft](screenshots/ui-skills-audit/after-cancelled-signout-320.png) |

Screenshots are fictional implementation evidence. Support history explicitly uses simulated responses, while the sharing-preview service remains honestly unavailable.

## UI-05 — Gabay asset publication and analysis — 3 November 2026

The user requests synchronization, publication and analysis of the supplied design materials before refactoring AGAP's presentation. Work is isolated on `codex/gabay-brand-analysis`, base `d0e0e6e`. A fast-forward-only pull initially confirmed main was current; subsequently integrated the already-published `63371c5` evidence/affordability workflow, preserving its instructions and task states. Asset commit `9ff66a3b8e0614d09adc14bb52261084c6c95be7` contains all 50 supplied files with unchanged bytes, restored specimen folders, a source-to-repository manifest and browser inspection evidence.

- Verified every file against the ZIP and repository hashes; independently read all committed Git blobs and checked image dimensions/alpha again. The 38 images include 27 transparent character masters/poses/states plus concepts and preview copies. All rasters are static, single-frame files.
- `npm run lint`, `npm run build`, Markdown link/anchor checks, six local HTML resource references and `git diff --check` pass. Browser globals are scoped only to archived specimen JavaScript; original source files and lint rules remain intact.
- Chromium inspection at 320/768/1366px loads every image. The supplied gallery still has a 7px overflow at 320px, two invalid ARIA nodes and four contrast findings; these are documented integration inputs, not a claimed accessibility pass. Dialog Escape restores trigger focus. See [raw checks](../design-library/review/preview-checks.json), [phone](../design-library/review/ui-kit-320.png), [desktop](../design-library/review/ui-kit-1366.png) and [analysis](../design-library/ANALYSIS.md).
- `graphify update .` completed with the existing missing SQL-parser / partial contracts-barrel limitations. No new application/financial acceptance result is claimed for asset publication; application, API, domain, tests, canonical tokens/fixtures and dependencies match the synchronized `63371c5` tree exactly. The incoming feature evidence is described separately in its delivery record.

[design.md section 16](../design.md#16-planned-gabay-rebranding--3-november-2026) records the planned visual-only adoption. UI-05 is Ready for review; UI-06 remains Not started at the requested analysis checkpoint. Preserve the supplied green/white/yellow direction and Gabay art while adapting existing primitives and responsive shells. The specimen calculator and concept-only features do not enter operational behavior. Original source archives and unrelated local files are preserved; no pending PR is merged. Direct main publication follows the user's existing authorization; representative-user acceptance and actual rebranding implementation remain separate.
