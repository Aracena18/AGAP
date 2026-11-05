# UI-11 verification — 5 November 2026

Robert; isolated `codex/household-date-ux`, initial base `174ee5a`. This addresses the user's screenshot of manually typed cash-date lists, inconsistent amount/date alignment and weak form branding. [Proposal](IMPLEMENTATION.md) precedes shared tracker/design/spec edits. The canonical product, architecture, delivery ownership, design and browser contracts retain their authority.

## Implemented behavior

Four household cash-date groups now use independently labeled native calendar inputs, Add date and Remove actions. Existing explicit dates hydrate the list; no recurrence is inferred. Native controls expose locale-appropriate day/month/year selection while the fact commands retain sorted ISO calendar days. Native validation, adjacent feedback and submit validation reject empty/duplicate/out-of-period dates. Period changes preserve selections and show the required repair. The date-array capacity is checked against the canonical schema. Add/remove actions renew acknowledgment, mark the draft unsaved and move focus to the new/nearest remaining date. Uncertain saves disable the complete group and retain original command progress/body/key/version.

Amount/date labels and first inputs align on desktop (browser measurement within 2px). Narrow screens stack each whole group. Tonal inputs, explicit peso prefixes, existing Nunito typography and the approved decorative Gabay image use the existing workspace palette/shared buttons. No new asset, dependency, canonical domain type/token/fixture, API/client/schema, financial calculation, policy, model or backend migration is introduced. The meaning remains the same amount on every selected cash date.

## Checks and captures

Six focused household tests pass: retained concurrent-save protection, uncertain exact replay, renewed acknowledgment after an amount edit, add/remove focus and confirmation, duplicate/range repair without silent date changes, and multiple ISO dates with exact centavos/per-date meaning. Both updated Chromium journeys pass before the full suite. Browser assertions exercise actual application/fact/upload services, invalid dates, a second explicit zero-rent date, original retry behavior, saved ISO dates, first-input alignment and accessibility/reflow. Browser test authentication uses existing server fixture sessions rather than a new real identity-provider walkthrough.

Phone captures are deliberate viewports of the header and cash-date groups; desktop/tablet captures show the complete page. The user-size capture is 1920 CSS pixels; other widths are 1366, 768 and 320. [Capture metadata/hashes](screenshots.json) retain actual dimensions and scope. Native picker visuals follow the browser/OS; physical devices and every browser locale are not certified by Chromium emulation.

A fresh independent Impeccable reviewer inspected the original user screenshot and the four initial current captures, relevant source/spec and the six focused tests. Its disposition is **ship for this narrow refinement**, with no material fixes. It explicitly does not certify full-suite completion or the whole product. The parent also inspects the additional user-size capture. The single detector pass for UI-11 returns `[]`; 21st review reports three files/zero findings. Catalog retrieval remains unavailable because CLI authentication is absent; no external component or dependency was added. The existing workspace world/design authority is preserved, including the pre-existing tool-sidecar scope drift.

Final required commands complete with exit status 0:

- `VITEST_MAX_WORKERS=1 AGAP_TEST_DATABASE_URL=<isolated localhost:55473/agap_test> npm run check`: lint, canonical generated-contract consistency, frontend/API builds, **271 application/domain + 804 platform/database + 109 evaluation tests (1,184 total)** and evaluation type checking pass.
- `AGAP_TEST_DATABASE_URL=<isolated localhost:55474/agap_test> AGAP_PILOT_TEST_DATABASE_URL=<separate localhost:55475/agap_test> AGAP_PILOT_TEST_API_PORT=4195 AGAP_E2E_WEB_PORT=5194 AGAP_E2E_API_PORT=4194 npm run test:e2e -- --workers=2 --trace off`: **145 pass, four existing presentation-only skips**, 3.5 minutes. No assertion or timeout is weakened. The final test-capture width addition receives a separate ESLint pass; runtime source is unchanged after the complete check begins.
- `graphify update .`: **5,323 nodes / 16,267 edges**, with the existing missing SQL parser/partial contracts-index limitations.
- The parent visually inspects the additional 1920px capture. Capture identities, local documentation targets, whitespace and canonical-file preservation are checked before publication. No production or institutional acceptance is claimed.

The normal direct main push is authorized after these results. Old VID-01 and other suite captures written incidentally by tests are restored only in this initially clean worktree; unrelated local user changes remain untouched.
