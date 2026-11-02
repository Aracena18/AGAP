# Evidence, extraction and assessment contract proposal — 3 November 2026

Tasks: FND-03, EVD-01, CRD-01, AI-01, QWN-01/EVAL-01 integration, SHOW-01 and OPS-01 preparation. Baseline: main `312c6f8`. The user explicitly authorizes this coordinated implementation across Robert/Aaron's boundaries; named task ownership and independent accepting authority remain unchanged. This proposal is written before canonical edits. User approval of the implementation plan is not another owner's acceptance or institutional policy approval.

## Compatibility and authority

Publish canonical 0.3.0/OpenAPI/client together. Existing 0.2.0 financial snapshot shapes, demo fixtures and calculation versions retain their meaning. New workflow projections carry explicit dated movements and horizon totals; do not relabel a multi-month net amount as monthly capacity. Existing member/domain endpoints remain, with added evidence workspace, statements/facts, processing and saved assessment reads. Browser payloads never supply authenticated actor, organization, scope, approved policy status or trusted model provenance.

## Sources, facts and human review

A source is a document version or a recorded member statement. Documents retain immutable original bytes/hash, quarantine/cleared/blocked status and separate processing progress. Statements are not scanned files and are never labeled independently verified by entry alone. Source references identify exact versions/page/text; derived OCR/text is versioned and inspectable separately from original bytes. Staff-only verification limitations are not exposed in member projections.

Financial facts include category (opening/income/expense/obligation), explicit recorded amount or unavailable reason, source/version, effective/cash dates, amount period and gross/net basis, deduction inclusion and human reason. A fact can have multiple explicitly confirmed dated occurrences. One opening balance is required at horizon start. Unsupported/missing period/basis/timing remains incomplete; zero must be explicit. AI suggestions do not enter assessments until human acceptance, and acceptance never supplies independent verification. Changes append history and increment application concurrency and assessment-input versions under a common application-row lock; saved assessments remain immutable and current reads identify stale input bindings.

Members may add/correct their own facts/statements; assigned officers may record assisted facts and corrections. Scoped verifiers record source verification; authorized staff can inspect a branch-scoped workspace. Unknown/denied resources return the existing opaque errors. Current linkage/session/resource access precedes cached command replay. Mutable commands bind stable actor-scoped keys and expected versions; changed payloads conflict.

## Documents and background processing

Keep PDF/JPEG/PNG and 10 MiB maximum, rejecting invalid byte counts/signatures, unsupported encrypted/malformed documents and resource exhaustion. Authorized upload intent and immutable storage object are recoverably linked; incomplete/abandoned intents remain quarantined, with cleanup subject to configured retention and holds. No public container/path or browser model/storage key is introduced.

Use private local storage for development and a private Azure Blob adapter in deployment. ClamAV inspection must succeed before download, text processing or model input. Native text/OCR subprocesses run with explicit page/output/time limits and generated private paths. Extracted text is not document authenticity evidence. Use the existing PostgreSQL jobs with leases/fencing, bounded retries and operator-visible failure. Claim/commit, external scan/OCR/model work, and fenced finalization are separate phases; external calls never run under the existing ten-second database unit of work.

One reusable Qwen adapter accepts only authorized source text and returns validated untrusted findings; no financial commands or database access. Pin model/prompt/schema/runtime provenance, enforce exact citations and explicit amount/date formats, reject invented references/truncation, retain manual fallback and never automatically promote Experiment D. Production model activation needs an independently accepted release manifest and actual GPU execution. Missing hardware/artifacts/evaluation leaves an honest unavailable state, not simulated success.

## Assessment and products

Staff assess a server-loaded immutable snapshot against an operator-published versioned offer/policy configuration. Missing/unapproved production configuration yields incomplete/unavailable results. No administrator role alone approves institutional policy. Development/test configuration is explicitly fictional and cannot enable real-member mode.

Reuse/refactor the existing finance calculation once, retaining cash-flow-v2 legacy outputs. New results contain dated balances, calendar-month breakdowns, modeled-horizon net remaining, shortage dates, exact full schedule costs and explicit dated separate fees. Input horizon is explicitly selected and bounded; future movements must be entered/confirmed, never extrapolated from past records. Protect payroll inclusion, duplicate commitments, reserved proceeds, unavailable values, safe centavos and exact dates. Offer validity/configuration and all included fact/source versions bind saved results. This milestone prepares producer projections for decisions; it does not activate decision/payment endpoints.

## Delivery and evidence

Use the existing design system and real staff/member sessions. Add staff application evidence/assessment views and extend member application review; keep fictional demo routes unchanged. Verify actual PostgreSQL roles/RLS, immutable history, concurrency/retries, malware/unavailable scanner, OCR/model reference failures, arithmetic oracles, multi-month costs and accessible real-API browser workflows. Test-only infrastructure/model stand-ins remain labeled and cannot be registered in production.

Prepare Vercel same-origin forwarding for `agap.software`, Azure Container Apps API/worker/private inference, PostgreSQL 18, private Blob, Keycloak and secrets/monitoring/recovery. Produce costs and verify live subscription eligibility/quota before provisioning. Real records remain disabled pending budget, institutional policy, privacy/retention, identity, recovery and accepting-officer evidence. Direct pushes follow the required checks; no PR is requested.

## Implemented examples / checkpoint

A manual net-income statement records its amount per listed cash date, an effective date, the full confirmed coverage dates and a reason for any recurrence assumption; unknown net/gross treatment remains incomplete. An AI suggestion may contain null dates and no cash dates, retains exact page/excerpt and derived-text version, and cannot become a fact until a human supplies/affirms the missing inputs. No current date is invented to complete it. Independent issuer verification records method, actual actor, checked date, outcome and limitations in a staff-only history.

A January–March assessment retains three month segments plus a separately labeled total; a confirmed March irregular cost affects March even when earlier months are positive. Full repayment/financing cost uses the complete offer schedule beyond March. Separate fees have configured dates. Policy explicitly chooses `reserved_for_purpose` loan proceeds and `each_reviewed_calendar_month_segment` remaining-rule basis; absent configuration is rejected. The actual/minimum comparison uses the same policy snapshot. Corrections append revisions and invalidate current review without modifying the recorded result. These examples are covered by independent arithmetic/API tests; receiving-owner and institutional acceptance are still unrecorded.

Explicit human `not_applicable` relevance retracts an erroneous fact without deleting it or coercing its amount to zero. Included unavailable facts remain incomplete. Managed-PostgreSQL tests also run evidence functions/views under a non-superuser, non-BYPASSRLS owner; the narrow member queue bridge restores the member claim before returning, and workers receive only their organization's branch scope without disabling FORCE RLS.

Before direct publication the task integrates `d0e0e6e`, preserving the newly merged design-asset archive and account/support UI fixes; it does not activate that archive's proposed palette or replace canonical tokens.
