# 03: Add Day Log domain models, mappers, and builders

**Blocked by:** 02.

**Status:** ready-for-agent

**What to build:** Define frontend Day Log, Food Entry, Meal, food-search, sync, and write-acknowledgement models under `verticals/day-logs/models`. Base them on the shape of the existing types `DayLogResponse` and `DayLogSyncResponse`, but make them independent of those types. Add co-located `__mocks__` builders. Add the initial pure API-response-to-domain mappers in the same private `api/<area>/<endpoint>.ts` files as their request operations; later tickets add mappers as they migrate other endpoints. Each operation continues to return its validated response, and the owning workflow calls the mapper. Pure vertical models must not know API response types.

- [ ] Keep `DayLog` meal fields nullable for this refactor.
- [ ] Define `DayLogSnapshot` as `{ date, data: DayLog | null | undefined }`; document `null` as Known-empty and `undefined` as unloaded.
- [ ] Keep response-contract imports in private endpoint files. A workflow may use request-contract types internally to shape commands, but neither model files nor public workflow results expose API contract types. Name workflow leaves for user goals; their grouping need not match a vertical, and they may use models from more than one vertical.
- [ ] Add focused tests for endpoint mappers that prove field-by-field conversion and null/undefined slot meanings; verify workflows call them before exposing or caching domain data.

**Acceptance:** Core consumers can use Day Log types and builders without importing `@calibrate/api-contracts`.

**Verify:** focused model/mapper tests, `npx nx run @calibrate/frontend-core:test`, `npx nx run @calibrate/frontend-core:typecheck`.

**Likely files:** `verticals/day-logs/models/day-log.ts`, its `__mocks__` sibling, the relevant private Day Log endpoint files, and focused mapper tests.
