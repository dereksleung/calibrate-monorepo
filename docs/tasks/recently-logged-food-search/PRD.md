# Spec: Recently logged food search

Status for Matt Pocock skills: ready-for-agent

## Objective

Replace mock “Recently logged” rows on food search with Recent foods from the Day Log cache, ranked for leftover / same-Meal reuse. Shorten logging with a plus shortcut that saves the last logged amount, while row tap still opens confirm.

The user is a signed-in calorie tracker opening `/logs/food-search` for a selected date, either from a Meal’s `+ Add Item` (preselected Meal) or from Quick log Search food (no Meal).

ADR-0005 records why the idle list is cache-only and Meal-first. Glossary: Day Log, Food Entry, Food Logging day, Meal, Recent food, Reference serving.

## ASSUMPTIONS I'M MAKING

These were confirmed in grilling. Treat a mismatch as a spec bug, not an implementation choice.

1. Web app only (`apps/web-frontend`), not React Native.
2. “Today” / “yesterday” are the device’s local calendar dates (`getTodayDateString`), not `selectedDate` and not the backend’s UTC recent-search window.
3. Idle recents never call `GET /foods/search` and never extra-sync Day Logs.
4. Unique key is exact `name` + `brand` (`null` brand is its own key).
5. Plus saves onto `selectedDate` using existing Food Entry create + Day Log cache patch (`useSaveFoodEntry`).
6. No new npm dependencies (Base UI Select and Sonner already exist).

## Tech Stack

Nx monorepo: `web` (React, TanStack Router/Query, Tailwind, Base UI, Sonner), `backend` (clean architecture, Kysely/Postgres), `@calibrate/api-contracts`, `@calibrate/api-client`.

## Commands

Use Nx, not package scripts:

```text
npx nx run api-contracts:test
npx nx run api-client:test
npx nx run backend:test
npx nx run backend:test:integration
npx nx run web:test
npx nx run web:test:integration
npx nx run web:typecheck
npx nx run web:lint
npx nx run web:fmt
```

## Project Structure

```text
apps/web-frontend/src/pages/logs/FoodSearch/     → idle ranking, FoodSearchPage, FoodResultCard
apps/web-frontend/src/pages/logs/Logs/components/MealSection.tsx → consume title/subtitle variants
apps/web-frontend/src/pages/logs/ConfirmFood/    → recent vs catalog initial quantity; keep scaleFoodNutrition
apps/web-frontend/src/shared/components/base/typography/ → foodListItemTitle, foodListItemSubtitle
apps/web-frontend/src/verticals/day-log-cache/   → read slots only; reuse useSaveFoodEntry
apps/backend/src/application/ports/recent-food-query.ts → chosenQuantity, chosenUnit on RecentFoodRecord
apps/backend/src/presentation/controllers/food-search-controller.ts → map those fields on source: "recent"
packages/api-contracts/src/food-search-responses.ts → RecentFoodSearchResultSchema
docs/adr/0005-cache-only-meal-first-recent-foods.md
docs/tasks/recently-logged-food-search/PRD.md
```

Do not add `FoodListItem` under `shared/components`. Do not add a recents HTTP route.

## Problem Statement

On food search, Recently logged is fake, so the first screen of logging is useless until the user types three characters. People often log the same leftover plate at the same Meal as yesterday. Search recents also omit the last logged amount, so even a typed match does not start from the portion that already controlled their intake.

## Solution

Before a typed query, rank unique Recent foods from cached Day Logs older than today. After three characters, keep mixed recent+catalog search, but recent hits include last-logged quantity and unit. Row tap still confirms. Plus adds immediately when a Meal is known, or opens a plus-pill Base UI Select of Meals when it is not. Search results sit in one denser glass card so aurora still shows and list text stays readable.

## User Stories

