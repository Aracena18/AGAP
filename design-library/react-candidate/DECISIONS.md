# AGAP · Brand and component decisions (candidate v0.1)

## Overall design principle

**Gabay brings warmth. AGAP brings clarity.** Human financial decisions should never be presented as a score or approval promise because of a reassuring mascot, yellow star, green bar, or illustration.

Member portal: guided, more spacious, warmer. Staff workspace: more compact, no unnecessary mascot, precise tables and inspectable evidence. Both use the same semantic colors, typography, spacing, inputs, buttons, status system and error handling.

## Proposed palette

| Token | Proposed value | Intended use |
| --- | --- | --- |
| `--ag-primary` | `#176347` | Primary buttons, active links, action emphasis |
| `--ag-forest` | `#123D2D` | Headings, brand ink |
| `--ag-leaf` | `#4D9B6F` | Non-consequential supporting charts/illustrations |
| `--ag-sun` | `#E4BD52` | Small decorative accent, never sole warning signal |
| `--ag-canvas` | `#F7F9F6` | Light page background |
| `--ag-surface` | `#FFFFFF` | Cards, inputs, tables |
| `--ag-line` | `#DCE7DD` | Borders and dividers |
| `--ag-text` | `#4B6257` | Body secondary text |
| `--ag-success` | `#176347` | Action success (explicit wording required) |
| `--ag-warning` | `#9A5B00` | Caution text on `#FFF2D6` |
| `--ag-danger` | `#B33330` | Error text on `#FFF0EF` |
| `--ag-info` | `#155B84` | Neutral informational text |

The primary green has roughly **7.2:1** contrast against white, a reasonable basis for ordinary text and primary controls. Warning text is roughly **4.9:1** against its background. These are token-level comparisons, **not** a conformance claim for every rendered state.

## Typography

Existing AGAP root design system uses bundled **Google Sans** weights 400, 500, 600. Keep it. System-ui / Arial fallback is supported if a font cannot load. Prototype roles: display 34px, heading 24px, subhead 18px, body 16px, metadata 13px, micro-labels 11–12px; adjust for small screens without shrinking critical data.

Money uses tabular numbers, PHP pesos and the existing canonical money formatter. Dates include month/day/year or enough context to avoid ambiguity.

## Spacing and shape

Core scale: 4, 8, 12, 16, 24, 32, 48, 64px. Component targets 44px minimum. Card radius 16px, small controls 8–12px, buttons pill. Subtle borders dominate over large shadows. Use 1–2 distinctive brand moments per screen, not stacked illustration effects.

## Component acceptance states

- Button: default, hover, keyboard focus, disabled, loading, destructive confirmation.
- Fields: normal, focused, empty, invalid, read-only, disabled, saving, recoverable error.
- Status: draft, saved, submitted, under review, needs information, unavailable, decision recorded.
- Feedback: status text near affected task; explanatory next action; no deceptive success.
- Navigation: desktop and 320px mobile; active indicator + text; accessible keyboard order.
- Financial summary: amount, units, dates, sources, assumptions, unavailable values, and warnings. Never smooth actual financial shortages or hide them behind visual affordances.
- Empty states: concise copy and correct action, art supportive rather than mandatory to understand.
- Gabay: optional; neutral, welcoming, listening, explaining, calm; not a borrower eligibility judge.

## Repo-aware migration and ownership

Existing `design.md` is the canonical spec; `src/styles/tokens.css`, `src/styles/global.css`, and `src/shared/ui/index.tsx` hold executable styling. Current design uses blue primary color. A coherent migration needs **approved design.md revision + canonical token change + impacted component tests**, not a one-off green override.

Use the existing repository icon vocabulary (`Material Symbols Rounded` / `src/shared/icons/index.tsx`). Do not introduce a competing icon pack. Respect AGAP's branch and ownership boundaries for shared style changes.

## Non-goals for this package

No source-control changes, no Keycloak or API changes, no business policy redefinition, no live data or real finance calculations, no claim of user-tested accessibility, no claim of regulator-approved loan UX.

## Suggested staged adoption

1. Review and approve the main palette in real member/staff screens.
2. Map current tokens to the approved semantic roles and eliminate duplicate values.
3. Migrate shared Button, Badge, Notice, Field and status patterns; keep API stable where possible.
4. Introduce Gabay as a reusable opt-in component for member screens.
5. Add financial component refinements from the verified AGAP cash-flow computation layer.
6. Run actual Playwright, keyboard, contrast, mobile and representative-user checks before declaring design acceptance.
