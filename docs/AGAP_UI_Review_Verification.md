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

### UI-05 combined synchronization verification

Integrated main `63371c5` (evidence/affordability implementation) and design-only commits through `8effecc` without merging a pending PR. Original source inventory and optimized-transfer inventory remain separately preserved; independently verified all 50 entries in each from committed Git blobs. No incoming task status or feature implementation is overwritten. The application/API/domain/test/dependency trees match upstream exactly.

On the combined application tree, `npm run check` passed lint, contract/client drift, frontend/API builds, **193 app tests, 520 platform/database tests and 76 evaluation-tool tests**. All **39 Chromium tests** passed using only the isolated `agap-gabay-analysis-tests` fictional PostgreSQL container at 55442 and browser ports 5289/4219. An initial browser launch found 5186 occupied; selected separate ports without stopping that other process. Final design-only additions passed lint again. Generated evidence-workflow screenshots from the regression run are restored to their existing committed versions, rather than replacing another task's evidence with duplicate captures.

Inspected the incoming brand comparison in two modes and all six member-journey destinations at three widths (24 samples): no broken images or page overflow; outstanding landmark/contrast findings and the cramped 320px welcome hero are recorded in the [analysis](../design-library/ANALYSIS.md) and [raw preview results](../design-library/review/synchronized-preview-checks.json). Four viewport captures were visually reviewed. This scoped inspection does not establish full interaction, assistive-technology, zoom or representative-user acceptance. Earlier structural-only preview evidence remains historical; UI-06 is still Not started.

Final handoff checks: **202 local Markdown links/anchors** and **16 local HTML resource references** pass, as does `git diff --check`. Final graph refresh completed (3,037 nodes / 8,386 edges) with the known optional SQL-parser and partial contracts-barrel warnings. Publication includes only the design library, scoped specimen lint configuration and canonical planning/verification updates; unrelated root files remain local. No remote CI pass, institutional acceptance or production release is claimed.


## UI-06 — Gabay workspace redesign — 3 November 2026

