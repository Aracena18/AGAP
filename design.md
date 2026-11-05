# AGAP UI/UX design system

## Current support position — HLT-01, 5 November 2026

In the assigned officer's support detail, retain the submitted dated position and place a separate Current posted loan position section immediately after the submission-time position, before the response form. Label the as-of date and posted-through time beside principal, interest/fees due, overdue and pending movements using existing Money and metadata controls. Keep the distinction between unavailable and recorded zero. State that pending movements do not reduce debt and that the submitted snapshot remains preserved.

Use the existing secondary Refresh current position button, loading status, warning Notice and Retry current position action. Refresh clears the old current figures while a new read is pending; failed reads preserve the response draft. Disable refresh during saving/uncertain commands. Keep keyboard focus on the read action; render all fields without page overflow at 320px. A later access denial clears private details and drafts together. No new tokens, financial actions or ornamental motion are added.

## Priority review and escalation — PRV-01, 5 November 2026

Extend the existing fictional review workspace with a dedicated Review summary before Evidence, Compare options and Decision; preserve the order and destinations of the existing steps. Queue entries show every applicable path and a named owner/next action, with material concerns first and original submission age retained. Completed decisions remain available under All applications. No repayment score, risk-free badge or AI-confidence ranking is introduced.

The summary uses existing tokens, panels, badges, notices and labeled forms. Keep readiness blockers, modeled-period figures and full costs, source links, evidence-currentness confirmation, simulated AI checking and escalation actions discoverable. Show unavailable amounts without zero placeholders. Missing information and earlier material findings awaiting recheck must coexist visibly. Sources open the existing evidence/source pane.

Show the assignment action only to Mara and investigation/resolution actions only to Luis under the existing simulated roles. The in-app notice inbox includes a direct case link and an explicit acknowledgment control; explain that receipt does not resolve the concern. Investigation and final lending decisions remain separate forms. Failed current material checks have no approval-exception bypass controls in this demo. Preserve history and frozen member printing; staff review history stays in the expandable staff details.

Use clear labels, recoverable form errors, keyboard-operable controls, existing focus handling and 320px reflow. Queue rows become labeled phone records; summary metrics stack and navigation wraps. No new dependencies, mascot artwork, animation or alternative design system is required. All new capability badges remain Planned until the saved-action browser demonstration in [PRV-01 verification](docs/AGAP_Priority_Review_Verification.md); Working does not assert representative acceptance or production readiness.

**Status:** implemented baseline plus explicitly planned expansion blueprints; visual acceptance and representative staff evaluation are pending.

**Baseline reviewed:** 20 October 2026.

**Planned expansion updated:** 25 October 2026. Section 10 supersedes the earlier later-member-channel sequencing; it is a design requirement for future work, not an implemented or accepted screen.

**Audience:** designers, developers, reviewers, and AI contributors.

**Production expansion:** the [product solution](docs/AGAP_Product_Solution.md) governs member-phone applications, AI-assisted expense clarification, accountable review, full lending and financial-health support. This document remains the sole UI/UX authority. Sections labeled baseline/implemented describe inspected code; section 10 defines planned member and adjacent staff behavior requiring implementation and review. Backend planning does not wait for frontend acceptance.

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

The shared header contains AGAP, a workspace selector and an actual account menu. A real staff session is required to open the review demo. Put the labeled **Demo role** switch and Reset demo inside a **Demo tools** disclosure; these simulate responsibility in fictional browser records and never grant server authority. Show the signed-in account in the account menu, not a decorative fictional staff avatar.

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

The current explanation is a deterministic template reviewed by staff. A later AI explanation must identify its origin, remain source-linked and reviewable, and preserve the checked financial results. The planned shared AI adapter and confirmation boundary follow the production architecture; the implemented brief remains a template until the reviewed enhancement is delivered. Human recommendation and decision ownership remain visible in either mode.

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

Examples implemented on the separate foundation candidate, awaiting team visual acceptance and representative staff evaluation; they are not supplied by main. The [platform guide](docs/AGAP_Platform_Foundation.md) defines server capabilities; this section governs the added interface.

Use the existing Google Sans typography, blue actions, surface/line colors, spacing tokens, buttons, badges and notices. Staff pages have a restrained brand/account header, Members/Applications navigation, scoped administration when permitted, a readable main landmark and a development-only fictional-data footer. Keep server intake and the fictional review demo visibly distinct. Never show a demo role selector as a staff access control.

Members use a scan-friendly table and an inline create/contact-correction form. Applications show the member name, purpose, requested amount, term and Draft state. Member names/branch labels replace raw UUIDs in ordinary controls. Requested terms are explicitly subject to review. Staff access uses a named revocation form with a reason, recent-MFA explanation and a consequential action button; never one-click revocation or self-approval implications.

Labels remain visible, targets are at least 44px, and fields stack on narrow screens. Tables scroll inside labeled, keyboard-focusable regions without page-level horizontal overflow. A skip link and route focus target support keyboard users. Validation summaries receive focus and retain entered values.

Show server saving, saved, loading, unavailable, stale/validation failure and uncertain save results separately. On uncertain saves, lock editing and offer “Retry same submission”; preserve the original request/key/sender. Warn before navigation loses unsaved values or uncertain retry details. On confirmed conflict, allow cancel/reload; never silently overwrite a changed record. An audit/history or financial approval UI is not implied by intake save confirmations.

