# VID-02 finish-review input

Original scope: implement the user-approved two-minute fictional AGAP loan-review plan with real normal sign-in, existing entered application, member/officer equal saved review, no percentages, actual persisted officer recommendation, separate final approval. UI inherits AGAP's current design authority and shared controls; this is an ordinary operational extension, not a new visual world.

Direction: Operate/Read. First viewport establishes application purpose/principal and presents parallel requested/alternative cash-flow figures. Five C evidence follows in rows; source/answer detail is expandable; explicit officer review confirmation precedes save. Prepared results have no playback spinner or live-model claims. Preserve green cooperative branding, Google Sans, workspace navigation, existing Button/Notice/Money tokens. Member never sees private officer reason. Queue retains original requested-term attention even after an alternative passes.

Quality bar: calm, legible operational hierarchy; exact monetary/date labels; no percentages or personal-honesty/authenticity score; desktop paired comparisons and phone stacking; no horizontal overflow; existing keyboard/focus affordances; confirmation/saving/uncertain states must remain clear. Long page scrolling is expected. No image assets or new motion are needed.

Required screenshots (all at current prepared report, except explicit uncertain-retry evidence from the preceding successful recovery run):
- screenshots/member-review.png — 1366×900 comparison before recommendation.
- screenshots/member-five-c.png — 1366×900 findings.
- screenshots/member-documents.png — 1366×900 submitted-source/answer disclosure.
- screenshots/officer-queue.png — 1366×900 actual ranked queue with historical takes retained.
- screenshots/officer-schedule.png — 1366×900 expanded exact repayment dates, captured during the separate successful exploratory/retry run.
- screenshots/officer-review.png — 1366×900 staff comparison.
- screenshots/officer-five-c.png — 1366×900 evidence findings.
- screenshots/officer-confirmation.png — 1366×900 prefilled review reason/confirmation before real save.
- screenshots/officer-uncertain.png — 1366×900 actual lost-response retry, edits/refresh locked.
- screenshots/member-recommendation.png — 1366×900 saved pending-decision result.
- screenshots/member-mobile.png and screenshots/officer-mobile.png — 390×844 saved result; natural scrolling with existing fixed member bottom navigation.

Implementation paths: src/features/review-preview/PreparedReview.tsx, prepared.module.css; integration PreviewPages.tsx. Governing authority: design.md and docs/AGAP_Frontend_Spec.md. QA inventory: QA.md. Paced walkthrough: walkthrough-rehearsal-final.json (109.28 seconds); retry: walkthrough-rehearsal-retry.json. No credentials, browser traces or MFA enrollment screens are in this packet.

Impeccable regex detector: two files scanned, no regex findings. Parsed-page tiny-text/contrast checks did not run; this is an explicitly limited scan. Visual checks are still owed. No approved comp exists because this extends the established workspace without replacing the visual system. Craft floor: /home/robert_jhon/.codex/skills/impeccable/reference/craft-floor.md.

Review required: fresh independent finish review, with disposition ship/fix/rebuild/recapture and the five contract sections. Inspect the entire provided screenshot set. Scope is prepared recording UI, not production underwriting or live inference. Do not change files. Report missing evidence honestly.
