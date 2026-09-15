# ADR-0005: Cache-only, Meal-first Recent foods

**Status:** Accepted

**Date:** 2026-09-13

Idle food search currently shows mock “Recently logged” rows. Typed search already blends Recent foods from Postgres (last 14 UTC days, name match) with catalog hits, but those recents ignore Meal, expose no last-logged amount, and never appear before the user types. `docs/ideas/log-page.md` assumed global recents would be more flexible than meal-specific ones.

Calibrate will build the idle Recently logged list on the client from the Day Log cache: skip the current local calendar date, walk cached Food Logging days newest-first, prefer the preselected Meal across those days, collapse name+brand, and cap at 20. Typed-search Recent foods will include `chosenQuantity` and `chosenUnit` so plus and confirm start from the last logged plate. Food Entry API responses will not grow `createdAt` / `updatedAt`; clock-time ranking and a dedicated recents endpoint are out.

This favors leftover / same-Meal reuse without a new read model, without treating log-time as eaten-time, and without extra Day Log sync just to fill the list.

## Considered Options

- **Clock-time ranking via `updatedAt`:** persistence already has timestamps, but they are last-write times, collapse when someone backfills a whole day at 9pm, and would force a domain and cache-shape change. Rejected.
- **Dedicated `GET` recents endpoint / `RecentFoodsResponse` route:** would ignore cache-first composition and duplicate Meal/date data already in Day Log slots. Rejected for idle; typed search keeps `GET /foods/search`.
- **Global recency only (ideas-doc MVP):** more flexible across Meals, worse for leftover lunch vs dinner. Rejected for the idle list.
- **Shared `FoodListItem`:** search rows need plus / Select; Logs rows are display-only. Share Typography variants only.

## Consequences

- Food search must read Day Log cache slots; idle recents are bounded by whatever prior Food Logging days are already cached (typically the rolling seven-day view, at most 30-day retention).
- `RecentFoodSearchResult` carries last-logged amount; catalog hits do not. Confirm recovers catalog-reference nutrition from the stored plate so quantity/unit changes still scale.
- A later reader should not “fix” idle recents by calling search with an empty query, ranking by `created_at`, or adding Food Entry timestamps for this feature.
