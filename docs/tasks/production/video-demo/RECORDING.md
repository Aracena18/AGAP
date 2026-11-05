# Recording the entered-application flow

VID-01, 5 November 2026. This recording uses the normal member/staff sign-in and an application entered during the recording. No preset persona, role switcher or resettable Ana/Ben/Cora case is required. The workspace visibly identifies **Demonstration analysis** and scripted presentation; do not crop that origin disclosure out of the video or narrate it as a live trained-model call.

## Before recording

1. Start the usual fictional local environment with the evidence workflow enabled and a deliberately configured fictional product/dated offers. Keep normal sign-in; do not enable `LOCAL_PRESENTATION_MODE` or password-only shortcuts for this recording. Never use real member records or documents.
2. Use actual linked member and authorized staff accounts. The existing administrator assignment step is still required before an officer can inspect a member-created request. Separate authorized people remain necessary for a real final approval.
3. Use a requested amount matching the configured offers. The preview does not invent alternatives; missing configuration stays unavailable. Pick explicit cash dates covering the review and configured payments. Actual file scanning/OCR/model availability retains its existing setup requirements.

### Observed local recording configuration

On 5 November the local web app is at `http://127.0.0.1:5186/#/member`, with the API at port 4100. The API returns 401 without a session: automatic presentation entry and password-only shortcuts are disabled. Evidence uploads and the fictional pilot are enabled; connected real lending remains disabled. These runtime settings do not change the checked-in environment defaults.

The existing local fictional policy offers **PHP 1,000 principal, one month, no financing charge, one PHP 1,000 repayment on 25 November 2026**, within a 1–30 November review. Request PHP 1,000/one month to exercise this configured option; other amounts may correctly return no offer. This is development configuration, not a cooperative-approved product.

For a privately entered practice application, a 1–30 November review can use PHP 1,000 opening cash; PHP 2,400 income on 15 November; PHP 0 rent on 5 November; PHP 500 essentials on 20 November; and PHP 250 existing repayments on 15 November, explicitly confirming whether payroll already deducted them. A separately entered PHP 600 expense on 12 November and PHP 500 illustrative reserve demonstrate a reduced cash buffer. These are practice inputs, not personal financial advice or an invented member profile.

If restarting the local API, use the normal environment and an existing private document directory. For example, after creating that directory with owner-only permissions:

```sh
LOCAL_PRESENTATION_MODE=false LOCAL_PREVIEW_PASSWORD_ONLY=false \
EVIDENCE_WORKFLOW_ENABLED=true EVIDENCE_RECORD_MODE=fictional \
FICTIONAL_PILOT_ENABLED=true CONNECTED_LENDING_ENABLED=false \
DOCUMENT_DIRECTORY="$HOME/.cache/agap-pilot-runtime/documents" npm run api:dev
```

Do not start a second API on the occupied port. This command enables the existing services; it does not configure or run a model/OCR worker. Use the linked accounts and the existing identity provider for sign-in.

## Main sequence

1. Member signs in at `/#/member`, chooses Apply, enters a purpose, amount and term, saves the draft, reviews and submits it.
2. Open **Open repayment review** from that application. Enter opening cash, take-home income, housing, other essentials and existing repayments, with exact dates and review coverage. The amount in each row applies on each listed date. Confirm payroll inclusion and acknowledge the entries, then **Save household information**.
3. Upload a supporting PDF, JPEG or PNG. This is the real private upload endpoint. Show the returned status accurately: received/quarantined is not read or verified. The preview can use recorded household statements while file checks remain pending; only cleared excerpts appear as available source text.
4. Enter an illustrative reserve if desired. Enable **Explore an unexpected or irregular expense**, supply a name, amount and date. Explicitly check session sharing if authorized staff should see the same assumptions in this browser session.
5. Select **Prepare review preview**. The short, labeled playback progresses through saved information, source checks, scenario comparison and 5C organization. **Show review now** skips it; **Cancel review** stops it. This sequence illustrates orchestration rather than model execution.
6. Inspect the attention reason, lowest cash balance before/after the expense, full repayments/costs and available options. Open the cash-date table. The hypothetical expense is counted once and never silently saved as a real expense. A date change cannot remove an overall monthly shortfall.
7. Open Character, Capacity, Capital, Collateral and Conditions. Capacity and Capital reference saved financial statements; unknown repayment history/collateral/policy stay explicitly unverified. This is a narrative draft, not a 5C percentage or probability.
8. Staff signs in through the normal staff workspace. An administrator assigns the entered application to the reviewing officer through the existing Applications screen when necessary. Open **Analysis queue**, refresh, and select **Open 5C review** for the entered request. Shared assumptions are available only in the same browser session and unchanged material basis; another browser/reload may require entering them again.
9. Review and change the scenario, compare the returned options and download the text 5C draft. In Officer review and next step, record a session-only demo follow-up with the actual signed-in name, member-visible reason and acknowledgment. This can request clarification or escalation, or accept a financially passing draft for separate decision review; it does not approve a loan. **Continue to officer decision** opens the existing connected decision workspace. Its actual configuration, evidence check, conflicts, recommendation, separate reviewer and exact preview guards remain authoritative. An unavailable decision service is not a demo approval.

The new slice ends at a reviewable handoff. A full real decision/acceptance recording additionally requires the existing CL2/CL3 configuration and separate authorized sessions; use their documented workflow rather than inventing a successful decision. Disbursement, actual model execution and real-world outcomes are not established by this recording.

## Useful narration

“The member enters and confirms household information and adds supporting documents. This interactive demonstration organizes the review, explores a dated expense scenario, compares configured repayment options and prepares a 5C handoff. Staff see a proposed attention order and retain responsibility for checking evidence and making the final decision.”

All displayed amounts come from entered/confirmed values and the shared calculation engine. There is no hidden persona, random risk score, synthetic accuracy metric or claim that AGAP predicts an emergency.
