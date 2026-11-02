# Gabay & AGAP design library — archive handoff

This folder records the user-reviewed design direction developed in ChatGPT through 3 November 2026. It is a **design-asset archive**, not a production UI change. No existing application components, canonical tokens, or lending behavior are modified.

## Accepted direction

- **Mascot:** Gabay, a friendly firefly, using the refined **3D** rendering with yellow/cream face, soft green/translucent wings, glowing antennae/abdomen, dark green head, and AGAP kerchief.
- **Format:** individual high-resolution transparent WebP assets preferred for reusable character/illustration scenes; no flat crop of an entire presentation board in place of individual exports.
- **Brand palette:** green, white, and yellow; minimal, professional and warm. The proposed component prototype uses green `#176347`, forest `#123D2D`, leaf `#4D9B6F`, yellow `#E4BD52`, canvas `#F7F9F6`. These are **proposed**, not yet merged into canonical app tokens.
- **Personality:** supportive and expressive, but calm for financial risks. Never imply approval, debt safety, or amended terms based on mascot emotion.
- **Member vs staff:** expressive Gabay on member-facing educational/onboarding/empty states; focused information-dense professional staff workspace.

## Asset inventory prepared in the conversation

| Collection | Expected deliverable | Notes |
| --- | --- | --- |
| Master Gabay | 3D standalone transparent WebP | Baseline canonical mascot candidate |
| Turnaround | Front, 3/4-left, 3/4-right, left profile, right profile, back | Opposite-side examples may be mirrored |
| Expressions | Happy, curious, thinking, encouraging, concerned, reassuring, excited | Individually rendered expressions |
| Signature poses | Welcome/onboarding, guiding steps, explaining finances, safety/reminders, progress/milestones | Distinct application uses |
| Empty & feedback | Welcome, no applications, missing document, application saved, under review, information unavailable, connection interrupted, payment assistance | Eight 2048px transparent WebPs in corrected package |
| Mobile examples | Four-screen onboarding, monthly budget, saved progress, repayment options | Design concepts; mock figures are illustrative |
| Motion | Wing flutter, hover, glow pulse, trail, expression shift | Reduced-motion and financial caution required |
| Component prototype | Interactive HTML, React/TypeScript components, CSS tokens and guidelines | Candidate library; not production-integrated |

## Source and asset status

**Transfer status — 3 November 2026:** Optimized individual WebPs, the motion/interactive gallery, React component candidate and mobile visual concepts are now included under this directory. These are derivative, resolution-preserving design exports; the 28.5 MB original `AGAP_Accepted_Design_Archive_2026-11-03.zip` remains the source-quality package in the owner's ChatGPT Library. The original standalone **1024 × 1024 transparent Gabay master** has also been transferred byte-for-byte from the source ZIP into `assets/gabay/master/`. The remaining transferred variants use resolution-preserving WebP optimization. All eight 2048px empty-state illustrations are individual transparent images. These files are not integrated production UI.

The corrected transparent empty-state package should supersede the first low-resolution, opaque cropped package. Old illustrations and superseded palette boards are historical references, not selected production assets.

## Implementation guidelines

1. Do not overwrite `design.md`, `src/styles/tokens.css`, or `src/shared/ui` without a reviewed UI task.
2. Keep all approved exported character files under `design-library/assets/gabay/` and track source provenance, dimensions and alpha channel.
3. Prefer actual HTML/React text and actions over screenshots containing baked-in financial figures.
4. Define responsive, focus, contrast, keyboard, zoom and reduced-motion acceptance per existing `design.md`.
5. Do not claim applications, loans, approvals, reminders, or support requests are live when underlying services are unavailable.
6. Test 320px layouts and financial comprehension with representative members before publication.

## Member-journey candidate — 3 November 2026

[Open the interactive member journey](prototypes/member-journey-preview.html) to inspect a **new design candidate** for six connected destinations: welcome with the four required actions, application draft and review, source-linked simulated suggestion with confirmation/correction/not-applicable, a fictional stage tracker, an explicitly unavailable posted-loan/full-cost view, and payment-help sharing preview and simulated completion. The design uses existing individual Gabay files and proposed green/white/yellow colors, **not** a new image crop or production palette change.

Controls remain local to the open HTML document: they do not authenticate, persist an application, upload a document, run AI, calculate an offer, transmit a support request or change repayment terms. The sample suggestion is visibly **Simulated**, while any independent source verification remains unavailable. The help preview requires a fresh sharing acknowledgment, returns focus appropriately after editing, and states that payments remain due. Layout modes expose desktop, 360px and 320px widths.

**Verification:** GitHub file write and read-back succeeded; the artifact was checked for all six screen IDs, referenced approved Gabay filenames, truthful unavailable/simulated states, focus styling, reduced-motion and 320px support, and absence of remote scripts. These are structural checks **only**: interactive browser testing, contrast/zoom review, keyboard/screen-reader testing, screenshots, representative-member comprehension, and visual sign-off are still pending. This is supporting context for existing **MOB-01**, not a new production feature or accepted design.

## Next work

Review [the member/staff brand adoption preview](prototypes/brand-adoption-preview.html), then compare the candidate palette against the running application before approving any canonical token change. Adopt the palette through `design.md` and canonical shared tokens only after review, with appropriate tests and screenshots. The master mascot original now appears under `assets/gabay/master/`; the complete original ZIP remains separately archived. Do not integrate a preview asset into lending UI without accessibility and financial-integrity checks.

Browse `prototypes/component-library/index.html` for a portable UI gallery; `react-candidate/` is a non-integrated TypeScript candidate; `prototypes/gabay-motion.html` and the four-screen concepts illustrate the Gabay motion and member experience. `manifest.json` indexes the transferred optimized files and their Git blob IDs.

*Maintained as a design-context handoff; the precise inventory is based on the user's accepted conversation direction.*