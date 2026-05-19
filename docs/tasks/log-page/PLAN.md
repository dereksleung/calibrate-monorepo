# Implementation Plan: Daily Log Page

## Phase

Phase 2 implementation plan for `docs/tasks/log-page/PRD.md`. Do not break this into Phase 3 tasks or start implementation until this plan is reviewed.

## Planning Assumptions

- The PRD is the source of truth for scope and success criteria.
- The backend `day_logs.weight` column already exists, so daily weight persistence should not require a migration.
- `@tanstack/react-query` is not currently installed. It is acceptable for `@calibrate/api-client` to import React Query because TanStack documents React Query as working with React Native, but dependency installation still requires explicit approval before implementation.
- The current `DayLogRepository.findOrCreateByDateAndUserId()` should be corrected as part of day-log persistence work because it currently throws when the requested date has no row.

## Major Components

### Shared Contracts

- Add request/response contracts for:
  - Food search query and result shape.
  - Recent food result shape, including compact recency metadata.
  - Day-log weight update request.
- Keep schemas in `packages/api-contracts/src/` and export them from `packages/api-contracts/src/index.ts`.
- Use Zod schemas for backend route/query validation and for any frontend route search state where practical.

Dependencies:

- Backend presentation depends on shared schemas for validation.
- Frontend API client/helpers depend on shared response/request types.

### Shared API Client Package

- Create a new Nx package, planned as `packages/api-client` with package name `@calibrate/api-client`.
- The package owns shared React-platform API logic for:
  - Get selected day log.
  - Save food entry.
  - Update weight.
  - Search foods.
  - Get recent foods.
- The package depends on `@calibrate/api-contracts` for schemas/types.
- The package should expose a configurable client factory or functions that accept configuration such as `baseUrl`, `fetch`, and authentication options if needed.
- The package may import React and `@tanstack/react-query` for reusable query options/hooks/mutations.
- Dependency shape: `@calibrate/api-client` should declare `@tanstack/react-query` as a peer dependency and dev dependency; consuming apps such as `web` and the future React Native app should declare `@tanstack/react-query` as app dependencies because they own `QueryClientProvider` and runtime platform setup.
- The package must not depend on React DOM, TanStack Router, browser globals, React Native-specific modules, or web UI primitives.
- Platform-specific setup remains app-owned: the web app owns router/provider/devtools wiring; the future React Native app owns React Native online/focus manager wiring.
- The future React Native app should be able to reuse the same request functions and React Query options/hooks with its own app-specific auth and platform setup.

Dependencies:

- API client package depends on shared contracts and, if approved, imports `@tanstack/react-query` with peer/dev dependency declarations.
- Web data layer depends on the API client package for request functions and shared React Query behavior.
- Backend route shape should be stable before finalizing API client method names and return types.

### Backend Domain And Application

- Extend `DayLog` with weight update behavior, likely `dayLog.updateWeight(weight)`, so weight remains owned by the aggregate.
- Add application DTOs for updating day-log weight.
- Extend `IDayLogService` with `updateWeight({ userId, date, weight })`.
- Extend `IDayLogRepository` with a targeted write such as `updateWeight(dayLogId, weight)`.
- Correct or replace `findOrCreateByDateAndUserId()` so adding food or weight to an empty selected day creates the day log instead of throwing.
- Keep food entry writes through `DayLogService.addFoodEntry()` and the aggregate.

Dependencies:

- Weight API depends on repository write support.
- Empty-day save behavior depends on corrected find-or-create behavior.

### Backend Food Search And Recents

- Backend food search returns the full display-ordered result list for the search UI:
  - Matching recent foods from the past 2 weeks first.
  - USDA FoodData Central results second.
  - Frontend renders the returned order without re-ranking.
- Add a FoodData Central infrastructure adapter responsible for:
  - Building FoodData Central requests.
  - Reading `FOODDATA_CENTRAL_API_KEY` from backend env.
  - Parsing external responses.
  - Mapping provider-specific fields to app-owned DTOs.
  - Ranking USDA results after recent foods: branded first when the query contains a brand name, common/generic first otherwise.
- Add an application port such as `FoodSearchProvider`.
- Keep the application service/query handler intentionally thin unless it owns app-level policy such as trimming, minimum query length, result limit, or auth context.
- Add a recent-food read path used by backend search based on existing food entries:
  - Query current user's food entries from the past 2 weeks only.
  - Match recent foods against the search query.
  - Deduplicate recent-food entries against other recent-food entries by exact normalized name, brand, serving unit, and nutrition values.
  - Preserve entries with different serving units or nutrition values because they can represent useful repeatable serving sizes and habits.
  - Do not deduplicate recent-food entries against USDA results in this cut.
  - Include last-used date metadata for labels such as `Thur` or `Mar 31`.

