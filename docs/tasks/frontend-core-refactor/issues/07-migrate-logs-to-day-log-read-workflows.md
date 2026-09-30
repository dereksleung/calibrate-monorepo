# 07: Migrate Logs to Day Log read workflows

**Blocked by:** 04, 05, 06.

**Status:** ready-for-agent

**What to build:** Complete the Day Log read slice used by Logs. Move `GET /daylogs/{date}` and range request formation/response validation into private `api/day-logs/get-day-log.ts` and `get-day-log-range.ts`, each with its own pure Day Log response mapper. The public read workflows call those mappers and return `DatedDayLogCacheResult`/domain values, preserving Known-empty and unloaded semantics. Migrate Logs to the new read, sync, save, and weight leaves. Move portable nutrition totals and meal definitions into cohesive core verticals; retain route, component, and UI-state choices in web.

- [ ] Treat the single-date and range endpoints as one cohesive “read Day Logs” goal, with separate private mappers and shared domain output; do not expose API response wrappers or contract request types from public leaves.
- [ ] Preserve date/range query-key identity and account-scoped `CachedDayLogState` from 04.
- [ ] Keep nullable meal collections and the `null`/`undefined` slot distinction through both mappers.
- [ ] Test each request/mapper and the public read workflow before migrating web consumers; cover loaded, Known-empty, unloaded, and invalid response cases.
- [ ] Replace API-shaped fixtures with core `__mocks__` builders where they model shared data.
- [ ] Do not change Logs UI behavior or nutrition rules as part of the type migration.

**Acceptance:** Logs reads and writes through contract-independent core workflows and models; its feature source no longer imports API response types for Day Log data.

**Verify:** focused Day Log read endpoint/mapper/workflow tests and Logs tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** `src/api/day-logs/get-day-log.ts`, `get-day-log-range.ts`, matching public workflow leaves, Day Log models/builders and nutrition vertical tests, plus bounded batches under `apps/web-frontend/src/pages/logs/`.
