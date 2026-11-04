# Frontend verification record

20 October 2026. Fictional browser prototype only. Team visual acceptance and representative staff evaluation remain pending.

> This record covers the existing browser implementation. The subsequent [product solution](AGAP_Product_Solution.md), [production architecture](AGAP_Production_Architecture.md) and [delivery plan](AGAP_Delivery_Plan.md) authorize full-product planning now. The historical backend-planning gate referenced below no longer restricts that work; the results here do not verify any new production module.

## Fresh implementation checks

- `npm run check`: passed lint, TypeScript, production build, and **115 unit/interaction tests**.
- `npm run test:e2e`: **6 Chromium browser tests passed** at the 1366×768 design viewport, with narrow-screen checks at 320 CSS pixels.
- Ana's complete evidence → comparison → recommendation → reviewer → saved brief journey passed using only keyboard input.
- Independent arithmetic tests cover Ana's ₱2,000 monthly remaining, −₱2,000 requested minimum, ₱1,000 alternative minimum, ₱11,000 closing, ₱36,000 total repayment and ₱6,000 financing cost. Ben stays −₱4,000 monthly; Cora stays incomplete.
- Browser tests exercise refresh, source tracing, explicit reset, preserved incompatible storage, deep decision history, renewed-review status and retained historical print figures.
- Automated axe checks found no violations in the tested screen states against WCAG 2 A/AA, 2.1 AA and 2.2 AA tags. This is automated coverage, not a claim of complete accessibility certification.
- Following the user's Google-inspired visual direction, font binary inspection confirmed bundled Google Sans contains ₱, −, ñ and 0/1/I/l, supports weights 400–700, and provides the `tnum` tabular-numeral feature used for financial values. Browser inspection confirmed Google Sans is applied. Font files and selected Material Symbols Rounded SVGs are served locally; their OFL/Apache licenses are included.
- Generated and text-inspected the two-page A4 fictional member brief: costs, assumptions, sources, decision and review date are present. Visual screenshots are in `docs/screenshots/`; they document implementation, not acceptance.

## Independent review and corrections

A separate read-only review found one Important explanation defect: returning a complete case could omit its failed policy checks. The template now preserves concerns from the checked available scenarios when no offer is selected. A regression proves Ben's −₱4,000 shortfall survives a return for clarification; the browser suite verifies the saved brief.

Additional corrections preserve structurally incomplete saved data for explicit recovery, focus the first invalid decision field after validation, and keep diagrams readable through local scrolling on small screens. Dated movements and detailed policy assumptions use progressive disclosure.

## Human review still required

