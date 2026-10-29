# UI cleanup and local preview authentication proposal

26 October 2026. User-approved annotation cleanup under Robert's platform/member/integration work. This proposal precedes changes to authentication interfaces. The explicit evidence-screen request authorizes presentation changes in Aaron's feature; financial/evidence domain rules and fixtures remain unchanged.

- Reuse the seeded fictional administrator and real staff sessions to gate review-demo routes. Share session/account controls across staff/demo screens; member sessions remain separate. Demo role controls affect fictional browser records only.
- Add opt-in `LOCAL_PREVIEW_PASSWORD_ONLY`, false by default, allowed only in loopback development. Staff preview uses a separate fictional Keycloak client; member and normal MFA clients remain unchanged. Production rejects the preview configuration/client.
- Extend staff `GET /api/v1/auth/login` with optional `assurance=mfa` and `returnTo`, limited to internal staff/review routes. Persist the requested assurance and validated return path in OAuth state through an append-only migration. Callback validates the requested signed assurance and returns the session plus saved route internally; cookies/JSON session schemas remain unchanged.
- Keep fresh-MFA authorization on assignment/revocation. Step-up does not automatically retry a command. Existing fictional realms receive a bounded idempotent preview-client update, not a reset or credential deletion.
- Shared navigation offers Member portal, Staff workspace and Review demo. Real account menus provide Sign out; demo tools contain simulated roles/reset. Shorter copy and grouped metadata retain complete sources, financial values, history and uncertainty.

Verify protocol/configuration rejection, preview login and MFA step-up, session invalidation, keyboard menus, protected routes, unchanged calculations and responsive annotated screens before publication. Assignment.md remains the sole task/status tracker.
