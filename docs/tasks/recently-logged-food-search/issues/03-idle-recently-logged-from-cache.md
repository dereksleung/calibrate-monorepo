# 03: Idle Recently logged list from the Day Log cache

**What to build:** Opening food search with no typed query shows Recently logged from the Day Log cache, not mocks and not a search request. Rows are Recent foods from cached Food Logging days before today, ranked for leftover / same-Meal reuse, unique by name+brand, at most 20. The list, empty copy, and skeletons sit in one denser glass card. Idle subtitles use the same `Oct 3 ·` date prefix as typed recents. Typing three or more characters still switches to backend search.

**Blocked by:** 01: Add food-list typography variants on Logs meal rows.

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] Idle list reads already-cached Day Log slots only. No extra Day Log sync and no `GET /foods/search` until the trimmed query is at least three characters. Live idle path does not fall back to mock foods.
- [ ] Source days are cached Food Logging days with date before the device’s local today, newest first. Known-empty and unloaded slots are skipped.
- [ ] Ranking (from the spec; unique key is exact `name` + `brand`, `null` brand is its own key):

  ```ts
  const MEAL_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const;
  // If preselectedMeal: that Meal across days, then other Meals newest-day-first in MEAL_ORDER.
  // Else: for each source day, emit MEAL_ORDER. Skip keys already seen. Stop at 20.
  ```

- [ ] Fewer than 20 unique foods is fine. Zero prior Food Logging days in cache shows `No recently logged foods.` inside the list card. Heading stays Recently logged until a typed search is active, then Search results.
- [ ] List, empty state, and skeletons share one search-list-only glass overlay at about 70% white. Global glass stays 40%. Search field stays its own pill. Rows use ticket 01’s title/subtitle variants. No shared FoodListItem component.
- [ ] Idle Recent food subtitles start with the cache slot’s calendar date as `Oct 3 · …`. Catalog-style rows (typed search) keep ticket 02’s date rules.
- [ ] Prove this at the idle ranking seam (fast tests with fixture slots) and the food-search live cache composition seam. No Playwright suite for this ticket.
