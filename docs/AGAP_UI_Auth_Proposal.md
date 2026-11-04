# UI cleanup and local preview authentication proposal

26 October 2026. User-approved annotation cleanup under Robert's platform/member/integration work. This proposal precedes changes to authentication interfaces. The explicit evidence-screen request authorizes presentation changes in Aaron's feature; financial/evidence domain rules and fixtures remain unchanged.

- Reuse the seeded fictional administrator and real staff sessions to gate review-demo routes. Share session/account controls across staff/demo screens; member sessions remain separate. Demo role controls affect fictional browser records only.
- Add opt-in `LOCAL_PREVIEW_PASSWORD_ONLY`, false by default, allowed only in loopback development. Staff preview uses a separate fictional Keycloak client; member and normal MFA clients remain unchanged. Production rejects the preview configuration/client.
- Extend staff `GET /api/v1/auth/login` with optional `assurance=mfa` and `returnTo`, limited to internal staff/review routes. Persist the requested assurance and validated return path in OAuth state through an append-only migration. Callback validates the requested signed assurance and returns the session plus saved route internally; cookies/JSON session schemas remain unchanged.
- Keep fresh-MFA authorization on assignment/revocation. Step-up does not automatically retry a command. Existing fictional realms receive a bounded idempotent preview-client update, not a reset or credential deletion.
- Shared navigation offers Member portal, Staff workspace and Review demo. Real account menus provide Sign out; demo tools contain simulated roles/reset. Shorter copy and grouped metadata retain complete sources, financial values, history and uncertainty.

Verify protocol/configuration rejection, preview login and MFA step-up, session invalidation, keyboard menus, protected routes, unchanged calculations and responsive annotated screens before publication. Assignment.md remains the sole task/status tracker.


## Temporary local presentation entry — 3 November 2026

The user explicitly requests automatic entry for both member and staff/review workspaces, hiding password/sign-in interaction while preserving its implementation for later. This task-specific direction supersedes the manual sign-in requirement only when the new opt-in `LOCAL_PRESENTATION_MODE=true` is active. Normal/default/production authentication remains unchanged.

Before implementation, the proposed boundary is: loopback development only; fictional record mode, notice, realm and named local database only; loopback API bind and exact public Host/origin checks. A session read can establish a bounded cookie-backed session for the existing seeded fictional administrator or separately linked member. Read canonical seeded subjects from the existing fictional realm; do not provision accounts, add roles or re-enable revoked access. Mark generated opaque cookie values with a presentation prefix accepted only while the flag is enabled, so switching it off immediately refuses these cookies without schema or migration changes. Member/staff cookies, database sessions, own-record scopes, CSRF, version checks and fresh-MFA restrictions remain separate. Presentation sessions do not claim MFA.

The existing session JSON/contracts stay unchanged. A local response header `X-AGAP-Presentation: true` informs the two providers to hide sign-in/sign-out controls and show Presentation mode in the shared header. No credentials or fake identities are placed in browser storage. Expiry triggers another bounded session read in presentation mode; missing/revoked fixtures or unavailable services show recoverable workspace errors. Mode-off resumes the existing OIDC/password/MFA flow. Explicit MFA step-up endpoints remain implemented; presentation cookies do not satisfy them.

Implement on an isolated Robert-owned branch; record UI-06/FND-02/MOB-01 scope in Assignment.md and verify flag rejection, separate scoped sessions, revocation, CSRF/MFA denial, restoration of normal authentication, responsive browser navigation and the full required checks. Activation is for the current fictional local presentation only, not public or real-record deployment.

### Alternate local identity port — 4 November 2026

The authorized `fix/local-presentation-port` change proposes accepting the two exact fictional development issuers `http://127.0.0.1:58080/realms/agap` and `http://127.0.0.1:18080/realms/agap` for presentation entry. The latter is the existing Windows port workaround and already-used account linkage. Do not change issuer linkage, roles, MFA policy, cookies or account provisioning. All existing development/loopback/fictional-data and session/access checks remain required. Verify both ports, reject other ports/hosts/realms/URL suffixes, and exercise actual automatic sessions and mode-off restoration. This is a compatibility amendment to the existing automatic-entry proposal; it records no production or receiving-owner approval.
