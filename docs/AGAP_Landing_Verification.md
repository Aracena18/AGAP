# UI-07 — Gabay landing page

## Approved proposal — 3 November 2026

The user approved the implementation plan in this collaboration. Robert owns this public landing/integration task on `codex/agap-landing`, initially based on `63371c5` and synchronized with `56cffd6`. The proposal below was recorded before canonical token or dependency edits. The initial local task label UI-05 was reconciled to **UI-07** when newer main supplied the distinct UI-05 archive analysis and planned UI-06 workspace rebrand; neither earlier task is reassigned or marked implemented by this landing.

- Add an explicitly scoped `[data-agap-landing]` theme to `src/styles/tokens.css`, adopting the accepted green/white/yellow archive direction only on the landing page. Existing root/workspace tokens remain unchanged. Add a system dark variant to the same scoped theme.
- Add `motion` as the sole runtime dependency, used only by the lazy-loaded landing feature. No new component, icon, or styling framework.
- Route `/` to the public landing before session providers. Retain all member/staff/review guards and internal destinations. Section links use router search parameters, not a second URL hash.
- Add a same-origin manifest and branded installation icons. Installation is browser-controlled and online-only; no service worker or offline financial persistence.
- Publish fresh screenshots of the canonical fictional review journey. Do not introduce public records, alternate arithmetic, demo authentication, or invented feature availability.

UI authority: [design.md](../design.md). Browser behavior: [frontend specification](AGAP_Frontend_Spec.md). Product/ownership authority remains unchanged. The approved plan supplies authorization for these shared changes; it does not establish representative-user acceptance or production readiness.

## Asset provenance

`design-library/assets/gabay/turnaround/gabay_front.webp` is copied unchanged from the user-supplied `AGAP_Accepted_Design_Archive_2026-11-03/gabay/turnaround/gabay_front.webp`: 1600×1600, native alpha, SHA-256 `91e1e4d01fdbfd8e64e0085b0cb654c1dff2e638afc114bc42503aa390e82b3c`. The source archive remains untouched and untracked. It is existing accepted artwork, not generated for this task.

The synchronized library already contains that exact original, so the task does not duplicate it. [Landing asset inventory](../design-library/assets/gabay/landing-assets.json) records 400/800/1600px responsive derivatives, dimensions, native transparency, bytes and hashes. The 1600px display copy is about 181KB versus the 826KB original; smaller displays receive the corresponding 27KB/73KB file. Matching responsive preload makes the image discoverable in the HTML. Static/mobile/reduced-motion clients do not fetch the desktop Motion module. Original source pixels/metadata remain unchanged; origin sidecars accompany WebP derivatives and public screenshots. PNG icons and review captures carry embedded origin metadata.

`scripts/capture-landing.mjs` captures four 1366×850 screenshots from the actual canonical fictional Ana workflow, using only the loopback browser-test server and its short-lived fictional staff session. It resolves income through the existing correction UI, checks the unchanged monthly/timing results, selects the permitted after-payday option, records a recommendation, switches the simulated review role, and records the template-reviewed decision. It introduces no second calculator or fixture registry. The script requires the isolated test API, frontend and `.platform-test/browser.json`; never run it against a real environment. Review captions and full-size links identify the images as fictional examples.

## QA inventory

- Public entry without session requests; original authenticated demo/member/staff destinations.
- Query-section links, Back/Forward, focus, skip link and sticky-header clearance.
- One continuous close-up/full-character scroll scene; start/middle/end/reverse; static mobile, short viewport and reduced-motion alternatives.
- Four screenshot tabs with arrow/Home/End keyboard interaction; all fresh fictional screenshots load with meaningful alternative text.
- Install dialog: native prompt, pending/dismissed/accepted/error, fallback instructions, installed mode, Escape and trigger-focus restoration.
- FAQ disclosures; light/dark, 1366×768/1440px/390px/320px, 200% zoom, contrast and no horizontal overflow.
- Full project checks, browser regression suite, Lighthouse, Impeccable detector and independent finish review.

