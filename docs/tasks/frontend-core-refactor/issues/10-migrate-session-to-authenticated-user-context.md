# 10: Migrate session to AuthenticatedUserContext

**Blocked by:** 01.

**Status:** implemented

**What to build:** Deliver the session slice and shared `AuthenticatedUserContext` model/builder. Move get-current-session, refresh-session, start-local-development-test-session, and delete-current-session request mechanics into their private `api/auth/**` endpoint files, each with a pure response mapper where it returns session/user data. Public session workflows call those mappers and return frontend-domain context. Migrate session-restoration and logout callers to public workflow leaves, keeping browser cache fencing and navigation in web. Make `ApiTransport` credentials app-configurable with the current `"include"` default and test the pass-through.

- [x] Do not treat current-user context as token storage.
- [x] Preserve session transport information needed by the client.
- [x] Let portable workflows receive or resolve account context supplied by the host app; do not import web's authenticated-session hook from core.
- [x] Keep WebAuthn/browser adapters and router transitions in web.
- [x] Keep `SessionRestorationGate` and the authenticated-session cache coordinator in web; preserve logout privacy and restoration ordering.
- [x] Test each session request/response mapper, context conversion, transport credentials/default, and public session workflow before migrating web callers.

**Acceptance:** Session callers use a domain-typed core workflow and `AuthenticatedUserContext`; browser restoration retains its security lifecycle, and configurable credentials preserve web's default cookie behavior.

**Verify:** focused transport, session endpoint/mapper/workflow, and session-restoration tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run @calibrate/frontend-core:typecheck`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** `src/transport.ts` and its test, `src/verticals/auth/models/` and sibling `__mocks__`, private `src/api/auth/*session*.ts` endpoints, public session workflow leaves and tests, and bounded web session-restoration/logout edits.


## Implementation

- Added the portable `AuthenticatedUserContext` model and sibling test builder. The model preserves user identity, tier, dates, and cookie/bearer transport metadata; it contains no credentials or tokens.
- Split the four session requests into private `api/auth` endpoints. Each session-producing endpoint owns its pure response mapper, and its public `feature-workflows/auth` leaf calls that mapper. Logout exposes completion as `Promise<void>`.
- Added `ApiTransportOptions.credentials`, passing the host configuration through to fetch with the existing `"include"` default.
- Migrated restoration, logout, and local test-session callers and mocks to explicit workflow leaves. The authenticated-session cache coordinator now stores domain context. Browser fencing, storage, navigation, WebAuthn adapters, and restoration ordering remain in web.
- Removed the superseded core session adapter/export and its replaced tests after auditing all callers. The web coordinator and restoration gate remain because they own the browser lifecycle.
- Session endpoints explicitly parse responses because the shared transport validator logs malformed data and returns it. Session endpoints now reject malformed success responses; other endpoints retain their existing validation behavior.
- Verification passed: focused session/transport tests (25), focused web session/logout/local-session tests (37), restoration ordering tests (7), all core tests (97), all web fast tests (196), core/web typechecks, scoped formatting, and the obsolete-import/diff audits. The first checkpoint's commit hook also passed affected lint/typecheck/test targets.


### Portable session cache follow-up

- Moved `authenticatedSessionQueryKey`, `setAuthenticatedSession`, `getAuthenticatedSession`, `clearAuthenticatedSession`, and `useAuthenticatedSession` to the public `verticals/auth/authenticated-session` core leaf. Migrated production and test callers directly to that leaf, with no web re-exports.
- Kept `establishAuthenticatedSession` and its transition type in web, preserving durable account confirmation and revocation before publishing the context.
- Added core coverage for context replacement, session-only removal, and QueryClient subscription without fetching.
- Verification passed: focused core cache tests (3), focused web lifecycle tests (34), all core tests (100), all web fast tests (196), both typechecks, scoped formatting, and the web import audit. Cache helpers accept only the QueryClient methods they use, matching existing core cache boundaries.
