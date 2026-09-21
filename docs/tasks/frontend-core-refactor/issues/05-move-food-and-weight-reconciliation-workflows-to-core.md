# 05: Move food and weight reconciliation workflows to core

**Blocked by:** 04.

**Status:** ready-for-agent

**What to build:** Implement public save-food-entry and update-weight workflows that map frontend command inputs, call private API operations, patch a predecessor-version cache slot, and conditionally reconcile with sync after an unverified acknowledgement.

- [ ] A user-goal workflow may call save/update and sync; do not split correctness across artificial endpoint-only hooks.
- [ ] Keep locally acknowledged data on reconciliation failure and leave the slot eligible for normal validation.
- [ ] Keep request/response contract types private to the workflow/API boundary.
- [ ] Characterize and preserve aggregate-creation and version-mismatch behavior before moving it.

**Acceptance:** Both writes preserve existing cache correctness without browser-specific imports in core.

**Verify:** focused mutation/reconciliation tests, `npx nx run @calibrate/frontend-core:test`, targeted web cache tests.

**Likely files:** one core workflow plus test per write, then bounded web call-site edits.
