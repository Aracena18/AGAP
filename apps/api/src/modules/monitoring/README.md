# Member support and staff follow-up

Monitoring implements member-confirmed payment-help requests, scoped assignment, staff responses, follow-up tasks, and safe dated loan-position reads. It changes no financial terms or balances. [Team status](../../../../../Assignment.md) records remaining acceptance; [verification](../../../../../docs/AGAP_Verification.md) records dated local checks.

## Access, disclosure and persistence

Members submit/read only their own requests through the member facade. Active branch administrators see assignment metadata and assign an active same-branch officer with fresh MFA and a reason. Only the currently assigned officer reads shared concerns/check-ins/internal notes and responds. Auditors and ordinary administrators receive no default disclosure access.

`MonitoringService` preserves `submitted` → `assigned` → `reviewed`: reviewed means a staff response exists, not that the concern is resolved. Member confirmation binds the exact message, optional answers, linked owned loan, and notice version. `declined`, `unavailable`, and an explicit answer remain distinct. Loanless requests are valid. Corrections create a new confirmed replacement linked to the original; earlier disclosures and follow-ups remain immutable.

Migrations `001-support.sql` through `005-member-history-page.sql` install tables, forced RLS, safe views/write functions, disclosure locks, follow-up events, and the member seek index. Runtime roles cannot read raw disclosure/action tables or write them directly. Reads/writes hold assignment/disclosure locks; current access is rechecked before replay. Versioned receipts retain metadata only and reconstruct private results under current authorization. Writes, audit, member events, and metadata-only outbox commit together.

## Loan positions

The member transaction calls servicing's public `LoanReads.memberLoans` to validate an optional owned loan and capture its submission-time position. Complete empty results differ from unavailable producers. Monitoring maintains no second financial calculator or raw servicing-table reader.

`GET /support-requests/{id}/position` resolves the linked loan from the assigned officer's currently authorized, locked disclosure. A narrow servicing-owned producer uses the same transaction and validates organization/member/branch. The available/unavailable result exposes only safe posted-position fields and freshness; absent/unsupported positions stay unavailable. It does not grant a financial-workspace role or overwrite the submitted position. Institutional/receiving-owner acceptance remains separate from the implemented reader.

## Staff response history

The additive operations are `GET /support-requests/{id}/history`, `GET /support-requests/{id}/actions`, and `POST /support-requests/{id}/actions`. History/detail responses carry the newest 25 actions and `actionsNextCursor`; bounded older pages use `items`/`nextCursor`. A cursor must identify an immutable action in the authorized request. Exclusive descending-version boundaries keep opened history stable during later appends or assignment-version gaps.

Paged-response receipts bind projection/page size and reconstruct through the original response version. New writes can pass 100 actions; legacy projections retain their explicit bound and replay semantics. A command key reused across old/paged operations conflicts rather than creating a duplicate response. A successful write followed by a failed refresh remains a confirmed write with a separate read error.

## Staff follow-ups

Every response with a follow-up date creates a separate staff task atomically; undated responses create none. Historical dated actions migrate to open tasks without fabricated completion. Later responses do not cancel earlier tasks. Tasks and transition notes remain private to the current assigned officer; members receive no completion/reschedule notes.

Operations expose queue/detail/event reads and completion/reschedule commands under `/support-follow-ups`. Queue states are all open, scheduled, due today, overdue, and completed, evaluated against the server's Asia/Manila date before bounded task-ID pagination. This is a live queue; refresh retrieves new/changed tasks. History uses immutable versions and bounded older pages.

Completion requires an action-taken note. Rescheduling requires a reason and a different date today or later. Both require task-specific versions, current assignment, disclosure locks, CSRF, and exact same-key retries. Date validation occurs at first execution, retaining replay across calendar changes. Completed tasks are terminal; further work needs a new dated response. Completion records staff action, not resolution of the member's concern. Transitions preserve original responses, request versions, and financial records.

## Member history

`GET /member/support-history` returns an available/unavailable envelope with bounded `items` and `nextCursor`. The legacy `/member/support-requests` array retains its explicit 100-request bound. An absent paging producer stays unavailable; it never silently returns a truncated complete history.

The member page initially loads 25 requests. Submission time/request ID form an exclusive descending seek, with SQL-precision timestamps. Each page rechecks own-record linkage/access. Member history shows submitted answers, linked-loan evidence, and published responses, excluding internal notes and assignment reasons.

## Browser behavior

`/#/member/help` previews all shared content and requires renewed sharing acknowledgment after editing. Optional check-ins are not inferred from text or silence. Failed history reads preserve the help draft/consent; successful submission resets history to the newest page without changing uncertain-command semantics.

`/#/staff/support-requests` provides request and Follow-ups views. The request filter explicitly applies to loaded records; follow-up filters apply across the server queue. Unsaved/uncertain actions guard navigation and retain the original body/key/version. Paging errors preserve loaded history and drafts and retry the same cursor. Obsolete reads are canceled/ignored; access denial unmounts private views and drafts.

The current-position refresh clears earlier current figures while loading, keeps the response draft, and offers an independent read retry. Saving/uncertain writes disable refresh. The submission-time position remains visible as dated evidence. Layout, focus, wrapping, and 320px reflow follow [design.md](../../../../../design.md).

## Setup and remaining boundaries

Apply module migrations with `npm run db:migrate`, then restart the API. Use normal web/API startup, a linked member, a branch administrator, and an assigned officer. Production startup seeds no permission grants. The broader `/health-reviews` operation remains contract-only; external delivery, assisted correction, institutional privacy/retention, and representative-user acceptance remain pending.