## Verification

The public root, bounded reveal/static alternatives, screenshot journey, scoped light/dark theme, native install prompt/fallback, manifest/icons and guarded destinations are implemented. No backend command, financial schema, calculation, authentication rule, fixture or saved decision format changes.

### Automated and manual evidence

- `npm run check`: **193 UI/domain, 520 platform/backend and 76 evaluation tests passed**, plus lint, canonical contract generation checks, browser/API builds and evaluation typechecking. Isolated PostgreSQL 18 test databases used loopback ports 55441 and 55443; no other worker's database was reset.
- `npm run test:e2e`: **52 passed** across the complete browser suite. After the final desktop-motion loading split, all **13 landing tests passed** again. The final integration run after synchronizing `56cffd6` also passed the complete checks and all **52 browser tests**; [machine-readable summary](screenshots/landing/checks.json).
- Existing test maintenance: the browser-storage regression now explicitly opens `/applications` because `/` is intentionally public; the evidence assessment assertion targets a visible result paragraph instead of matching both the current result and its closed historical copy. It still checks persisted results, exact money, retries, reload and accessibility. Production evidence UI was not modified.
- Axe checks cover both themes at 1366px, 390px and 320px, plus the install dialog. Query links, Back/Forward, repeated section links, home return, tab arrows/Home/End, image failure, dialog Escape/focus return, pending/dismissed/accepted/error/installed states and iPhone instructions passed. Browser install events are simulated for deterministic automation; actual OS installation approval remains browser/device controlled.
- Rendered start/middle/end/reverse reveal, static mobile/reduced-motion, dark theme and installation dialog inspected. The 200% equivalent reflow capture uses 683×384 CSS pixels at device scale 2; it demonstrates reflow without horizontal overflow, not a native browser chrome zoom test. No representative-member/staff acceptance is claimed.
- Final production-preview Lighthouse mobile run: **Performance 96, Accessibility 100, Best Practices 100, SEO 100**. LCP **2.7s**, total blocking time **20ms**, CLS **0**. LCP remains above the aspirational 2.5s target; a Lighthouse score is lab evidence, not field Core Web Vitals/INP or production certification. The first run's 6.9s LCP prompted responsive artwork/preload and separate desktop animation loading.
- Impeccable detector: **no findings** in the initial landing feature scan. The later loading-only Motion module split was independently source/visually reviewed; the detector was not rerun. Independent finish reviewer returned **ship**, then scored the final responsive-asset/loading changes **ship** after inspecting refreshed desktop/mobile/dark/zoom evidence. Its verdict covers visual/interaction evidence; test/performance results were supplied by this implementation run. The documenter verified the system and added only a source-reference sidecar; existing authorities remain intact.
- `21st review` completed. Token literals were informational findings in the canonical token file; the modal's Close autofocus is intentional native-dialog focus behavior. Public 21st scroll-hero references informed structure; no catalogue source was retrieved or installed, no hosted generation occurred, and nothing was published to an external registry.
- `graphify update .` completed: the final refresh built 3,097 nodes / 8,492 edges / 171 communities. It reported 34 SQL files without `tree_sitter_sql`, partial extraction for `packages/contracts/src/index.ts`, and heuristic community-label changes. Graph output is regenerable/ignored; no accuracy claim is made for the skipped symbols or semantic labels. No optional parser/model dependency was installed.

### Visual evidence