1. As a signed-in user who opens food search without typing, I want a Recently logged list from my cached prior Food Logging days, so that I am not looking at mock food.
2. As a signed-in user, I want that list to ignore the current local calendar date, so that today’s already-logged plates are not the source of suggestions.
3. As a signed-in user, I want yesterday used when it is a Food Logging day, otherwise the newest earlier cached Food Logging day, so that leftovers come from the last real eating day I still have locally.
4. As a signed-in user who opened search from Lunch `+ Add Item`, I want yesterday’s Lunch foods first, then Lunch from older cached days, then other Meals newest-day-first in Breakfast → Lunch → Dinner → Snacks, so that same-Meal leftovers beat other Meals.
5. As a signed-in user who opened search from Quick log with no Meal, I want no clock inference: newest prior Food Logging day first, and within each day Breakfast → Lunch → Dinner → Snacks, so that FAB search stays Meal-neutral.
6. As a signed-in user, I want the same name and brand to appear once (newer day wins), so that the picker is not three identical chickens.
7. As a signed-in user, I want at most 20 unique foods, and fewer if the cache cannot supply 20, so that the list does not invent history or extra sync.
8. As a signed-in user with no prior Food Logging day in cache, I want `No recently logged foods.` in that same list card, so that I do not see mocks.
9. As a signed-in user typing three or more characters, I want the heading to become Search results and the list to be backend search (recents then catalog), so that idle ranking does not hijack typed lookup.
10. As a signed-in user looking at a typed recent hit, I want `chosenQuantity` and `chosenUnit` from the server, so that plus and confirm start from the last plate.
11. As a signed-in user looking at a catalog hit, I want the Reference serving, so that catalog foods do not pretend to have a last plate.
12. As a signed-in user, I want tapping the title/subtitle to open confirm, so that I can change amount before save.
13. As a signed-in user opening confirm from a Recent food (idle or typed), I want quantity and unit initialized to the last logged amount, so that confirm is a shortcut not a reset to 1 serving.
14. As a signed-in user on that confirm screen, I still want changing quantity or unit to scale nutrition from the catalog Reference quantities on the entry, so that a smaller leftover is truthful.
15. As a signed-in user with a preselected Meal, I want plus to create the Food Entry immediately on `selectedDate` with the last plate (or catalog Reference serving), stay on search, and toast `Added to Lunch` using that Meal’s display name.
16. As a signed-in user with no preselected Meal, I want plus to open a Base UI Select of Breakfast / Lunch / Dinner / Snacks from the plus pill, with the options list expanding upward; choosing a Meal adds immediately; overlay or escape cancels.
17. As a signed-in user, I want a second plus to log a second copy, so that “another serving” is explicit rather than hidden dedupe.
18. As a signed-in user, I want only the in-flight plus disabled, so that I can add a different row while one save runs.
19. As a signed-in user whose save fails, I want `We couldn't save that food.` and to remain on search, so that I can retry.
20. As a signed-in user, I want Logs meal-card rows and search rows to use matching title and subtitle type (size, weight, family only), so that type matches without a shared list-item component.
21. As a signed-in user, I want the search list, empty state, and skeletons in one ~70% white glass card, with the search field still its own pill, so that aurora shows around the list and item text stays readable.
22. As a signed-in user, I do not want Food Entry timestamps on Day Log or search payloads for this work, so that ranking stays on Meal and date.
23. As a signed-in user looking at a Recent food row (idle or typed search), I want the subtitle to start with that Food Logging day’s date as `Oct 3`, then a middle dot, then the rest of the subtitle, so that I can see which prior day the leftover came from.

## Implementation Decisions

