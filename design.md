# AGAP UI/UX design system

**Status:** implemented baseline; visual acceptance and representative staff evaluation are pending.

**Baseline reviewed:** 20 October 2026.

**Audience:** designers, developers, reviewers, and AI contributors.

**Production expansion:** the [product solution](docs/AGAP_Product_Solution.md) now governs target scope, including full lending operations and financial-health follow-up. This document remains the sole UI/UX authority. The screens below describe the implemented baseline; production access, servicing, accounting and monitoring screens require blueprints and review here before being declared accepted. Backend architecture planning no longer waits for frontend acceptance.

AGAP is a financial health loan-review workspace. Its interface should help staff connect evidence, everyday cash needs, available repayment options, and a recorded human decision. The design direction is Google-inspired: Google Sans, Material Symbols Rounded, white surfaces, blue actions, and calm hierarchy, while retaining AGAP's own identity.

This file defines UI/UX requirements. Descriptions labeled **Baseline** refer to the inspected implementation. **Pending** items identify refinements or checks that have not been accepted or completed; writing them here does not implement them.

| Authority | Responsibility |
| --- | --- |
| [Product solution](docs/AGAP_Product_Solution.md) | Target scope, feature priorities and required behavior |
| [Earlier product freeze](docs/AGAP_Product_Freeze.md) | Historical problem/demo baseline and independent demonstration arithmetic |
| **This document** | Appearance, information hierarchy, layouts, component behavior, and user interaction |
| [Frontend specification](docs/AGAP_Frontend_Spec.md) and [production architecture](docs/AGAP_Production_Architecture.md) | Implemented browser contracts and planned production interfaces, calculations, versioning and persistence boundaries respectively |
| [Tokens](src/styles/tokens.css), [global styles](src/styles/global.css), and [shared UI](src/shared/ui/index.tsx) | Executable visual values, shared styles, and controls |
| [Domain contracts](src/domain/types.ts) and [fictional fixtures](src/demo/cases.ts) | Implemented data shapes, evidence, offers, and demonstration inputs |

Use the executable definitions rather than copying tokens or fixtures into another configuration. If code differs from a design requirement, identify the difference in the task or pull request. Change the relevant authority and implementation together when the team changes an agreed rule.

## 1. Design principles

- **Give each element a job.** Include information or controls that help staff understand the case, check a fact, compare an option, or complete the next action.
- **Make priority visible.** Use size, weight, alignment, and spacing to establish order. Give the current task one dominant action; keep inspection, cancellation, and secondary navigation quieter.
- **Group related information.** Keep a value near its label, source, and status. Use whitespace and a shared heading before adding another border or panel.
- **Keep the workspace familiar.** Use labeled fields, semantic tables, ordinary links, and native selection controls. Consistent placement should reduce the need for instructions.
- **Show financial consequences clearly.** A positive monthly total and a shortage before payday are equally relevant. Present both without an unexplained score or a decorative verdict.
- **Use concise, necessary language.** Prefer sentence case and concrete verbs: “Review,” “Save correction,” and “Record decision.” Retain assumptions, costs, and qualifications that affect a decision; remove copy that only describes the interface.
- **Make uncertainty and responsibility visible.** Missing evidence remains unavailable. Recommendations, decisions, exceptions, and explanation origins have distinct labels. Document support does not establish authenticity.

Polish comes from consistent type, alignment, grouping, and state behavior. Additional animation, illustration, shadows, or summary cards need a task-related purpose.

## 2. Users and navigation

### Roles and responsibilities

| User | Main task | Interface treatment |
| --- | --- | --- |
| Loan officer | Inspect sources, correct facts, compare available offers, and recommend an option | Editing and recommendation actions are available in the officer role |
| Reviewer | Inspect the review and record a decision, rationale, and any exception | Decision form is available in the reviewer role; evidence remains inspectable |
| Member, assisted by staff | Clarify circumstances and understand the outcome and next step | Plain-language explanation and printable saved brief |
| Bookkeeper or cashier | Help clarify an existing obligation or payment fact | Supporting participant; no additional prototype role or workspace |

The labeled **Demo role** switch stays in the shared header. Display the active fictional staff identity. These roles demonstrate responsibility within one browser; they are not authentication or authorization for a live institution.

