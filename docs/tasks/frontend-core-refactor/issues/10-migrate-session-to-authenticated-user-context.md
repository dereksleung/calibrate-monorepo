# 10: Migrate session to AuthenticatedUserContext

**Blocked by:** 01.

**Status:** ready-for-agent

**What to build:** Deliver the session slice and shared `AuthenticatedUserContext` model/builder. Move get-current-session, refresh-session, start-local-development-test-session, and delete-current-session request mechanics into their private `api/auth/**` endpoint files, each with a pure response mapper where it returns session/user data. Public session workflows call those mappers and return frontend-domain context. Migrate session-restoration and logout callers to public workflow leaves, keeping browser cache fencing and navigation in web. Make `ApiTransport` credentials app-configurable with the current `"include"` default and test the pass-through.

- [ ] Do not treat current-user context as token storage.
- [ ] Preserve session transport information needed by the client.
- [ ] Let portable workflows receive or resolve account context supplied by the host app; do not import web's authenticated-session hook from core.
- [ ] Keep WebAuthn/browser adapters and router transitions in web.
- [ ] Keep `SessionRestorationGate` and the authenticated-session cache coordinator in web; preserve logout privacy and restoration ordering.
- [ ] Test each session request/response mapper, context conversion, transport credentials/default, and public session workflow before migrating web callers.

**Acceptance:** Session callers use a domain-typed core workflow and `AuthenticatedUserContext`; browser restoration retains its security lifecycle, and configurable credentials preserve web's default cookie behavior.

**Verify:** focused transport, session endpoint/mapper/workflow, and session-restoration tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run @calibrate/frontend-core:typecheck`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** `src/transport.ts` and its test, `src/verticals/auth/models/` and sibling `__mocks__`, private `src/api/auth/*session*.ts` endpoints, public session workflow leaves and tests, and bounded web session-restoration/logout edits.