[Members example](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/screenshots/platform/staff-members.png) · [Applications example](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/screenshots/platform/staff-applications.png) · [Staff access example](https://github.com/Aracena18/AGAP/blob/19674ea8544e8401e7b2c8ed2903f4c84adb6e35/docs/screenshots/platform/staff-access.png). The 26 October candidate adds assigned-draft correction and submitted-request assignment screens. Broader staff grant/recovery screens remain pending designs; automated evidence does not establish visual acceptance.


## 10. Planned member and support workflows (25 October 2026)

**Status, 26 October: candidate member UI supplied; domain services, team acceptance and representative evaluation remain pending.** This section preserves the complete target and supersedes earlier later-member-channel sequencing. Real intake/reminder behavior and simulated downstream rendering are distinguished in [current verification](docs/AGAP_Robert_Member_Verification.md). Robert exclusively owns every member-phone screen and the member-portal facade. Other owners build their staff/domain views and provide the reviewed projections in the delivery plan.

### Member navigation and page hierarchy

Use the same Google Sans, tokens, shared controls, focus/error patterns and minimum target sizes as the baseline. Start with a responsive web experience; native installation, voice input and external push/SMS delivery are not first-demo prerequisites. At 320px, forms and summaries reflow without a page-wide horizontal scroll. Keep one primary action per current task.

The signed-in member home has four clearly labeled actions: **Apply for a loan**, **Track my application**, **View my loan**, and **Get payment help**. Show the next confirmed payment/date with position freshness when a loan exists; otherwise explain the applicable application/empty state. Member identity and sign-out are separate from staff navigation. Never offer a demo-role switch as member authentication or display an invented credit/financial-health score.

| Member workflow | Planned content | Primary action and state treatment |
| --- | --- | --- |
| Apply | Requested amount/purpose; relevant household/business income, essential expenses, existing obligations and timing; only missing relevant evidence | Continue through short grouped steps, then review and submit; application saved/submitted is not loan approval |
| Add/check information | Camera/file input or approved alternative statement; dated source; proposed extracted fields and unresolved questions | Confirm, edit or mark a suggestion not applicable; upload/quarantine, extracted text and independent checks are separate statuses |
| Review irregular needs | Candidate nonmonthly costs with supporting source; confirmation of relevance/amount/date and explicit recurrence assumptions | Confirm details; unknown stays unavailable; do not imply a past repair will necessarily recur |
| Track application | Plain stage, outstanding request, next responsible action and recorded decision/explanation when available | Supply requested information or inspect the explanation; no unsupported guaranteed approval date |
| Compare options | Only permitted options; net proceeds, payments/dates, fees, total cost, modeled horizon and remaining essentials context | Review the option; show incomplete information before unavailable results; selection is not institutional approval |
| View loan | Own posted balance/as-of date, effective schedule, receipts, next payment and reminder preferences | View schedule/receipt; distinguish pending transactions and unavailable/stale data from zero or success |
| Get payment help | Short explanation of changed circumstances, optional detail/contact preference and preview of what staff will see | Confirm and send request; then show review status and staff response without promising a pause or amendment |
| Review amended terms | Checked old/new dates, amounts, term and full cost; effective date, human authorization and original schedule available | Accept or decline the proposed terms; reminders change only when the amendment is effective |

Keep information reuse visible: show the document/source date and ask whether circumstances changed. Do not require every applicant to upload land titles, a fixed number of documents or all grocery receipts. Offer the approved alternative/assisted route where relevant. Technical engine versions, provider labels and correlation details belong in inspectable staff evidence rather than the member's main task flow.

### AI drafts, confirmation and uncertainty

Place a proposed value beside its source excerpt and status. Label an actual generated suggestion **AI draft**; label deterministic text **Template** and a simulated response **Simulated**. A generic success badge must not imply authenticity, affordability or approval. Do not show an unvalidated confidence percentage as a borrowing score.

Member/staff confirmation records what was accepted or corrected. It must not relabel the source independently verified. If an accepted value changes, show that affected pending results require review; historical decision briefs remain available. Display the calculation horizon and explicit assumptions alongside a comparison. A reserve view and a dated irregular expense cannot visually appear as two separate costs when they represent the same commitment.

If extraction fails, keep manual entry and source inspection available. If AI is unavailable, use the checklist/template path and explain the recoverable next action. Retain entered values on validation errors; focus a concise error summary and associate errors with fields. Confirmation controls and source links must work by keyboard. A member is never required to compose a prompt to complete the journey.

### Payment-help and adjacent staff blueprints

Explain who will receive the shared request before submission. Let the member preview/edit their words and proposed summary, skip unnecessary sensitive detail, or use staff assistance. A missing/declined check-in response remains unavailable. The first check-in can ask about difficulty meeting essentials, borrowing to repay and changed income/circumstances; no emotion/character inference is displayed.

**3 November focused audit refinement:** Review request focuses the sharing-preview heading. Edit message returns focus to the message field and clears the sharing acknowledgement; each new preview requires a fresh confirmation before sending. Keep the entered message and preferred response while moving between these steps. These interaction refinements do not implement the unavailable support service or change loan terms.

Long member messages and staff responses in request history wrap within their card, including an unbroken reference. Keep the complete text readable; hidden card overflow must not silently truncate it. Check the text's bounds inside the card as well as page-level reflow.

After submission, show **Sent for review** and the recorded response when available. A pending request does not say payments, fees or interest have paused. When an amendment is proposed, the member sees old/new cost and dates before acceptance; keep the original terms inspectable. Notification preferences do not alter contractual due dates. First-demo reminders are in-portal notices; simulated external delivery is labeled, and real delivery failures remain visible/recoverable.

| Staff view and owner | Required planned behavior |
| --- | --- |
| Evidence/expense review — Aaron | Sources and proposed/confirmed facts side by side; CI/issuer method/date/limitations separate; one focused missing question; no fraud verdict from a mismatch |
| Comparison — Aaron | Equal visibility for regular/irregular commitments, dated shortages, cost and horizon; permitted alternatives only; no date-change cure for an overall shortfall |
| Decision/conflict review — Benedict | Show preparer, reviewer and declared restriction; require reassignment/authorized resolution; block self-approval; explain current-input/exception errors |
| Amendment review — Benedict | Link to the support request, show checked cost comparison, authorization/acceptance/effectiveness and retained original schedule |
| Support queue — Earl | Show confirmed member concern next to a dated repayment position; assign staff action/follow-up; current repayment can coexist with reported strain |
| Reconciliation — Earl | Show the demonstrated receipt/subledger/GL relationship and unresolved differences; no green success from missing positions |

Use the existing table/notice/form patterns and shared tokens; owner briefs do not define competing layouts. Underlying permission enforcement is a server requirement, and hidden controls alone do not establish it.

### Staff response-history pagination — 4 November 2026

Within an opened staff support request, show the newest responses first and append older responses only through **Load older responses**, using the existing secondary button and Notice patterns. Show the number loaded, keeping partial history distinct from the complete history. During loading, announce progress and prevent duplicate activation. On a failed read, retain the existing history and response draft, then offer **Retry older responses**. When the last page is loaded, show **All responses loaded** and return focus to the Response history heading as the paging control disappears. Ordinary page loads keep keyboard focus and scroll context; they never submit a draft.

Request/version changes reset the history view. Later access denial clears private history and draft controls together. Match visible **Open support request** text with its accessible name. Maintain readable wrapping, 320px reflow and shared controls/tokens; pagination adds no decorative motion or new visual system. This is the supplied staff-history candidate; member-history pagination and representative-user acceptance remain separate.

### Staff follow-up workflow — 4 November 2026

Within Payment-help requests, assigned officers switch between **Support requests** and **Follow-ups** through clearly selected buttons in a named navigation region. Unsaved or uncertain actions disable switching until saved, safely retried or explicitly discarded. Reuse shared buttons, notices, badges, fields and keyboard-scrollable tables. Follow-up filters cover all assigned tasks, with explicit scheduled/due-today/overdue/completed labels and the server's Manila as-of date; status text carries meaning without relying on color.

The selected task shows its source response, original date and current follow-up date. Completion asks for **Action taken**; rescheduling asks for **New follow-up date** and **Reason for rescheduling**. Notes remain private to authorized staff. Explain that completion concerns the staff task and does not resolve a member's difficulty or change a loan. Historical dates indicate no recorded completion. Each new dated response creates a separate commitment, so the response form explains when to use the task's reschedule action instead.

Focus the selected-task heading after opening and validation/save errors when they appear. History loading retains the form and cursor; completion of history paging focuses its heading when the button disappears. Source text and identifiers wrap at 320px, with contained table scrolling. Later denial clears private data/drafts together. This supplies a staff workflow candidate; representative acceptance and broader health monitoring remain separate.

### Member request-history paging — 4 November 2026

Within Payment help, keep the form and **My requests** history as separate sections. Use shared controls for **Refresh requests**, **Load older requests**, retry, loading status and unavailable notices. Append older cards in newest-first submission order and show the loaded count; partial history must not appear complete. Refresh/loading never sends the form or clears its draft, preview or sharing acknowledgement. Disable history actions during a saving/uncertain submission. A confirmed submission starts history again from its newest page; failed follow-up reads remain separate from save certainty.

Retain the existing member-card hierarchy, shared-check-in content, published-response notices and narrow layout. Long messages and references wrap at 320px. Loading/retry preserve keyboard context; completion of paging announces the end and focuses My requests as its button disappears. Member scope changes and access denial clear private records/drafts together. No internal staff notes/task history appear in member cards. These rules describe the supplied paging candidate; representative acceptance remains pending.

### Model origin and research presentation

Qwen fine-tuning does not add another member task: retain the existing source/confirmation controls and manual fallback. Runtime origin and exact model/artifact versions remain inspectable in staff evidence rather than added to the member's main flow. Label generated drafts, templates and prerecorded/simulated responses accurately; an uploaded scan is not an authenticated claim.

EBM/logistic results belong to a separately labeled **Exploratory research** report, outside the member portal and staff lending decisions. Show the survey/cohort, reported emergency-funds target, sample/exclusions, comparison baseline, uncertainty and limits beside any feature-contribution chart. Do not display a member health/credit score, causal promise or suggested loan limit from these results. An offline report needs no new application route; any later interactive research view requires a design/ownership proposal through Robert.

The first demo ends payment help at submitted request, staff review and recorded response/follow-up. The amended-terms blueprint above is retained for stage 2 under Benedict and is not included in the new first-demo training workload. Pending requests leave the existing schedule/charges intact.

### Planned acceptance checks

Review the complete member journey with keyboard and 320px reflow, unavailable/stale/empty/error states, source confirmation/correction, saving and uncertain retries, inaccessible other-member records and revoked linkage. Check that support requests cannot silently alter a loan and original decisions/schedules remain accessible. Attach screenshots when actual UI is implemented.

Compare AI-assisted expense discovery with an annual-expense checklist and AI summaries with a plain form. Observe completion, missed relevant costs, unsupported assumptions, correction effort and comprehension. Technical tests and synthetic examples do not establish actual household benefit, accepted visual design or production readiness. Track implementation/status only in [Assignment.md](Assignment.md).

### Supplied member candidate and review evidence — 26 October

The current candidate implements the four-action home, separate member sign-in/sign-out, own draft/application review/submission, unavailable-domain states and persisted reminder preferences. Source upload/confirmation, checked options/decision acceptance, loan/receipt and payment-help screens connect to owner ports; their default domain services are unavailable. Screenshots containing simulated domain data are named and labeled accordingly. See [home at 320px](docs/screenshots/member-platform/member-home-320.png), [application form](docs/screenshots/member-platform/member-apply.png), [submitted request](docs/screenshots/member-platform/member-submitted.png), [unavailable support](docs/screenshots/member-platform/member-help-unavailable.png) and [staff assignment](docs/screenshots/member-platform/staff-member-assignment.png).

Use one router-level unsaved-change warning across editable staff/member forms, including Back/Forward, plus reload/close and sign-out warnings. Lock uncertain submissions and retain the original key/request until resolved. Hide old record/version results while new checked data loads; refresh must not silently discard unrelated unsent input. Session expiry/401 clears private content. Known unavailable services show a recoverable next step and cannot display a successful save or loan adjustment.

These are implemented examples awaiting human design acceptance. Automated 320px, keyboard, accessibility and workflow checks supplement representative member/staff review; they do not establish financial-health improvement or deployed lending capability.

## 11. Planned goals, savings and product guidance (29 October 2026)

**Status: planned; no new UI, accepted design, trained guidance or product availability is claimed.** This extends the member experience in section 10 and follows the [product requirements](docs/AGAP_Product_Solution.md#member-goals-savings-and-cooperative-product-guidance). Robert owns all member screens; Earl owns the staff goal/advice-review view in monitoring. Use existing tokens and controls. This addition does not replace the current first-demo path.

Offer **My goals** as a voluntary secondary destination on member home; it must not block applying, checking a loan or requesting help. Start with one active goal. Support emergency savings, a known expense, travel, leisure and a member-defined purpose without moral labels or pressure to buy a cooperative product. Explain data reuse and who can see a shared request; declining or pausing guidance has no credit consequence.

| Step | Planned content and primary action |
| --- | --- |
| Choose a goal | Purpose, target, date/flexibility and funds already dedicated; **Continue**; allow unknowns and staff assistance |
| Check my information | Dated income/expenses/debts/loan position and upcoming needs, sources, accessible versus restricted savings and explicit reserve assumptions; **Confirm details** |
| Explore a contribution | Required and modeled-available amounts, dated cash effect, protected essentials, horizon and assumptions; **Review this plan**; incomplete data or infeasibility precedes unavailable amounts |
| Review guidance | Source-linked AI draft or template, rationale, limitations, missing questions and alternatives; **Choose this plan** or edit; savings-choice confirmation is not a transfer |
| Consider a cooperative product | Neutral information about eligible approved catalogue candidates, fees, minimums, access/lockup, loss risks and return uncertainty; **Request staff review**; personalized investment recommendations appear only after review |
| Follow my goal | Dated chosen plan, member-reported or source-linked progress, next review and **Update my plan**; accessible pause/withdraw controls and a route to payment help |

Use plain language such as **Based on the information you confirmed** and **This plan needs more information**. Avoid an unexplained safe-to-invest score, guaranteed outcome, default investment selection, forced percentage, countdown/sales pressure or praise/shame about spending. Do not present a modeled amount as money already saved or an AI draft as reviewed advice. Display uncertainty and the effect on essential needs close to a contribution suggestion. A positive monthly total cannot visually override a dated shortage. Explain why data is requested without exposing provider/engine details in the member's main flow.

Personalized investment drafts stay in the staff view until suitability review. The member sees **Review pending** and neutral product/educational facts; there is no purchase/transfer action. The reviewed recommendation keeps reviewer/date, approved terms, risks/costs and no-action/alternative choices inspectable. A changed goal, household fact or product condition shows **Needs review** and preserves the earlier explanation. Staff see the relevant input sources, checked run/horizon, catalogue/content origin, unresolved questions and required review rationale together; administrative access alone is not review authority.

Include empty, incomplete, infeasible, stale, paused/withdrawn, target-already-met, no-eligible-product, review-pending/declined and AI-unavailable states. Retain form values on errors and use the established focus/error summary and save/retry rules. Verify keyboard use, meaningful currency/date labels, 320px reflow and source/correction access. Manual/template assistance must support the same member choice. Accepting a plan does not amend a loan, open an account or move funds. Attach implementation screenshots and record representative member/staff evaluation before declaring the blueprint accepted.

## 12. Planned 5C review, explanations and handoff (29 October 2026)

**Status: planned; no accepted scoring screen, numerical rubric or trained 5C model exists.** Follow the [product requirements](docs/AGAP_Product_Solution.md#ai-assisted-5c-review-and-explainable-handoff). Aaron owns the staff credit/evidence panel; Benedict owns the decision handoff/explanation; Robert owns shared wiring/contracts. Preserve current source inspection, correction, cash-flow and separate reviewer patterns.

Show five category sections: **Character — repayment-related evidence**, **Capacity**, **Capital**, **Collateral** and **Conditions**. Each has an explicitly named institution-rubric score only when configured and supported, review/as-of state, evidence/source links, key supported findings, missing questions and **Inspect criteria**. Keep **Rubric unavailable**, **Needs clarification**, **Not applicable by policy**, **AI draft**, **Reviewed** and **Needs renewed review** distinct from zero/failure. Show source completeness separately from a score. No invented percentage, AI-confidence gauge, percent-honest label, radar-chart-only verdict or default green approval badge.

The inspectable explanation shows criterion definition, input/source date, verification status, weight, awarded/possible points, arithmetic and human acceptance/rationale for discretionary findings. The main summary uses plain language from that trace, with unresolved matters close to the result. Make the rubric institution/product/version/date and score meaning accessible without technical clutter. Do not label a rubric score a chance of repaying. Unconfigured scores show no fabricated example numbers in a production-like view; any fictional illustration has an unmistakable demo-rubric label.

Capacity retains the actual dated cash-flow shortage, monthly remaining, full offer cost and horizon alongside the rubric result. A high value in another C or a configured aggregate cannot hide them. For collateral, explain when the product does not require it rather than treating absence as failure. Character concerns refer only to documented repayment/verification findings, with approved alternatives when history is unavailable, never personality or moral judgments.

Primary action is **Review findings**, then **Prepare handoff** after required confirmation; neither action approves the loan. The handoff preserves authorized original sources/member answers, accepted/candidate findings, per-C score or unavailable state, missing items, calculation/trace and officer recommendation. The separate reviewer sees the same saved versions and records their own decision/reason. Changed inputs/rubrics show a recoverable review-needed state and preserve historic snapshots. A member's existing plain-language explanation/correction route remains available; do not expose staff-only notes or create a public member ranking.

Use shared table/form/notice styles with keyboard-operable source/criterion controls, accessible labels and 320px reflow. Missing, stale, no-rubric, inapplicable, correction, forbidden access and AI-unavailable states must remain usable with a checklist/template fallback. Future implementation needs meaningful financial/workflow/source/rubric tests, screenshots and representative staff review; a generated explanation does not establish accepted design, score validity or measured impact.

## 13. Annotation cleanup and shared account controls — 26 October

This section supersedes earlier baseline header/copy/layout descriptions where they differ. The user requested less prose, stronger hierarchy, a navigation button for the review demo and a working account menu. Implementation evidence and screenshots belong to the UI verification record; human visual acceptance remains pending.

- Use one shared header: AGAP, a workspace selector (Member portal / Staff workspace / Review demo), and the actual account button when signed in. Move duplicate demo links out of cards/footers. Account menus expose identity and Sign out, with keyboard navigation, Escape/outside dismissal and appropriate focus return. An avatar must not imply an account that is not authenticated.
- **3 November focused audit refinement:** selecting a menu action restores focus to its trigger while the action resolves. Cancelling an unsaved-change sign-out warning leaves the account control focused and the unfinished form intact; successful route changes keep the existing main-region focus behavior.
- Member welcome: Welcome to AGAP; a simple Apply / Track / Get help icon row; one Sign in action. Enrollment guidance belongs under Need access? Preserve actionable sign-in errors.
- Staff/review sign-in: a static, full-viewport background with soft blue corner gradients from the existing palette, a white header and an opaque white sign-in card. Keep the background confined to signed-out staff/review entry screens, with readable focus/error states and 320px reflow.
- Applications: one heading, date-cycle context, search/status filters and the table. Remove the repeated workspace subtitle and three-case guide. Use one concise Demo data / browser-save notice; memory-only warnings remain truthful.
- Case identity: name and ID/occupation on the left, status beneath; requested amount and term on the right. Stack the amount group cleanly on phones. Review steps are Evidence / Compare options / Decision.
- Evidence: label and amount first; status, source and cash date next. Effective dates and secondary details are expandable, while deduction treatment remains visible. Short warnings point to the next action. Preserve complete source excerpts/dates, supported versus verified meanings, correction reasons/history and financial figures.
- Evidence readiness lists specific input/source issues, including missing categories without a fact row. Every included fact can block readiness, including optional facts; unused sources do not. Keep offer and policy results separate. Label ambiguous source references explicitly and never preview an arbitrary matching source. Rejected corrections preserve their draft; source errors identify and focus the field, while ambiguous target errors focus the form alert. Preserve the current source-card layout, navigation and fictional-data/verification notices.
- Review-demo role/reset controls stay under Demo tools. Review-demo access uses a real staff session; the fictional record actors and role simulation do not become server permissions or real lending decisions. Preserve browser edits on sign-out; Reset demo remains explicit.

Use existing Google Sans, tokens, Material symbols and shared controls. Verify at 320px and 1101px, keyboard menus and full source/correction/decision workflows. Keep private member/staff sessions separate; a workspace switch is navigation, not an authorization grant.


### Source and staff action cards — follow-up annotations

Keep source identity separate from Type/Date metadata, the complete excerpt, the linked field and the concise verification qualification. Use a wider desktop source column, readable quote typography and a contained excerpt surface; stack below the evidence on phones. Do not turn source text into invented facts or replace the original excerpt.

Assignment and access-revocation forms use the same action-card pattern: short action heading and target identity; an Authenticator required policy hint with a separate Verify link; aligned labeled fields; and a bordered footer with Cancel before the primary action. Verify remains outside the submit/cancel group. Destructive actions retain their red treatment and a short consequence statement. On phones, stack fields and keep the primary action prominent without horizontal overflow. Staff tabs use compact spacing and single-line labels.

Remove redundant Loan intake/Administration eyebrows and descriptive page subtitles from staff Applications/Staff access. Keep the page heading, workspace navigation, field labels, errors, required reasons, uncertain-result recovery and MFA authority checks. The user explicitly requested these presentation refinements; domain behavior and ownership remain unchanged.

## 14. Planned policy and cash-flow review refinement

**2 November 2026: planned acceptance refinement; no screen or visual acceptance is supplied.** Follow the [product amendment](docs/AGAP_Product_Solution.md#supplied-policy-and-cash-flow-sources--2-november-2026) and [policy-source register](docs/AGAP_Policy_Clarification_Register.md). Retain the existing shell, tokens, source cards, correction editor, comparison and human-review hierarchy; no redesign or additional member task is required by the documentation.

For an affected future implementation, make the applicable product/policy and source date inspectable. Present relevant document requirements and approved alternatives, identifying conditional applicability and the responsible next action. An optional or not-applicable requirement must not look like a failed mandatory one. A submitted document, confirmed fact and independently verified claim remain different states.

Keep amount period, gross/net basis and whether an obligation is already included discoverable beside the financial fact. Unknown remains unavailable rather than zero. Display capacity labels from the same approved configuration used by the calculation, keep eligibility separate from household cash flow, and show a missing-rule clarification rather than an invented percentage. Changing the selected supported payment mode must not leave an obsolete or misleading result visible. Source/offer/policy changes follow the existing renewed-review behavior and preserve historical snapshots.

Robert owns member UI/shared changes; Aaron owns evidence/comparison/product staff views; Benedict owns the decision handoff. Agree affected contracts and capacity before implementation, then verify retained values/error recovery, keyboard/source access, 320px reflow, accurate states and screenshots. Existing numerical 5C and servicing amendments retain their staged scope.

## 15. Evidence and affordability workspace candidate — 3 November 2026

The user authorizes the coordinated member/staff evidence workflow; the [delivery evidence](docs/AGAP_Evidence_Workflow_Delivery.md) supplies implementation screenshots and distinguishes release blockers from implemented examples. Preserve the existing Google-inspired shell, shared controls/tokens and historical demo routes. Representative-user acceptance is pending.

Staff enter from Applications → Review evidence; members remain on their own application page. Show source identity and file-check/processing status first, separate suggested values from confirmed facts and independent verification, then present the saved assessment. Statements are labeled Recorded statement; a file's passed safety checks never imply authenticated financial claims. Explain unavailable scanning/AI and provide manual entry with an explicit source or statement. Keep page excerpts and model provenance inspectable without treating them as verified facts.

The fact editor exposes amount/unavailable reason, dates/coverage, gross/net basis, period, deduction inclusion and confirmation/correction reason. Preserve fields after validation/stale errors; freeze ambiguous submissions and provide Retry same submission using the same request/key. Source and history inspection remain keyboard reachable. Member views omit private verification methods/limitations.

Use responsive source cards and stacked forms at 320px. Saved results distinguish each reviewed calendar-month segment, whole-horizon remaining money, lowest/closing balances and complete contractual costs. Show actual and configured minimum amounts together. Explain that loan proceeds are reserved for their purpose and that balances are measured at end of day. Changed inputs show renewed-review status while retaining earlier results. Do not imply approval or hide missing configuration behind zeroes. Visual/accessibility checks establish implementation evidence, not institutional or representative-user sign-off.

The fact editor includes an explicit “Does not apply to this household (keep history)” choice. Retain the original amount and explanation; display the not-applicable state in the confirmed-fact list. It must not look like zero or disappear from history.

Authenticated workspace footers use the server's record mode to distinguish a fictional environment from a cooperative account; a real-data workspace must not be labeled fictional. Missing mode preserves the fictional label for historical projections.

## 16. Planned Gabay rebranding — 3 November 2026

**Status: UI-06 implemented workspace candidate; representative acceptance pending.** The user supplied Gabay artwork, member concepts, motion examples and candidate components, then authorized the workspace migration after analysis while excluding the public landing. [Verified material analysis](design-library/ANALYSIS.md) and [asset manifest](design-library/manifest.json) preserve the reference evidence. This section merges the selected direction and its implementation refinements into the existing UI/UX authority; its historical heading and anchor are retained. UI-05 covers the asset/analysis handoff; [Assignment.md](Assignment.md) alone records current task status, and [UI verification](docs/AGAP_UI_Review_Verification.md) records checks and screenshots.

### Brand and visual foundations

The workspace candidate adopts the supplied green/white/yellow direction through the existing canonical token roles. This section supersedes earlier blue-workspace descriptions for the scoped member, staff, sign-in and review surfaces; those descriptions remain historical baseline context. The root and public landing token scopes are unchanged. Retain Google Sans, the existing Rounded operational icons, semantic HTML and the established financial patterns. Resolve executable values from [canonical tokens](src/styles/tokens.css), not the supplied specimen or tool-context files.

| Existing role | Supplied reference | Workspace mapping rule |
| --- | --- | --- |
| Primary action and hover | Candidate `--ag-primary` / `--ag-primary-hover` | Map once into `--primary` / `--primary-hover`; do not import a second active palette |
| Main and supporting surfaces | Candidate canvas, white surface and pale mint roles | Preserve readable input/table/panel boundaries and existing visual hierarchy |
| Text and brand ink | Candidate ink, forest and body-text roles | Supporting text must meet the existing contrast target; the candidate subtle role needs adjustment on its canvas |
| Selection and focus | Candidate mint, forest foreground and focus green | Verify active, hover, keyboard and error states across member and staff screens |
| Yellow and leaf green | Supplied sun/leaf accents | Use sparingly in brand art and non-consequential emphasis; preserve textual warning/status meaning |
| Warning, danger and success | Candidate semantic pairs, mapped to existing roles | A successful save is distinct from approval or affordability; financial shortages retain clear warning/error treatment |

Keep the existing spacing system, restrained 16px card treatment, readable controls and pill actions as the base. Workspace text fields use 16px text and a minimum 48px height; standalone targets remain at least 44px. Preserve current Button/Badge/Notice/Money contracts while adopting the supplied treatments; optional extensions need consumer checks. Avoid the specimen's decorative labels, oversized showcase headings and repetitive nested cards in operational pages. Use white surfaces, light borders and tonal grouping for ordinary task content; reserve elevation for the existing interaction and overlay patterns.

### Responsive composition

- **Member phone:** a clear current task, readable one-column fields, short supporting copy and a dominant action. Keep Home, Applications, Loans and Help visible in the top task navigation; reflow them into two rows of two on the smallest phones. Apply stays easy to reach through its existing destinations. Preserve keyboard/focus clearance and do not drop Loans merely to copy the concept's labels.
- **Member desktop/tablet:** keep the same routes and content, using available width for balanced task/support columns and quieter guidance. Do not stretch forms across the screen or force a phone frame onto desktop.
- **Staff and review:** use the same brand with greater information density and restrained art. Staff navigation sits to the left on desktop and wraps above content on narrower screens. Keep case identity, ordered review steps, evidence sources, checked figures, cost comparisons, exceptions and saved history discoverable. Fictional application-list rows reflow into labeled phone records. Wide staff and financial tables remain locally scrollable, with an accessible name and keyboard access; smaller viewports must not lose essential columns or source access.
- **All screens:** verify 320px, tablet, desktop and 200% zoom; inspect content inside cards as well as page overflow. Navigation, dialogs and fixed actions must preserve visible/unobscured focus and the UI-04 draft/sharing safeguards.

### Gabay and motion

Use the supplied 3D character family, with state-appropriate, optional art on member welcome, onboarding guidance, empty states and recoverable feedback. Keep actionable text and controls in HTML. Show no-applications art only for a successfully loaded empty list; distinguish loading, unavailable service and failed connection. Saved/review/assistance illustrations require the corresponding actual state. No expression, shield, checkmark or growth arrow can establish approval, verification, loan safety or changed payment terms.

Select small responsive delivery versions while preserving the archived master bytes and provenance. Reserve image dimensions, load only relevant art, and avoid shipping the complete source pack in the initial app payload. The supplied preview logo geometry can inform a crisp reviewed brand mark; it does not require replacing operational icons or drawing a different mascot.

Treat flutter, hover, glow, trail and expression examples as optional concepts. The supplied raster files are static; they do not provide independently animated wings. Use brief interaction feedback where it helps, stop ornamental movement during a task, keep financial values steady and provide an intentional reduced-motion alternative. No new animation dependency is required by the design proposal.

### Preserved behavior and acceptance

This is a presentation migration. Retain current authentication/session separation, routes, own-record access, role restrictions, source/confirmation distinctions, integer-centavo/date calculations, supplied offers, uncertain retries, renewed sharing acknowledgement, immutable decisions and printing. Preserve section 15’s source-processing states, manual fallback, complete fact semantics, explicit not-applicable history, private verification boundaries, separate monthly/horizon/cost results, stale saved assessments and server-controlled record-mode wording. Do not copy the showcase's simplified repayment arithmetic or expose depicted budget/goal/AI functions as newly implemented features.

Robert owns canonical tokens, shared controls/shell and member surfaces; domain owners retain their feature directories and logic. Begin with the shared foundation and member home/sign-in at phone and desktop sizes, then extend the reviewed treatment through member forms and staff surfaces. Each implementation slice updates its relevant tests and evidence and passes the required application/browser checks. Archived references and automated results do not establish representative-user acceptance or production readiness.

### Staff/review sign-in recovery — 3 November 2026

A failed session check keeps the sign-in card visible with one concise warning title and a recovery explanation. Place **Try again** below the warning as a separate primary action; do not wrap it into the message text. Retry checks the session in place, preserves the requested route/source fragment and keeps keyboard focus on the retry control while pending or still unavailable. Announce checking, prevent repeated activation and bound a stalled check to ten seconds. An ordinary signed-out response restores **Sign in**; a valid existing session opens the requested workspace. Keep actual outages visible until recovery; no fabricated session or demo-role bypass. Preserve 320px reflow and the existing workspace tokens/artwork. Implementation and checks belong in the [UI verification record](docs/AGAP_UI_Review_Verification.md#ui-06-sign-in-recovery--3-november-2026).

### UI-06 implementation boundary — 3 November 2026

The user authorizes this migration now and explicitly excludes the public landing. Append canonical `[data-agap-workspace]` token overrides, keeping `:root` and `[data-agap-landing]` unchanged. Load workspace-only presentation styles through WorkspaceRoutes. Shared Button/Badge/Notice/Money behavior and signatures remain intact; any visual overrides apply only inside the workspace boundary. No new dependency, API, calculator, record fixture or motion library is required.

Use a quiet white header, the supplied three-petal mark treatment, and separate workspace/account menus. Member navigation keeps all four labeled destinations visible, with phone reflow. A spacious welcome with selected Gabay artwork leads to the existing four tasks; forms remain a readable column. Staff use a compact left navigation at desktop and a wrapping top navigation on phones, with a white content surface and the same token/control vocabulary. Review-demo steps preserve their order and meaning. Selected source art is served from a workspace-specific path; original and landing files stay intact.

Use the confirmed empty-list artwork only after a successful empty application load. Missing service data stays a notice/unavailable state. Artwork remains decorative beside real HTML headings/actions. No animated entrances or perpetual decorative motion in operational screens; short native hover/focus feedback is sufficient. Measure 320px/tablet/desktop, 200% zoom, keyboard/focus and reduced motion, and compare public landing rendering before/after. The [frontend workspace contract](docs/AGAP_Frontend_Spec.md#gabay-workspace-presentation-candidate--ui-06-3-november-2026) records implementation boundaries; tool-context files point here and to executable sources without defining another palette. Technical review, required checks and direct publication do not establish consuming-owner agreement, representative-user acceptance or institutional release approval.

## 17. Public Gabay landing — UI-07, 3 November 2026

The user approved this surface for hackathon visitors. Implementation evidence and remaining acceptance are tracked in [UI-07 verification](docs/AGAP_Landing_Verification.md); publication is not institutional release or representative-user sign-off.

The public root introduces AGAP through the accepted front-facing Gabay firefly. Its green/white/yellow theme is scoped with `[data-agap-landing]` in the canonical token file. Existing workspace themes, Google Sans, Material Symbols Rounded, shared buttons, spacing and shape remain intact. The user’s subsequent browser comments explicitly lock the entire landing surface to white, including when the browser prefers dark mode. This page-local light theme supersedes its initial automatic dark variant; workspace themes are unchanged. Green carries action/selection; yellow is a restrained brand detail in the illustration and selection treatment, never a lending verdict.

Use one bounded sticky scene on desktop: the oversized AGAP wordmark and enlarged head/antennae keep their opening composition. Copy and install/demo actions stay clear of the mascot. As the camera pulls back, Gabay moves into a pale green branded stage on the right; Meet Gabay and one concise feature occupy the left. The user’s follow-up selects a turnaround story, superseding the earlier four simultaneous explanations. Use the existing front, quarter, profile and back assets for a full reversible turn over four reading moments: evidence, cash-flow timing, full costs and human decisions. Hold each reading moment; blend adjacent views briefly with a restrained perspective cue, avoiding prolonged double silhouettes. This is a 2D sequence with a 3D-style impression, not an interactive 3D model. The three-part accepted AGAP mark is reused as a quiet stage motif and in landing navigation/footer. No replacement logo is invented.

Keep ordinary scroll control inside the finite desktop scene (500svh including the opening and four chapters), with no wheel interception or snap. Four labeled native buttons provide direct keyboard access to the reading positions; the current step is explicit. Meet Gabay navigation lands at the first chapter rather than the story’s end. Only the current feature is exposed in the animated story’s accessibility tree; maintain one accessible AGAP page heading after the visual opening fades. Defer additional turn-image decoding until after the opening paint and retain the front view if any turn image fails. Mobile, short and reduced-motion layouts retain the static full mascot and all four readable explanations without the extended scene or extra turn downloads. Do not animate financial figures or imply an automated lending conclusion.

The rest of the page explains the connected workflow, then shows four keyboard-operated tabs containing fresh screenshots of the actual fictional evidence/cash-flow/options/decision screens. Keep fictional status outside the images, provide descriptive alternative text and full-size image access, and preserve the canonical Ana example rather than rendering a second calculator. Screenshot captions distinguish source conflict, a positive monthly remainder with a dated shortage, permitted options/full costs and the recorded human rationale. Failures offer the real review-demo destination.

Navigation is a single desktop line, with compact mobile links; query-based section destinations preserve the existing hash router and focus their headings. Installation uses a native modal dialog, browser prompt when offered, and platform instructions otherwise. Initial focus is Close; Escape/closing restores the invoking control. Dismissal, accepted request and installation confirmation are distinct. Installation adds access on the device, not offline finance, authentication, loan approval or production readiness. Keep the FAQ and member/staff links available without an account. All private destinations retain their existing guards.

Motion refinement: use proportional eased camera scale, native reversible scroll values and short clamped chapter transitions. The final view returns to the front. The existing 280ms screenshot-image arrival, 180ms caption feedback and reduced-motion alternatives remain. Use the installed Remotion skill’s timing guidance through the existing Motion/CSS runtime; no Remotion player or new runtime dependency is introduced. Later sections stay immediately available.

How it works uses an ordered three-stage gallery of actual fictional evidence, cash-flow and saved-decision screen previews. Show each complete screenshot in a clean AGAP window frame; use existing surface, shape and shadow tokens. On motion-enabled desktop, bind the fan directly to ordinary page scrolling: the windows start in one central stack, the side windows sweep outward along short shallow arcs, and the cash-flow window rises. The spread progresses as the gallery top moves from 70% to 30% of the viewport height, clamps to the start/end, holds when scrolling stops, and follows the same path back on reverse scrolling. Settle the side windows slightly lower, keep all three separated, and keep their captions aligned and fully readable throughout, including when scrolling stops midway. Use the existing Motion values in a lazy desktop leaf, with no one-shot timer, spring lag, replay flag, extra sticky scene or scroll interception. Mobile, short and reduced-motion viewports receive the clear static layout; changing preferences immediately releases the motion. Keep source-linked captions in DOM reading order throughout.

Keep the fictional-demonstration label outside and before the gallery. The complete preview images remain decorative because the following accessible demo tabs supply descriptions and full-size links. Failed previews retain their existing Material symbol and stage caption, and do not block the entrance. Use the current green workspace screenshots for consistent branding; keep all four screenshot examples fictional and preserve Ana’s checked figures. The gallery’s AGAP/module headers are presentation framing, not interactive browser controls.

Verify desktop 1366×768/1440px, mobile 390px/320px, 200% zoom, white presentation under both system preferences, reduced motion, start/middle/end/reverse reveal, focus, screenshot tabs, installation states, image failure, session guards and full workflow regression. Use one primary action label per intent and factual copy; no endorsements, invented impact metrics or unsupported service availability. `design.md` remains the only UI/UX authority; tool context files contain pointers only.


## 18. Temporary local presentation entry — 3 November 2026

The user requests direct entry for both member and staff/review, preserving authentication for later. With the explicit local presentation switch enabled, show only a brief workspace-opening status while obtaining a real bounded fictional session; do not flash sign-in/password UI. Keep member and staff accounts/scopes separate. Preserve the workspace selector, current tasks, fictional context, real unavailable states, Demo tools and financial/history behavior. The shared header replaces account/sign-out controls with quiet **Presentation mode** text, which may wrap at the narrowest phone width. It must remain readable without page overflow at 320px.

Automatically refresh an expired presentation session without replaying a command. Missing/revoked fictional accounts and connection failures remain recoverable workspace errors with Try again; never invent a successful login or available domain result. Disabling the switch restores ordinary sign-in/account controls and rejects presentation cookies. Normal and production auth layouts remain implemented. This is a user-authorized temporary exception to the signed-out entry described in sections 2/13/16, not a new production access design. [Authentication boundary](docs/AGAP_UI_Auth_Proposal.md#temporary-local-presentation-entry--3-november-2026) and [verification](docs/AGAP_UI_Review_Verification.md#temporary-presentation-mode--3-november-2026) record implementation and pending representative acceptance.

## 19. Planned priority review and human escalation — 5 November 2026

**PRV-01 follow-up:** the implemented, demonstrated three-case browser slice follows the PRV-01 amendment at the top of this file and its [verification/screenshots](docs/AGAP_Priority_Review_Verification.md). The original PLN-05 blueprint below remains the broader planned integration direction; it does not relabel the verified fictional capabilities as unimplemented or assert production/representative acceptance.

**Status: planned customization from the corrected selected-constraint fact sheet; no working screen or visual acceptance is claimed.** The [product amendment](docs/AGAP_Product_Solution.md#selected-constraint-limited-review-capacity--5-november-2026) governs behavior and the [implementation plan](docs/AGAP_Priority_Review_Plan.md) defines technical scope. This section adds the priority/summary blueprint to the earlier fixture-order Applications baseline. It retains current Google-inspired hierarchy, Gabay workspace tokens and shared controls; no new design system, dependency, landing change or ornamental motion is required.

The staff application workspace leads with **Review queue**. Each row shows application/member, primary next-action route, readable reason, original received/waiting basis, preparing officer, assigned reviewer if any, and **Open review summary**. Confirmed material concerns appear first; comparable cases follow waiting time. Show all applicable concern indicators without exposing raw private documents in the list. Search and route/owner filters state whether results cover the whole authorized queue. Queue refresh preserves selection when still accessible and states its as-of time; a moving queue must not silently discard an open draft. Distinguish loading, unavailable, empty and no matching results. Preparation and recorded-decision states cannot be mislabeled ready.

The summary puts case identity, route/reason, responsible person and next action first. Follow with unresolved items and source links; confirmed evidence and separate verification status; selected-offer assessment/horizon/freshness; monthly remaining beside lowest dated balance and full costs; current recommendation; review actions/history. Reuse existing detail views for evidence and comparison. A positive total cannot hide a dated shortage, failed check, stale basis or other blocker. Show all simultaneous concerns even when one determines the primary route. Avoid a risk-free badge, confidence percentage, composite risk score or batch approval.

Concern rows identify **Simulated AI concern**, **AI draft**, manual or checked-rule origin accurately, with source/date/version, proposed issue and pending/checked state. The preparing officer can **Confirm concern**, **Correct concern** or **Dismiss concern**, recording a reason and inspectable resulting history. Correction links to evidence editing when facts must change. A dismissal never visually clears an independent failed rule. No display implies source authenticity from confirmation alone.

For escalation show concern, assigner, eligible reviewer, assignment reason and recorded status. When no reviewer is eligible, show **Reviewer assignment needed** and the recovery action while retaining the concern. Use **Assign reviewer** for escalation, keeping existing **Assign officer** intake semantics distinct. The reviewer's in-app notice links to the exact application/concern. **Acknowledge notice** only records receipt; keep **Record review disposition** and **Record decision** separate. Reassignment/history remain inspectable. No toast alone serves as durable notice or concern resolution.

Use the four named paths **Needs clarification**, **Awaiting concern check**, **Escalated review**, and **Ready for approval**, each with text and next action. Readiness explicitly awaits a separate human decision; no green treatment promises repayment or automatic approval. Material changes show **Needs renewed review** with access to earlier saved history. Fictional demo-role and simulated AI labels remain visible; they grant no server permissions.

At 320px stack queue rows into labeled records retaining reason, owner and action; allow contained keyboard-accessible scrolling only for genuinely two-dimensional financial detail. Verify tablet/desktop and 200% zoom. Focus the summary heading when opened and the affected concern/error after a saved/failed action; use existing status announcements and accessible source links. Retain input and original request/key on uncertain saves, block conflicting navigation, ignore obsolete reads and clear private content on denied access. Working labels require the implemented Ana/Ben/Cora/simulated-concern walkthrough, required feature checks and inspected screenshots. Representative acceptance remains separate.

## 20. Mobile-first member portal — UI-08, 5 November 2026

The user-approved mobile member redesign supersedes the member top-navigation/large welcome composition in sections 10 and 16. It keeps the adopted Google Sans, green/white/yellow tokens, Material Symbols, existing Gabay art and current member capabilities. Robert owns the member/shared presentation changes; the public landing retains its appearance.

- Below 768px use fixed, labeled Home, Applications, My loans and Help links. Applications stays current on apply, detail and edit routes. At larger widths use compact top navigation. Keep the member content in its own scroll area above the fixed bar. Respect safe areas, measure navigation clearance and hide the phone bar while a shrinking visual viewport indicates an input keyboard. Keep route focus and unsaved-navigation guards.
- All member headers, including presentation mode, omit the workspace switch. Retain identity/account controls and explicit installation access. Staff/review keep their separate entry routes and existing header defaults.
- Home has a compact greeting. Lead with the earliest returned scheduled payment, loan label and position-as-of date. Load payments and a recent application independently; unavailable is not empty. With no loan, the application or Apply action leads. Do not calculate a repayment score or infer an approval. Ordinary account summaries remain visible independently of reminder-notice preferences.
- Keep the short requested-terms form and separate server save/review/submit. Put status and next-action guidance near the application heading; preserve grouped supporting information, checked options and recorded decisions. Loans put the next payment before posted balance/date and retain schedules, receipts, pending movements and reminder controls.
- Payment help starts with the member's message and preferred response, followed by optional linked loan/check-in details. Preserve preview/edit focus, renewed sharing consent and full history. Use the loan's member-facing label in the preview.
- Retain 16px fields, at least 44px standalone controls, readable long content and accessible focus/errors. Installation dialogs use existing controls with browser instructions and focus restoration. Connectivity guidance preserves entered values, distinguishes saving uncertainty and never automatically resends writes.

Installation is optional and online-only. Keep one prompt owner before lazy routes; native prompt acceptance is distinct from confirmed installation. The existing manifest identity/icons remain, with installed launch at `./#/member`; the normal member session determines Home versus sign-in. Use Safari Add to Home Screen guidance including Open as Web App where offered. No service worker, offline private store, background queue or push delivery is introduced. Technical/visual verification and device limitations belong in the existing UI verification record; representative acceptance is separate.

## 21. Experiment F fictional pilot workspaces — 5 November 2026

Apply section 19's priority-review behavior to the connected staff workspace, using existing scoped Gabay tokens, shared controls and navigation. The queue displays a reason, original waiting-time basis, next action and responsible person; priority is not a risk score. Keep all blockers visible when one controls the route. Concern wording, source checking, independent verification, escalation and final approval remain separate tasks. A notice acknowledgment is never concern resolution.

Source review can include 1–12 exact cleared excerpts, with visible coverage and removable selections; ask about both sources for a discrepancy. Oversized bundles fail without truncation. An interrupted generation has an explicit manual reconciliation action, preserving source/history. Static unavailable AI keeps manual work editable; ambiguous writes retain their original request/key/version. Mark model, simulated and checked-rule origins accurately.

The lifecycle page separates own conflict declaration, officer recommendation, exact template preview/reviewed recording and immutable history. Member acceptance shows the exact saved document and full schedule/costs. With the pilot enabled, staff entry opens the review queue for lending reviewers or financial operations for financial staff. Financial staff use a purpose-limited queue and views; sensitive actions require fresh MFA and separate people. Label every movement as simulated. Show an unavailable position before posted release, then only server-supplied posted amounts/receipts. Keep monthly segments distinct from horizon totals. No new motion library, decorative animation, token system, score or landing change is introduced.

All new surfaces preserve keyboard focus, readable narrow-phone forms, 320px reflow, local table/document scrolling, error/empty/loading states and stable uncertain retries. Desktop/mobile captures and actual checks are recorded in the [delivery evidence](docs/AGAP_Experiment_F_Pilot_Delivery.md); implementation does not imply representative-user or institutional acceptance.

## 22. Friendly member guidance — UI-09, 5 November 2026

The user requests a warmer, more approachable member experience based on the archived [member concepts](design-library/concepts/member-experience/agap_member_experience_refined.webp). This member-only amendment extends UI-08's navigation and supersedes the earlier member Google Sans requirement. Keep staff/review/landing typography and behavior intact.

Use self-hosted **Nunito** for member text and controls, including readable tabular financial numerals and PHP glyphs, with Google Sans as fallback. The member font role belongs in the canonical tokens; do not introduce another palette or component system. Keep the adopted green/white/yellow identity, light mint background, white working surfaces, existing Material symbols, and restrained petal shapes derived from the accepted mark. Backgrounds remain behind text; yellow is brand emphasis, never an approval indicator.

Make Gabay a visible, optional guide with the supplied artwork and real HTML prompts. Home pairs a short greeting with the returned payment/application information; actions use concise labels without a description on every tile. Page headings stand alone when their meaning is clear. Keep one short contextual prompt only where it explains an action, an unavailable state, or a consequence. Friendly language must not imply a chatbot, live conversation, guaranteed response, approval or financial advice. No decorative perpetual animation.

The existing application journey gets a three-part **Details → Review → Send** guide. Details is current on new/edit forms, Review on a saved draft and Sent only after the server returns a submitted/later application. The guide describes intake only; it does not certify evidence completeness, approval or loan release. Saving and submitting remain separate actions. Preserve explicit sharing consent and requested-versus-approved terms.

Application lists use clear amounts, status and a draft-specific continuation. Successfully empty lists and no-loan records can use supplied decorative art; failed/unavailable reads must never look empty. Loans retain dated posted positions, schedules, receipts and reminder consequences. Payment help starts with a reassuring Gabay prompt, retains the message-first flow and sharing preview, and puts optional check-in details in a descriptive disclosure. Keep its payment/interest/fee qualification visible.

All current guards, same-key uncertain retries, retained drafts, focus and sharing acknowledgements remain authoritative. Verify 320/390/768/1366px, doubled text, keyboard, image/font failure, reduced motion, inaccessible/private state and the financial workflows with the required checks. Record actual evidence in the existing UI verification record; technical publication does not establish representative acceptance.

## 23. Posted trial balance and check-in counts — 5 November 2026

The staff trial-balance screen uses existing panels, fields, buttons, notices, badges and Money. Lead with the report purpose and limitation, then dates/create action, saved history and the selected immutable report. Show opening/movement/closing debit and credit columns, inactive-account labels, totals and source freshness. Label actual empty and unavailable separately. A balanced badge describes ledger arithmetic only. The two-dimensional account table has contained scrolling and a keyboard-focusable named region; dates and metadata stack at 320px. Focus saved results/errors, retain exact uncertain requests, disable conflicting actions and clear results on access denial.

The assigned-officer check-in summary leads with its submission scope and explicit limitation, then dates and Load summary. Show recorded answers/counts, including declined and unavailable, with the returned dates and read time. Count submissions rather than implying distinct members or improvement. Remove older counts while a new read is pending; errors offer another read. Use a contained named table region, labeled fields, visible focus and 320px reflow. No predictive color coding, individual ranking, health score, automatic lending consequence or new member confirmation screen is introduced. These implemented examples still require receiving-owner and representative acceptance.


## 24. Structured responses and focused clarification — RSP-01, 5 November 2026

User-approved direction: task-embedded guidance for members and staff, plain English, existing Gabay identity. Source-local response sections show the finding/proposed value, explicit uncertainty, source name/page and quotation, then the next action. Generated content remains escaped text; only application code supplies controls or destinations. Use semantic headings, lists and definition lists; checked repayment context retains monthly segments, lowest dated balance, full repayment/cost, horizon and stale blockers.

Members answer one authored, typed question at a time. Ask for missing information and explicit relevance/amount confirmation. Source-supported details remain inspectable and correctable without repeatedly asking for them. Income-basis and payroll-inclusion questions are conditional on category; dates are explicitly entered, never extrapolated from a period or historical expense. Each question states why it is needed and offers unknown/declined responses. Saved partial responses stay separate from confirmed facts; only the existing final confirmation can accept or reject a suggestion. Unknown and declined answers yield staff follow-up, not zero or a character judgment.

Keep sources beside the question/editor, use readable labels and multiline explanations, and distinguish pending suggestions from reviewed history. Technical model/engine/source versions belong in staff detail; members retain truthful AI draft/Simulated/Template origin. Staff qualitative model questions are labeled proposed questions for staff review, with no implication they were sent to the member. Source links focus the named evidence section; concern checks edit inline and focus their first input. Opening/closing questions focuses the heading/trigger; unfinished answers survive local close/reopen, with existing route guards and exact uncertain retries. Final reason/acknowledgment remain separate; changing an answer clears acknowledgment. A recorded result cannot hide a stale source.

Use existing typography, controls and tokens. No chatbot, extra animation, dependency, credit score or model promotion. Verify 320/390/768/1366px, doubled text, keyboard, source access, error/status announcements, partial/declined answers, local close/reopen, inaccessible content and same-key retry. Current implementation/evidence and remaining human acceptance are recorded only in Assignment.md and the existing UI verification record.
