# 04: Move Day Log sync and slot composition to core

**Blocked by:** 03.

**Status:** ready-for-agent

**What to build:** Keep the `POST /daylogs:sync` request formation, response validation, and pure response mapper in the private `api/day-logs/sync-day-logs.ts` file. The request operation returns the validated response without mapping it. Move shared portable cache behavior—account-scoped query keys, cache-slot observations, freshness checks, and persistence filtering/pruning—into `verticals/day-log-cache/`. The `feature-workflows/day-logs/sync-day-logs.ts` workflow builds the sync manifest, calls the endpoint mapper, and applies the accepted frontend-domain result to the cache using shared vertical keys/models. Web continues to own the IndexedDB persister and lifecycle fencing.

- [ ] Preserve account identity in every slot and version key.
- [ ] Preserve no-body sync success, Known-empty, validation timestamps, and invalidation behavior.
- [ ] Keep `QueryClient`, account ID, and transport injected from the app.
- [ ] Keep TanStack Query options/hooks, sync-result cache writes, and user-goal reconciliation decisions in the workflow; reusable QueryClient cache mechanics may live in the Day Log cache vertical. The private API file contains request mechanics and its pure response mapper, with no cache or user-goal policy.
- [ ] Move the portable cache buster, retention, account-scoped dehydration allowlist, persisted-snapshot validation, and pruning into the Day Log cache vertical; compose them with the web persister through `PersistQueryClientProvider`.
- [ ] Do not move IndexedDB, BroadcastChannel, document/window, or persistence-provider code into core.

**Acceptance:** Logs and Dashboard can observe the same core Day Log snapshots; all current sync cache semantics survive the move.

**Verify:** focused sync/cache tests, `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test:integration`.

**Likely files:** a core Day Log cache vertical and `feature-workflows/day-logs/sync-day-logs.ts` with focused tests, then bounded web provider/persister adapter and test edits.
