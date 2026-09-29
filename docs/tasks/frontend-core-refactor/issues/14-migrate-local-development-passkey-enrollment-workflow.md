# 14: Migrate local-development passkey enrollment workflow

**Blocked by:** 10.

**Status:** ready-for-agent

**What to build:** Deliver the existing local-development passkey enrollment request as a small complete slice. Define any frontend command/result models and builders it needs, put request formation/validation and a pure response mapper in its private `api/auth/**` endpoint file, and expose the goal through a public workflow leaf. Migrate its Signup/Login caller. The local-development test-session operation is owned by the session slice in 10.

- [ ] Preserve the existing local-only behavior and response/error meanings; do not add a production authentication path.
- [ ] Keep API-contract types within the private endpoint/workflow boundary and any browser or router behavior in web.
- [ ] Test request formation/validation, mapper conversion, and the public workflow success/error paths before migrating its caller.

**Acceptance:** The local-development enrollment operation is reachable through a domain-typed public workflow and has a focused independent test, while the session operation remains in 10.

**Verify:** focused local-development endpoint/mapper/workflow and Signup/Login tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** private local-development passkey endpoint, a public workflow leaf, any needed auth models/builders and their tests, and the bounded Signup/Login caller edit.
