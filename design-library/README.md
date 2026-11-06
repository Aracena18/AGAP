# Gabay and AGAP design library

This folder preserves accepted character artwork, source manifests, and design specimens. The application uses selected Gabay assets; component galleries and concept screens remain reference material. [design.md](../design.md) governs the implemented interface.

**Source inventory, 3 November 2026:** all 50 supplied source files are committed in `9ff66a3b8e0614d09adc14bb52261084c6c95be7` and independently verified from Git blobs. See the [file manifest](manifest.json), [analysis and adoption plan](ANALYSIS.md), and [canonical design requirements](../design.md#16-planned-gabay-rebranding--3-november-2026). The landing and workspace adoption are now implemented; this archive retains the original source bytes and design-review limitations.

## Accepted direction

- **Mascot:** Gabay, a friendly firefly, using the refined **3D** rendering with yellow/cream face, soft green/translucent wings, glowing antennae/abdomen, dark green head, and AGAP kerchief.
- **Format:** individual high-resolution transparent WebP assets preferred for reusable character/illustration scenes; no flat crop of an entire presentation board in place of individual exports.
- **Brand palette:** green, white, and yellow; minimal, professional and warm. The proposed component prototype uses green `#176347`, forest `#123D2D`, leaf `#4D9B6F`, yellow `#E4BD52`, canvas `#F7F9F6`. These are reference-kit values; current application values come from the canonical scoped tokens.
- **Personality:** supportive and expressive, but calm for financial risks. Never imply approval, debt safety, or amended terms based on mascot emotion.
- **Member vs staff:** expressive Gabay on member-facing educational/onboarding/empty states; focused information-dense professional staff workspace.

## Asset inventory

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

### Verified locations

| Supplied material | Repository location | Verified contents |
| --- | --- | --- |
| Character source art | [Gabay assets](assets/gabay/) | One 1024px master, six 1600px turnaround views, seven 1254px expressions, five 1600px signature poses, eight 2048px state illustrations; all 27 have actual transparency |
| Member concepts | [Member experience](concepts/member-experience/) | Composite board and four individual concept screens |
| Motion concepts | [Motion specimen](concepts/motion/AGAP_Gabay_Motion_Design_System.html) | Supplied HTML prototype and reference board |
| Component kit | [Interactive gallery](specimens/ui-kit/index.html), [source README](specimens/ui-kit/README.md) | Nine React primitives, candidate CSS/tokens, browser interactions, five transparent preview images and decisions |
| Provenance | [Source manifest](source-manifests/accepted-design-2026-11-03.json), [repository manifest](manifest.json) | Original file hashes plus source-to-repository path mapping; all copied bytes preserved |
| Inspection evidence | [Preview checks](review/preview-checks.json), [desktop](review/ui-kit-1366.png), [phone](review/ui-kit-320.png) | Archived specimen inspection, including outstanding contrast/ARIA/reflow findings; not an application acceptance pass |

The source ZIP and original extracted folder are preserved locally. Repository paths restore the kit's documented `assets/`, `react/` and `docs/` layout, which was flattened in the supplied extraction. The original component documents remain unchanged as source artifacts; their creation-time descriptions are not a claim that the current archive is uncommitted.

## Source and asset status

Source artwork and prototype files were supplied by the team. The manifests bind their exact committed bytes, dimensions, transparency, and repository paths. Source specimens remain unchanged, including their creation-time README/decision text; current implementation status is described here and in the main documentation.

The corrected transparent empty-state package should supersede the first low-resolution, opaque cropped package. Old illustrations and superseded palette boards are historical references, not selected production assets.

## Implementation guidelines

1. Do not overwrite `design.md`, `src/styles/tokens.css`, or `src/shared/ui` without a reviewed UI task.
2. Keep all approved exported character files under `design-library/assets/gabay/` and track source provenance, dimensions and alpha channel.
3. Prefer actual HTML/React text and actions over screenshots containing baked-in financial figures.
4. Define responsive, focus, contrast, keyboard, zoom and reduced-motion acceptance per existing `design.md`.
5. Do not claim applications, loans, approvals, reminders, or support requests are live when underlying services are unavailable.
6. Test 320px layouts and financial comprehension with representative members before publication.

## Additional synchronized design references

GitHub main `8effecc` also carries optimized WebP derivatives, a second portable component gallery, React candidates and two design comparisons. They are preserved alongside the exact original files. The [original manifest](manifest.json) maps all 50 source files; the separate [optimized-transfer manifest](source-manifests/optimized-transfer-2026-11-03.json) preserves the incoming file/blob inventory. The reference kits are not imported as parallel token/component systems; the application uses the canonical tokens and shared UI.

Review the [member/staff brand comparison](prototypes/brand-adoption-preview.html), [portable component gallery](prototypes/component-library/index.html), [React candidate](react-candidate/README.md) and [motion prototype](prototypes/gabay-motion.html). The original 1024px master is also present at the incoming master path; optimized delivery files do not replace source-quality originals. No animated sprite/layer pack is supplied.

## Member-journey candidate — 3 November 2026

[Open the interactive member journey](prototypes/member-journey-preview.html) to inspect a **new design candidate** for six connected destinations: welcome with the four required actions, application draft and review, source-linked simulated suggestion with confirmation/correction/not-applicable, a fictional stage tracker, an explicitly unavailable posted-loan/full-cost view, and payment-help sharing preview and simulated completion. The design uses existing individual Gabay files and proposed green/white/yellow colors, **not** a new image crop or production palette change.

Controls remain local to the open HTML document: they do not authenticate, persist an application, upload a document, run AI, calculate an offer, transmit a support request or change repayment terms. The sample suggestion is visibly **Simulated**, while any independent source verification remains unavailable. The help preview requires a fresh sharing acknowledgment, returns focus appropriately after editing, and states that payments remain due. Layout modes expose desktop, 360px and 320px widths.

**Original transfer verification:** GitHub file write and read-back succeeded; the artifact was checked for all six screen IDs, referenced approved Gabay filenames, truthful unavailable/simulated states, focus styling, reduced-motion and 320px support, and absence of remote scripts. These are structural checks **only**: interactive browser testing, contrast/zoom review, keyboard/screen-reader testing, screenshots, representative-member comprehension, and visual sign-off are still pending. This is supporting context for existing **MOB-01**, not a new production feature or accepted design. Subsequent UI-05 browser/visual findings are recorded in the [analysis](ANALYSIS.md); full interaction, assistive-technology, zoom and representative-member acceptance remain pending.

## Adoption and review

Preserve original files and manifests. Adopt reference patterns through the existing shared UI and scoped tokens, following [design.md](../design.md). The [historical analysis](ANALYSIS.md) retains inspection findings for the supplied specimens; these are not findings about every current application screen. Representative-user, assistive-technology, and production acceptance remain separate from archive verification.

## Landing artwork provenance

`design-library/assets/gabay/turnaround/gabay_front.webp` is copied unchanged from the user-supplied `AGAP_Accepted_Design_Archive_2026-11-03/gabay/turnaround/gabay_front.webp`: 1600×1600, native alpha, SHA-256 `91e1e4d01fdbfd8e64e0085b0cb654c1dff2e638afc114bc42503aa390e82b3c`. The source archive remains untouched and untracked. It is existing accepted artwork, not generated for the landing implementation.

The synchronized library already contains that exact original, so the library does not duplicate it. [Landing asset inventory](assets/gabay/landing-assets.json) records 400/800/1600px responsive derivatives, dimensions, native transparency, bytes and hashes. The 1600px display copy is about 181KB versus the 826KB original; smaller displays receive the corresponding 27KB/73KB file. Matching responsive preload makes the image discoverable in the HTML. Static/mobile/reduced-motion clients do not fetch the desktop Motion module. Original source pixels/metadata remain unchanged; origin sidecars accompany WebP derivatives and public screenshots. PNG icons and review captures carry embedded origin metadata.

`scripts/capture-landing.mjs` captures four 1366×850 screenshots from the actual canonical fictional Ana workflow, using only the loopback browser-test server and its short-lived fictional staff session. It resolves income through the existing correction UI, checks the unchanged monthly/timing results, selects the permitted after-payday option, records a recommendation, switches the simulated review role, and records the template-reviewed decision. It introduces no second calculator or fixture registry. The script requires the isolated test API, frontend and `.platform-test/browser.json`; never run it against a real environment. Review captions and full-size links identify the images as fictional examples.
