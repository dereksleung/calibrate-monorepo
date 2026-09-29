# 12: Migrate Passkey Authentication workflow

**Blocked by:** 10.

**Status:** ready-for-agent

**What to build:** Deliver passkey sign-in as one slice. Define frontend challenge and authenticated-result models/builders. Split request-options and verify-authentication network mechanics into private `api/auth/**` endpoint files with pure response mappers. The public Passkey Authentication workflow owns mutation options/hooks and maps validated results into `AuthenticatedUserContext`. Migrate Signup/Login callers while keeping the browser WebAuthn adapter in web.

- [ ] Preserve challenge/verification ordering, cancellation and error-code behavior, and session information required by the client.
- [ ] Keep browser credential creation/assertion and navigation in web; core receives portable command data and injected transport.
- [ ] Test request and verify endpoints/mappers, public workflow success/error paths, and the web adapter handoff before migrating callers.

**Acceptance:** Passkey Authentication completes through a domain-typed core workflow and existing web adapter without exposing API response types or browser APIs from core.

**Verify:** focused passkey endpoint/mapper/workflow and Signup/Login tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** auth models/builders, private passkey-authentication endpoint files, a public workflow leaf, focused tests, and bounded Signup/Login edits.
