# Robert's member-platform verification and handoff

26 October 2026, Asia/Manila. Tasks: FND-03, MOB-01, SHOW-01 and OPS-01 groundwork. [Assignment.md](../Assignment.md) alone records current task statuses. Worktree: `.worktrees/robert-member-platform`; branch: `feat/robert-member-platform`. This candidate combines published plan `c51af85` with the earlier platform candidate through local merge `e649d02`. It does not record consuming-owner agreement or authorize merging [PR #10](https://github.com/Aracena18/AGAP/pull/10).

## Supplied behavior

- Separate member OIDC state, callback, opaque session cookie, principal and transaction context. Operator-verified issuer/subject links establish access; member IDs, phone edits, uploads and provider role claims cannot grant it. Revocation invalidates sessions. Narrow database functions lock current access through commit; own-record RLS excludes staff-only commands, history and queues.
- Real server-saved own application drafts, exact-centavo edits, review/submission, cursor lists and reminder preferences. Submission stops member edits. A fresh-MFA administrator can assign a submitted request to an active same-branch officer with a reason; assignment does not approve the loan or change its financial inputs. Staff can correct their assigned draft.
- Responsive member sign-in, four-action home, application/status flow, preferences and unavailable-service states. Private views clear on 401, expiry and sign-out. No member identity or financial payload is placed in localStorage.
- Candidate domain connections for bounded file/camera upload, cleared-source download, source-linked suggestions/confirmation, checked options, recorded decisions/immutable terms, acceptance, posted loans/schedules/receipts and confirmed payment-help sharing. Their default domain services are unavailable. They do not fabricate uploads, balances, approval, support success or changed terms.
- Versioned source/confirmation/irregular-expense and model-artifact provenance schemas in executable contract **0.2.0, for review**. Generated OpenAPI/client are consistent. Model drafts require provenance and a matching cleared source/version; manual/template/simulated origins remain distinct.
- Stable original request/key/sender for uncertain writes, stale/version errors, aggregated dirty-form guards including router Back/Forward, and explicit known non-execution for unavailable services. Resource changes immediately hide obsolete record/version results and ignore late responses; same-record refresh can preserve unsent input.

The original deterministic `assessCase` body moved once to [packages/finance](../packages/finance/src/assessment.ts), with only its two imports changed. [The compatibility re-export](../src/domain/assessment.ts) preserves existing consumers. Aaron owns subsequent finance implementation. No second calculator, provider adapter or fictional fixture registry was created.

## Local verification

All records and identities used below are fictional. The default application supplies no real lending or trained-model service.

| Check | Result and scope |
| --- | --- |
| `npm run check` | Passed: lint, generated-contract drift, web/API builds, **118 domain/UI tests** and **68 backend/contracts tests** against actual PostgreSQL roles/RLS |
| `AGAP_MEMBER_SCREENSHOTS=1 npm run test:e2e` | **24 Chromium tests passed**: original fictional review, real staff/member intake and explicitly simulated member-domain rendering |
| `npm run test:keycloak:member` | Passed against the imported local Keycloak 26.4.7 realm: real signed member login, correct separate member principal, denied staff session and logout; temporary OTP enrollment removed and original actions restored. [Evidence](AGAP_Member_Identity_Walkthrough.json) |
| `npm run ops:drill` | Passed: encrypted Restic repository checked, plaintext stage removed, isolated PostgreSQL restore, all 25 user-table fingerprints and private fixture hash matched. Includes member links/sessions/preferences/commands/events. [Evidence](AGAP_Member_Restore_Drill.json) |
| Documentation audit | Passed: 223 local links/anchors across 14 changed Markdown documents, four unchanged 16-unit owner budgets, owned paths/dependencies and matching workflow descriptions |
| Preservation | Historical calculation oracles, canonical fixtures/types/tokens, original identity/restore evidence and dependency lockfile unchanged. Extracted assessment body checked against `e649d02` after excluding its two import lines |
| `graphify update .` | Completed: 1,163 nodes / 3,006 edges. Tool warned that SQL extraction lacks optional `tree_sitter_sql` and the contracts barrel export was partially unparsed; this is not a complete SQL graph or a substitute for tests |

Backend checks cover member/staff isolation, caller-supplied scope rejection, own-record reads/writes/downloads, expiry/revocation, transactional access locks, duplicate/concurrent/stale commands, preserved revisions, CSRF and known unavailable domains. Signed protocol tests reject invalid nonce/signature/issuer/missing or old authentication claims. Domain-port tests inject fictional services to verify bounded exact bytes/server SHA-256, cleared-file access, explicit unknown values, sharing and safe rejection of invalid projections/provenance.

The browser suite verifies real draft save/reload/edit/submission, a lost-success retry producing one record, other-member denial, dirty navigation cancellation including Back, persistent reminder preferences, unavailable support without a false success, scoped staff assignment and sign-out. Two page-scoped domain simulations separately exercise source upload/unknown confirmation, checked costs/term acceptance, loan schedules/receipts and staff support responses. Those simulations use canonical schemas/fixtures and the existing assessment engine; they are rendering evidence, not completed B–D services or a trained model.

Automated accessibility and 320px checks cover the baseline and new member states. Existing keyboard review tests still pass. React Router warns when browser tests deliberately replace a hash outside its history; normal router links and Back/Forward are tested. Direct manual hash replacement cannot provide the same unsaved-navigation guarantee. Human visual acceptance and representative member/staff evaluation remain outstanding.

## Screenshots

| Real intake or unavailable-domain screen | Labeled simulated domain screen |
| --- | --- |
| [Member home, 320px](screenshots/member-platform/member-home-320.png) | [Source and unknown amount/date confirmation](screenshots/member-platform/member-simulated-source.png) |
| [Application form](screenshots/member-platform/member-apply.png) | [Recorded terms and acceptance](screenshots/member-platform/member-simulated-decision.png) |
| [Submitted request](screenshots/member-platform/member-submitted.png) | [Posted loan, schedule and receipt](screenshots/member-platform/member-simulated-loan.png) |
| [Unavailable payment-help service](screenshots/member-platform/member-help-unavailable.png) | These contain simulated responses, not live domain records |
| [Staff assignment](screenshots/member-platform/staff-member-assignment.png) | Keyboard focus, including the skip link, can remain visible in captures |

## Domain handoff and remaining dependencies

Review [the written proposal](AGAP_Member_Contract_Proposal.md), [schemas](../packages/contracts/src/schemas.ts), [ports](../packages/contracts/src/ports.ts), [operations/capabilities](../packages/contracts/src/operations.ts) and [platform setup](AGAP_Platform_Foundation.md). Record the actual agreed version/base in Assignment.md before dependent integration. Do not infer agreement from this candidate or from local test success.

| Owner | Required next handoff |
| --- | --- |
| Aaron | Evidence metadata/quarantine/scanning/retention and independent checks; source-versioned confirmation/invalidations; deterministic permitted options over an explicit horizon; one bounded inference adapter. Domain services enforce member permission, expected version and durable deduplication on the supplied member transaction |
| Benedict | Current authorized human decisions and complete terms/document snapshots; acceptance/idempotency/version rules; actual posted loans/schedules/receipts and later authorized amendments. Qwen training/artifacts remain his separate task |
| Earl | Confirmed support records, staff routing/responses and follow-up; ledger/reconciliation for the money path; independent training manifests and model evaluations. A support request never updates the servicing contract or ledger |
| Robert | Integrate the reviewed domain services/artifacts through shared registration and the existing portal, then repeat relevant checks and representative review; complete external channels, recovery administration and operational release evidence when their institutional dependencies exist |

No Qwen/EBM/logistic training, runtime hosting, model promotion or actual financial-health outcome evaluation occurred here. There is no AI authenticity verdict, financial score, automated approval, production evidence lifecycle, ledger, disbursement, repayment or contractual hardship amendment. EBM research has no operational member/lending route.

The restore drill is local to one development host. Full application plus identity-provider backup, offsite copies, independently recoverable keys, approved recovery objectives, institution-specific rules/data and opening-balance/cutover reconciliation remain OPS-01 dependencies. The fresh fictional Compose project is `agap-member-platform-dev`, separate from the dedicated test project; no existing identity volume was reset. Public development credentials must never serve real data.

## Publication

Published implementation commit [`ea3bf5736df698083c8b997d3d59d7f4bdfa75e8`](https://github.com/Aracena18/AGAP/commit/ea3bf5736df698083c8b997d3d59d7f4bdfa75e8) to [`feat/robert-member-platform`](https://github.com/Aracena18/AGAP/tree/feat/robert-member-platform), following the user's preference to avoid another PR. Remote main remains `c51af851509f22b2cae93b020228d30e5f780060`; PR #10 remains open at its original head. Existing PR/issue descriptions were not changed. Publishing the branch does not establish an agreed integration base, a PR merge or a live deployment.

[Remote run 40280409812](https://github.com/Aracena18/AGAP/actions/runs/40280409812) completed with `startup_failure` for that implementation commit, with zero check runs. This is not a remote application-check failure or pass; no job ran. Its underlying cause has not been established. The local passes above are recorded separately. This final publication note changes documentation only.
