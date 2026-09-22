# 05: Move food and weight reconciliation workflows to core

**Blocked by:** 04.

**Status:** ready-for-agent

**What to build:** Implement public save-food-entry and update-weight workflows that complete each user goal. `src/api/day-logs/save-food-entry.ts` owns the validated network request and returns the validated API response. `src/feature-workflows/day-logs/save-food-entry.ts` owns `getSaveFoodEntryMutationOptions` and `useSaveFoodEntry`; it absorbs the portable orchestration currently in web's `verticals/day-log-cache/use-save-food-entry.ts`.

- [ ] Resolve host-supplied account context and the app-owned `QueryClient` without importing web authentication code; execute the server command with the injected transport.
- [ ] Put request/response mappers in the workflow folder, optionally in a separate `save-food-entry-mappers.ts`. Map the validated save response and command input to frontend-domain values before patching the cache.
- [ ] Patch the account-scoped Day Log slot after the server acknowledges the write. Advance the cached version only when its predecessor is trusted; otherwise keep the local acknowledgement unverified and conditionally sync that date. A user-goal workflow may call save/update and sync when correctness requires it.
- [ ] Keep mutation options and the hook on the same workflow policy so using either entry point produces the same mapping, cache updates, reconciliation, and fallback behavior.
- [ ] Keep locally acknowledged data on reconciliation failure and leave the slot eligible for normal validation.
- [ ] Keep request/response contract types private to the workflow/API boundary.
- [ ] Characterize and preserve aggregate-creation and version-mismatch behavior before moving it.

**Acceptance:** Both writes preserve existing cache correctness without browser-specific imports in core. The API operation has no TanStack Query/cache dependency; the public option factory and hook complete the same Save Food Entry behavior and expose frontend-domain values.

**Verify:** focused mutation/reconciliation tests, `npx nx run @calibrate/frontend-core:test`, targeted web cache tests.

**Likely files:** `src/feature-workflows/day-logs/save-food-entry.ts`, its optional mapper/test, an update-weight workflow/test, then bounded edits to web's `verticals/day-log-cache/use-save-food-entry.ts` and callers.
