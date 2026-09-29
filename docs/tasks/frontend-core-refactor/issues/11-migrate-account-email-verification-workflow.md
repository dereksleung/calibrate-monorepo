# 11: Migrate Account Email Verification workflow

**Blocked by:** 10.

**Status:** ready-for-agent

**What to build:** Deliver the request-and-verify email goal as one slice. Define frontend verification command/result models and co-located builders. Put each request's path/body validation, transport call, response validation, and pure response mapper in its private `api/auth/**` endpoint file. A public Account Email Verification workflow owns mutation options/hooks, calls both endpoint mappers as needed, and returns domain values. Migrate Signup/Login and OTP callers to the workflow.

- [ ] Preserve request and verification behavior, error states, and any session context established by a successful verification.
- [ ] Keep OTP page navigation and handoff state in web; keep API-contract request/response types out of public leaves and models.
- [ ] Test both endpoint operations/mappers and the public workflow, including invalid input, expired/invalid code, and successful verification, before migrating callers.

**Acceptance:** Account Email Verification is independently testable from request through confirmation, with contract-independent public results and unchanged web behavior.

**Verify:** focused endpoint/mapper/workflow and OTP tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** auth models/builders, private account-email-verification endpoint files, a public workflow leaf, focused tests, and bounded `apps/web-frontend/src/pages/auth/` caller edits.
