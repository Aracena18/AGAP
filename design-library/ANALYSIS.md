# Gabay material analysis and rebranding handoff

3 November 2026, Asia/Manila. UI-05, Robert. Starting application/main revision: `d0e0e6e193b70bd3d50f8a89dce7343a46c306f3`. Asset commit: `9ff66a3b8e0614d09adc14bb52261084c6c95be7`. The user requests synchronization and analysis first, followed by a cleaner, responsive member/staff rebrand with the same underlying system.

This is an evidence and migration report. [design.md section 16](../design.md#16-planned-gabay-rebranding--3-november-2026) owns the proposed UI/UX requirements; [Assignment.md](../Assignment.md) remains the sole task/status tracker. The existing product, architecture, financial rules, access boundaries and owner responsibilities remain authoritative.

## 1. Synchronization and material inventory

Fetched all remote refs and ran a normal fast-forward-only pull of main; it was already current at `d0e0e6e`. That revision already includes the accepted-direction archive from PR #25 and the UI-04 interaction fixes. This analysis introduces no new functional feature from another branch and merges no pending PR.

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

Files are organized under `design-library/assets`, `concepts` and `specimens`. Original bytes are unchanged. Restoring the component kit's documented folders fixes its missing preview-image references without changing the supplied code. The raw archive's two identical token files are preserved as candidate sources; neither is imported by AGAP. The original ZIP/extraction and unrelated local documents remain local.

## 2. What the materials establish

The selected visual direction is **green, white and yellow**, with dark forest text, pale surfaces, restrained outlines, rounded controls and the supplied 3D firefly. Google Sans and Material Symbols Rounded remain suitable existing foundations. The preview's three-petal brand mark is available as CSS geometry; a separate approved standalone vector logo file is not included.

The member references favor a guided, spacious experience with occasional Gabay scenes. Staff references favor compact, precise tables and clear task hierarchy. These are two densities of one brand, rather than a second application or a second design system. The strongest first implementation slice is the shared shell/sign-in plus member home, rendered on phone and desktop, before rolling the same foundations through forms and staff surfaces.

The supplied screens are useful composition references, not replacement functional specifications. Their budget example, principal slider, term choices, progress counts and repayment suggestions do not establish available AGAP features or approved offers. The preview's `updateScenario()` is illustrative floating-point arithmetic with omitted costs. It stays in the specimen; the app continues to display its existing deterministic checked results.

Gabay can support welcome, missing information, saved drafts, actual review status, unavailable information and payment-help acknowledgement. The illustrated checkmark, shield, growth arrow or happy expression must not imply loan approval, verified evidence, guaranteed safety or changed terms. An unavailable application list must not be rendered as an empty list merely to use the no-applications artwork.

## 3. Candidate component mapping

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

## 4. Browser and palette findings

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

## 5. Proposed implementation sequence

1. **UI-06 foundation and first screens:** approve the section 16 proposal; migrate the canonical token roles once, then shared shell/navigation, staff/member sign-in and member home. Show phone and desktop states before extending the treatment. Keep current route destinations and account behavior.
2. **Shared controls and member forms:** adopt compatible fields, buttons, notices and guidance; retain save/submit semantics, warnings, uncertain retries, source confirmation and existing unavailable states. Resolve the specimen findings during integration.
3. **Staff and review surfaces:** apply shared typography, density, status and layout improvements. Preserve evidence detail, paired financial results, sources, history and print behavior. Robert owns shared changes; domain owners retain their feature paths and logic.
4. **Selected motion and delivery:** introduce only justified optional cues using the supplied art; keep figures steady, stop ornamental motion during tasks and provide an intentional reduced-motion state. Inspect appropriate current source if a React Bits component is selected; no new library is required by this plan.
5. **Release evidence:** run `npm run check` and `npm run test:e2e` after actual UI changes; review 320px, tablet, desktop, 200% zoom, keyboard/focus, long text, reduced motion, contrast and saved-brief printing. Retain UI-04 sharing/focus fixes and all financial oracles. Representative member/staff review remains separate from automated checks.

The target is a cleaner face for the same product. It does not activate a new chatbot, AI authority, budget calculator, goal/investment flow, 5C score, financial service, authentication mode or lending policy. Product work retains its existing task/status/dependency boundaries.

## 6. Handoff verification

- Exact source-to-ZIP and source-to-committed-blob checks passed for every supplied file. Dimensions and actual alpha channels were inspected; character sheets and key concepts were visually reviewed.
- `npm run lint` and `npm run build` passed. A narrowly scoped browser-globals setting lets the preserved specimen JavaScript be linted in its actual environment; no lint rule is disabled.
- Application, API, domain, canonical tokens, fixture registry, tests, dependency manifest and lockfile are unchanged. Asset/specimen publication is not UI feature integration, so unrelated database/application regression runs are not represented as new acceptance evidence.
- Local Markdown link/anchor and specimen-resource checks passed. `graphify update .` completed; the optional SQL parser remains unavailable and the existing contracts barrel is partially extracted. No remote CI result, final redesigned screen, production readiness or representative-user acceptance is inferred from asset publication.

The next review concerns the concrete design requirements and sequence above. Asset archival and analysis do not authorize treating the standalone showcase's mock interactions as the operational AGAP system.
