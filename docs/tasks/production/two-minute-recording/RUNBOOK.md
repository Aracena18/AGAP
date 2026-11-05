# Two-minute AGAP recording

Fictional prepared results, deterministic financial calculations and an actual persisted officer recommendation. This take does not demonstrate live model inference, final approval, disbursement or document authenticity. Keep the normal fictional-environment footer visible.

## Prepared access

Open <http://127.0.0.1:5186/#/member> in one browser profile and <http://127.0.0.1:5186/#/staff/analysis-queue> in a second profile. Separate profiles keep both the application and identity-provider cookies isolated. Two tabs in the same profile do not provide that isolation.

The private local file `/home/robert_jhon/.cache/agap-recording/credentials.json` contains generated passwords, authenticator secrets, account subjects, take IDs and exact application links. Its directory is 0700 and file is 0600; it is outside Git. Featured member: `maya.santos@demo.agap.test`. Comparison member: `leo.cruz@demo.agap.test`. Recording officer: `recording.officer@demo.agap.test`. The separate reviewer and setup operator are preparation accounts; neither is impersonated during the recording.

The local realm requires authenticator codes for these prepared member and officer logins. Enrollment is already completed. Import each account's private `otpSecret` into your authenticator before recording, or run `npm run recording:code -- maya` and `npm run recording:code -- officer` in an off-camera terminal. Codes expire every 30 seconds. Obtain a fresh officer code when you switch profiles around48 seconds; a code prepared at the start may have expired. Keep credential copying/password-manager controls off-camera. Never put the manifest, passwords, authenticator setup or terminal output in the video or screenshots.

Use the `recording-01` links in the manifest for the first real take. Maya is prepared for an officer recommendation; Leo already has a recommendation and is genuinely ready for a separate authorized decision. Earlier rehearsal applications remain in the queue and history. Find `recording recording-01` using the queue search; the displayed ranks preserve the full queue's original order. Earlier requested-term concerns remain visible even after an alternative is recommended.

## Before recording

From the repository, `npm run recording:start` runs the normal-auth fictional API on 4108 and web app on 5186. Keep that terminal running. If those ports already serve the recording app, use the running instance. The existing local PostgreSQL and Keycloak containers must be available. Do not start the presentation-mode server. The API needs the existing private `.env`; credentials are never included in these instructions.

If a new machine or an explicit new take is needed, apply migrations using `npm run db:migrate`, then run:

```sh
LOCAL_PRESENTATION_MODE=false LOCAL_PREVIEW_PASSWORD_ONLY=false \
FICTIONAL_PILOT_ENABLED=true CONNECTED_LENDING_ENABLED=false \
EVIDENCE_WORKFLOW_ENABLED=true \
DOCUMENT_DIRECTORY="$HOME/.cache/agap-pilot-runtime/documents" \
npm run recording:prepare -- recording-02
```

This resumes that named take idempotently, or creates new applications for it. It preserves accounts, passwords and earlier application/recommendation history. It restores the checked-in local realm's known authentication execution requirements, priority and assurance levels; it does not disable MFA. `npm run recording:enroll` finishes normal authenticator enrollment before filming. Existing authenticators are preserved.

Check the application links in the manifest, then close all optional disclosures. Keep both profiles signed out at the start; preload the sign-in pages. After the member portion, leave that profile open and signed in. The small install dialog should be closed before the take.

## Continuous take and narration

The target endpoint is around 110 seconds, leaving room within the 120-second limit. Read the selected lines while scrolling; there is no upload or configuration during the take.

| Time | Action | Narration |
|---|---|---|
| 0–12s | Member signs in with password and current authenticator code. | “Maya signs in to her cooperative account. Her loan application is already entered, so we can focus on the review.” |
| 12–25s | Open the existing application, then Open repayment review. Expand Submitted documents and confirmed answers briefly. | “Her supporting files are submitted and her clarification answers are saved. File-check status stays visible; upload receipt alone does not verify a document.” |
| 25–48s | Show requested versus alternative terms, then 5C findings. | “Ten-thousand-peso payments before payday create a six-thousand-peso cash shortage. With a two-thousand-peso repair assumption, the shortage reaches eight thousand. Six five-thousand-peso payments after payday retain six thousand pesos. Both fictional offers repay thirty thousand in total, with no financing charge.” |
| 48–65s | Switch to officer profile. Complete password and MFA sign-in. | “The officer signs in separately, with multi-factor authentication.” |
| 65–80s | Open Analysis queue; find the take. Point to Maya and the lower-concern comparison. | “The queue highlights requested terms needing attention. A passing alternative does not hide the original shortage. Leo's separate case is ready for decision review.” |
| 80–100s | Open Maya's 5C review. Inspect source status, assumptions, payment dates and proposed terms. | “The review organizes evidence under Character, Capacity, Capital, Collateral and Conditions. Missing references remain unknown. The repair is a what-if, not a prediction or a personal reliability score.” |
| 100–108s | Review the internal draft reason; tick the explicit confirmation and Save officer recommendation. | “The officer reviews the evidence and saves a recommendation for the six-month schedule. Final approval belongs to a separate authorized reviewer.” |
| 108–115s | Return to the member profile; Refresh saved information. | “Maya now sees the saved recommended terms, awaiting a separate decision.” |

## Retakes and recovery

After Save officer recommendation succeeds, that take has immutable history. Resume it to show the saved outcome, or prepare `recording-02`, `recording-03`, etc. for a fresh save action. Never delete history or manually reset status. Update the links you will record from the private manifest. Search by take name to distinguish earlier records; queue numbering remains authentic.

If a save response is uncertain, leave the form in place and use Retry same recommendation. Editing and refresh are locked until the same request is resolved. If inputs change, the prepared report becomes stale and requires renewed assessment/preparation; do not film old findings as current. A later separate decision takes the user back to the ordinary saved-decision workflow.

`AGAP_RECORDING_TAKE=rehearsal-timed npm run recording:rehearse` performs the automated paced normal-identity walkthrough and actually saves that take's recommendation. Use a fresh named rehearsal; do not point it at an untouched recording take unless you intend to consume its save action. `AGAP_RECORDING_FAST=1 AGAP_RECORDING_LOST_RESPONSE=1` additionally exercises exact retry after discarding a committed response. Test artifacts contain signed-in screens and public result metadata only.

The supporting PDFs are actual stored fictional files. Their quarantine and verification statuses are preserved. Financial facts are explicit member-confirmed statements with saved source-bound clarifications; the authored preparation is not represented as trained-model output. No live model is deployed by this feature.