No health score, AI priority, repayment pause, loan amendment, financial write, or automatic lending consequence follows from a support request. The separately gated fictional pilot supplies its own financial operations. Review the [delivery responsibilities](../../../../../docs/AGAP_Delivery_Plan.md) before cross-module changes.

## Linked member corrections

The fictional correction flow supplies coordinated monitoring, member facade, and member UI behavior. Institution-dependent rules and receiving-owner acceptance remain separate.

Add a bounded own-member `GET /member/support-requests/{id}/correction-source` and optional producer port. Return only the existing public request projection, original contact preference, adjacent replacement links and the member's recorded correction reason when applicable. The facade supplies the current sharing-notice version. Never return staff notes, assignments, task details or other-member identifiers. One source read works independently of paged history; newer/previous requests are opened explicitly one at a time rather than following an unbounded chain or fetching all history. A new LF-pinned module migration adds only the scoped read function; existing migrations and strict history/command contracts remain unchanged.

Reuse the existing correction writer and immutable new-unassigned-request semantics. Add an optional recovery-only producer port for exact old-notice retries: current member/link/own-record access precedes receipt lookup; a new old-notice command is rejected without invoking the writer or public loan reader. Existing injected producers without recovery retain the safe notice-changed error. Generic receipts remain ID-only, and replay reconstructs the immutable submitted projection. Shared hashes/scopes stay in the monitoring owner; the facade does not inspect its command cache.

The fictional member page at `/member/help/requests/{id}` opens from My requests, previews the full replacement, reason, optional loan/check-in and recipients, and requires renewed sharing confirmation. Original records and follow-ups remain unchanged. Concurrent corrections require explicit review of the newer request; refresh must preserve an unsent correction and cannot negate a successful save. Unsaved/uncertain guards, same-key retries, aborted obsolete reads, complete private-view removal on access denial, keyboard focus and 320px reflow accompany the flow. Real-record correction UI remains unavailable pending the existing institutional release requirements. No financial policy, loan write, AI provider, goal/5C implementation or retention rule is added. Existing specs/design and actual PostgreSQL/API/browser tests accompany the candidate.

## Member-confirmed assisted check-ins

The fictional assisted flow retains the existing institution-dependent boundaries. Add an assigned-officer draft beside an existing support request, an authenticated own-member review/confirmation page, and additive shared/member-domain contracts. This coordinated slice includes the member confirmation surface needed to demonstrate the complete flow; Robert retains receiving-owner review of shared contracts, wiring and member UI. No institutional assisting/advisory authority or notice/retention approval is asserted.

Only `EVIDENCE_RECORD_MODE=fictional` enables these operations. Real-record mode returns the existing module-unavailable error before accessing draft data. Reuse existing active assigned-officer/branch access and own-member linkage; administrators retain assignment metadata only. Never impersonate a member or add a role. A staff draft contains message/contact/check-in answers, with the optional loan resolved from the source disclosure; it cannot contain private response notes or client-selected member/actor/loan IDs. No automatic expiry or retention policy is invented; operational retention remains an institutional release input.

Draft revisions are append-only. States are pending, withdrawn, declined and confirmed, separate from existing support statuses. Member confirmation binds the exact revision, server payload hash and current sharing notice through the member's own session. A new revision requires renewed review. Source reassignment (including away and back) or assisting-staff access/version changes make a pending draft require staff review. Changed notice or unavailable/foreign loan evidence prevents confirmation. Declining remains available to the owning member. Confirmation atomically records member/session-method provenance, creates a new ordinary unassigned support request through the existing owner writer, and preserves the source request and any follow-ups. Unconfirmed drafts never enter existing support histories, counts, financial records or model inputs.

Proposed additive routes: staff create/list under `/support-requests/{id}/assisted-check-ins`, detail/revision/withdrawal under `/support-assisted-check-ins/{id}`; member list/detail/confirmation/decline under `/member/assisted-check-ins`. Pages use bounded 25-item UUID cursors. Versioned commands and metadata-only idempotency receipts protect stale/uncertain retries; current access is rechecked before replay. Existing API definitions and client signatures stay intact. A new module-local LF-pinned migration installs forced RLS, private revisions and bounded owner functions; runtime receives no raw table writes/reads. Existing specs/design and actual DB/browser/privacy tests accompany the candidate.

## Support expansion proposal — 5 November 2026

The coordinated expansion proposes optional member-domain ports and additive routes for member-confirmed corrections and a single-request correction link. A correction repeats the current notice and exact sharing confirmation, submits a new disclosure, and links it to the member's earlier request in one transaction. The original disclosure, assignment, responses and follow-ups remain unchanged. Only one direct successor is allowed; another correction addresses that successor. The new request starts unassigned, preserving administrator assignment and preventing an old officer assignment from silently authorizing new information. Members alone read these links in this slice; member-phone presentation and assisted staff entry remain Robert's later receiving work. Exact retries retain a metadata receipt, and current member linkage is checked before replay.

An additive officer-only descriptive check-in summary counts submissions currently assigned to the requesting officer, within a supplied Manila submission-date range. It counts each explicit answer separately, including declined and unavailable; it is not a unique-member outcome measure, diagnosis, prediction or support ranking. Read at most 1,000 requests under repeatable read and hold assignment locks while reading disclosures. Larger scopes return unavailable with no partial counts. Administrators and auditors gain no access. Robert reviews shared schemas, ports, client and registration. No institutional notice, retention, receiving-owner acceptance or assisted-confirmation policy is asserted.

The latest-main integration preserves connected pilot/review routes, consumes the same configured public loan reader for corrections and existing support, and retains the shared member/staff material-transaction guards. The correction ports remain optional for injected member-domain implementations; missing producers stay unavailable.
