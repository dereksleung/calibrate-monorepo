# 05: Move Save Food Entry reconciliation workflow to core

**Blocked by:** 04.

**Status:** ready-for-agent

**What to build:** Deliver Save Food Entry as one complete slice. Add frontend save-command and acknowledgement models/builders alongside the Day Log models created in 04. Move the validated `POST /daylogs/{date}/food-entries` request and pure acknowledgement mapper together into private `src/api/day-logs/save-food-entry.ts`; the request returns its validated API response. `src/feature-workflows/day-logs/save-food-entry.ts` owns `getSaveFoodEntryMutationOptions` and `useSaveFoodEntry` and absorbs the portable orchestration currently in web's `verticals/day-log-cache/use-save-food-entry.ts`.

- [ ] Resolve host-supplied account context and the app-owned `QueryClient` without importing web authentication code; execute the server command with the injected transport.
- [ ] Shape frontend command input into the request in the workflow; call the co-located mapper on the validated response before patching or returning domain data. The request operation does not call the mapper.
- [ ] Patch the account-scoped Day Log slot inside this Save Food Entry workflow, using shared cache keys/models from `verticals/day-log-cache/`. Advance the cached version only when its predecessor is trusted; otherwise keep the local acknowledgement unverified and conditionally sync that date.
- [ ] Keep mutation options and the hook on the same workflow policy so using either entry point produces the same mapping, cache updates, reconciliation, and fallback behavior.
- [ ] Keep locally acknowledged data on reconciliation failure and leave the slot eligible for normal validation.
- [ ] Keep request/response contract types private to the workflow/API boundary; public results and models use frontend-domain types.
- [ ] Characterize and preserve aggregate-creation and version-mismatch behavior before moving it.
- [ ] Test the endpoint request/mapper and both public mutation entry points against cache patching, conditional sync, and reconciliation failure.

**Acceptance:** Save Food Entry request, mapper, models/builders, option factory, and hook work as one independently testable slice without browser-specific imports or contract-shaped public results. Weight is handled in [06](./06-move-update-weight-reconciliation-workflow-to-core.md).

**Verify:** focused mutation/reconciliation tests, `npx nx run @calibrate/frontend-core:test`, targeted web cache tests.

**Likely files:** `src/verticals/day-logs/models/` and sibling `__mocks__`, `src/api/day-logs/save-food-entry.ts`, `src/feature-workflows/day-logs/save-food-entry.ts`, their focused tests, and bounded edits to web's `verticals/day-log-cache/use-save-food-entry.ts` and callers.