### Information architecture

Applications → Evidence → Repayment comparison → Decision and explanation.

Applications is the entry list. Within a case, keep its identity, requested loan, review status, and three review navigation links above the page content. Mark the current screen programmatically and visually. Navigation remains available when information is incomplete; validate consequential actions at the point of use.

Use ordinary links for navigation and buttons for actions. Source links from the cash-movement table lead to the relevant source on Evidence. Returning to the application list should remain easy to find without competing with the current task.

Review statuses describe workflow: **Needs information**, **In review**, **Ready for reviewer**, **Decision recorded**, **Clarification requested**, and **Review again**. The executable mapping is [caseStatus](src/app/caseStatus.ts). “Decision recorded” confirms recordkeeping; it does not mean approval.

## 3. Visual foundations

### Typography

Use locally bundled **Google Sans**, primarily weights 400, 500, and 600. The font and icon licenses are recorded in [third-party notices](THIRD_PARTY_NOTICES.md). The official font source and supporting design references are listed in [section 8](#primary-references).

| Role | Baseline treatment | Purpose |
| --- | --- | --- |
| Page title | 28px / 36px, weight 400 | Establish the current task without heavy display typography |
| Section heading | 18px / 26px, weight 500 | Group evidence, comparisons, and review actions |
| Body and field input | 16px / 24px, weight 400 | Comfortable reading and data entry |
| Table content | 14px, inherited 1.5 line height; 13px headers | Scan structured comparisons without shrinking the whole page |
| Button label | 14px / 20px, weight 500 | Clear action hierarchy |
| Supporting metadata | Usually 13px / 19px through `.small`; compact badges use 12px / 18px | Secondary provenance, dates, and status |
| Comparison amount | 38px / 46px, weight 500; 34px / 42px on narrow screens | Give both financial summary amounts equal emphasis |

These describe existing styles, not a second token registry. Use shared styles and feature compositions for their actual definitions. Keep member identity distinct from the page heading. Avoid widely spaced uppercase headings, excessive bold text, and introducing another typeface for numbers.

Financial values use tabular numerals. Check the actual bundled font with `₱`, `−`, `ñ`, `0`, `1`, `I`, and `l`, including print output. Text must remain readable while the font loads or if a fallback is used.

### Color roles

Consume [tokens](src/styles/tokens.css) by role; do not repeat their hexadecimal values in feature styles or create a separate palette.

| Token role | Use |
| --- | --- |
| `--canvas`, `--surface` | Pale workspace canvas and white content surfaces |
| `--ink`, `--muted` | Primary text and readable supporting information |
| `--primary`, `--primary-hover` | Primary actions and interactive emphasis |
| `--primary-soft`, `--primary-container`, `--on-primary-container` | Selection and related emphasis, with the appropriate foreground |
| `--surface-variant`, `--hover`, `--line` | Neutral status surfaces, hover feedback, and restrained separation |
| `--input-line`, `--focus` | Discoverable form boundaries and visible keyboard focus |
| `--warning` / `--warning-bg` | Unresolved evidence, timing concerns, exceptions, or renewed review |
| `--danger` / `--danger-bg` | Invalid input or a demonstrated financial shortfall |
| `--success` / `--success-bg` | Confirmed actions or readiness within the stated workflow |

Pair every semantic color with meaningful text. A successful save and an affordable loan are different claims. A nonnegative modeled balance never establishes future financial wellbeing.

### Spacing, shape, and surfaces

Use the shared 4, 8, 12, 16, 24, 32, and 48px spacing scale for new layout decisions. Smaller gaps connect labels and values; larger gaps separate tasks or sections. Align related fields and amounts rather than placing every item in its own card.

Major panels consume `--radius`, inputs consume `--control-radius`, and buttons consume `--button-radius`. The baseline uses 16px panels, 8px input corners, and pill-shaped actions. Keep panel borders light. Reserve stronger outlines for controls, selection, focus, or a specific issue. Use shadow sparingly for elevation and interaction feedback, as in the reset dialog and primary-button hover.

AGAP's interaction-target standard is at least 44px for standalone controls. Small native radio/checkbox marks need a sufficiently large clickable label. This is a project rule; it is not a claim that WCAG 2.2 AA requires every target to be 44px.

### Icons

Use the existing **Material Symbols Rounded** SVG vocabulary in [shared icons](src/shared/icons/index.tsx). Assets are unfilled weight-400 paths from a pinned official revision. Existing controls generally render them at 16, 20, or 24px; 32px is reserved for occasional empty/incomplete-state illustration.

| Meaning | Existing symbol |
| --- | --- |
| Application or record | `Description` |
| Inspect supporting evidence | `FindInPage` |
| Compare available offers | `CompareArrows` |
| Correct a fact | `Edit` |
| Date or follow-up | `CalendarToday` |
| Preserved history | `History` |
| Print saved explanation | `Print` |
| Issue or supporting information | `Warning`, `Info` |
| Search and navigation | `Search`, `ArrowForward`, `ArrowBack`, `ExpandMore` |
| Reset demo | `RestartAlt` |
| AGAP brand mark | `NorthEast`, within the existing brand treatment |

Choose icons by meaning and keep consequential actions labeled. Decorative icons are hidden from assistive technology; accessible names belong to the control. A checkmark or approval symbol must not imply approval before a reviewer records it.

### Financial and date formatting

Use the shared [formatters](src/domain/format.ts). Display PHP amounts with `₱`, grouped digits, up to two decimal places when present, and an explicit Unicode minus sign for negatives. The current formatter omits unnecessary `.00`. Right-align comparable amounts and keep the currency sign attached to the amount.

Use **Unavailable** for a missing amount. Reserve an em dash for a genuinely nonapplicable table cell, such as an opening-balance row without a cash movement. Neither presentation means zero.

Show readable calendar dates with a month name and year where needed for context. Keep the review period visible. Label cash balances as **end-of-day**; distinguish a source date, a fact's effective date, a cash date, and a decision's recorded date.

## 4. Layout and responsiveness

The primary review viewport is **1366 × 768**, with English content and PHP amounts. Use document scrolling rather than shrinking the interface to fit every section above the fold.

| Area | Baseline and layout rule |
| --- | --- |
| Shell | Header content is capped at 1440px; main content at 1280px with 24px horizontal padding on desktop |
| Case context | Member and request summary precede the review navigation; the page title follows |
| Evidence | Flexible fact column plus a 330px source panel; 24px gap; source panel is sticky on wider screens |
| Comparison | Two equal-width schedule choices and two equal-width financial summaries; full-width chart and cost table below |
| Decision | Recommendation and assessment precede the reviewer form; saved brief and follow-up follow the review action |
| Supporting detail | History, full payment dates, assumptions, and frozen staff evidence use clearly labeled disclosures |

At widths of 1100px and below, Evidence's source panel becomes a normal stacked section. At 767px and below, shell content wraps, main padding becomes 16px, comparison choices/metrics stack, and Decision's supporting columns stack. Evidence's correction fields and candidate cards become a single column at 600px and below. Preserve logical reading order through these changes.

Keep the page readable at 320 CSS pixels and at 200% zoom. Permit local horizontal scrolling for genuinely two-dimensional financial tables and the cash-flow chart. Give those regions an accessible name and keyboard access. Do not reduce text size to force table columns onto a narrow screen.

Keep essential context visible when secondary chrome is reduced. The baseline hides some header decoration on narrow screens; the demo role control and fictional-data context remain available through the workspace.

## 5. Shared components and patterns

`Button`, `Badge`, `Notice`, and `Money` are shared React components. Panels, fields, tables, disclosures, and the financial patterns below also use shared CSS or feature compositions; this catalog does not imply that each has a shared component export.

### Controls and feedback

| Pattern | When and hierarchy | Interaction | Applicable states |
| --- | --- | --- | --- |
| Button | Primary for the current commit action; secondary for supporting actions; quiet for inspection; danger for an explicit destructive action | Native button semantics, visible text, keyboard activation; use a link when navigating | Default, hover, focus, disabled, saving; preserve a readable label |
| Review navigation | Stable case-level links above page content | Preserve case identity and mark the active route; changing screens does not commit a form | Current, inactive, hover, focus; incomplete cases remain navigable |
| Form field | Visible label, input, then relevant hint/error; group related choices with a legend | Preserve values after an unsuccessful submission; associate errors with fields | Empty, populated, focused, invalid, disabled, submitting |
| Radio/checkbox group | Choose a schedule, outcome, exception, or reviewed acknowledgement | Clickable labels; native keyboard behavior; a radio selection alone does not record a recommendation or decision | Selected, unselected, focus, unavailable; unavailable actions have an explanation |
| Badge | Compact status or provenance adjacent to the relevant item | Informational, not a button | Neutral, brand, warning, danger, success, always with status text |
| Notice | A local issue, required next step, or result that changes how staff proceed | Keep near the affected task; announce submitted errors or saved results appropriately | Informational, warning, error, success; persistent recovery notices remain visible |
| Disclosure | Useful detail that is secondary to the immediate task | Descriptive native summary with visible focus and expanded/collapsed state | Closed/open; a required error, financial concern, or exception must remain discoverable |
| Reset dialog | Explicitly replace this browser's fictional progress | Name what will be replaced; initially focus “Keep changes”; allow cancellation and return focus to the trigger | Closed/open, cancel, confirmed reset; recovery warnings remain if storage still fails |

Use one dominant action within an active editing task. A saved-state continuation can be quieter than the commit action. Repeated inspection controls, print, and follow-up should not compete with recording the current decision.

### Evidence and financial patterns

| Pattern | When and hierarchy | Interaction | Applicable states |
| --- | --- | --- | --- |
| Fact row and source panel | Amount and label first; status, dates, and source adjacent; excerpt in a supporting panel | Inspect a source in context; open correction beside the fact; route-based source links focus the destination panel | Document-supported, member-reported, conflicting, missing, selected, editing |
| Correction editor and history | Current/candidate evidence before inputs; reason before save | Officer selects or enters the applicable value, source, status, effective date, and reason; history retains before/after context | Valid, invalid, saving, saved, canceled, renewed-review consequence |
| Financial summary pair | Monthly remaining and lowest dated balance receive equal size and weight | Selecting an available schedule updates both and their associated detail | Positive, zero, negative; incomplete assessment uses an unavailable state instead of metrics |
| Cash-flow chart and dated table | Directly labeled step line, zero reference, minimum, and closing balance; dated movements supply exact values | “View dated movements” opens the disclosure; evidence-source links return to the relevant source | Selected schedule, timing shortage, monthly shortfall, local overflow |
| Full-cost table | Comparable offer columns with aligned amounts; total repayment and financing cost together | Keep core costs visible; disclose detailed payment dates and terms below | Viewing indication, available offers, locally scrollable columns |
| Explanation and saved brief | Plain-language outcome, evidence, costs, assumptions, concerns, and next step | Preview before reviewed acknowledgement; print a selected saved snapshot | Template preview, reviewed/saved, historical, changed-case warning, missing historical explanation |

The chart represents supplied deterministic calculations. Do not smooth the line, invent a forecast, or make a hover interaction necessary to obtain an essential amount. Its accessible description summarizes opening, minimum, and closing balances; the dated table remains available without interpreting the drawing.

## 6. Screen blueprints

### Applications

**Question:** Which application needs attention? **Primary action:** Review the selected application.

Order: page title and cycle → labeled search/status filter and result count → application table → compact fictional-case context. Each row contains identity, purpose, requested amount, review status, received date, and a labeled Review link.

Search by name or application ID. A status filter narrows the same list; an empty result provides **Clear filters**. Display attention through workflow status. **Baseline:** cases retain fixture order; no urgency-ranking algorithm is implied. Keep the status vocabulary consistent with the case header.

### Evidence and circumstances

**Question:** Which facts can support this review? **Primary action:** Resolve the relevant discrepancy; within the editor, Save correction. The continuation is Review repayment comparison.

Order: heading and readiness → actionable evidence notice → grouped income, everyday expenses, existing obligation, and opening balance → correction history → continuation. The adjacent source panel follows the selected fact.

For conflicts, show candidate amounts with their source and date. Selecting a candidate source fills its amount/date for human review; it does not decide which source is correct. A correction requires a reason and retains earlier evidence. Missing amounts remain explicit, including when staff deliberately record information as unavailable.

Source status, effective date, cash date, and payroll-deduction treatment remain inspectable. Reviewers inspect evidence and history; the officer edits. Incomplete evidence can still lead to a clarification decision. **Baseline:** comparison navigation remains available and shows the incomplete-state explanation rather than fabricated totals.

### Repayment comparison

**Question:** Does an available schedule fit everyday cash needs, and what does it cost? **Primary action:** Save recommendation once the officer has examined the evidence and options.

Order: available schedule choices → equally prominent monthly remaining and lowest dated cash balance → explanation of any shortage → dated cash-flow chart and movements → full-cost comparison → recommendation and reason → assumptions and demo-policy detail.

For a timing gap, connect the negative dated balance to payday and the explicitly available alternative. For an overall monthly shortfall, state that changing the payment date does not remove the gap. For incomplete evidence, replace the complete comparison with the missing/conflicting facts and a **Review evidence** action.

Opening spendable cash and closing cash belong to the dated model. Monthly remaining is a separate result. Show whether an existing obligation has already been deducted from take-home pay. The authoritative formulas remain in the frontend specification and domain modules.

Keep principal, net received, separate fees, term, payment day/amount, total repayment, and total financing cost together. Selecting a schedule only examines it. Saving a recommendation commits the officer's chosen available option and reason; it does not approve a loan.

### Decision and explanation

**Question:** What does the reviewer decide, based on which evidence and reasoning? **Primary action:** Record decision. After saving, printing the saved brief becomes the main handoff action.

Order: current officer recommendation and assessment → reviewer outcome and offer considered → rationale → conditional departure/exception fields → review date → template preview and reviewed acknowledgement → record action → saved brief/history → follow-up checkpoint.

Approval and decline require complete critical evidence and a current officer recommendation. Return for clarification remains available when those prerequisites are absent. **Baseline:** outcome choices remain visible; validation prevents an unsupported submission and explains the prerequisite.

Show a departure reason when the decision departs from the recommendation. An approval that fails a configured demo-policy check needs an explicit exception and reason for each failed check. Missing critical evidence cannot become a complete assessment through an exception.

Label the preview **Deterministic template**. Relevant form edits clear the reviewed acknowledgement. A saved brief preserves the selected evidence, offer, calculations, reviewer, rationale, and explanation. Historical selection and changed-case warnings distinguish the original record from the current review.

The follow-up checkpoint is secondary. It records a short check-in and date; material fact changes belong in Evidence and require renewed review.

## 7. Interaction and accessibility

### Keyboard and focus

- Use semantic landmarks, headings, table captions, scoped headers, and visible input labels. Provide the existing skip link and a useful page title.
- Preserve a logical focus order. Route changes focus the main region. Source deep links focus the source panel; selecting a source in place updates the panel without unexpectedly moving keyboard focus.
- Make focus visible against adjacent surfaces and keep the focused control unobscured. The shared baseline uses a 2px focus outline with a 3px offset, with a distinct field-focus treatment.
- Correction editors focus their first input. Invalid submissions preserve data and direct attention to an invalid field or a useful error summary. Do not communicate validation through color alone.
- Dialog focus stays within the open dialog, Escape cancels, and closing restores focus to the trigger. Test these native behaviors in the supported browser.
- Keep scrollable tables/chart keyboard-accessible. Required figures and actions must work without hover, precision pointing, animation, or interpreting color.

Use WCAG 2.2 AA as the acceptance target: check text contrast, non-text contrast, visible/unobscured focus, labels, error identification, status messages, resizing, reflow, and target size. Normal text needs at least 4.5:1 contrast; qualifying large text and required non-text visual information need at least 3:1 against their adjacent colors. Check actual rendered states, not just isolated token pairs. The project's 44px target standard is specified separately above.

### Feedback, saving, and recovery

Announce successful saves with a concise status message. Distinguish saving from completion and prevent repeated commits while an action is pending. Invalid submissions retain entered values and give a recoverable next step. Do not replace a failed save with a success message.

The browser repository may fall back to memory-only changes. Keep the warning visible above case content, explain possible loss on refresh, and offer an explicit reset. Unreadable saved data stays preserved until reset. A warning about memory-only operation takes precedence over ordinary persistence claims.

**Baseline:** saved case records persist through refresh when browser storage works. Unsaved forms are local to their screen and are not persistent drafts; navigation, changing schedules, or role changes may discard them. Do not imply autosave of unfinished inputs. Pending usability review must address unexpected draft loss before promising draft recovery.

### Motion and explanation trust

Use brief feedback for hover, focus, and disclosure state changes. The baseline uses 120ms color/border transitions and honors `prefers-reduced-motion`. Avoid decorative motion and artificial loading delays in the review journey.

The current explanation is a deterministic template reviewed by staff. A later AI explanation must identify its origin, remain source-linked and reviewable, and preserve the checked financial results. Provider choice and live AI integration belong to later architecture work. Human recommendation and decision ownership remain visible in either mode.

### Printing

Print the selected **saved** member brief, including a historical one. Preserve the member/case identity, evidence version, considered option and full costs, relevant evidence/source dates, assumptions, concerns, decision, reviewer, and review date. Use the original snapshot rather than recalculating from current facts.

Hide navigation, role controls, editable forms, staff-only disclosures, and follow-up controls. The baseline targets A4 with 16mm margins and readable print typography. Permit multiple pages and preserve readable tables and headings without clipping. Check `₱`, `−`, names, and amounts in the generated PDF; a clean preview alone is insufficient.

## 8. Review criteria and references

### Acceptance checklist

These checks are acceptance work, not a declaration that every item has passed. Existing [browser tests](tests/workflow.spec.ts) and feature tests provide regression evidence; representative staff evaluation and explicit visual acceptance remain separate.

- [ ] At 1366 × 768, staff can identify the case, its review state, and the next meaningful action without reading a page of instructions.
- [ ] Google Sans and the single Rounded icon family render consistently. Every icon, color, panel, and supporting sentence serves a task.
- [ ] Complete the workflow with a keyboard; verify labels, focus, error recovery, source access, local scrolling, and reset-dialog behavior.
- [ ] Check actual contrast, 200% zoom, 320 CSS-pixel reflow, interaction targets, and reduced motion. Record any exceptions and fixes.
- [ ] Ana's correction, timing gap, permitted alternative, and full costs remain understandable together. Check arithmetic against the [frozen demonstration](docs/AGAP_Product_Freeze.md#5-the-fictional-demonstration), without maintaining another numerical oracle here.
- [ ] Ben's monthly shortfall remains visible after a date change; no available option is presented as a guaranteed remedy.
- [ ] Cora's missing evidence stays unavailable. A clarification decision is possible without displaying a complete assessment.
- [ ] Corrections and recommendations propagate through the shared review; material edits visibly require renewed review while historical decisions remain inspectable and printable.
- [ ] Rationale, departure reasons, required exceptions, explanation review, and review date cannot be skipped when required.
- [ ] Invalid submissions preserve entered values. Refresh/reset and memory-only recovery are understandable, and persistence claims match the current state.
- [ ] The selected saved brief prints with its original amounts, costs, assumptions, concerns, decision, evidence version, and dates.
- [ ] Observe representative staff using the fictional cases. Record confusion, missed information, repeated entry, task completion, and elapsed time; record participants and limitations before making benefit claims.

### Pending baseline refinements and checks

| Item found during documentation review | Required follow-up |
| --- | --- |
| The case's Applications back link has a 32px minimum height; several inline links have no explicit 44px target treatment | Review actual target bounds and spacing; align standalone controls with AGAP's 44px rule |
| Correction and decision forms move focus after validation; recommendation and follow-up forms do not share that handling | Check keyboard/error recovery and provide consistent focus guidance where needed |
| The application-list footer says changes are saved in this browser even while a memory-only warning may be displayed | Make persistence messaging agree with the active recovery state |
| Drafts are screen-local; switching route, schedule, or role can reset an unfinished form | Observe the effect in staff tasks and specify draft retention or a departure warning if needed |
| Evidence source selection updates a panel that stacks below the fact list on narrower screens | Confirm that staff can locate the updated source without losing the selected fact's context |
| Repeated conflict actions and the Evidence continuation can share primary styling | Review which action dominates in unresolved and editing states |

These are documentation findings and review tasks. They do not change product scope or mark the interface accepted. Record implementation work and acceptance evidence through the existing issue/PR workflow.

### Implementation examples

| Example | What it demonstrates |
| --- | --- |
| [Applications](docs/screenshots/applications.png) | Case list, status, and entry actions |
| [Evidence](docs/screenshots/evidence.png) | Source-linked facts and correction workspace |
| [Requested schedule](docs/screenshots/comparison-requested.png) | Monthly result alongside the timing shortage |
| [Alternative schedule](docs/screenshots/comparison.png) | Changed cash timing and comparable offer costs |
| [Decision](docs/screenshots/decision.png) | Human review and saved explanation |
| [Fictional member brief PDF](docs/screenshots/ana-member-brief.pdf) | Printable saved explanation |

These files illustrate the implemented baseline. They are not signed-off designs or evidence of staff usability acceptance. Update screenshots with relevant visual changes and record explicit acceptance separately.

### Primary references

References checked on 20 October 2026. These support asset selection and interaction/accessibility guidance; AGAP's palette, hierarchy, and layout are project decisions to evaluate in its own workflow.

| Source | Application to AGAP |
| --- | --- |
| [Google Sans source](https://github.com/google/fonts/tree/main/ofl/googlesans) and [font metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/googlesans/METADATA.pb) | Typeface identity and available weight axis; retain the [bundled OFL license](public/licenses/Google-Sans-OFL.txt) |
| [Google Material Symbols guide](https://developers.google.com/fonts/docs/material_symbols) | Rounded-family consistency and SVG assets; retain the [bundled Apache license](public/licenses/Material-Symbols-Apache-2.0.txt) |
| [Material color roles](https://m3.material.io/styles/color/roles) and [buttons](https://m3.material.io/components/buttons/overview) | Official design-system reference for semantic roles and action treatments; these pages require JavaScript |
| [GOV.UK tables](https://design-system.service.gov.uk/components/table/) | Semantic comparison tables, captions, headers, and right-aligned numbers |
| [GOV.UK text inputs](https://design-system.service.gov.uk/components/text-input/) | Visible field labels, associated hints, and errors |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessibility acceptance criteria; automated checks alone do not establish conformance |

For technical verification commands and implementation boundaries, use the [frontend specification](docs/AGAP_Frontend_Spec.md) and [README](README.md).


## 9. Staff intake workspace (21 October 2026)

Implemented examples, awaiting team visual acceptance and representative staff evaluation. The [platform guide](docs/AGAP_Platform_Foundation.md) defines server capabilities; this section governs the added interface.

Use the existing Google Sans typography, blue actions, surface/line colors, spacing tokens, buttons, badges and notices. Staff pages have a restrained brand/account header, Members/Applications navigation, scoped administration when permitted, a readable main landmark and a development-only fictional-data footer. Keep server intake and the fictional review demo visibly distinct. Never show a demo role selector as a staff access control.

Members use a scan-friendly table and an inline create/contact-correction form. Applications show the member name, purpose, requested amount, term and Draft state. Member names/branch labels replace raw UUIDs in ordinary controls. Requested terms are explicitly subject to review. Staff access uses a named revocation form with a reason, recent-MFA explanation and a consequential action button; never one-click revocation or self-approval implications.

Labels remain visible, targets are at least 44px, and fields stack on narrow screens. Tables scroll inside labeled, keyboard-focusable regions without page-level horizontal overflow. A skip link and route focus target support keyboard users. Validation summaries receive focus and retain entered values.

Show server saving, saved, loading, unavailable, stale/validation failure and uncertain save results separately. On uncertain saves, lock editing and offer “Retry same submission”; preserve the original request/key/sender. Warn before navigation loses unsaved values or uncertain retry details. On confirmed conflict, allow cancel/reload; never silently overwrite a changed record. An audit/history or financial approval UI is not implied by intake save confirmations.

[Members example](docs/screenshots/platform/staff-members.png) · [Applications example](docs/screenshots/platform/staff-applications.png) · [Staff access example](docs/screenshots/platform/staff-access.png). API-only application corrections/reassignment and broader staff grant/recovery screens remain pending designs, not accepted or implemented screens.