Dependencies:

- Food search endpoint depends on contracts, the recent-food read query, and FoodData Central adapter.
- Recent-food reads depend on a bounded query across user's day logs and food entries from the past 2 weeks.
- No new recent-food persistence table is planned for the MVP.

### Backend Presentation And Container Wiring

- Add or extend routes:
  - `GET /foods/search?query=<text>`
  - `GET /foods/recent` only if a standalone recent-food endpoint is still useful outside search; the MVP search UI should not require a separate frontend merge.
  - `PATCH /daylogs/:date/weight`
- Validate query params, route params, and bodies with shared Zod schemas.
- Preserve auth middleware on all user-specific routes.
- Wire new services/adapters/controllers in `apps/backend/src/infrastructure/container.ts`.
- Ensure controller responses never expose `FOODDATA_CENTRAL_API_KEY` or provider internals.

Dependencies:

- Controller tests depend on service/controller interfaces being injectable.
- Container changes depend on finalized service and adapter constructors.

### Frontend Data Access

- Use `@calibrate/api-client` for common request/response logic.
- Use shared React Query options/hooks/mutations from `@calibrate/api-client` where they are portable across web and React Native.
- Add web-local wrappers only for web-specific concerns such as routing, provider placement, devtools, or UI-specific error handling.
- Preferred plan if dependency is approved: use TanStack Query in `@calibrate/api-client` for selected-day log fetching, mutation invalidation, and optimistic weight update.
- If TanStack Query is not approved, use page-local fetch/state first and keep the cache abstraction small enough to swap later.
- Use TanStack Router `validateSearch` for selected date if date is represented in the URL search params.
- Store enough selected-food context for route-level confirmation navigation. Prefer route-safe state/search params where practical, and handle missing or stale confirmation state by returning the user to search with an error/empty state.

Dependencies:

- Optimistic weight behavior depends on the chosen web query/cache approach.
- Food confirmation page save depends on selected-food context plus existing `POST /daylogs/:date/food-entries`.

### Frontend Page And Components

- Replace the current placeholder `Logs` page with a mobile-first daily log composition.
- Page-local components:
  - Date stepper with previous/next day only.
  - Daily progress summary with placeholder targets and weight.
  - Meal sections for Breakfast, Lunch, Dinner, Snacks.
  - Empty meal and empty weight messages with habit/momentum copy.
  - Floating action button and bottom sheet.
  - Food search experience that renders backend-ordered results.
  - Food result rows with name, brand/source, serving, calories, and compact recent date label when applicable.
- Add a hidden route-level food confirmation page, planned as `apps/web-frontend/src/routes/logs/confirm-food.tsx` with page composition in `apps/web-frontend/src/pages/logs/ConfirmFood.tsx`.
- The confirmation page owns quantity, serving unit, and meal edits before save.
- Search result selection navigates to the confirmation page; it should not be just a drawer step.
- Consider TanStack Router View Transitions for search-to-confirmation navigation:
  - Use per-navigation `viewTransition: true` if this transition is unique.
  - Consider router-level `defaultViewTransition` only if multiple log workflow transitions should share the same behavior.
  - Keep normal navigation fallback for unsupported browsers.
- Use existing primitives first. If repeated styling suggests a `Button` variant or a new primitive, pause and ask with examples and a proposed API.
- Larger viewports may improve spacing and layout density but must not add macro detail to entry rows or meal summaries.

Dependencies:

- Page can start with mock/fixture data after API contracts define the expected shapes.
- Frontend UI should cover normal, empty, loading, and error states against contract-shaped fixtures before live backend wiring is available.
- Network-backed UI requires loading, empty, and error states.

## Implementation Order

1. Shared contracts and backend day-log weight foundation.
   - Add weight request schema.
   - Add domain/application/repository weight update path.
   - Correct day-log find-or-create behavior.
   - Verify with backend unit/controller tests.

2. Backend food search and recent-food APIs.
   - Add search/recent contracts.
   - Add FoodData Central adapter behind an application port.
   - Add recent-food query with 2-week bound, query matching, and recent-only dedupe.
   - Merge matching recent foods before USDA results in the backend search response.
   - Add controllers/routes/container wiring.
   - Verify with mocked-provider tests and controller validation tests.

