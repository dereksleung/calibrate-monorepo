# Spec: Daily Log Page

## Phase

Specification approved for Phase 2 implementation planning. Do not proceed to Phase 3 task breakdown until the implementation plan is approved.

## Assumptions

1. The feature belongs in the existing React frontend project named `web` and the existing Express backend project named `backend`.
2. The first shipped surface is a mobile-first `/logs` page, with larger viewport refinements on the same route rather than a separate desktop experience.
3. USDA FoodData Central is called only from the backend. The frontend never receives the data.gov API key.
4. Saving food entries continues to go through the existing `DayLog` aggregate and `DayLogService.addFoodEntry()` path.
5. Macro and calorie targets are placeholder display values for the MVP and are not persisted as user goals yet: 1,800 calories, 120g protein, 60g fat, and 220g carbohydrates.
6. Daily weight is shown from and persisted under the existing `DayLog.weight` field.

## Objective

Build a daily food log page that helps casual calorie trackers quickly record a day of eating while giving enough progress feedback to feel oriented and motivated.

The user should be able to:

- Pick a single calendar day.
- See calories eaten versus a placeholder target.
- See simple protein, carbohydrate, and fat progress against placeholder targets.
- See the day's weight if available.
- Log or update the selected day's weight as part of that day log.
- Review food entries grouped by Breakfast, Lunch, Dinner, and Snacks.
- Add food from a meal-specific action that preselects the meal.
- Use a global floating action button to open quick logging actions.
- Search USDA FoodData Central through the backend, choose a result, confirm quantity and serving details, then save it as a food entry.
- Reuse globally recent foods without being forced into meal-specific recents.

## Tech Stack

- Workspace: Nx 22.7.0 with npm workspaces.
- Frontend: React 19, Vite 7, TanStack Router, Tailwind CSS 4, Radix UI, Vaul drawer, lucide-react.
- Backend: Express 5, TypeScript 5.9, Zod 4, Kysely/PostgreSQL.
- Shared contracts: `@calibrate/api-contracts` package for request/response schemas and types.
- Tests: Vitest in both frontend and backend.

## Commands

- Frontend dev: `npx nx run web:dev`
- Backend dev: `npx nx run backend:dev`
- Frontend typecheck: `npx nx run web:typecheck`
- Backend type-aware check: `npx nx run backend:typecheck`
- Frontend test: `npx nx run web:test`
- Backend test: `npx nx run backend:test`
- Frontend lint: `npx nx run web:lint`
- Backend lint: `npx nx run backend:lint`
- Backend format check: `npx nx run backend:fmt:check`
- Backend migrations, if explicitly approved for a schema change: `npm run kysely migrate:latest`

## Project Structure

- `docs/ideas/log-page.md` - original product idea and scope notes.
- `docs/tasks/log-page/PRD.md` - living specification for the feature.
- `apps/web-frontend/src/routes/logs.tsx` - route entry for `/logs`.
- `apps/web-frontend/src/routes/logs/confirm-food.tsx` - hidden route-level page for food confirmation before save.
- `apps/web-frontend/src/pages/logs/Logs.tsx` - page composition for the daily log.
- `apps/web-frontend/src/pages/logs/ConfirmFood.tsx` - page composition for quantity, serving unit, and meal confirmation.
- `apps/web-frontend/src/pages/logs/components/` - page-local UI components such as progress summary, meal sections, food search drawer, confirmation controls, and recent foods list.
- `apps/web-frontend/src/pages/logs/__tests__/` - page and interaction tests.
- `apps/web-frontend/src/shared/components/base/` - existing reusable primitives such as `Button`, `Card`, and `Drawer`; use these first, but do not expand primitives or add variants without review.
- `packages/api-contracts/src/` - shared request/response contracts for day logs, food entries, and new food search/recent food APIs.
- `packages/api-client/src/` - shared React-platform API client for request/response logic and React Query integration used by the web app and planned React Native app.
- `apps/backend/src/domain/` - existing `DayLog` aggregate and `FoodEntry` entity. Food entry writes stay behind the aggregate.
- `apps/backend/src/application/` - use cases, DTOs, and ports for day logs, USDA search, and read-only recent foods.
- `apps/backend/src/infrastructure/` - concrete FoodData Central client and persistence-backed recent food query adapter.
- `apps/backend/src/presentation/` - routes, controllers, validation, and mappers for HTTP.