- [Visual and workflow review](https://github.com/Aracena18/AGAP/issues/1): inspect actual screens, copy, hierarchy, keyboard use and printed explanation.
- [Representative staff exercise](https://github.com/Aracena18/AGAP/issues/2): record observed effort, missed issues and appropriate next actions. No impact percentage has been assumed.
- [Backend planning gate](https://github.com/Aracena18/AGAP/issues/3): database, authentication and AI gateway decisions follow frontend acceptance.

No real member records, live AI calls, core-system connections or payment operations were used.

## Remote CI limitation

GitHub Actions currently returns `startup_failure` before creating jobs, with an empty workflow name, `BuildFailed` path, and no job logs. Local checks above are verified; remote checks have not executed. The workflow passes actionlint, Actions is enabled, and the referenced action versions resolve. The supplied metadata does not establish the cause.

Track the observed runs and required administrator follow-up in [issue #5](https://github.com/Aracena18/AGAP/issues/5). The draft PR must not be described as having green remote checks until an actual job runs successfully.


## PR #26 integration — 3 November 2026

User-authorized review, conflict management, merge and pull of open AGAP pull requests. The only open request was [PR #26](https://github.com/Aracena18/AGAP/pull/26), tasks CRD-01 and UI-07. Review used isolated `codex/pr26-integration` over exact PR head `769789230f0e081da6c68dd1a5fd8f708ee7bd8b` and main `a69df0812d67fb67cda12ed9bc18445a99900172`. GitHub reported mergeable, with no unresolved review threads. Merging main into the candidate was already up to date; no conflict resolution or source changes were necessary. GitHub merged normally as `f078c28301799939275d47ebe6f11dcbd2af58b1`; a fast-forward-only pull synchronized the main checkout. The merged application, API, packages, tests and dependency trees match the tested head exactly.

### Reviewed behavior

- Included one-time facts with multiple cash dates yield an incomplete assessment naming the fact; a confirmed zero on one date remains valid. New saved assessments identify `dated-cash-flow-v4`. Historic snapshots and earlier engine versions retain their meaning.
- The fictional member/staff journey confirms two explicit installments, a one-time sourced school expense and an already payroll-deducted obligation. Independent expectations are PHP 400 horizon remaining, PHP 450 lowest balance, PHP 1,400 closing and PHP 1,100 contractual repayments. A correction preserves the original result and marks it for renewed review.
- Install dialog closure restores its invoking control even when lazy hero replacement changes the underlying button. The complete Ana keyboard journey continues to use native selection with checked values.
- Product/spec updates accompany behavior; rates/capacity policy, automatic overlap detection, institutional acceptance and release remain outside this bounded change. No blockers were found in the reviewed diff.

### Local verification

`npm run check` passed lint, generated contract/client consistency, frontend/API builds, **193 app tests, 522 platform/database tests and 76 evaluation-tool tests**. `npm run test:e2e` passed **all 52 Chromium tests on Linux/Node 24**. The real PostgreSQL/API journey exercises uncertain-save recovery, persistence, arithmetic, correction history and 320px reflow/accessibility. Existing missing/scanner/model states and legacy financial oracles remain checked. Only the isolated `agap-pr26-tests` fictional database at port 55443 was used, with web/API ports 5293/4223; unrelated databases and previews were preserved.

Visually inspected the browser captures below. The two install captures additionally record Escape returning focus to `install-hero` in a 320px reduced-motion context. Original screenshot evidence remains unchanged; fresh PR-specific copies preserve this fixture's changed facts and schedule.

| Evidence | Capture |
| --- | --- |
| Member facts, 320px | [Member](screenshots/pr26-integration/member-320.png) |
| Staff saved assessment, 320px | [Staff phone](screenshots/pr26-integration/staff-320.png) |
| Staff saved assessment, 1366px | [Staff desktop](screenshots/pr26-integration/staff-desktop.png) |
| Install dialog, 320px | [Dialog](screenshots/pr26-integration/install-dialog-320.png) |
| Restored opener focus, 320px | [Focus](screenshots/pr26-integration/install-focus-320.png) |

`graphify update .` completed (3,099 nodes / 8,494 edges), with the known unavailable `tree_sitter_sql` parser and partial contracts-barrel extraction warnings. Local documentation links/anchors and `git diff --check` pass. Tool graph limitations do not substitute for the application/database checks.

### Remote CI and remaining authority

The PR head's GitHub Actions [run 41610950677](https://github.com/Aracena18/AGAP/actions/runs/41610950677) reports `startup_failure`; its jobs API returned an empty list. This is not a remote test pass, and the available evidence does not identify a code-level failure or establish a repaired CI service. The merge follows the user's explicit authorization and passing required local checks; no branch protection was overridden. Publication is separate from consuming-owner, institutional, representative-user and production release acceptance. Existing task statuses and unrelated untracked local documents/archives remain preserved.

## Windows local startup — 4 November 2026

Purpose: SHOW-01 local startup evidence, including HLT-01 support and ACC-01 reporting checks. Application checkout: `42673378c015b175bd86d2742fba0bf0748c92fc`. The fictional walkthrough ran from **11:55:00 to 11:55:17 Asia/Manila**, using Node 24.22.2, PostgreSQL 18, Keycloak 26.4.7, Docker Compose 5.1.0 and an isolated headless Microsoft Edge browser through the installed Playwright package. [Machine-readable results and screenshot hashes](evidence/local-startup-2026-11-04.json) retain the run identity and exact recorded checks.

The local Docker engine was started, migrations reported current and the development seed completed without changing existing access. Windows reserved `58020–58119`, blocking Keycloak's original port `58080`; an ignored Compose override and private `.env` used `18080` with normal OIDC and automatic presentation mode disabled. PostgreSQL readiness, matching identity discovery, API health and the web response were checked. The existing API was reused. Missing Vite optimized dependencies returned 404; restarting the verified AGAP Vite process with `--force` repaired the cache. The [setup guide](AGAP_Platform_Foundation.md#windows-powershell-startup) records reproducible commands.

All **12 startup/workflow checks passed**:

| Area | Observed result |
| --- | --- |
| Landing | Renders after dependency-cache repair |
| Identity | Actual member, officer, administrator and auditor OIDC sign-ins passed; staff used real MFA enrollment rather than injected session fixtures |
| Ana | Source correction preserves PHP 2,000 monthly remaining; requested minimum is minus PHP 2,000; permitted after-payday minimum is PHP 1,000 |
| Ben and Cora | Ben retains minus PHP 4,000 after a date change; Cora retains an incomplete state with no complete monthly result |
| Member support | Exact message/check-in preview and sharing confirmation create a persisted fictional request |
| Assignment and response | Fresh-MFA administrator assigns the officer without disclosure access; assigned officer publishes a response; member sees it without the internal note |
| Access boundaries | Ordinary officer is denied reconciliation; auditor is denied support disclosures; member session does not grant staff access |
| Reconciliation | Auditor saves an **Empty** report for 1–4 November: zero event records in the development inventories, rather than a fabricated matched payment |

Actual captures: [landing](screenshots/local-startup-2026-11-04/landing.png), [Ana](screenshots/local-startup-2026-11-04/ana-comparison.png), [Ben](screenshots/local-startup-2026-11-04/ben-comparison.png), [Cora](screenshots/local-startup-2026-11-04/cora-incomplete.png), [staff support](screenshots/local-startup-2026-11-04/support-staff.png), [member support](screenshots/local-startup-2026-11-04/support-member.png), and [reconciliation](screenshots/local-startup-2026-11-04/reconciliation.png). All records shown are fictional. The walkthrough left one explicitly labeled support request and one empty report in the local development database; demo corrections used the isolated browser's storage. Its application sessions ended, and only its uniquely labeled temporary authenticators were removed, restoring the original enrollment requirements.

All seven captures were visually inspected. The landing capture retains the initial scroll position and below-fold lazy placeholders; a complete motion/gallery review is outside this startup check.

Documentation publication checks passed: **43 local links/anchors**, **seven PowerShell examples parsed**, **seven screenshot hashes**, the documented override's equality with the tested file, its single loopback Compose mapping, and `git diff --check`.

Scope: local startup and selected workflows, not a full regression run. `npm run check` and `npm run test:e2e` were **not rerun for this documentation-only change**. No remote CI pass, live model execution, payment movement, institutional acceptance or task completion is established by this record. Existing task statuses and previously recorded verification remain intact.
