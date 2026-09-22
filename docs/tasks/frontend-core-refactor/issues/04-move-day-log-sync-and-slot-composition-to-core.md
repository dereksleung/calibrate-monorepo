# 04: Move Day Log sync and slot composition to core

**Blocked by:** 03.

**Status:** ready-for-agent

**What to build:** Keep the `POST /daylogs:sync` request formation and response validation in a private `api/day-logs/sync-day-logs.ts` operation. Move account-scoped Day Log query keys, manifest creation, cache-slot snapshots, freshness checks, sync-response-to-domain mapping, and accepted-sync cache writes into a portable `feature-workflows/day-logs/sync-day-logs.ts` user-goal workflow. Web continues to own persistence serialization/filtering and lifecycle fencing.

- [ ] Preserve account identity in every slot and version key.
- [ ] Preserve no-body sync success, Known-empty, validation timestamps, and invalidation behavior.
- [ ] Keep `QueryClient`, account ID, and transport injected from the app.
- [ ] Keep TanStack Query options/hooks and reconciliation decisions in the workflow; the private API operation contains only network request mechanics.
- [ ] Do not move IndexedDB, BroadcastChannel, document/window, or persistence-provider code into core.

**Acceptance:** Logs and Dashboard can observe the same core Day Log snapshots; all current sync cache semantics survive the move.

**Verify:** focused sync/cache tests, `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test:integration`.

**Likely files:** one core Day Log sync workflow and test, then bounded web adapter and test edits.
