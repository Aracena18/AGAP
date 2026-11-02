# Gabay & AGAP design library — archive handoff

This folder records the user-reviewed design direction developed in ChatGPT through 3 November 2026. It is a **design-asset archive**, not a production UI change. No existing application components, canonical tokens, or lending behavior are modified.

**3 November verified handoff:** all 50 supplied source files are committed in `9ff66a3b8e0614d09adc14bb52261084c6c95be7` and independently verified from Git blobs. See the [file manifest](manifest.json), [analysis and adoption plan](ANALYSIS.md), and [planned canonical design requirements](../design.md#16-planned-gabay-rebranding--3-november-2026). This delivery covers synchronization, asset publication and analysis; application rebranding is the next implementation slice.

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

**Important:** The high-resolution WebP binary files and interactive prototype archives originate as files in the ChatGPT conversation. The GitHub archive must only mark a binary as uploaded after its exact file is committed and independently verified in the tree. A complete visual asset package is not established merely by this document.

The corrected transparent empty-state package should supersede the first low-resolution, opaque cropped package. Old illustrations and superseded palette boards are historical references, not selected production assets.

## Implementation guidelines

1. Do not overwrite `design.md`, `src/styles/tokens.css`, or `src/shared/ui` without a reviewed UI task.
2. Keep all approved exported character files under `design-library/assets/gabay/` and track source provenance, dimensions and alpha channel.
3. Prefer actual HTML/React text and actions over screenshots containing baked-in financial figures.
4. Define responsive, focus, contrast, keyboard, zoom and reduced-motion acceptance per existing `design.md`.
5. Do not claim applications, loans, approvals, reminders, or support requests are live when underlying services are unavailable.
6. Test 320px layouts and financial comprehension with representative members before publication.

## Next work

Review the [analysis](ANALYSIS.md) and `design.md` section 16, then implement UI-06 as a visual-only migration using the existing system. Preserve the source files and adopt components through the current shared UI rather than importing a parallel kit. Publication follows the user's authorized direct-main workflow after relevant checks; no PR is required for this handoff. Application acceptance still requires its full checks and representative review.

*Maintained as a design-context handoff; the precise inventory is based on the user's accepted conversation direction.*
