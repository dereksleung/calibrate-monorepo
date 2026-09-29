# 13: Migrate Passkey Registration workflow

**Blocked by:** 10.

**Status:** ready-for-agent

**What to build:** Deliver passkey enrollment as one slice. Define frontend registration challenge and result models/builders. Split request-options and verify-registration network mechanics into private `api/auth/**` endpoint files with pure response mappers. The public Passkey Registration workflow owns mutation options/hooks, invokes the mappers, and exposes domain results. Migrate Passkey Enrollment callers while leaving browser WebAuthn registration and router transitions in web.

- [ ] Preserve enrollment challenge/verification ordering, error-code parsing, and current session behavior.
- [ ] Keep browser passkey registration adapter and navigation in web; do not introduce token storage in core.
- [ ] Test request and verify endpoints/mappers, public workflow success/error paths, and the web adapter handoff before migrating callers.

**Acceptance:** Passkey Registration completes through a domain-typed core workflow and existing web adapter without API-contract-shaped public results.

**Verify:** focused passkey registration endpoint/mapper/workflow and enrollment-page tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** auth models/builders, private passkey-registration endpoint files, a public workflow leaf, focused tests, and bounded Passkey Enrollment edits.
