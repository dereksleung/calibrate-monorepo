# 14: Migrate local-development passkey enrollment workflow

**Blocked by:** 10.

**Status:** implemented

**What to build:** Deliver the existing local-development passkey enrollment request as a small complete slice. Define any frontend command/result models and builders it needs, put request formation/validation and a pure response mapper in its private `api/auth/**` endpoint file, and expose the goal through a public workflow leaf. Migrate its Signup/Login caller. The local-development test-session operation is owned by the session slice in 10.

- [x] Preserve the existing local-only behavior and response/error meanings; do not add a production authentication path.
- [x] Keep API-contract types within the private endpoint/workflow boundary and any browser or router behavior in web.
- [x] Test request formation/validation, mapper conversion, and the public workflow success/error paths before migrating its caller.

**Acceptance:** The local-development enrollment operation is reachable through a domain-typed public workflow and has a focused independent test, while the session operation remains in 10.

**Verify:** focused local-development endpoint/mapper/workflow and Signup/Login tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** private local-development passkey endpoint, a public workflow leaf, any needed auth models/builders and their tests, and the bounded Signup/Login caller edit.

## Implementation

- Relocated the legacy request into private `api/auth/local-development-passkey-enrollment.ts`, with strict response validation and a pure metadata mapper. The bodyless POST needs no frontend command model.
- Added a portable enrollment result model and sibling builder, exposed through explicit leaves alongside the public workflow. Removed the transitional public auth export.
- Migrated Signup/Login to the domain-typed workflow. Web retains its development/hostname guard, browser cancellation, safe error copy, router handoff, and session restoration behavior. The ticket 10 test-session operation is unchanged. No web implementation file became unused.
- Verification: 13 focused core endpoint/mapper/workflow tests, 16 Signup/Login tests, and six real-workflow web integration tests passed. The complete core suite (166 tests), web fast suite (217 tests), core/web typechecks, web lint, and changed-file formatting passed.
- The initial broad core run failed on a missing generated API-contract file during concurrent Nx dependency-output restoration. A sequential rerun passed; no source fix or test suppression was needed.
- Actual device enrollment was not manually exercised; this slice tests enrollment authorization and router handoff, while WebAuthn remains owned by the existing registration workflow.