The user authorizes implementing the selected Gabay app UI/UX direction and explicitly excludes the landing page. Work is isolated on `codex/workspace-redesign`, base `f10dae460dc20a1d39222891d9b725b2a0283b4a`. [design.md section 16](../design.md#16-planned-gabay-rebranding--3-november-2026) governs the merged implementation; Assignment.md alone records task status. Coordinated staff/demo edits are presentation-only; domain ownership and accepting authority are preserved.

### Delivered presentation

- `WorkspaceRoutes` applies `[data-agap-workspace]` and loads workspace-only presentation CSS. Existing root and landing token blocks stay byte-identical; canonical tokens append the green/white/yellow operational mapping. Compatible shared Button/Badge/Notice/Money behavior is retained.
- Shared workspace/account header, supplied three-petal mark treatment, member navigation and desktop staff sidebar. Small phones retain all four member destinations; staff navigation wraps above its content. Existing route/session/role guards remain intact.
- Gabay welcome/sign-in/home, cleaner task actions, readable application/help forms and truthful unavailable loan/support views. The empty-list image is conditional on a successfully loaded empty list. Decorative art does not claim verification, approval or safety.
- Review-demo application rows become labeled phone records, keeping purpose, amount, status, date and Review action together. Wider staff tables remain local scroll regions with keyboard-reachable actions. Evidence, source, comparison, saved-assessment and history surfaces share the new controls and palette.
- Two workspace-specific WebPs are exact copies of the incoming optimized archive assets: 256,708-byte welcome and 334,962-byte no-applications image. Original masters and landing files are unchanged; the full archive is not shipped in the app bundle. No dependency or decorative operational animation was added.

### Verification and preservation

`npm run check` passed lint, generated contracts/client consistency, frontend/API builds, **193 app tests, 522 platform/database tests and 76 evaluation-tool tests**. Final `npm run test:e2e` passed **all 56 Chromium tests**. Four added cases cover member phone navigation/focus, every demo phone-record field/action, styling isolation after returning to the landing, and staff navigation/table-action reachability at 320/683/1366px. The 683px width checks reflow equivalent to 200% of a 1366px viewport; it is not a physical-device or browser-zoom usability study.

The first browser run passed 55 cases; the new navigation test reused the original member session that its own serial logout journey had invalidated. It now uses the existing independent UI session. All four new cases then passed in isolation and the full final suite passed. No application change was needed for that fixture issue. Tests used only `agap-ui06-tests` fictional PostgreSQL at 55444, web/API 5305/4235; preview capture used 5304/4234 and a separate baseline frontend at 5314.

[Forty-two route/size samples](screenshots/workspace-redesign/after/checks.json) cover 14 member/staff/demo destinations at 320/768/1366px: no page overflow, broken images or axe violations in those states. First-pass intrinsic table sizing and compact-header overflow were corrected before final captures. [Before captures](screenshots/workspace-redesign/before/) and [after captures](screenshots/workspace-redesign/after/) remain separately recorded. Source/assessment financial outputs, corrections, uncertain retries, retained history, sharing confirmation and original Ana/Ben/Cora oracles pass their existing checks.

[Preservation checks](screenshots/workspace-redesign/preservation-checks.json) verify **19 protected files**, including landing source/assets, global CSS and root routing, unchanged from the base. Existing root and landing token blocks are unchanged. Landing viewport captures are **pixel-identical at 320px and 1366px** under the same reduced-motion static conditions; the full existing landing browser tests also pass. Financial/domain/contracts, canonical fixtures, API implementation and dependency manifests/lockfile remain unchanged. Newly generated server-workflow screenshots were copied to this task's evidence path; original captures were restored.

### Visual review and tools

A fresh Impeccable finish reviewer returned **ship**, with no proven material fixes across the named member, staff and demo captures; supplemental review returned **ship** for the real-API saved-assessment screenshots. [Review scope and disposition](screenshots/workspace-redesign/visual-review.md) distinguish screenshot review from live interactions and independent financial verification. Existing canonical docs and source-pointer tool context were updated through the documenter handoff; no competing guide/token registry was introduced.

Impeccable's detector returned no findings. The local 21st review reports the existing delegated Dropdown menu-click scanner finding and informational canonical color literals; sampled native menuitems/keyboard handlers, unit/browser checks and fresh review establish no new defect from those generic findings. Catalogue search was attempted but needs 21st sign-in; no catalogue source was retrieved, installed or published. The supplied component kit and existing primitives grounded implementation. [Tool review disposition](screenshots/workspace-redesign/tool-review.json) records these limits. React Bits motion was not selected for task-oriented operational screens; reduced motion remains supported. Graph refresh completed with the existing optional missing SQL parser and partial contracts-barrel limitations.

| Surface | Phone | Desktop |
| --- | --- | --- |
| Member welcome | [320px](screenshots/workspace-redesign/after/member-entry-320.png) | [1366px](screenshots/workspace-redesign/after/member-entry-1366.png) |
| Member home | [320px](screenshots/workspace-redesign/after/member-home-320.png) | [1366px](screenshots/workspace-redesign/after/member-home-1366.png) |
| Application form | [320px](screenshots/workspace-redesign/after/member-apply-320.png) | [1366px](screenshots/workspace-redesign/after/member-apply-1366.png) |
| Staff applications | [320px](screenshots/workspace-redesign/after/staff-applications-320.png) | [1366px](screenshots/workspace-redesign/after/staff-applications-1366.png) |
| Fictional review list | [320px](screenshots/workspace-redesign/after/demo-list-320.png) | [1366px](screenshots/workspace-redesign/after/demo-list-1366.png) |
| Saved server assessment | [320px](screenshots/workspace-redesign/after/evidence-workflow-staff-320.png) | [1366px](screenshots/workspace-redesign/after/evidence-workflow-staff-1366.png) |

The task follows authorized normal direct-main publication, with no force push or new PR. Local verification and visual ship disposition do not establish remote CI success, consuming-owner agreement, representative staff/member acceptance, institutional approval or production readiness. Those remain separately recorded requirements; unrelated local source archives and documents are preserved.

Final UI-06 handoff consistency: **243 local Markdown links/anchors**, context JSON parsing and `git diff --check` pass. Final graph refresh records 3,118 nodes / 8,531 edges with the same parser limitations. Protected implementation/fixture/dependency paths remain byte-identical to the base.


## UI-06 sign-in recovery — 3 November 2026

User browser annotation on `http://127.0.0.1:5186/#/applications`; tasks UI-06/FND-02, Robert-owned access/shared shell. Branch `codex/signin-recovery`, base `7b9e8ab`. The observed frontend proxy returned 502 because the API was stopped; the existing fictional database and Keycloak containers had exited. Restarted those existing containers and the API, verified current migrations without reseeding/resetting records, and aligned the API public origin and exact fictional OIDC callback allowlists with port 5186 while preserving the existing 5174 entries. The API uses the per-process `PUBLIC_ORIGIN=http://127.0.0.1:5186` override; the private shared `.env` was preserved. Credentials, required assurance and account roles are unchanged. These are local runtime repairs, not production deployment.

The sign-in card now keeps its real heading/context during checks. The warning has a concise title and explanation, with a standalone primary Try again action below it. Retry rechecks the existing session endpoint without document reload, retains route/source return paths, announces checking, prevents repeated activation, and retains keyboard focus on repeated failure. Ten-second abort and unmount cleanup prevent an indefinitely pending read. A normal 401 restores Sign in; only a validated real session opens a private workspace. Protected financial/contracts/fixtures/dependencies and the public landing are unchanged.

Targeted evidence: two provider tests cover a stalled read timing out/retrying to 401 and unmount cleanup. Four browser tests cover malformed 502 and 503 responses, network failure, repeated keyboard retry/focus, recovery to ordinary signed-out and existing authenticated states, no document reload, exact return paths and 320/683/1263px reflow. Axe reports no violations at those sizes. Initial tests exposed Strict Mode's extra initial read and native disabled focus loss; fixtures now hold the outage until explicit recovery and the button uses guarded aria-disabled semantics to retain focus. Local package links were adjusted only in the ignored worktree dependency directory so font assets load normally; no dependency/configuration changes.

Screenshots inspected: [desktop warning](screenshots/signin-recovery/unavailable-1263.png), [tablet warning](screenshots/signin-recovery/unavailable-683.png), [phone warning](screenshots/signin-recovery/unavailable-320.png). Impeccable context, craft-floor and focused polish guidance were applied within design.md; its initial detector scan had no findings. Full regression/publication results follow below. Automated checks remain separate from representative-user acceptance and institutional release approval.


Required checks passed on the isolated fictional database at port 55445: `npm run check` (195 app/domain, 551 platform/backend and 76 evaluation tests, plus lint/contracts/frontend/API builds and evaluation typecheck), and full `npm run test:e2e` at web/API 5320/4240 (**68 passed**). The browser suite retains the previously recorded React Router warning for tests that deliberately replace hashes outside router navigation; no new failures. The recovery tests also capture the [restored sign-in state](screenshots/signin-recovery/recovered-review.png). A follow-up capture run briefly remained in the lazy app bootstrap under concurrent local workload (before any session request); rerunning the four recovery tests with one worker passed, including the original annotation viewport. No application workaround or timeout increase was added. All eight new local documentation links/anchors and `git diff --check` passed. Protected source/contracts/fixtures/dependency paths match the base. Unrelated screenshot rewrites from the existing full-suite capture behavior were discarded in this worktree.

`graphify update .` completed with 3,210 nodes / 8,868 edges. Its existing limitations remain: optional `tree_sitter_sql` is unavailable and the contracts barrel is only partially extracted. Direct non-force publication to main is authorized under the contributor contract; no PR or production release is introduced.


## Temporary presentation mode — 3 November 2026

User explicitly requests hiding authentication/password interaction and automatic entry for both member and staff/review. Tasks UI-06/FND-02/MOB-01, Robert-owned access/platform/member/shared paths. Branch `codex/presentation-mode`, initial base `4323627`, merged current main `a344a31` before required regression. [Written proposal](AGAP_UI_Auth_Proposal.md#temporary-local-presentation-entry--3-november-2026) precedes implementation and supersedes the earlier manual-entry requirement only while this opt-in fictional loopback flag is enabled.

`LOCAL_PRESENTATION_MODE` defaults false. When enabled, existing session GETs create normal database-backed sessions only for the existing seeded fictional administrator and separately linked member; no accounts, roles or linkage are provisioned or revived. Shared seeded scope IDs were extracted without value changes so setup and presentation share one source. The canonical fictional realm supplies subject identities. Member login locking reuses the existing narrow `member_link_for_login` function; direct row locking was initially rejected by least-privilege credentials and was corrected without new grants. Sessions use marked opaque HTTP-only cookies, separate member/staff paths, normal TTL, active identity/linkage checks and CSRF. They do not claim MFA; privileged MFA guards remain enforced. Mode-off rejects marked tokens immediately, including direct authentication calls, and restores existing OIDC/password/MFA. Strict session JSON/contracts, dependencies, migrations, financial fixtures/rules and saved snapshots are unchanged.

The local session response header controls UI state only. Initial opening hides auth controls; successful entry shows Presentation mode and workspace navigation. Account/sign-out interaction is hidden only in this mode. Expiry/private-request 401 obtains another session read without replaying a command. Member failures now have bounded reads and in-place retry, matching staff recovery. Unavailable/revoked/missing fixtures remain errors; no domain success is fabricated. Startup rejects real records/notices, other realms, non-development and non-loopback API/origin/database settings. Bootstrap checks the exact configured public Host/origin and loopback request address.

Backend tests cover opt-in/configuration refusal, both strict session schemas/cookie paths, session reuse/expiry, prefix rejection when disabled, separate principals, missing/revoked fixtures, CSRF/MFA and foreign-origin refusal. Browser presentation checks cover automatic member/staff/review switching without any login request, refresh, expiry and 320/683/1263px reflow/accessibility. Ordinary authentication is separately covered by the normal full suite. Tests use the isolated fictional database at 55446 and web/API 5322/4242, preserving other tasks' servers and data.

Inspected [member phone](screenshots/presentation-mode/member-320.png), [member desktop](screenshots/presentation-mode/member-1263.png), [review desktop](screenshots/presentation-mode/applications-1263.png) and [staff phone](screenshots/presentation-mode/staff-applications-320.png); nine captures cover all three workspaces at the three widths. Screenshots show fictional implementation, not representative acceptance. Existing Impeccable/craft guidance was applied within design.md. Final check/activation evidence follows below.

Activation for the current local frontend uses `LOCAL_PRESENTATION_MODE=true PUBLIC_ORIGIN=http://127.0.0.1:5186` on API startup. The private local flag can be set false and the API restarted to restore normal login; existing Keycloak accounts/passwords/MFA and their flows are retained. No public/production deployment or paid provisioning is authorized or performed.


**Final regression — 4 November 2026:** synchronized main `faf2ddf`, preserving the accepted landing update, Earl’s evaluation review pack and tracker updates. `npm run check` passed: lint, generated-contract check, frontend/API builds, 197 app/domain tests, 571 platform/backend tests, evaluation typecheck and 91 evaluation tests. Ordinary `npm run test:e2e` passed **75**, with the four mode-specific cases intentionally skipped; the separate `AGAP_E2E_PRESENTATION=1` run passed **all four**, including automatic expiry refresh for both principals. Axe reported no violations in the nine presentation captures. Existing React Router warnings remain confined to the previously recorded hash-navigation tests. Unrelated baseline screenshot rewrites were discarded. All 17 new local documentation links/anchors checked before this completion note passed; final whitespace/links are checked again before publication.

The existing Impeccable detector returned no findings. `graphify update .` completed with **3,499 nodes / 9,518 edges**; optional `tree_sitter_sql` remains unavailable and the existing contracts barrel is partially extracted. Protected contracts, dependencies, finance/demo fixtures, module-owned domain code and snapshots are unchanged relative to the synchronized main; shared fictional scope constants retain their original seed values. No new PR is required under the user-authorized direct-publication workflow.


**Local activation — 4 November 2026:** enabled the private `LOCAL_PRESENTATION_MODE=true` setting and aligned `PUBLIC_ORIGIN` with the existing `http://127.0.0.1:5186` frontend. Verified current migrations without reseeding; both existing fictional identities are active. The API runs detached on loopback 4100, with its local process-group ID in ignored `.platform-test/presentation-api.pid` and output in `/tmp/agap-presentation-api.log`. Both session endpoints return 200 with the presentation header through the frontend proxy. Live browser verification opens the review list, member portal and staff workspace automatically with Presentation mode visible; no password or sign-out controls are presented. Normal auth remains available after disabling the flag and restarting this API process. Existing local data, credentials, identity-provider flows and unrelated user files are preserved. This activates the fictional local preview only.

## Alternate local presentation port — 4 November 2026

`fix/local-presentation-port` starts from `7723e72`. The [compatibility proposal](AGAP_UI_Auth_Proposal.md#alternate-local-identity-port--4-november-2026) precedes the change. Windows uses the existing port-18080 Keycloak workaround and account links; the prior exact port-58080 assertion rejected presentation startup there. The guard now accepts only the two exact `127.0.0.1` HTTP issuer URLs for `/realms/agap` on ports 58080 and 18080. Other hosts, ports, realms, credentials and URL suffixes remain rejected, alongside all existing development/fictional/loopback restrictions.

The entire existing presentation database suite runs against both ports, retaining separate cookies, CSRF, fresh-MFA denial, expiry, revocation, origin checks and mode-off restoration. Browser fixtures can select either exact test issuer through a test-only port flag. A temporary API against the existing fictional local database verified both session endpoints return 200 with `X-AGAP-Presentation: true` using port 18080; no account links, roles, passwords or provider MFA settings changed. The temporary API closed afterward; the user's foreground API still needs restart to load the changed `.env` and guard.

Automatic staff entry retains the seeded administrator identity and does not grant officer access or fresh MFA. Officer-only support disclosures/follow-ups and privileged step-up operations remain subject to their existing authorization. The [startup guide](AGAP_Platform_Foundation.md#windows-reserved-keycloak-port) explains activation without changing the existing issuer. No UI layout, dependency, schema or database migration changes are required.

Verification: isolated Debian/Node 24/PostgreSQL 18 fictional `agap_test` containers. `npm run check` passed (lint, generated contracts, builds, **206 app/domain**, **603 backend/contracts**, **91 evaluation** tests and evaluation typecheck). This includes **16 presentation cases**, running the entire existing suite against each issuer. `npm run test:e2e` passed **85** with four existing mode-specific skips; separate presentation-enabled browser runs passed **4/4 on 58080 and 4/4 on 18080**, including responsive accessibility, automatic entry and expiry renewal. **173 local documentation links/anchors** and diff whitespace passed. Existing presentation screenshots remain representative because layout and identities are unchanged. `graft`/`graphify` are unavailable in this environment. Task-owned test containers are removed after retaining logs; user Docker services and foreground API/frontend are preserved. No remote CI result, receiving-owner approval or production release is claimed.

Activation: keep the existing port-18080 issuer and private `LOCAL_PRESENTATION_MODE=true`, restart the user's API, then open the member/staff application URL directly. The previous Keycloak enrollment page belongs to the ordinary login flow and does not turn into an application page when the flag changes. Disable the flag and restart to restore normal sign-in.

## UI-08 — mobile-first member portal — 5 November 2026

Robert implements the user-approved plan on `codex/member-mobile-pwa`, base `59351ce`, in an isolated worktree. This is member/shared presentation and online installation work. API/schema contracts, calculations, server sessions/CSRF, same-key command retries, immutable decisions, canonical fictional fixtures and other-owner domain modules retain their existing behavior. Public landing content/styles/motion are retained; its installation dialog/state now come from the shared implementation.

### Supplied changes

- Member-only header, including fictional presentation mode; staff/review retain their existing separate entry routes and default header behavior.
- Bottom Home/Applications/My loans/Help links below 768px, with Applications current on apply/detail/edit routes. Phone content scrolls above the fixed bar, measured clearance accommodates larger text, and keyboard-sized visual viewports hide the bar until space returns. Safe areas and route focus remain explicit.
- Compact Home greeting, earliest returned scheduled payment with loan/record date, independent recent-application loading, and honest unavailable/empty/no-next-payment states. Ordinary loan summaries remain available with reminder notices off.
- Existing short form and save/review/submit commands with clearer guidance; grouped application sections, next-payment-first loan details, and message/contact-first payment help. Preview/edit focus, renewed acknowledgement and full history are retained; the preview uses a member-facing loan label.
- One installation provider before lazy routes, shared accessible dialogs, direct member installation access and `./#/member` installed launch with the existing app ID/icons. Browser prompt acceptance remains separate from confirmed installation; Safari guidance includes Open as Web App where offered.
- Advisory connection status keeps entered values in memory and sends no command on reconnection. Internet remains required; no service worker, private-data cache, offline draft store, background queue or push channel is supplied.

### Verification and design review

Final `npm run check` passes lint, generated-contract consistency, web/API builds, 226 UI/domain tests, 611 platform/database tests, evaluation type checking and 91 evaluation tests. Final normal `npm run test:e2e` passes **111 browser tests**, with the four existing presentation-only cases intentionally skipped there; **all four pass in the separate presentation-enabled run** (member/staff/review entry, member-only header, responsive presentation and both session-expiry refresh paths). All 20 added mobile/PWA cases pass within the normal suite. Screenshot review found and corrected a P2 fixed-navigation overlap by bounding the phone content scroll area above the navigation; the final browser tests assert that the main content bounds end above the bar at 320px and 390px.

The isolated worktree initially used linked dependencies; Vite rejected the linked Google Sans font path. That preview setup was corrected by copying the already installed, lockfile-matched dependencies into the worktree. No application allow-list workaround, dependency version change or fallback-font acceptance was used. Historical screenshots generated by existing tests are restored rather than replacing earlier evidence.

Physical Android/iPhone devices are unavailable in this environment. Automated Chromium checks cover manifest launch, mocked native prompt lifecycle, iPhone/Safari instructions and standalone detection; these do not establish device-level installation or real keyboard/gesture behavior. The visual-viewport keyboard case is simulated. Representative-member and receiving-owner acceptance, remote CI and institutional production release remain separate.

### Inspected visual evidence

Seven member routes at each of 320/390/768/1366px supply 28 fresh render samples and zero automated axe findings in the sampled states. Additional captures cover payment ordering, empty application, help preview and doubled text/long content. Rendering-only domain responses are explicitly simulated; real server draft/retry/access/help/history journeys remain covered by the existing suite. Pixel evidence is an example for review, not representative-user acceptance.

| Screen/check | Evidence |
| --- | --- |
| Payment-first Home | [390px](screenshots/member-mobile/home-390.jpg), [320px](screenshots/member-mobile/home-320.jpg), [1366px](screenshots/member-mobile/home-1366.jpg) |
| Application list / new form | [List at 390px](screenshots/member-mobile/applications-390.jpg), [form at 390px](screenshots/member-mobile/apply-390.jpg), [form at 768px](screenshots/member-mobile/apply-768.jpg) |
| Draft detail / edit | [Detail at 320px](screenshots/member-mobile/application-320.jpg), [edit at 390px](screenshots/member-mobile/edit-390.jpg) |
| Loans and payment help | [Loans at 390px](screenshots/member-mobile/loans-390.jpg), [help at 390px](screenshots/member-mobile/help-390.jpg), [sharing preview at 320px](screenshots/member-mobile/help-review-320.jpg) |
| Enlarged text and unbroken reference | [200% text at 320px](screenshots/member-mobile/text-200-320.jpg) |
| Source and correction comparison | [Original versus redesigned form](screenshots/member-mobile/source-vs-apply-390.jpg), [P2 correction](screenshots/member-mobile/scroll-correction-390.jpg), [field typography/control comparison](screenshots/member-mobile/field-comparison-390.jpg) |

The paired captures preserve their original pixels: original/initial candidate on the left, current candidate on the right, at a 390×844 CSS viewport and density 1. The original form is in fictional presentation mode; the automated candidate uses a normal fictional member session. That intentional header-state difference is not treated as a visual defect. Google Sans, control geometry, the unchanged brand/token system and retained disclosures are inspected alongside the approved navigation/hierarchy changes. The project-root [design QA report](../design-qa.md) records the comparison and remaining device limits.

`graft` and `graphify` are unavailable on this machine; no completed graph refresh is claimed. No external design registry, new dependency, schema generation change or visual-token migration is introduced.

### Publication

Final application and browser verification passes; direct-main publication follows the established workflow. The established workflow authorizes a normal direct-main push after checks; no new PR, hosted deployment, paid provisioning or production release is requested by this slice. Preserve the original checkout's unrelated untracked documents and local environment.

**Publication confirmed:** after the user's explicit approval of `origin/main`, the normal non-force push published implementation commit `d5b7f47` on 5 November 2026. The original main checkout was fast-forwarded to the exact verified tree; its three pre-existing untracked files remain untouched. This follow-up records publication/live evidence only; application source is unchanged. No remote CI or institutional release approval is inferred.

Post-integration in-app-browser checks at 390×844 confirm the running portal's [actual fictional Home](screenshots/member-mobile/live-home-390.jpg), [blank application](screenshots/member-mobile/live-apply-390.jpg) and [installation fallback dialog](screenshots/member-mobile/live-install-390.jpg). Home correctly leads with the submitted application when no loan is recorded. Closing the dialog restores the Install control's focus. The live browser log contains only Vite connection and React DevTools information, with no error entries. The [same-mode source/live comparison](screenshots/member-mobile/source-vs-live-apply-390.jpg) uses the same blank-form/presentation state at density 1.

## UI-09 — friendly member guidance — 5 November 2026

**Purpose and authorization.** The user requests a substantial member-only improvement in comfort, guided next actions, branding, background treatment, typography and concise copy. The user confirms the five archived [member concepts](../design-library/concepts/member-experience/agap_member_experience_refined.webp) and the repository's supplied design materials as references. Robert implements this in isolated `codex/member-friendly` over `c6f572834a262849c5abb4005e6417f5374c80c6`. Initial and early fetches show that base current with no open PR. Final UI verification finds newly opened PR #36 with conflicts; its [separate verified integration](AGAP_Verification.md#pr-36-integration--5-november-2026) follows this checked UI publication and preserves the member presentation. Original untracked documents/archives remain untouched.

**Shared proposal before edits.** The UI-09 authorization entry in Assignment.md records the member-scoped font-token proposal before the canonical token edit. Only an additive `[data-member-shell]` font role is introduced; existing root, landing and staff roles remain intact. The unmodified variable Nunito font is self-hosted with its OFL license and pinned source in [third-party notices](../THIRD_PARTY_NOTICES.md). No new package or runtime service is required.

**Supplied candidate.** The existing member shell, controls and data services now present a short greeting, supplied Gabay art, a pale mint/petal background, concise action rows and fewer title descriptions. The intake-only Details/Review/Send indicator follows the current route and returned application status. New/edit forms remain Details, saved drafts Review, and submitted/later records Sent. Saving, submitting, checking evidence, institutional approval and accepting terms remain separate. Payment-help optional fields use a native disclosure and retain selected values in the sharing preview; editing requires renewed sharing acknowledgment. New tests cover these transitions, exact centavos and preserved optional answers.

**Preserved boundaries.** No API/schema, calculator, canonical fixture, source status, financial command, authentication or snapshot change. Own-record reads, unavailable/zero distinctions, pending movements, original request/key retries, unsaved navigation, consent, installation and history remain authoritative. Staff/landing source is unchanged. The lifecycle browser proxy now waits for active forwarding callbacks before disposing contexts; this corrects a test teardown race without suppressing route errors or changing financial behavior.

**References and tools.** Impeccable context/craft guidance applied inside design.md; the final mechanical detector returns `[]`. The 21st UI Build workflow was read, but `21st` is absent, so no catalogue component was retrieved or installed. Existing shared controls and supplied artwork are reused. [Delivery asset hashes](../public/workspace/member-assets.json) preserve source/transform/output provenance; archived masters remain unchanged. `graphify update .` succeeds (4496 nodes/13078 edges), reporting missing SQL parser support and partial extraction of `packages/contracts/src/index.ts`; no tooling upgrade is attempted.

**Verification environment and recovery.** Test infrastructure initially required starting the stopped fictional database and explicitly setting `AGAP_TEST_DATABASE_URL`. An oversized worker run exhausted memory; a two-worker override also bypassed the platform suite’s intended serialization. Final verification uses one Vitest/browser worker and separate fictional databases. No source test is skipped to avoid failures. `VITEST_MAX_WORKERS=1 AGAP_TEST_DATABASE_URL=postgresql://agap_owner:development-owner@127.0.0.1:55433/agap_test npm run check` passes lint, contract generation consistency, frontend/API builds, **237 application/domain + 667 platform/database + 100 evaluation tests** and evaluation type checking. After the final two visual corrections, lint and the frontend build pass again. **Normal browser suite: 116 passed, four existing presentation-only cases skipped as intended.** The full real-HTTP pilot lifecycle, principal movement/reconciliation, member save/edit/submit, exact retry, source confirmation, access clearing, support history, installation and public landing regressions pass. **All six post-correction member recapture cases pass**, covering every member route at 320/390/768/1366px, empty Home and doubled text. **All four presentation-enabled cases also pass** in the separate fictional environment. Existing manual hash-navigation warnings remain recorded; no failing assertion is waived.

**Visual review.** The fresh Impeccable review inspected all 28 route/size captures and special states, requesting two fixes: whole-word doubled-text Home actions and a draft-specific continuation. A single correction batch makes phone actions one column and uses Continue your draft for drafts. After recapture, the reviewer scores both findings **Resolved** and returns **ship at fix-list scope**. This is a screenshot/source verdict, not representative-user acceptance.

**Screenshots.** All seven member routes at 320, 390, 768 and 1366 pixels are captured under [member-friendly](screenshots/member-friendly/). These are fictional rendering fixtures, with actual API workflow tests recorded separately. Examples: [Home at 390px](screenshots/member-friendly/home-390.jpg), [Apply at 390px](screenshots/member-friendly/apply-390.jpg), [application review](screenshots/member-friendly/application-390.jpg), [help at 320px](screenshots/member-friendly/help-320.jpg), [sharing preview](screenshots/member-friendly/help-review-320.jpg), [desktop Home](screenshots/member-friendly/home-1366.jpg), [desktop Apply](screenshots/member-friendly/apply-1366.jpg) and [doubled text](screenshots/member-friendly/text-200-320.jpg). The original screenshots are retained as historical evidence.

**Documentation and scope checks.** All 298 local Markdown target paths and both new UI-09 anchors resolve; whitespace checks pass. The pre-existing token role blocks, canonical domain types/fixtures, dependencies and landing/staff source remain unchanged. Unrelated screenshots rewritten by existing full-suite captures were restored.

**Resilience and isolation.** [Supplemental browser evidence](screenshots/member-friendly/font-art-fallback.json) confirms that Nunito loads with the PHP/minus/Filipino glyph probe; blocking the member font and Gabay assets leaves the form enabled and without page overflow or uncaught page errors. Reduced-motion captures have no decorative animation. Staff retains Google Sans after member navigation.

Technical publication does not establish representative member acceptance, physical-device verification or institutional release. Task status remains in Assignment.md.
