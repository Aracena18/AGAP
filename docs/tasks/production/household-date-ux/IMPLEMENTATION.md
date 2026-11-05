# UI-11: household date selection and form polish

User screenshot/request, 5 November 2026. Robert owns this narrow follow-up to VID-01; isolated `codex/household-date-ux`, base `174ee5a`. Improve entered household cash dates, alignment and existing AGAP/Gabay branding.

## Proposal before editing

Replace comma-separated cash-date text with individually labeled native calendar inputs and explicit add/remove actions. Keep ISO calendar days at the existing fact-command boundary; preserve existing saved dates, deterministic calculations, full-period/amount-per-date meaning, acknowledgments, partial-save progress and exact uncertain retries. Limit date counts using the canonical schema, disallow duplicate/out-of-period dates, preserve dates when the review period changes and require explicit correction. Date edits and add/remove actions renew acknowledgment; keyboard focus follows added/removed controls. No recurrence inference, automatic financial defaults, contract, dependency, model or database changes.

Top-align amount/date columns, use existing workspace tokens, shared buttons/icons, member typography and the approved Gabay image in a restrained form header. Keep currency clear, help close to its group, existing save states and 320px stacking. `design.md` remains the visual authority; update its VID-01 section and the browser specification with these requirements. Shared tracker changes are proposed here before edit. Verify calendar interactions, multiple dates, invalid ranges/duplicates, renewed acknowledgment and retry integrity; run the required complete check/browser suite and capture phone/tablet/desktop evidence. Preserve all unrelated local work; normal direct publication to main follows passing checks.

[Verification and captured UI](VERIFICATION.md) record the implemented interactions, checks and remaining limits.
