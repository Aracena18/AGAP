# AGAP UI Design System · Proposed v0.1

**Status:** design candidate / interactive specimen. This package does **not** modify the AGAP GitHub repository or certify lending functionality.

This package builds upon AGAP's existing Google Sans, CSS Modules, shared buttons, statuses, icon components and documented accessibility practices. It introduces the green / white / yellow branding explored in the Gabay sessions, with a restrained member-facing treatment and a professional, data-focused staff treatment.

## What is included

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `interactions.js` | Portable interactive gallery (open `index.html` in a browser). No server or dependency install needed. |
| `tokens.css` | Proposed AGAP brand and semantic color tokens, typography, spacing, radii and motion timings. |
| `assets/` | Optimized preview copies of pre-existing Gabay WebP illustrations. Not new master illustrations. |
| `react/AGAPComponents.tsx` and `AGAPComponents.css` | React / TS components: Button, Badge, Notice, Card, TextField, SelectField, SegmentedControl, StepProgress and GabayHelp. |
| `react/ExampleUsage.tsx` | Sample usage with demonstrative state only, no lending actions. |
| `react/agap-tokens.css` | Self-contained copy of the candidate tokens for the sample React components. |
| `docs/DECISIONS.md` | Token rationale, adoption mapping, accessibility checks, and approval boundaries. |

## Preview

Open `index.html`. The interactive scenarios let you try:
- loading button and status toast
- modal with Escape / focus restoration
- an empty-form validation error
- term buttons and principal slider in a **simplified illustrative repayment example**
- accessible application progress and contextual Gabay guidance

All content is fabricated for UI evaluation. **No loan offers, eligibility, repayment policy or approvals are calculated.** Production figures must come from the existing deterministic finance engine and validated server projections.

## React integration (after design approval)

1. Review `design.md` and `src/styles/tokens.css` in the AGAP repository. Those are the current authorities; this candidate does not replace them by default.
2. Copy the proposed token values into the canonical root design system **after** approving the new palette. Do not keep two diverging token registries. The current repo primary color is blue (`#0B57D0`); this candidate is green (`#176347`).
3. Merge the supplied React primitives into `src/shared/ui` incrementally, reusing current Button / Badge / Notice when practical. Do **not** wholesale overwrite the current exports.
4. Keep Material Symbols Rounded from `src/shared/icons` for operational UI. The standalone preview includes local vector placeholders so it works offline.
5. Connect components to existing auth, member application, evidence, loan, and saving/retry contracts. Present simulated data as demo, never as live balances or eligibility.
6. Add automatic tests for 320px reflow, keyboard focus, forms, disabled state, error recovery, screen reader status announcements, high zoom, and reduced-motion.
7. Use the existing `src/domain/format.ts` for PHP currency and date semantics. Do not duplicate money/loan arithmetic from the preview.

## Accessibility

Targets: WCAG 2.2 AA; strong focus outlines; form labels; status roles and aria descriptions; independent text and color meaning; visible progress; minimum 44px targets for standalone controls (AGAP project rule). Final production implementation requires actual browser checks and representative-user testing.

**Fonts:** Google Sans is already bundled in the AGAP project; font binaries are intentionally not packaged here. The offline demo uses a system fallback when Google Sans is unavailable.

**Images:** Gabay images are transparent WebPs optimized for the preview. Keep the original high-resolution master files from the separate Gabay asset pack in your design archive.
