# AGAP frontend specification

Status: implementation baseline; visual acceptance and representative staff evaluation are pending.

## Product and experience

The product authority is [AGAP_Product_Freeze.md](AGAP_Product_Freeze.md).
Desktop-first, English, PHP, single browser, three fictional cases. Four screens:
Applications → Evidence → Repayment comparison → Decision and explanation.
One primary action per screen. Officer prepares; demo reviewer records the decision.

Evidence uses visible source dates, provenance and human corrections. Missing/conflicting critical facts block a complete assessment, not clarification. Correcting evidence retains the previous fact and reason.
Comparison gives monthly remaining and lowest dated balance equal weight, with full offer costs, a directly labeled chart, and the underlying dated table.
Decision records rationale, recommendation departures, configured policy exceptions, reviewed template explanation, and follow-up date. Historical decisions remain printable after edits.
Use source panels and inline editing; concise hints only when needed. Status words supplement color. No unexplained risk scores, autonomous decisions, or new product terms.

## Researched visual direction

The actual values live in `src/styles/tokens.css`; components must consume them.

| Choice | Rationale and primary source |
| --- | --- |
| Self-hosted IBM Plex Sans 400/500/600 | Designed for UI; OFL licensed. [IBM Plex](https://github.com/IBM/plex). Retain bundled license; verify peso/minus/diacritics and print rendering. |
| Carbon icons 16/20px | Designed to pair with 14/16px Plex. [Guidelines](https://www.carbondesignsystem.com/building-blocks/foundations/icons/guidelines). One family; icons accompany consequential action labels. |
| Neutral surfaces, dark petrol text, restrained teal action | Project design choice, evaluated by measured contrast and actual screen review. [WCAG 2.2](https://www.w3.org/TR/WCAG22/). No claim that a color guarantees trust. |
| Semantic right-aligned numeric tables | Comparison and scanning. [GOV.UK tables](https://design-system.service.gov.uk/components/table/). |
| Visible input labels and associated errors | [GOV.UK text inputs](https://design-system.service.gov.uk/components/text-input/). |

Type: titles 28/36, sections 18/26, body/input 16/24, tables 14/20, metadata 13/18.
Spacing: 4,8,12,16,24,32,48. Controls at least 44px. Main design viewport 1366×768.
At narrow widths supporting panels stack; only actual two-dimensional tables scroll.
Icon vocabulary: Document (application), DocumentView (source), Compare (offers), Edit (correction), Calendar (dates), RecentlyViewed (history), Printer (brief), WarningAlt (issue). Approval icon only indicates an actual recorded approval.
Screenshots under `docs/screenshots/` are implementation evidence, not evidence of user acceptance.

## Architecture and contracts

React + TypeScript + Vite, React Router hash routes, Context/reducer, CSS Modules and shared tokens.
One app, one lockfile, one shared CaseRecord. Feature components receive `record: CaseRecord` and use `useWorkspace()` to access `actor`, `role`, and `saveCase(record)`.
Canonical contracts: `src/domain/types.ts`.

- `assessCase(record): AssessmentResult` — complete/incomplete discriminated result.
- `applyCorrection(record, input, actor, at): CaseRecord` — evidence validation and immutable correction.
- `makeRecommendation(record, offerId, note, actor, at): CaseRecord`.
- `validateDecision(record, input): DecisionValidation`.
- `recordDecision(record, input, actor, at): CaseRecord` — snapshot, template, reviewer enforcement.
- `recordFollowUp(record, reviewDate, note, actor, at): CaseRecord`.
- `buildExplanation(snapshot): ExplanationDraft`.

`CaseRepository` exposes list/load/save/reset asynchronously. Browser storage is versioned, structurally validated, and falls back to a visible memory-only mode on failure. Do not erase incompatible persisted data automatically.
Domain modules do not import React, browser storage or feature components. Screens never calculate authoritative money figures.

Calendar rules: explicit first cycle 2026-11-01 through 2026-11-30; group movements by calendar date and calculate end-of-day balances. No intraday or future-cycle guarantee.
Monthly remaining excludes opening cash and purchase-reserved proceeds. Already-deducted obligations appear in evidence but do not reduce take-home pay twice.
Offer total repayment is sum of all scheduled payments; financing cost is repayment + separately paid fees − net received. Fees withheld from proceeds are already reflected in net received.
Demo policies: nonnegative monthly remaining (`monthly-capacity`) and nonnegative daily cash balance (`cash-timing`). Available offers remain explicit; failed policy checks require reviewer exceptions for an approval. Critical evidence gaps cannot be overridden into a complete assessment.
Evidence changes and recommendation changes increase case version. A recommendation carries its resulting case version. Decisions preserve their referenced version; recording a decision and recording follow-up notes do not revise its evidence.
Recommendation and evidence editing are officer actions. Final decisions are reviewer actions. These browser checks demonstrate workflow, not security.

## Verification and later backend boundary

Independent arithmetic oracles are in the product freeze. Test them alongside double deductions, unavailable offers, missing evidence, required reasons, stale versions, immutable print content, persistence/recovery, keyboard interaction and print output.
Frontend explanation uses a deterministic template and is labeled as such. No fake AI requests or browser API keys.
User acceptance and representative staff evaluation must be recorded separately from automated tests.
Only after frontend acceptance: plan a server-owned case repository, authentication, version validation, and constrained explanation gateway. No backend/provider commitment in this milestone.
