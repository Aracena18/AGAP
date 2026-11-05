# UI-08 member portal design QA

**final result: passed**

## Visual truth and comparison

The approved target is the existing AGAP design system with the user-requested mobile hierarchy/navigation changes in `design.md` section 20. This is an existing-product redesign, not a pixel-identical clone of the earlier layout.

- Source capture: `docs/screenshots/member-mobile/review-before/source-apply-390.jpg` (opened after saving).
- Implementation capture: `docs/screenshots/member-mobile/apply-390.jpg`; Home/loans/help and all seven member routes also captured at 320/390/768/1366px.
- CSS viewport: 390×844, density 1; source and final phone images are both 390×844 pixels. The initial pre-correction full-page image is cropped to its first 390×844 viewport for the correction pair; the raw image remains available.
- State: blank new application, term 12 months, no consent or entered values. Original header uses fictional presentation mode; the automated candidate uses a normal fictional member session. Account controls differ intentionally. No claim of identical header state is made.
- Full-view evidence: `docs/screenshots/member-mobile/source-vs-apply-390.jpg` and `scroll-correction-390.jpg` (left original/earlier candidate; right final candidate). Both were opened as combined images before judgment.
- Focused evidence: `docs/screenshots/member-mobile/field-comparison-390.jpg`, retaining first-field labels and controls from both screenshots at their original pixel density. Opened alongside the full-view evidence.

## Findings and comparison history

1. Initial candidate: **P2** — fixed bottom navigation visually overlapped the Save action at the viewport boundary. Evidence: `review-before/apply-390.jpg`. The full-page image also showed the fixed bar covering mid-page content.
2. Correction: put phone content in a bounded, separately scrollable main area above the fixed bar, measure actual bar height, retain safe-area spacing and keyboard handling, and shorten the form hints. Separate amount/date presentation and a compact status badge also improve loan scanning.
3. Final candidate: the Save action is fully visible at 390px; main bounds end above navigation. Secondary/off-screen content remains reachable through the main scroll area. Browser assertions verify content clearance, focus on the final help action, 44px links, 320px reflow, enlarged text and simulated keyboard contraction. No actionable P0/P1/P2 finding remains.

## Required surfaces

- **Typography:** the actual bundled Google Sans loads after correcting the local linked-dependency setup. Existing weights, field labels, 16px fields and readable line lengths remain; no fallback-font screenshot is accepted as final evidence. Long text wraps rather than truncating.
- **Spacing/layout:** compact greeting, payment-first Home, two-column larger-screen overview, phone bottom navigation, safe-area insets and measured scroll clearance follow the approved revision. Input geometry remains consistent with the source; tighter form hints keep the primary action visible at 390px.
- **Colors/tokens:** shared canonical tokens are unchanged. Green payment emphasis and existing white/soft surfaces, semantic states and focus treatment retain the adopted design language. Automated axe checks have no findings in the 28 sampled route/size states.
- **Image quality:** existing Gabay artwork and AGAP brand components are reused. The Home symbol is from the same pinned Google Material Symbols Rounded source as the existing library, not a new drawing. No placeholder, generated replacement, new font or dependency is introduced.
- **Copy/content:** plain-English next-step guidance and amount/term hints are added; requested terms versus approval, pending versus posted payments, unavailable values, sharing consent and payment-help limitations remain explicit. Member fixtures are labeled fictional/simulated.

## Interaction verification and limits

Required full checks pass: 226 UI/domain, 611 platform/database, 91 evaluation tests; the normal browser suite passes 111 cases, including 20 new mobile/PWA cases. The four presentation-only cases are exercised separately and recorded in `docs/AGAP_UI_Review_Verification.md`. Existing server save/reload/edit/submit, exact-centavo validation, lost-response same-key retry, consent/focus, sign-out, access denial and paginated history coverage remains intact.

Native installation outcomes are mocked in Chromium; browser-confirmed installation is distinct from prompt acceptance. Safari guidance and standalone detection are exercised. Physical Android/iPhone installation, device keyboard/gesture behavior and representative-member acceptance are unavailable/pending, not claimed. Browser test logs retain existing warnings caused by manually changing hash URLs between test cases; normal tab navigation and unsaved guards are exercised by the existing browser suite. No uncaught browser error blocks the exercised journeys.

Implementation checklist: resolved P2 recaptured and compared; all route-size samples inspected; full checks pass; device limits recorded. No remaining blocking visual fix.