| Capture | Purpose |
| --- | --- |
| [Desktop](screenshots/landing/desktop.png), [1366px](screenshots/landing/user-1366.png) | Full-page composition from the document top; sticky scene travel is represented by the separate viewport captures |
| [Start](screenshots/landing/hero-start.png), [middle](screenshots/landing/hero-middle.png), [end](screenshots/landing/hero-end.png), [reverse](screenshots/landing/hero-reverse.png) | The actual continuous scroll reveal and return |
| [390px](screenshots/landing/mobile.png), [320px](screenshots/landing/mobile-320.png) | Static responsive content and controls |
| [Dark desktop](screenshots/landing/dark-desktop.png), [dark reveal](screenshots/landing/dark-reveal.png), [dark mobile](screenshots/landing/dark-mobile.png) | Consistent system dark theme |
| [Reduced motion](screenshots/landing/reduced-motion.png), [zoom equivalent](screenshots/landing/zoom-200.png), [installation](screenshots/landing/install.png) | Alternative layout and dialog evidence |

`.impeccable/review/` contains relative links to these canonical screenshots. No screenshot containing private real records or account tokens was published.

### Integration and remaining limits

Main synchronization preserves UI-05's complete source archive, analysis and prototype evidence, UI-06's separately planned workspace migration, and the MOB-01 design-only journey record. UI-07 adopts the accepted identity on the public landing only; no capacity estimate or owner acceptance is invented.

Technical/visual review supports publication as a fictional demonstration. Representative-user acceptance, an actual device-install walkthrough, native browser zoom, field performance and institutional production release remain separate. The installation dialog explicitly keeps internet/sign-in requirements; no service worker, private offline cache, push delivery, automatic approvals or live-lending claim is added.

Publication completed on 3 November 2026: implementation [bf03230](https://github.com/Aracena18/AGAP/commit/bf032306cd59cfbc5596bbaa80c511897a7e239b) was pushed normally from `codex/agap-landing` to `main` after the required checks. Remote `refs/heads/main` read back the exact implementation commit. No PR or force push was used. The later publication-record commit changes documentation/evidence only; publication does not grant human acceptance or production release approval.

## Browser-comment follow-up — white, oversized hero

The user explicitly requests a white background and an AGAP wordmark covering the screen, with a new sketch showing the mascot antennae overlapping the lower lettering. This authorizes a landing-only light lock, superseding the initial system dark variant. The wordmark now spans nearly the viewport width; the supporting copy and actions occupy clear lower side areas. Gabay rises higher at the start while the final full-character composition and scroll/reduced-motion behavior remain intact. Existing workspace colors, content, authentication and financial logic are unchanged.

The original theme screenshots and Lighthouse result above describe the initial publication. Follow-up captures below establish the current appearance; the initial dark gallery is historical, not the latest design authority. Final checks and publication for this refinement are recorded after verification.

Follow-up verification: `npm run check` passed (193 UI/domain, 520 backend and 76 evaluation tests); all **52 browser tests** passed. The existing accessibility/reflow test now explicitly verifies white under either system preference at 1263/1366/390/320px. The public-entry test uses the annotated 1263×900 viewport and verifies that Install AGAP remains in view. Actual in-app-browser inspection confirms the oversized wordmark, clear supporting controls and retained full-mascot reveal. [Hero at 1263×900](screenshots/landing/white-hero-1263.png), [in-app hero](screenshots/landing/white-hero-browser.jpg), [white reveal](screenshots/landing/white-reveal-browser.jpg), [390px](screenshots/landing/white-light-390.png), [320px under dark preference](screenshots/landing/white-dark-320.png), and [all follow-up capture dimensions/checks](screenshots/landing/white-checks.json) record the revised result.

`21st review` completed with informational color-literal findings in the canonical token file; no production palette values are duplicated in feature CSS. `graphify update .` completed with the same missing SQL parser/partial contract extraction limitations. The original screenshots remain intact as historical evidence. No application behavior, financial contract or original artwork was changed by the visual refinement.

Publication follow-up: the requested white/oversized presentation was published normally to `main` in [2c75cad](https://github.com/Aracena18/AGAP/commit/2c75cad); the original in-app preview was refreshed and visibly verified. The following documentation-only correction gives browser-captured JPEGs their proper `.jpg` extension; it changes no rendered page.
