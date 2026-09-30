# 11: Migrate Account Email Verification workflow

**Blocked by:** 10.

**Status:** implemented

**What to build:** Deliver the request-and-verify email goal as one slice. Define frontend verification command/result models and co-located builders. Put each request's path/body validation, transport call, response validation, and pure response mapper in its private `api/auth/**` endpoint file. A public Account Email Verification workflow owns mutation options/hooks, calls both endpoint mappers as needed, and returns domain values. Migrate Signup/Login and OTP callers to the workflow.

- [x] Preserve request and verification behavior, error states, and any session context established by a successful verification.
- [x] Keep OTP page navigation and handoff state in web; keep API-contract request/response types out of public leaves and models.
- [x] Test both endpoint operations/mappers and the public workflow, including invalid input, expired/invalid code, and successful verification, before migrating callers.

**Acceptance:** Account Email Verification is independently testable from request through confirmation, with contract-independent public results and unchanged web behavior.

**Verify:** focused endpoint/mapper/workflow and OTP tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** auth models/builders, private account-email-verification endpoint files, a public workflow leaf, focused tests, and bounded `apps/web-frontend/src/pages/auth/` caller edits.


## Implementation

- Added contract-independent email request/confirmation commands, challenge and continuation results, and sibling test builders in frontend-core.
- Split request and verification into private `api/auth` endpoints with validated bodies/responses and explicit pure response mappers. The public `feature-workflows/auth/account-email-verification` leaf owns both mutation option factories and hooks, request shaping, and mapper calls.
- Migrated Signup/Login, OTP, and test mocks to the workflow leaf. Replaced email-verification API-contract imports in the form and browser handoff with domain models and web-owned history validation. Routing, timestamps, resend countdown, and setup authorization through transport cookies remain in web.
- Replaced the superseded core adapter/export and moved its endpoint tests. No web file became unused: the handoff still owns browser history parsing and route state.
- Verification: 121 core tests, 196 web fast tests, six request/confirmation routing integration tests, core/web typechecks, and web lint passed. Added eight additional continuation-history validation tests after the full web run, then verified the focused handoff suite. Changed-file formatting and diff checks passed.
- Full `web:fmt:check` reports existing formatting issues in untouched `MiniAnalyticsCard.tsx`, `CalendarWeek.stories.tsx`, and `CalendarWeek.tsx`; these are outside this ticket. Nx also printed a router-generator discovery warning about root `src/routes` during one invocation; the requested test target completed successfully.