- **Idle ranking is a pure client function** over cached `DayLogResponse | null` slots already in React Query. Input: account-scoped slots, local `today`, optional preselected Meal. Output: up to 20 unique Recent foods. Colocate it under FoodSearch (for example `rank-recent-foods-from-cache.ts`) with fast tests.
- **Source days:** every cached date `< today` whose slot is a Food Logging day. Sort dates descending. Do not treat Known-empty or unloaded slots as sources. Do not fetch.
- **Walk:** if `preselectedMeal` is set, take that Meal from each source day in date order, then remaining Meals in `MEAL_SECTIONS` order, still newest day first. If unset, for each source day in date order emit Breakfast, then Lunch, Dinner, Snacks. Skip a name+brand already emitted.
- **`FoodSearch` idle:** `query.trim().length < 3` → pass ranked cache rows, `state: "ready"` or empty. Do not pass `undefined` into `mockRecentFoods`. Delete mock defaults from the live page path.
- **Typed search:** keep `useFoodSearch` when trimmed query length ≥ 3. Map `source: "recent"` onto confirmation food with `chosenQuantity` / `chosenUnit`. Catalog mapping unchanged.
- **Contracts:** extend `RecentFoodSearchResultSchema` (not catalog) with `FoodEntryChosenFieldsSchema`. Thread `chosenQuantity` / `chosenUnit` through `RecentFoodRecord`, `PostgresRecentFoodQuery` mapping (`selectAll` already loads the columns), and `toRecentResult`. No Day Log / `FoodEntryResponse` timestamp fields. No recents-only route.
- **Confirm, Recent food:** stored calories/macros are the plate. Recover catalog-reference nutrition as `plate / (chosenQuantity / baseQuantity(chosenUnit))` using the same unit bases as `getFoodUnitOptions` (`quantityServing`, `quantityMass`, `quantityVolume`). Put recovered nutrition on `SelectedFoodForConfirmation`, initialize the form to `chosenQuantity` / `chosenUnit`, then keep `scaleFoodNutrition` as the only scale path. If the chosen unit cannot be matched, fall back to today’s catalog init (`quantityServing`).
- **Confirm, catalog:** unchanged Reference serving init and scale.
- **Plus payload:** Recent food → POST stored plate + `chosenQuantity` / `chosenUnit` (no recover-and-rescale). Catalog → same as confirm’s initial Reference serving scale. Meal is preselected Meal or the Select choice. Date is `selectedDate`. Reuse `useSaveFoodEntry`; on success do not navigate away.
- **Plus control:** preselected Meal → button. No Meal → Base UI `Select` like `ConfirmFoodUnitSelect` (primitive only). Trigger stays the plus pill (not the full-width unit field). Positioner `side="top"` so the Meal list expands upward (same as the confirm unit Select). Items: Breakfast, Lunch, Dinner, Snacks. `onValueChange` with a value → close and save. No Meal label on the trigger. Row tap must not fire when using plus/Select (`stopPropagation` / split controls).
- **Toasts:** Sonner success `Added to {Meal display name}`; error copy matches confirm-food (`We couldn't save that food.`).
- **Typography:** `foodListItemTitle: "text-base font-semibold"` and `foodListItemSubtitle: "text-xs"` are the shared type values. The Typography variants carry them in `MealSection` title and `NutrientSummary`; `FoodResultCard` applies the same values directly. No color, tracking, or margin belongs to the variants. The Storybook variant list includes them.
- **Glass:** do not change global `.glass-card` (40% white). Add a search-list-only class with the same blur/border/shadow and `background-color: rgba(255, 255, 255, 0.7)`. Wrap the list, empty status, and skeletons in one card. Remove per-row `glass-card` from result rows and idle skeletons. Search input keeps its pill `glass-card`.
- **FoodResultCard** remains search-specific (plus / Select). **MealSection** rows stay display-only. Similar row height comes from shared type, not a shared component.
- **Recent food subtitle date:** prefix with the Food Logging day’s ISO date formatted `en-US` short month + numeric day (`Oct 3`), then ` · `, then calories / serving / brand. Use the cache slot date for idle rows and `recency.lastUsedDate` for typed recents. Do not use `displayLabel` (`Recent`). Catalog rows have no date prefix. This is a calendar date, not `createdAt` / `updatedAt`.

### Ranking sketch

```ts
const MEAL_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const;

function foodKey(entry: { name: string; brand: string | null }): string {
  return `${entry.name}\0${entry.brand ?? ""}`;
}

// days: Food Logging days with date < today, sorted newest → oldest
// If preselectedMeal: emit that meal across days, then other meals newest-day-first.
// Else: for each day, emit MEAL_ORDER.
// Skip keys already seen. Stop at 20.
```

## Code Style

Follow existing Food Search / Confirm Food patterns: named Meal union from contracts, `cn()` for class names, no new color tokens on Typography variants, presentation mappers only at HTTP boundaries. Domain `FoodEntry` stays without timestamps.

## Testing Strategy