## Code Style

Frontend components should stay page-focused, typed, and composed from existing primitives. Derived nutrition totals should be computed in small pure helpers instead of embedded across JSX.

```tsx
type MealSectionProps = {
  meal: MealNameEnumType
  title: string
  entries: FoodEntryResponse[]
  onAddFood: (meal: MealNameEnumType) => void
}

function MealSection({ meal, title, entries, onAddFood }: MealSectionProps) {
  const calories = entries.reduce((total, entry) => total + entry.calories, 0)

  return (
    <section aria-labelledby={`${meal}-heading`} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${meal}-heading`} className="font-heading text-base font-medium">
          {title}
        </h2>
        <Button size="sm" variant="ghost" onClick={() => onAddFood(meal)}>
          Add
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{calories} calories</p>
    </section>
  )
}
```

Backend changes should preserve the clean architecture direction from `apps/backend/docs/adr/0001-clean-architecture-and-domain-boundaries.md`: presentation validates HTTP, infrastructure owns external API/database implementations, and domain remains independent. For food search specifically, the application layer may stay intentionally thin for the first cut if it only coordinates validation-shaped input and an infrastructure FoodData Central adapter.

```ts
export interface FoodSearchProvider {
  search(query: FoodSearchQueryDto): Promise<FoodSearchResultDto[]>;
}

export class FoodSearchService {
  constructor(private readonly foodSearchProvider: FoodSearchProvider) {}

