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

Supplemental post-integration evidence: `docs/screenshots/member-mobile/source-vs-live-apply-390.jpg` compares the original and integrated live blank application in the same fictional presentation mode at 390×844/density 1. Live Home and installation-dialog captures are saved alongside it. The live browser log contains no error entries. Implementation commit `d5b7f47` is published to main after explicit user approval; this follow-up is documentation/evidence only.

## UI-09 friendly member refinement — 5 November 2026

The user confirms the five archived member concepts as references. This code-led extension follows design.md section 22: member-only Nunito, existing Gabay art, mint/petal backgrounds, shorter copy, intake steps and optional help details. It does not reproduce the concepts' illustrative budget numbers or introduce chat/goal capabilities. Earlier UI-08 evidence above remains historical.

The first fresh review inspects all 28 route/width captures, special help/doubled-text states and both additional Home states. It identifies two material corrections: the two-column Home action grid splits words under doubled text, and draft-list links remain generic. One correction batch uses a phone action list and Continue your draft while preserving destinations. The recaptured [doubled-text Home](docs/screenshots/member-friendly/text-200-320.jpg), [320px Home](docs/screenshots/member-friendly/home-320.jpg) and [draft list](docs/screenshots/member-friendly/applications-320.jpg) resolve both findings. The reviewer returns **ship, fix-list scope only**.

Original [UI-08 Apply](docs/screenshots/member-mobile/apply-390.jpg) and final [UI-09 Apply](docs/screenshots/member-friendly/apply-390.jpg) retain the same 390×844 viewport and task, showing the type/guidance changes. All new captures use fictional records. Six final recapture tests cover seven routes at all four sizes, empty Home and 200% text; no page/main overflow or axe findings occur. Required checks pass: 237 app, 667 platform, 100 evaluation, 116 normal browser, six post-review recapture and four separately enabled presentation cases. Additional font/art-failure probes preserve form access and staff typography.

No representative member evaluation or physical-device acceptance is asserted. Full evidence and limitations remain in the existing [UI verification record](docs/AGAP_UI_Review_Verification.md#ui-09--friendly-member-guidance--5-november-2026).