Assert seams: ranked list contents, search JSON shape, confirm initial values, and what the user can activate. Do not lock onto private ranking helpers’ inner loops, CSS class strings beyond the denser list-card contract, or SQL.

1. **Idle ranking (fast, `web:test`).** Given fixture Day Log slots, assert skip-today, yesterday-first, preselected-Meal-across-days, FAB meal order, name+brand collapse, cap 20, fewer than 20, and empty. Prior art: `food-search.test.tsx`, day-log-cache tests.
2. **Recent search contract + mapper (fast, `api-contracts` / `backend:test`).** `RecentFoodSearchResultSchema` requires chosen fields; catalog schema rejects them; `toRecentResult` / query mapping forwards DB chosen columns. Prior art: `log-page-contracts.test.ts`, `food-search-controller.test.ts`.
3. **Confirm recent init + scale (fast, `web:test`).** Recent food with plate of 2 servings shows that plate at open; changing to 1 serving halves; catalog path unchanged. Prior art: `ConfirmFood.test.tsx`, `confirm-food-nutrition` tests.
4. **Search page plus vs row (fast, `web:test`).** Row → confirm navigation; plus with preselected Meal → mutate and stay; plus without Meal → Select then mutate with chosen Meal; in-flight disables only that plus; error toast. Prior art: `food-search.test.tsx`, confirm-food route save wiring.
5. **Live cache composition (integration, `web:test:integration`).** Food search idle list reads real query-client Day Log slots (no search HTTP). Prior art: `food-search.integration.test.tsx`, `logs-live-day-log.integration.test.tsx`.

Browser Playwright is not required for this delivery unless a later E2E ticket is added. Postgres recent-search integration is optional supporting evidence for seam 2, not a third product seam.

## Boundaries

- Always: keep idle recents cache-only; keep Food Entry writes on the Day Log aggregate; run the smallest relevant `nx` tests before calling the work done; use glossary terms (Recent food, Meal, Food Logging day).
- Ask first: adding `createdAt`/`updatedAt` to Food Entry responses; a recents HTTP route; extra Day Log sync for this list; new dependencies; changing global `.glass-card`.
- Never: restore `mockRecentFoods` on the live idle path; catalog-scale a Recent food as if stored calories were a Reference serving without recovering the baseline; put domain timestamps on `FoodEntry` for this story; commit secrets.

## Success Criteria

- Idle food search shows ranked cache Recent foods or `No recently logged foods.`, never mocks.
- Preselected Meal and no-Meal orderings match the walk above; unique name+brand; max 20; no extra sync.
- Typed recent results include `chosenQuantity` and `chosenUnit`; catalog results do not.
- Confirm from a Recent food opens on last amount and still scales when quantity or unit changes.
- Plus adds immediately (Select first when no Meal), stays on search, toasts success/error as specified.
- Logs and search use matching title/subtitle type values; search list uses one 70% glass card; global `.glass-card` remains 40%.
- Recent food subtitles start with `Oct 3 · …`; catalog subtitles do not.
- No Food Entry timestamp fields on Day Log or search contracts.

## Out of Scope

- Clock-time ranking; `createdAt` / `updatedAt` / eaten-at on Food Entry
- `GET /foods/recent` or wiring `RecentFoodsResponse` as its own route
- Extra Day Log sync or widening cache retention to fill 20
- Shared `FoodListItem` component
- Changing global `.glass-card` opacity or Dashboard/Logs glass
- Inferring current Meal from clock
- Removing plus, or using a Drawer for Meal choice
- Changing typed-search merge order (recents still before catalog)
- React Native

## Open Questions

None. Grilling closed ranking, cache bounds, plus vs confirm, Select vs Drawer, glass wrapping, last-logged amount (including confirm scale), and Recent food subtitle dates.

## Further Notes

- `docs/ideas/log-page.md` still says “Global recent foods, not meal-specific.” ADR-0005 supersedes that for the idle list.
- Backend typed recents still use a UTC 14-day window for `GET /foods/search`; that is independent of idle local-date ranking.
- Confirm-food success still navigates to Logs; plus success stays on search. Do not change confirm’s post-save navigation in this story.