  async search(query: FoodSearchQueryDto): Promise<FoodSearchResultDto[]> {
    return this.foodSearchProvider.search(query);
  }
}
```

## Functional Requirements

- The page loads the selected day's log from `GET /daylogs/:date`.
- If the selected day has no log, the frontend renders an empty daily log state with zero starting totals and all available add actions per meal section plus the FAB.
- Date selection supports moving to the previous day and next day, one day at a time.
- Arbitrary date picking is deferred because the best interface may differ after the daily workflow is usable.
- The summary displays calories eaten against a 1,800 calorie placeholder target; protein against 120g; fat against 60g; carbohydrates against 220g; and daily weight.
- Logging weight persists the value under the selected day's `DayLog`.
- Newly logged weight shows immediately in the summary using an optimistic UI update.
- If the weight update API call fails, the optimistic weight value is rolled back and the user sees an error state.
- After a successful weight update, the frontend invalidates the selected day-log query, likely with TanStack Query's `queryClient.invalidateQueries`, so the UI refetches and reconciles with server state.
- Empty meals and empty weight states show a short encouraging phrase that helps the user build the habit.
- If the user recorded the same habit yesterday, the empty meal or empty weight phrase should gently remind them of that momentum.
- Meal sections render Breakfast, Lunch, Dinner, and Snacks in that order.
- Each meal section shows meal calories, food rows, and an add action that opens search with that meal preselected.
- The floating action button opens a bottom sheet with Search food and Log weight actions.
- Recent foods appear inside the general food search response by default instead of as a separate first-level sheet action or separate frontend-only list.
- Recent food results are visually distinguished with a small date label: weekday abbreviation such as "Thur" for foods logged up to a week ago, or a compact date such as "Mar 31" for older foods.
- Recent foods are queried from the past 2 weeks of food entries only.
- Recent foods are deduplicated against other recent-food entries by exact normalized name, brand, serving unit, and nutrition values.
- Recent foods with different serving units or nutrition values remain distinct, because the user may want to repeat that serving size as its own habit.
- Recent-food entries do not need to be deduplicated against USDA results in this cut.
- Food search calls a backend endpoint that mediates FoodData Central requests instead of calling FoodData Central directly from the browser.
- Search results include recent foods plus generic and branded USDA foods, with enough metadata to distinguish name, brand, source type, serving, calories, and recency in the result list.
- Search results are returned as one ordered list whose item type is a discriminated union, such as `RecentFoodSearchResult | UsdaFoodSearchResult`, rather than one flat type with source-specific optional fields.
- All search result variants share normalized serving fields for confirmation: `quantityServing` defaults to `1`, and `servingLabel` defaults to `"serving"`. `quantityMass`, `massUnit`, `quantityVolume`, and `volumeUnit` are optional with no default values; they should only be present when the search result provides a real mass or volume serving basis for the same nutrition values.
- `servingLabel` is a human serving unit such as `"serving"`, `"piece"`, or `"each"`; it should remain separate from mass and volume units so confirmation can choose between serving, mass, or volume-based entry.
- Do not infer that `1 serving` equals `1g` or `1mL`. If mass or volume serving data is unavailable, omit those fields so confirmation does not present misleading unit conversions.
- The backend returns search results in display order. Recent foods that match the query come first, followed by USDA FoodData Central results.
- USDA results use a single ranked list after recent foods. If the search string includes a brand name, branded USDA results rank first; otherwise common/generic USDA results rank first.
- The frontend renders food search results in the order returned by the backend and does not re-rank recent or USDA results.
- Search result payloads may include macros for the later confirmation/save flow, but macros are not required in the search results list UI.
- Selecting a search result navigates to a separate food confirmation page before saving. This page is not linked from the header or first-level drawer actions.
- The confirmation page allows quantity, serving unit, and meal to be reviewed or adjusted.
- The confirmation page does not allow direct calorie editing in this cut. A later nutrition customization flow can expose an edit action that opens a dedicated screen before save.
- Navigation from search results to the confirmation page should visibly transition to a new page. Consider TanStack Router View Transitions for this route transition, with normal navigation as the fallback when the browser does not support view transitions.
- Saving a confirmed food creates an entry through `POST /daylogs/:date/food-entries`.
- Recent foods are global per user, based on food entries logged in the past 2 weeks, and can be selected into the same confirmation flow.
- Mobile rows show food name, quantity, and calories.
- Larger viewports do not show macro detail for entries or meal summaries in this cut.

## API Requirements

Existing APIs:

- `GET /daylogs/:date` returns `DayLogResponse | null`.
- `POST /daylogs/:date/food-entries` accepts `CreateFoodEntryRequestSchema` and returns the created food entry.

Proposed MVP APIs:

- `GET /foods/search?query=<text>` returns a single ordered result list: matching recent foods first, then ranked USDA search results.
- `GET /foods/recent` may still exist if a standalone recent-food endpoint is needed later, but the MVP search UI should not depend on a separate frontend merge of recent foods and USDA results.
- `PATCH /daylogs/:date/weight` persists the selected day's weight under the authenticated user's `DayLog`.

Food search result contracts:

- Export one top-level `FoodSearchResult` type as a discriminated union of source-specific variants, currently recent-food and USDA variants.
- Keep shared display and confirmation fields in a common base shape: name, brand/source display metadata, calories/macros needed for confirmation, `quantityServing`, `servingLabel`, optional mass fields, and optional volume fields.
- Keep source-specific fields on their own variant: recent-food recency metadata on the recent variant, and FoodData Central identifiers/provider metadata on the USDA variant.
- Apply defaults only for `quantityServing` and `servingLabel` during backend mapping and/or Zod parsing. Do not default mass or volume fields; missing provider data should remain absent before it reaches the frontend.

FoodData Central mediation:

- "Mediation" means the frontend calls this application's backend, the backend calls FoodData Central, and the backend maps FoodData Central responses into app-owned response contracts.
- This protects the data.gov API key, keeps external API shape churn out of the frontend, lets the backend normalize branded and generic result fields, and gives the app one place to handle external errors, timeouts, and future caching.
- Direct browser calls are not recommended for this MVP because any required API key would be exposed to users, the frontend would become coupled to FoodData Central's response shape, and error handling/ranking would be duplicated in UI code.

FoodData Central configuration:

- Store the API key only in backend environment configuration.
- Environment variable name: `FOODDATA_CENTRAL_API_KEY`.
- Never expose the key through frontend env vars or committed files.

## Application Layer Decision: Food Search

Food search is not a domain aggregate mutation like adding a `FoodEntry`; it is closer to an external lookup. Because of that, the application layer should earn its existence rather than becoming ceremony.

Pros of an application-layer `FoodSearchService`:

- Gives presentation a stable use-case interface and keeps controllers from depending directly on infrastructure.
- Centralizes app-owned behavior such as query trimming, minimum query length, result limits, result ranking policy, and mapping to shared DTOs.
- Keeps FoodData Central replaceable if the app later adds another provider, cached results, or curated internal foods.
- Gives tests a clean seam for provider errors and ranking behavior without exercising HTTP client details.

Cons of an application-layer `FoodSearchService`:

- If it only forwards `search(query)` to a provider, it adds indirection without real business value.
- Ranking and mapping may be better placed in the infrastructure adapter at first because they are tightly coupled to FoodData Central's response shape.
- A thin service can make the architecture look more complicated than the MVP behavior actually is.

Recommendation for this cut:

- Keep an application port such as `FoodSearchProvider` so infrastructure remains behind an interface.
- Use a small application service only if it owns app-level rules: validated query object, result limit, auth/user context if needed, and response DTO shape.
- If no app-level rules exist yet beyond "call FoodData Central and map it," allow the controller to call a narrowly typed application query handler or service that is intentionally thin, and do not add extra domain concepts.
- Keep FoodData Central request construction, external response parsing, and provider-specific ranking details in infrastructure.

## Testing Strategy

- Frontend pure helpers: unit test nutrition totals, placeholder target progress calculations, over-target states, and empty log normalization.
- Frontend component tests: cover date changes, meal-specific add preselection, FAB drawer actions, search result selection, navigation to the confirmation page, confirmation edits, save success, optimistic weight update, weight rollback on API error, loading state, and error state.
- Backend application tests: cover USDA search service behavior through a mocked provider, recent-food read behavior, and day-log weight persistence.
- Backend presentation tests: cover query validation, authentication requirements, search success, weight update success/failure, provider errors, and no API key leakage in responses.
- Contract tests or schema tests: cover new request/response schemas in `packages/api-contracts`.
- Route/search-param tests: cover TanStack Router `validateSearch` behavior for any URL state such as selected date.
- Manual verification: run frontend and backend locally, log a search result into a selected meal, refresh the selected day, and confirm totals update.

## Boundaries

- Always: preserve `DayLog` as the write boundary for saved food entries.
- Always: validate route params, query params, and request bodies with shared Zod schemas where practical.
- Always: when frontend URL search params are used, validate and type them through TanStack Router `validateSearch`; with Zod v4, prefer passing the Zod schema directly to `validateSearch` unless the app needs an adapter-specific behavior.
- Always: use route-level navigation for food confirmation rather than presenting confirmation as only an in-drawer or inline step.
- Always: keep hidden workflow routes out of header/drawer navigation while preserving direct route ownership and error handling.
- Always: keep FoodData Central calls behind backend infrastructure.
- Always: show loading, empty, and error states for network-backed UI.
- Always: keep common API request/response logic in a shared Nx package, planned as `@calibrate/api-client`, so web and future React Native clients can reuse it.
- Always: `@calibrate/api-client` may use `@tanstack/react-query` because React Query supports React Native, but it must avoid browser-only APIs and web UI state.
- Always: keep platform-specific React Query setup, such as React Native online/focus managers or web-specific provider/devtools wiring, in the consuming app.
- Always: use existing UI primitives and the design language from `apps/web-frontend/docs/DESIGN.md`.
- Always: try existing UI primitives first, but treat them as unevenly mature; page-level composition is acceptable when a primitive does not yet encode the needed style.
- Ask first: codifying a repeated UI style into a primitive variant. Bring examples of the repeated style and a proposed variant API before changing the primitive.
- Ask first: creating a new primitive UI component. Explain where it repeats, why page-local composition is insufficient, and what API the primitive would expose.
- Ask first: adding dependencies, changing database schema, adding migrations, changing CI, or introducing a new global frontend state library.
- Ask first: changing auth/session behavior or public API route naming conventions.
- Never: commit secrets or example API keys.
- Never: call FoodData Central directly from the frontend.
- Never: bypass `DayLogService.addFoodEntry()` for food-entry writes.
- Never: remove or disable tests only to make local checks pass.

## Success Criteria

- `/logs` presents a mobile-first daily log page instead of the current placeholder.
- A user can view a selected day's grouped meal entries and total calories/macros.
- A user can open Search food from the FAB or a meal section.
- Recent foods appear inside general search by default and show compact recency labels.
- Meal-specific add actions preselect the requested meal on the confirmation page.
- A user can search USDA foods through the backend and see ranked branded/generic results.
- A user can select a result, visibly navigate to a separate confirmation page, adjust quantity, serving unit, and meal, then save.
- Saved entries appear in the correct meal and are reflected in daily and meal totals.
- Logged weight appears immediately, persists under the selected day log, refetches the selected day log after success, and rolls back only if the API persistence call fails.
- Recent foods are available globally for the authenticated user after foods have been logged.
- Empty meals and empty weight states include encouraging habit-building copy, including yesterday-momentum reminders when applicable.
- The backend never exposes the FoodData Central API key to the frontend or responses.
- Relevant frontend and backend tests pass with the commands listed above.

## Tradeoffs

- A single backend-ordered result list is the MVP decision. It keeps scanning simple by putting matching recent foods first, then USDA results with branded results first for brand-name searches and common/generic results first otherwise.
- A discriminated union is preferred over one flat search-result type. The API still returns one list for display order, but recent-food and USDA variants keep identity, recency, and provider metadata honest without a broad set of nullable fields.
- Calorie override is intentionally excluded from the first confirmation flow. It is useful for imperfect USDA data, but it creates divergence from source nutrition data and deserves a dedicated nutrition customization screen.
- Recent foods can be implemented as a read-only query over the past 2 weeks of existing food entries, avoiding a new persistence table. Dedupe intentionally preserves entries with different serving units or nutrition values because a different serving size may be useful for quick re-entry and habit building.
- Placeholder targets unblock the UI, but they must be visually treated as provisional so users do not mistake them for personalized goals.
- Macro detail for larger viewport entries and meal summaries is intentionally deferred. The daily summary can carry macro awareness without making the log rows feel dense.

## Resolved Questions

1. Placeholder targets: 1,800 calories, 120g protein, 60g fat, and 220g carbohydrates.
2. Food search returns a single backend-ordered list: matching recent foods first, then USDA results. Brand-name USDA searches put branded results first; non-brand USDA searches put common/generic results first.
3. FoodData Central API key env var: `FOODDATA_CENTRAL_API_KEY`.
4. Recent foods query only the past 2 weeks of food entries and deduplicate only within the recent-food subset by exact normalized name, brand, serving unit, and nutrition values; different serving units or nutrition values stay distinct.
5. Food search results use one top-level discriminated union type with recent-food and USDA variants, plus shared normalized serving fields: `quantityServing`, `servingLabel`, `quantityMass`, `massUnit`, `quantityVolume`, and `volumeUnit`.

## Review Gate

- [x] Assumptions reviewed.
- [x] Open questions answered or explicitly deferred.
- [x] Spec approved for Phase 2 implementation planning.
- [ ] Spec file committed with the implementation work.
