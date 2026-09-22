# 08: Migrate authentication workflows and current-user context

**Blocked by:** 02.

**Status:** ready-for-agent

**What to build:** Define and map the core `AuthenticatedUserContext` plus all existing auth workflow results. Migrate session, email-verification, and passkey callers to direct public core leaves. Keep `SessionRestorationGate` and the authenticated-session cache coordinator in web because they own browser cache fencing and navigation.

- [ ] Do not treat current-user context as token storage.
- [ ] Preserve session transport information needed by the client.
- [ ] Let portable workflows receive or resolve account context supplied by the host app; do not import web's authenticated-session hook from core. A workflow may consume auth and Day Log models without being nested under either vertical.
- [ ] Keep WebAuthn/browser adapters and router transitions in web.
- [ ] Ensure auth API response types no longer escape public core operations.

**Acceptance:** Auth callers use core domain/workflow values while browser session restoration retains its current security lifecycle behavior.

**Verify:** focused core auth tests, session-restoration and auth-page tests, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** core auth models/workflows and bounded batches under `apps/web-frontend/src/verticals/auth/` and `pages/auth/`.
