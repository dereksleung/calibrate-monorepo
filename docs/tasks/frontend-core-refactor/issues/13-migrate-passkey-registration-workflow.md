# 13: Migrate Passkey Registration workflow

**Blocked by:** 10.

**Status:** implemented

**What to build:** Deliver passkey enrollment as one slice. Define frontend registration challenge and result models/builders. Split request-options and verify-registration network mechanics into private `api/auth/**` endpoint files with pure response mappers. The public Passkey Registration workflow owns mutation options/hooks, invokes the mappers, and exposes domain results. Migrate Passkey Enrollment callers while leaving browser WebAuthn registration and router transitions in web.

- [x] Preserve enrollment challenge/verification ordering, error-code parsing, and current session behavior.
- [x] Keep browser passkey registration adapter and navigation in web; do not introduce token storage in core.
- [x] Test request and verify endpoints/mappers, public workflow success/error paths, and the web adapter handoff before migrating callers.

**Acceptance:** Passkey Registration completes through a domain-typed core workflow and existing web adapter without API-contract-shaped public results.

**Verify:** focused passkey registration endpoint/mapper/workflow and enrollment-page tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** auth models/builders, private passkey-registration endpoint files, a public workflow leaf, focused tests, and bounded Passkey Enrollment edits.


## Implementation

- Added portable registration challenge, credential, command, and error-code models with sibling builders. Verification reuses the shared `AuthenticatedUserContext` result and builder.
- Split options and verification requests into private `api/auth` endpoints with strict validation and pure mappers. The public workflow owns mutation options/hooks and maps successful results before returning them.
- Migrated Passkey Enrollment and its browser adapter to public core leaves; relocated the superseded core auth implementation/tests and removed its legacy export. No web file became unused. Web retains WebAuthn, cancellation, advisory credential signaling, remember-device selection, navigation, and session restoration gating.
- Verification: 154 core tests and 216 web fast tests passed. Six focused web integration tests cover routing and the real core/transport/browser handoff, including ordering, remembered-device choice, failures, disabled retries, and deferred session publication. Core/web typechecks, web lint, and changed-file formatting passed.
- The first broad web run timed out in one Logs test; its isolated run and the full rerun passed. Web-wide format checking reports existing issues in `MiniAnalyticsCard.tsx`, `CalendarWeek.tsx`, and `CalendarWeek.stories.tsx`; those files were left untouched. Concurrent Nx invocations briefly encountered an incomplete graph-cache file; sequential reruns succeeded.
- Actual device passkey enrollment was not manually exercised; WebAuthn is covered through the injected web adapter and SDK handoff tests.
