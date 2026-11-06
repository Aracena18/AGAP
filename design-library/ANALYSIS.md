# Historical Gabay design-material analysis

> Historical inspection of supplied reference assets and specimens, 3 November 2026. Later landing/workspace adoption is described in [the library guide](README.md) and [design.md](../design.md); proposed work and findings below retain their original reference-material scope.


3 November 2026, Asia/Manila. UI-05, Robert. Starting application/main revision: `d0e0e6e193b70bd3d50f8a89dce7343a46c306f3`. Synchronized application/main revision: `63371c5bd3b06f57cb1b565c4f8b1f4288f59d69`. Asset commit: `9ff66a3b8e0614d09adc14bb52261084c6c95be7`. The user requests synchronization and analysis first, followed by a cleaner, responsive member/staff rebrand with the same underlying system.

This is an evidence and migration report. [design.md section 16](../design.md#16-planned-gabay-rebranding--3-november-2026) owns the proposed UI/UX requirements; [Assignment.md](../Assignment.md) remains the sole task/status tracker. The existing product, architecture, financial rules, access boundaries and owner responsibilities remain authoritative.

## 1. Synchronization and material inventory

Initially fetched remote refs and confirmed main was current at `d0e0e6e`, including the accepted-direction archive from PR #25 and UI-04 interaction fixes. During analysis, main advanced to `63371c5` with the evidence/affordability workflow. Integrated that already-published commit into the isolated analysis branch, preserving its canonical instructions, task statuses and implementation. Later integrated design-only commits through `8effecc`, including optimized transfers, a member/staff comparison and a member-journey prototype. No pending PR is merged by this task. The asset/analysis changes introduce no additional operational feature.

The local accepted-design archive contains **50 files / 31,216,368 bytes**, including **38 raster images**. All 49 entries in its supplied manifest match both the extracted files and ZIP bytes; the 50th file is that manifest itself. Independently verified all 50 copied files from the committed Git tree against [repository hashes](manifest.json), with image dimensions and alpha checked again.

| Group | Count | Readiness and use |
| --- | ---: | --- |
| Master Gabay | 1 | 1024 × 1024 transparent WebP; primary character reference |
| Turnaround | 6 | 1600 × 1600 transparent WebP views; preserve the supplied files |
| Expressions | 7 | 1254 × 1254 transparent PNGs; warm, curious, thoughtful, concerned and reassuring variants |
| Signature poses | 5 | 1600 × 1600 transparent WebPs for welcome, guidance, explanation, reminders and milestones |
| Empty/feedback states | 8 | 2048 × 2048 transparent WebPs; actual alpha range 0–255 |
| Member concepts | 5 | One composite board and four screens; financial figures are illustrative |
| Motion material | 2 | HTML prototype and reference image; supplied raster art is static, one frame per image |
| Component package | 15 | HTML/CSS/JS, README/decisions, nine React primitives and five 880px transparent WebP previews |
| Source manifest | 1 | Preserved original metadata |

Files are organized under `design-library/assets`, `concepts` and `specimens`. Original bytes are unchanged. Restoring the component kit's documented folders fixes its missing preview-image references without changing the supplied code. The raw archive's two identical token files are preserved as candidate sources; neither is imported by AGAP. The original ZIP/extraction and unrelated local documents remain local. A second incoming inventory contains 50 entries / 9,585,483 bytes, including 38 WebPs, indexed by the preserved [optimized-transfer manifest](source-manifests/optimized-transfer-2026-11-03.json). These derivatives and candidate sources coexist with the originals; all 50 incoming blob IDs/sizes were independently checked. The incoming standalone master is the source-quality original.

## 2. What the materials establish

The selected visual direction is **green, white and yellow**, with dark forest text, pale surfaces, restrained outlines, rounded controls and the supplied 3D firefly. Google Sans and Material Symbols Rounded remain suitable existing foundations. The preview's three-petal brand mark is available as CSS geometry; a separate approved standalone vector logo file is not included.

The member references favor a guided, spacious experience with occasional Gabay scenes. Staff references favor compact, precise tables and clear task hierarchy. These are two densities of one brand, rather than a second application or a second design system. The strongest first implementation slice is the shared shell/sign-in plus member home, rendered on phone and desktop, before rolling the same foundations through forms and staff surfaces.

The supplied screens are useful composition references, not replacement functional specifications. Their budget example, principal slider, term choices, progress counts and repayment suggestions do not establish available AGAP features or approved offers. The preview's `updateScenario()` is illustrative floating-point arithmetic with omitted costs. It stays in the specimen; the app continues to display its existing deterministic checked results.

Gabay can support welcome, missing information, saved drafts, actual review status, unavailable information and payment-help acknowledgement. The illustrated checkmark, shield, growth arrow or happy expression must not imply loan approval, verified evidence, guaranteed safety or changed terms. An unavailable application list must not be rendered as an empty list merely to use the no-applications artwork.

## 3. Newly synchronized features and instructions

The [delivery record](../docs/AGAP_Production_Architecture.md), [current architecture](../docs/AGAP_Production_Architecture.md) and design.md section 15 describe the new implemented candidate at `63371c5`:

- **Member and staff workspaces:** authenticated staff review evidence from Applications; members review only their own application. The member projection retains its legacy fallback when the workflow is unavailable. Feature activation defaults off; the redesign must cover enabled and unavailable states.
- **Documents and processing:** private upload intents accept PDF/JPEG/PNG up to 10 MiB. Quarantine, safety clearance, reading text, suggestions, failure and manual entry are distinct states. Cleared downloads, source text/page/version and provenance remain inspectable. File safety clearance is separate from verification of financial claims.
- **Human review and history:** suggestions require human confirmation or correction. Facts preserve unavailable reasons, source/statement, cash/effective/coverage dates, gross/net basis, period and payroll deduction treatment. Explicit not-applicable facts retain their amount/history. Staff-only verification methods/limitations stay out of member views. Stable retries, concurrency versions and saved snapshots survive presentation changes.
- **Server assessments:** canonical contracts advance to 0.3.0 while earlier financial snapshots retain their meaning. The server reuses deterministic integer-centavo/calendar-date arithmetic. Each reviewed calendar month, whole-horizon net remaining, dated shortage/balances, actual/configured minimum and full contractual offer costs have different meanings and must remain separately labeled. Reserved loan proceeds do not become spendable household income. Corrections make saved reviews stale without rewriting them.
- **Environment and operations:** server-controlled record mode determines fictional/cooperative wording; historical omitted mode keeps the fictional fallback. Private local/Azure storage, bounded scan/OCR/model jobs, policy publication, retirement/holds and API/worker deployment preparation exist as implementation candidates. They do not establish live production activation.

Actual GPU/model execution and independent model acceptance remain unavailable; manual entry is essential. Expired Azure access, budget approval, deployed scanner/container verification, remote CI startup failure and institutional policy/privacy/recovery/release evidence remain explicit blockers in the delivery record. No mascot, polished screen or successful local test resolves them. Approval/payments, later accounting reports, goals, numerical 5C scoring and model training remain subsequent milestones.

The [brand comparison](prototypes/brand-adoption-preview.html) reinforces the member warmth/staff clarity distinction, while the [member journey](prototypes/member-journey-preview.html) connects welcome, draft, information review, tracking, unavailable loan details and simulated payment help. Their controls are temporary browser state, not persistence or service integration. They support the existing MOB-01 discussion without advancing its status. Preserve the source-linked correction/not-applicable and renewed sharing-review patterns, but keep operational navigation and backend contracts authoritative.

The incoming section 15 and owner/task updates are preserved. The visual migration must retain both this current workspace and the historical fictional review routes; it must not use the static concept screens to replace the implemented source/fact/assessment distinctions.

## 4. Candidate component mapping

| Supplied component | Existing integration point | Required adaptation before adoption |
| --- | --- | --- |
| Button | `src/shared/ui` Button | Preserve existing variants, native types and disabled/save behavior; add optional loading behavior compatibly |
| Badge | Existing Badge and workflow labels | Preserve current tones/labels; green brand color must not change status meaning |
| Notice | Existing Notice | Keep current caller props and explicit announcement behavior; candidate requires a title and defaults to a live status, so wholesale replacement would change contracts |
| Card | Existing panel compositions | Use for real grouping; avoid nesting decorative panels or reproducing gallery labels in product screens |
| TextField / SelectField | Existing native labeled fields | Preserve constraints, value handling, error focus, helper IDs and uncertain-command locks; candidate 15px input styling needs alignment with the existing 16px input treatment |
| SegmentedControl | Existing choices when actual data permits them | Candidate's 40px minimum falls below AGAP's 44px standalone-control rule; use appropriate single-choice semantics and responsive layout |
| StepProgress | Existing application status/progress information | Define empty/complete bounds and meaningful accessible state; do not invent a four-step workflow or calculate progress from an unsupported source |
| GabayHelp | Reusable opt-in member guidance composition | Use selected supplied images, correct decorative/descriptive alt treatment and real existing help actions; the example alert is a specimen placeholder |

Keep the current Money/date formatters and icons. Adapt these treatments into the current shared UI incrementally; retain all existing consumers and financial workflow tests. The archive is a reference implementation, not another production primitive package.

## 5. Browser and palette findings

Rendered the restored HTML gallery in Chromium at 320, 768 and 1366px. All image references loaded. Escape closed the example dialog and returned focus to its trigger. The specimen uses a system fallback when the bundled app font is unavailable; these screenshots do not establish Google Sans fidelity in a redesigned application.

| Finding | Evidence | Adoption implication |
| --- | --- | --- |
| Phone overflow | 320px viewport produced 327px page width; repayment segments and status group reached approximately 326.9px | Redesign those groups for the available width; do not hide overflow to claim reflow |
| Invalid ARIA | Axe reports two `aria-prohibited-attr` nodes: `.budgetbar` and `.track` have names on role-less divs | Provide appropriate semantics with a text equivalent, or remove inappropriate ARIA in the integrated component |
| Secondary-text contrast | Four `color-contrast` findings: breadcrumb, mode indicator and two footer spans | Adjust the supporting-text role while retaining the core brand palette |
| Small standalone choices | React specimen sets segmented controls to 40px | Bring integrated targets to the project's 44px rule |
| Static source art | Every supplied raster has one frame | Motion concepts require implementation; no animated sprite/layer pack is supplied |
| Large originals | Largest original is 1,687,626 bytes; eight state illustrations are roughly 1.5–1.7 MB each | Keep archival masters outside the initial app payload; create selected responsive delivery variants in the implementation slice |

Computed contrast from the exact supplied sRGB values:

| Foreground / background | Ratio | Interpretation for adoption |
| --- | ---: | --- |
| Primary `#176347` / white | 7.21:1 | Strong basis for primary controls and ordinary text |
| Warning `#9A5B00` / `#FFF2D6` | 4.89:1 | Suitable token pair for ordinary warning text; rendered states still need checks |
| Subtle `#64786E` / canvas `#F7F9F6` | 4.45:1 | Below the current 4.5:1 normal-text target; browser finding confirmed |
| Leaf `#4D9B6F` / white | 3.37:1 | Accent/illustration use, not ordinary small text on white |
| Yellow `#E4BD52` / white | 1.79:1 | Decorative accent with a suitable dark foreground; not an independent status signal |
| Candidate input border `#A8BCAE` / white | 2.01:1 | Review required control-boundary contrast in the integrated field |

The [raw preview report](review/preview-checks.json) records findings, not a conformance pass. Screenshots: [phone](review/ui-kit-320.png), [tablet](review/ui-kit-768.png), [desktop](review/ui-kit-1366.png), [motion concept](review/motion-1366.png). The original specimens remain unchanged so these findings stay reproducible.

Also inspected the synchronized brand comparison in member/staff modes and all six member-journey destinations at 320/768/1366px: **24 page/state samples**, no broken images or page-level overflow. The [raw checks](review/synchronized-preview-checks.json) still report landmark-region findings in both wrappers, contrast findings in comparison progress/table text and two source-excerpt labels on the journey's information screen. Screenshots: [member phone](review/member-journey-preview-320.png), [member desktop](review/member-journey-preview-1366.png), [staff phone](review/brand-adoption-preview-320.png), [staff desktop](review/brand-adoption-preview-1366.png). Visual review additionally catches the journey's narrow two-column welcome: at 320px the heading breaks into near word-per-line fragments. Stack/rebalance that hero in the real member shell. Passing a page-width check alone does not establish useful mobile composition. These are limited specimen checks; keyboard/screen-reader, zoom, full interaction and representative-user acceptance remain pending.


## 6. Proposed implementation sequence

1. **UI-06 foundation and first screens:** approve the section 16 proposal; migrate the canonical token roles once, then shared shell/navigation, staff/member sign-in and member home. Show phone and desktop states before extending the treatment. Keep current route destinations and account behavior.
2. **Shared controls and member forms:** adopt compatible fields, buttons, notices and guidance; retain save/submit semantics, warnings, uncertain retries, source confirmation and existing unavailable states. Resolve the specimen findings during integration.
3. **Staff and review surfaces:** apply shared typography, density, status and layout improvements. Preserve source processing, human review, fact semantics, separate monthly/horizon results, full offer costs, private verification boundaries, stale histories, record-mode wording and print behavior. Robert owns shared changes; domain owners retain their feature paths and logic.
4. **Selected motion and delivery:** introduce only justified optional cues using the supplied art; keep figures steady, stop ornamental motion during tasks and provide an intentional reduced-motion state. Inspect appropriate current source if a React Bits component is selected; no new library is required by this plan.
5. **Release evidence:** run `npm run check` and `npm run test:e2e` after actual UI changes; review 320px, tablet, desktop, 200% zoom, keyboard/focus, long text, reduced motion, contrast and saved-brief printing. Retain UI-04 sharing/focus fixes and all financial oracles. Representative member/staff review remains separate from automated checks.

The target is a cleaner face for the same product. It does not activate a new chatbot, AI authority, budget calculator, goal/investment flow, 5C score, financial service, authentication mode or lending policy. Product work retains its existing task/status/dependency boundaries.

## 7. Handoff verification

- Exact source-to-ZIP and source-to-committed-blob checks passed for every supplied file. Dimensions and actual alpha channels were inspected; character sheets and key concepts were visually reviewed.
- Combined `npm run check` passed: lint, generated contracts, frontend/API builds, 193 application tests, 520 platform/database tests and 76 evaluation-tool tests. All 39 Chromium tests passed on the isolated fictional database; incoming design-only files then passed lint with scoped browser globals. A narrowly scoped browser-globals setting lets the preserved specimen JavaScript be linted in its actual environment; no lint rule is disabled.
- The asset/analysis task leaves application, API, domain, canonical tokens, fixture registry, tests, dependency manifest and lockfile identical to the synchronized `63371c5` tree. The upstream functional additions are preserved; they are not attributed to UI-05. Combined revision validation is recorded in the existing UI verification record. Asset/specimen publication is not UI feature integration.
- Local Markdown link/anchor and specimen-resource checks passed. `graphify update .` completed; the optional SQL parser remains unavailable and the existing contracts barrel is partially extracted. No remote CI result, final redesigned screen, production readiness or representative-user acceptance is inferred from asset publication.

The next review concerns the concrete design requirements and sequence above. Asset archival and analysis do not authorize treating the standalone showcase's mock interactions as the operational AGAP system.
