# 06: Migrate Logs and food search to domain workflows

**Blocked by:** 05.

**Status:** ready-for-agent

**What to build:** Replace Logs and food-search consumption of API response/request types with direct core workflow/model imports. Move portable nutrition totals, meal definitions, and cache-only recent-food ranking into core; retain route parsing, display formatting, component props, and UI state in web.

- [ ] Keep the Confirm Food route state web-local.
- [ ] Preserve cache-only recents: no idle API fetch and no new endpoint.
- [ ] Replace API-shaped fixtures with core `__mocks__` builders where they model shared data.
- [ ] Do not change UI behavior or food-ranking rules as part of the type migration.

**Acceptance:** Logs and food search render and write using domain/workflow types; the requested source scope has no API response type imports.

**Verify:** focused Logs/FoodSearch tests, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** bounded batches under `apps/web-frontend/src/pages/logs/` and core shared/day-log model modules.
