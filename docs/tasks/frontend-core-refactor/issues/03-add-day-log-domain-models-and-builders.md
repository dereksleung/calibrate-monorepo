# 03: Add Day Log domain models, mappers, and builders

**Blocked by:** 02.

**Status:** ready-for-agent

**What to build:** Define frontend Day Log, Food Entry, Meal, food-search, sync, and write-acknowledgement models under `verticals/day-logs/models`. Add co-located `__mocks__` builders and response-to-domain mappers in Day Log feature-workflow modules.

- [ ] Keep `DayLog` meal fields nullable for this refactor.
- [ ] Define `DayLogSnapshot` as `{ date, data: DayLog | null | undefined }`; document `null` as Known-empty and `undefined` as unloaded.
- [ ] Keep API contract imports inside the mapper/workflow files, never the model files.
- [ ] Add mapper tests that prove field-by-field conversion and null/undefined slot meanings.

**Acceptance:** Core consumers can use Day Log types and builders without importing `@calibrate/api-contracts`.

**Verify:** focused model/mapper tests, `npx nx run @calibrate/frontend-core:test`, `npx nx run @calibrate/frontend-core:typecheck`.

**Likely files:** `verticals/day-logs/models/day-log.ts`, its `__mocks__` sibling, a Day Log workflow mapper, and their focused tests.
