# 04: Move Day Log sync and slot composition to core

**Blocked by:** 01.

**Status:** implemented

**What to build:** Deliver the first complete Day Log slice. Define contract-independent `DayLog`, nested Meal/Food Entry, `DayLogSnapshot`, and sync-result models under `shared/models/day-logs/`, with co-located `__mocks__` builders. Keep nullable meal collections and define snapshot `data` as `DayLog | null | undefined` (`null` is Known-empty; `undefined` is unloaded), but also define named types for null and undefined like `KnownEmpty = null` and `NotYetLoaded = undefined`. Move `POST /daylogs:sync` formation, request/response validation, and its pure response mapper together into private `api/day-logs/sync-day-logs.ts`; the request returns the validated API response. The public `feature-workflows/day-logs/sync-day-logs.ts` builds the manifest, calls that mapper, and applies the mapped result. Move shared account-scoped keys, cache-slot observations, freshness checks, and portable persistence policy into `verticals/day-log-cache/`. Web keeps its persister and lifecycle fence.

- [x] Preserve account identity in every slot and version key.
- [x] Preserve no-body sync success, Known-empty, validation timestamps, and invalidation behavior.
- [x] Keep `QueryClient`, account ID, and transport injected from the app.
- [x] Map every accepted sync response into the frontend Day Log model before caching or returning it; keep API-contract imports out of vertical models and public results.
- [x] Test request method/path/body/response validation, mapper field conversion, snapshot null/undefined meanings, and the public workflow together so this slice is usable before the next ticket.
- [x] Keep TanStack Query options/hooks, sync-result cache writes, and user-goal reconciliation decisions in the workflow; reusable QueryClient cache mechanics may live in the Day Log cache vertical. The private API file contains request mechanics and its pure response mapper, with no cache or user-goal policy.
- [x] Move the portable cache buster, retention, account-scoped dehydration allowlist, persisted-snapshot validation, and pruning into the Day Log cache vertical; compose them with the web persister through `PersistQueryClientProvider`.
- [x] Do not move IndexedDB, BroadcastChannel, document/window, or persistence-provider code into core.

**Acceptance:** Logs and Dashboard can observe the same contract-independent core Day Log snapshots; sync request, mapper, workflow, and shared cache policy work together with all current cache semantics preserved.

**Verify:** focused Day Log model/builder, sync endpoint/mapper, and sync/cache workflow tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run @calibrate/frontend-core:typecheck`, and targeted web cache integration tests.

**Likely files:** `src/verticals/day-logs/models/day-log.ts` and sibling `__mocks__`, `src/verticals/day-log-cache/`, `src/api/day-logs/sync-day-logs.ts`, `src/feature-workflows/day-logs/sync-day-logs.ts`, their focused tests, and bounded web provider/persister adapter tests.
