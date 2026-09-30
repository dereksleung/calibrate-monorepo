# 12: Migrate Passkey Authentication workflow

**Blocked by:** 10.

**Status:** implemented

**What to build:** Deliver passkey sign-in as one slice. Define frontend challenge and authenticated-result models/builders. Split request-options and verify-authentication network mechanics into private `api/auth/**` endpoint files with pure response mappers. The public Passkey Authentication workflow owns mutation options/hooks and maps validated results into `AuthenticatedUserContext`. Migrate Signup/Login callers while keeping the browser WebAuthn adapter in web.

- [x] Preserve challenge/verification ordering, cancellation and error-code behavior, and session information required by the client.
- [x] Keep browser credential creation/assertion and navigation in web; core receives portable command data and injected transport.
- [x] Test request and verify endpoints/mappers, public workflow success/error paths, and the web adapter handoff before migrating callers.

**Acceptance:** Passkey Authentication completes through a domain-typed core workflow and existing web adapter without exposing API response types or browser APIs from core.

**Verify:** focused passkey endpoint/mapper/workflow and Signup/Login tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** auth models/builders, private passkey-authentication endpoint files, a public workflow leaf, focused tests, and bounded Signup/Login edits.


## Implementation

- Added portable challenge, credential, command, and error-code models with sibling test builders. Successful authentication uses the existing `AuthenticatedUserContext` and builder.
- Split challenge and assertion requests into private `api/auth` endpoints with strict request/response validation and pure response mappers. The public workflow owns mutation options/hooks, preserves error codes and disabled retries, and maps session/account data for the host.
- Migrated Signup/Login and the browser authentication adapter to the public core leaves. Web retains conditional/explicit WebAuthn, cancellation, challenge reuse/expiry, remember-device choice, and navigation. Removed the superseded core auth leaf/export/tests; no web implementation file became unused.
- Verification: 137 frontend-core tests and 215 web fast tests passed, including endpoint validation/mapping, workflow/hooks, adapter handoff, ordering, cancellation, expiry, and rate-limit behavior. Core/web typechecks and web lint passed.
- Chrome smoke check rendered Signup/Login and entered conditional passkey authentication. An actual credential sign-in requires an authenticator and was not exercised manually.