3. Shared API client and frontend route/data foundation.
   - Generate or create `packages/api-client` following workspace package conventions.
   - Add shared request functions and portable React Query options/hooks using `@calibrate/api-contracts`.
   - Install/declare TanStack Query with peer/dev dependency shape for `@calibrate/api-client` and app dependency shape for `web`.
   - Add selected-date URL search validation with TanStack Router if date is URL state.
   - Add hidden confirmation route and decide how selected-food context is passed to it.
   - Decide whether search-to-confirmation uses per-navigation `viewTransition: true` or router-level `defaultViewTransition`.
   - Add web-local wrappers/hooks and selected-day loading state.
   - Verify route/search-param behavior and API helper tests where practical.

4. Frontend mock-state UI.
   - Build date stepper, summary, meal sections, empty states, error states, loading states, FAB shell, search results, and confirmation page against contract-shaped mock data.
   - Cover normal, empty, and error scenarios before backend endpoints are live.
   - Verify totals, placeholder progress, empty messaging, error messaging, and responsive layout.

5. Frontend live wiring and mutation flows.
   - Wire the mock-state UI to `@calibrate/api-client` and backend APIs after live endpoints are available.
   - Add optimistic weight update with rollback and selected-day invalidation/refetch.
   - Add food search that renders backend-ordered results, including recent matches first when returned.
   - Add route-level confirmation page flow and save into selected meal.
   - Verify search, confirmation route navigation, confirmation edits, save, optimistic weight, rollback, and refetch behavior.

6. Integration polish and manual verification.
   - Run targeted frontend/backend tests first.
   - Run typecheck/lint for touched projects.
   - Start backend/frontend dev servers only when ready for manual flow verification.

## Sequential Vs Parallel Work

Sequential:

- Contracts before controller/frontend integration.
- Day-log repository/service changes before weight UI integration.
- FoodData Central adapter contract before search UI can be wired to live data.
- Backend search result ordering before frontend live-data search display assertions.
- Shared API client package before web data wrappers and page integration.
- TanStack Query dependency setup before implementing optimistic cache behavior.
- Confirmation route/context design before wiring search result selection.
- View Transitions strategy before adding transition CSS or router-level defaults.

Parallelizable after contracts:

- Backend weight persistence and backend food search can proceed independently.
- Frontend normal, empty, loading, and error state UI can proceed against contract-shaped mock data while backend endpoints are being finished.
- Shared API client package and frontend mock-state UI can proceed in parallel after contracts define expected shapes.
- Recent-food backend query and search UI result-row design can proceed independently if the shared result shape is stable; live ordering assertions wait for the backend merge behavior.
- Backend controller tests and frontend pure helper tests can be written alongside implementation.

## Risks And Mitigations

- Risk: TanStack Query is not installed.
  - Mitigation: ask before dependency installation. If approved, declare `@tanstack/react-query` in `@calibrate/api-client` as peer + dev dependency and in `web` as an app dependency. If not approved, isolate data-fetching logic so the first cut can use page-local state and later migrate cleanly.

- Risk: The shared API client accidentally becomes web-specific and hard to reuse in React Native.
  - Mitigation: allow React Query, but keep `@calibrate/api-client` free of React DOM, TanStack Router, DOM APIs, React Native-specific modules, and UI state; inject `fetch`/base URL where needed.

- Risk: React Query platform behavior differs between web and React Native.
  - Mitigation: keep platform setup outside `@calibrate/api-client`; web and React Native apps configure their own providers, devtools, online manager, and focus manager.

- Risk: A new package is generated with targets/config that do not match current workspace package conventions.
  - Mitigation: use the `nx-generate` workflow in Phase 3, dry-run first, and compare against `packages/api-contracts` before committing generated files.

- Risk: FoodData Central response shape is noisy and provider-specific.
  - Mitigation: keep parsing/ranking inside infrastructure and return app-owned DTOs to the frontend.

- Risk: Brand-name detection is ambiguous.
  - Mitigation: implement a conservative heuristic first, such as matching known `brandOwner`/brand fields from returned results against query tokens, and keep the ranking function isolated for later tuning.

- Risk: Recent-food and USDA results are merged inconsistently between clients.
  - Mitigation: merge and order results in the backend search response, then require clients to render the returned order without re-ranking.

- Risk: Recent-food dedupe accidentally collapses useful serving-size variants.
  - Mitigation: keep dedupe intentionally simple and exact: normalize name and brand text, then compare serving unit and nutrition values exactly. Entries with different serving units or nutrition values remain distinct because the user may want to repeat that serving size again and build a habit around it. Do not attempt cross-deduplication against USDA results in this cut.

- Risk: Recent-food reads become expensive as a user's history grows.
  - Mitigation: restrict the query to food entries from the past 2 weeks for the MVP and ensure the query filters by authenticated user and date range before dedupe.

