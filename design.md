# AGAP UI/UX design system

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
