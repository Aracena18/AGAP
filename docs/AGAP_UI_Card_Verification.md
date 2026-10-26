# UI-02 source and action-card refinement

26 October 2026, Asia/Manila. Follow-up to UI-01 at `db9ec72685dca189176b600b965fa37bc419e5b7`, delivered on `codex/ui-review-cleanup`. The user requested four additional browser annotation fixes. Robert owns this refinement; evidence-feature edits are presentation-only under that explicit request. [Assignment.md](../Assignment.md) remains the sole task/status tracker and [design.md section 11](../design.md#11-annotation-cleanup-and-shared-account-controls--26-october) remains the UI authority.

## Supplied changes

| Annotation | Result |
| --- | --- |
| Source and related evidence cards | Wider desktop source column; separate title, Type/Date metadata, contained full excerpt, linked-field context and concise verification note. Source text is never rewritten or converted into invented facts. Phone correction actions align consistently |
| Officer-assignment form | Short action heading and member identity; distinct authenticator/Verify control in the header; aligned Officer/Reason fields; Cancel then Save assignment in a separate footer |
| Access-revocation form | Matching card structure, retained consequence statement and required reason; Verify separate from Cancel/Revoke access; destructive action stays red |
| Staff page hierarchy | Removed redundant Loan intake/Administration labels and page subtitles; reduced duplicate heading spacing; retained page headings and workspace navigation |

The two forms share a stylesheet and existing controls. Compact visible labels retain descriptive accessible names. No API, authentication policy, permission check, application version, idempotency handling, validation rule or uncertain-result recovery is changed. No database is reset for the preview. Canonical fixtures, financial/domain rules, contracts, dependency lockfile and prior evidence/screenshots are preserved.

## Verification

- Passed `npm run check`: lint, generated-contract drift, web/API builds, **126 domain/UI tests** and **88 real PostgreSQL backend/contracts tests**. The final phone-tab spacing adjustment also passes lint/build.
- Passed **32 Chromium tests** in the complete browser suite with `AGAP_E2E_WEB_PORT=5184 AGAP_E2E_API_PORT=4111 AGAP_CARD_SCREENSHOTS=1 npm run test:e2e`. Dedicated test ports avoid interrupting the user's running 5174 preview; all database fixtures use fictional `agap_test` records.
- New browser cases compare the entire displayed statement with the canonical fixture, switch the linked field, retain explicit MFA URLs and confirm that Cancel sends no write and leaves staff access active. Existing tests still perform actual assignment/revocation, source corrections and financial review.
- Checked 320px and 1101px reflow, automated accessibility and the replacement screenshots below. The existing unsaved-navigation test now awaits the actual dialog before attaching its next handler, avoiding a test race between dismissal and acceptance; the application guard is unchanged.
- Completed `graphify update .`; its optional SQL-parser/barrel-export limitations remain documented in the earlier UI verification. This revision changes no SQL or financial service.

| Screen | Desktop | Phone |
| --- | --- | --- |
| Source card | [1101px](screenshots/ui-card-refinement/source-card-1101.png) | [320px](screenshots/ui-card-refinement/source-card-320.png) |
| Assignment | [1101px](screenshots/ui-card-refinement/assignment-1101.png) | [320px](screenshots/ui-card-refinement/assignment-320.png) |
| Access/revocation | [1101px](screenshots/ui-card-refinement/revocation-1101.png) | [320px](screenshots/ui-card-refinement/revocation-320.png) |

Documentation audit passed: 83 local links/anchors across four changed Markdown files, with backend/contracts/financial source and historical evidence preserved.

These are implemented examples for user review, not representative-user acceptance. The same local preview remains at `http://127.0.0.1:5174`. Publishing this branch creates no PR or merge. The existing push workflow does not target `codex/**` without a PR, so no remote application-check pass is claimed.