- Risk: Empty selected days fail on save because current repository find-or-create behavior throws.
  - Mitigation: fix find-or-create early and cover it in service/repository-level tests where practical.

- Risk: Weight optimistic UI diverges from server state.
  - Mitigation: rollback on mutation failure and invalidate/refetch the selected day log after success.

- Risk: Confirmation page is opened without selected-food context, such as via refresh or direct URL entry.
  - Mitigation: design the route to handle missing/stale state explicitly by returning to search or showing a recoverable empty state.

- Risk: View Transitions support varies by browser.
  - Mitigation: treat View Transitions as progressive enhancement and keep ordinary route navigation fully functional.

- Risk: Router-level `defaultViewTransition` applies motion too broadly.
  - Mitigation: start with per-navigation `viewTransition: true` for search-to-confirmation unless multiple log workflow transitions need the same animation.

- Risk: UI primitive reuse creates one-off styles or premature variants.
  - Mitigation: keep page-local composition first; ask before adding variants or new primitives.

- Risk: FoodData Central key leaks.
  - Mitigation: read `FOODDATA_CENTRAL_API_KEY` only server-side and assert response contracts do not include configuration fields.

## Verification Checkpoints

Checkpoint 1: Day-log weight foundation

- `npx nx run backend:test`
- `npx nx run backend:typecheck`
- Confirm `PATCH /daylogs/:date/weight` creates/updates the selected day log and returns safe response data.

Checkpoint 2: Food search and recent foods backend

- `npx nx run backend:test`
- `npx nx run backend:typecheck`
- Confirm search validates missing/short query, handles provider errors, and never returns API key data.
- Confirm search returns matching recent foods before USDA results.
- Confirm recent foods are limited to the past 2 weeks, deduplicate only exact recent-food duplicates as specified, preserve serving-size variants, and include recency metadata.

Checkpoint 3: Frontend data and route foundation

- `npx nx run web:test`
- `npx nx run web:typecheck`
- Confirm `@calibrate/api-client` is portable across React web and React Native: no React DOM, browser globals, TanStack Router, React Native modules, or UI primitives.
- Confirm React Query is declared as peer + dev dependency in `@calibrate/api-client` and as a dependency in `web`.
- Confirm selected-date search params validate through TanStack Router if URL search params are used.
- Confirm food confirmation is a hidden route-level page, handles missing selected-food context, and is not exposed in header/drawer navigation.
- Confirm selected day log query/mutation behavior, including weight optimistic update and rollback.

Checkpoint 4: Frontend mock-state UX

- `npx nx run web:test`
- `npx nx run web:lint`
- Manual responsive check for mobile and larger viewport layouts.
- Confirm normal, empty, loading, and error states render correctly from contract-shaped mock data before live backend wiring.
- Confirm empty meal and empty weight habit copy appears in the right states.
- Confirm food search renders results in backend-provided order and does not re-rank recent or USDA entries.
- Confirm search result selection visibly navigates to the confirmation page; if View Transitions are enabled, confirm unsupported browsers still fall back to normal navigation.

Checkpoint 5: Frontend live wiring

- `npx nx run web:test`
- `npx nx run web:typecheck`
- Confirm mock-state UI is wired to `@calibrate/api-client` without changing the established visual states.
- Confirm live food search preserves backend result order.
- Confirm selected day log, weight update, search, confirmation, and save flows use live APIs.

Checkpoint 6: End-to-end manual smoke

- `npx nx run backend:dev`
- `npx nx run web:dev`
- Manually verify previous/next day navigation, empty day display, weight logging, food search, recent foods, confirmation, save, and totals update.

## Decisions Recorded

1. TanStack Query dependency setup: approved. `@calibrate/api-client` should import React Query and declare it as peer + dev dependency; `web` should declare it as an app dependency because it owns `QueryClientProvider` and devtools/provider wiring.
2. Shared API client package name/path: approved as `packages/api-client` with package name `@calibrate/api-client`.
3. Hidden confirmation route path: approved as `/logs/confirm-food`.
4. Search-to-confirmation View Transition strategy: start with per-navigation `viewTransition: true`. Meal add buttons leading into search do not justify router-level `defaultViewTransition`; consider `defaultViewTransition` later only if multiple workflow route transitions need the same motion.
5. `GET /foods/search` minimum query length: 3 characters.
6. `PATCH /daylogs/:date/weight` response shape: return the updated `DayLogResponse`.

## Review Gate

- [x] Plan reviewed.
- [x] Dependency decision recorded for TanStack Query.
- [x] Shared API client package name/path recorded.
- [x] Confirmation route path and transition strategy recorded.
- [x] API response shape decision recorded for weight update.
- [x] Approved for Phase 3 task breakdown.
