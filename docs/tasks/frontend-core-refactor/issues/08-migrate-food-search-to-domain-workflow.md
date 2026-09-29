# 08: Migrate Food Search to a domain workflow

**Blocked by:** 04, 05.

**Status:** ready-for-agent

**What to build:** Complete the Search Foods slice. Define contract-independent food-search query, result, and cursor models with co-located builders. Put search request query formation, response validation, and a pure result mapper together in private `src/api/foods/search-foods.ts`. The public `feature-workflows/foods/search-foods.ts` owns TanStack Query options/hook and calls the mapper before returning domain values. Migrate FoodSearch and Confirm Food consumers to these models. Move portable cache-only recent-food ranking and nutrition confirmation calculations to cohesive core verticals.

- [ ] Preserve query keys, cancellation/signal behavior, pagination, and existing food-ranking rules.
- [ ] Keep Confirm Food route state and display choices in web.
- [ ] Preserve cache-only recents: no idle API fetch and no new endpoint.
- [ ] Keep API response types in the endpoint file; public search results and shared builders use frontend-domain types.
- [ ] Test request query/response validation, mapper conversion, workflow query behavior, pagination/empty results, and cache-only ranking before web migration.

**Acceptance:** Food search and recents render with domain/workflow types, and the search workflow is independently testable without browser APIs or API-contract-shaped public results.

**Verify:** focused search endpoint/mapper/workflow, ranking, and FoodSearch tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run web:test`, `npx nx run web:typecheck`.

**Likely files:** `src/verticals/foods/models/` and sibling `__mocks__`, `src/api/foods/search-foods.ts`, `src/feature-workflows/foods/search-foods.ts`, a portable recent-food vertical, their tests, and bounded FoodSearch/Confirm Food web edits.
