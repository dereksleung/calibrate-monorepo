# Implementation Plan: Daily Log Page

## Phase

Phase 3 task breakdown for `docs/tasks/log-page/PRD.md`. Do not start implementation until this task breakdown is reviewed.

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
- Prefer a small `ApiTransport` factory plus file-per-operation request modules over a single large API client object. The configured transport should be owned by the consuming app, while `@calibrate/api-client` exports portable request/query helper functions that accept the transport.
- See `docs/adr/0001-api-client-transport-and-operation-modules.md` for the API client architecture decision.
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
  - Receiving a startup-loaded `FOODDATA_CENTRAL_API_KEY` value from backend configuration.
  - Decrypting/reading `FOODDATA_CENTRAL_API_KEY` with `dotenvx.get` during backend startup, then caching the resolved value in memory rather than reading env per request.
  - Parsing external responses.
  - Mapping provider-specific fields to app-owned DTOs.
  - Ranking USDA results after recent foods when the provider data supports it; branded-versus-generic handling is optional and can be skipped if USDA results do not expose reliable branded data.
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
- Before starting any frontend UI task, ask the user for screenshots and describe what the task entails so they know which existing screens, states, and viewport sizes to capture. For example, say whether the task touches the daily log overview, search flow, confirmation flow, loading/error states, mobile viewport, or larger viewport layout.
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

### Contract-First Slicing Note

The implementation order below is dependency-aware, not strictly serial. Once the shared request/response contracts are known in `@calibrate/api-contracts`, mock frontend UI tasks can start against contract-shaped fixtures while backend endpoints, infrastructure adapters, and API-client transport work continue in parallel. Treat this as Contract-First Slicing: contracts first, then backend and frontend slices can independently build against the same agreed shapes before live integration.

## Implementation Order

1. Shared contracts.
   - Add weight request schema.
   - Add search/recent contracts.

2. Backend day-log weight foundation.
   - Add domain/application/repository weight update path.
   - Correct day-log find-or-create behavior.
   - Verify with backend unit/controller tests.

3. Backend food search and recent-food APIs.
   - Add FoodData Central adapter behind an application port.
   - Add recent-food query with 2-week bound, query matching, and recent-only dedupe.
   - Merge matching recent foods before USDA results in the backend search response.
   - Add controllers/routes/container wiring.
   - Verify with mocked-provider tests and controller validation tests.

4. Shared API client foundation.
   - Generate or create `packages/api-client` following workspace package conventions.
   - Add shared request functions and portable React Query options/hooks using `@calibrate/api-contracts`.
   - Install/declare TanStack Query with peer/dev dependency shape for `@calibrate/api-client` and app dependency shape for `web`.

5. Frontend mock-state UI.
   - Can begin as soon as shared request/response contracts are stable; does not need to wait for backend endpoints or API-client live wiring.
   - Add selected-date URL search validation with TanStack Router if date is URL state.
   - Add hidden confirmation route and decide how selected-food context is passed to it.
   - Decide whether search-to-confirmation uses per-navigation `viewTransition: true` or router-level `defaultViewTransition`.
   - Add web-local wrappers/hooks and selected-day loading state.
   - Verify route/search-param behavior and API helper tests where practical.
   - Build date stepper, summary, meal sections, empty states, error states, loading states, FAB shell, search results, and confirmation page against contract-shaped mock data.
   - Cover normal, empty, and error scenarios before backend endpoints are live.
   - Verify totals, placeholder progress, empty messaging, error messaging, and responsive layout.

6. Frontend live wiring and mutation flows.
   - Add web-level QueryClient provider/configuration and app-owned API transport setup before live hooks use `@calibrate/api-client`.
   - Wire the mock-state UI to `@calibrate/api-client` and backend APIs after live endpoints are available.
   - Add optimistic weight update with rollback and selected-day invalidation/refetch.
   - Add food search that renders backend-ordered results, including recent matches first when returned.
   - Add route-level confirmation page flow and save into selected meal.
   - Verify search, confirmation route navigation, confirmation edits, save, optimistic weight, rollback, and refetch behavior.

7. Integration polish and manual verification.
   - Run targeted frontend/backend tests first.
   - Run typecheck/lint for touched projects.
   - Start backend/frontend dev servers only when ready for manual flow verification.

## Sequential Vs Parallel Work

Sequential:

- Contracts before controller/frontend integration.
- Day-log repository/service changes before weight UI integration.
- FoodData Central adapter contract before search UI can be wired to live data.
- Backend search result ordering before frontend live-data search display assertions.
- Shared API client package before live web data wrappers and live page integration.
- TanStack Query dependency setup before implementing optimistic cache behavior.
- Confirmation route/context design before wiring search result selection.
- View Transitions strategy before adding transition CSS or router-level defaults.

Parallelizable after contracts:

- This is the main Contract-First Slicing lane: after `@calibrate/api-contracts` defines request/response shapes, frontend mock UI can proceed with contract-shaped fixtures while backend services/controllers and API-client transport are implemented separately.
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

- Risk: Brand-name detection is ambiguous or USDA results do not expose reliable branded data.
  - Mitigation: implement branded-versus-generic ranking only if the provider data has usable brand fields. If not, skip branded-specific handling for the MVP and keep generic USDA ordering isolated for later tuning.

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
  - Mitigation: read/decrypt `FOODDATA_CENTRAL_API_KEY` only server-side with `dotenvx.get` during backend startup, cache the resolved value in memory, inject it into the adapter/configuration, and assert response contracts do not include configuration fields.

## Verification Checkpoints

Checkpoint 1: Day-log weight foundation

- `npx nx run backend:test`
- `npx nx run backend:test:integration`
- `npx nx run backend:typecheck`
- Confirm `PATCH /daylogs/:date/weight` creates/updates the selected day log and returns safe response data.

Checkpoint 2: Food search and recent foods backend

- `npx nx run backend:test`
- `npx nx run backend:test:integration`
- `npx nx run backend:typecheck`
- Confirm search validates missing/short query, handles provider errors, and never returns API key data.
- Confirm search returns matching recent foods before USDA results.
- Confirm recent foods are limited to the past 2 weeks, deduplicate only exact recent-food duplicates as specified, preserve serving-size variants, and include recency metadata.

Checkpoint 3: Shared API client foundation

- `npx nx run web:test`
- `npx nx run web:test:integration`
- `npx nx run web:typecheck`
- Confirm `@calibrate/api-client` is portable across React web and React Native: no React DOM, browser globals, TanStack Router, React Native modules, or UI primitives.
- Confirm React Query is declared as peer + dev dependency in `@calibrate/api-client` and as a dependency in `web`.
- Confirm operation modules use `ApiTransport` rather than a central API client object or package-level fetch singleton.

Checkpoint 4: Frontend mock-state UX

- `npx nx run web:test`
- `npx nx run web:test:integration`
- `npx nx run web:lint`
- Manual responsive check for mobile and larger viewport layouts.
- Confirm selected-date search params validate through TanStack Router if URL search params are used.
- Confirm food confirmation is a hidden route-level page, handles missing selected-food context, and is not exposed in header/drawer navigation.
- Confirm normal, empty, loading, and error states render correctly from contract-shaped mock data before live backend wiring.
- Confirm empty meal and empty weight habit copy appears in the right states.
- Confirm food search renders results in backend-provided order and does not re-rank recent or USDA entries.
- Confirm search result selection visibly navigates to the confirmation page; if View Transitions are enabled, confirm unsupported browsers still fall back to normal navigation.

Checkpoint 5: Frontend live wiring

- `npx nx run web:test`
- `npx nx run web:test:integration`
- `npx nx run web:test:e2e`
- `npx nx run web:typecheck`
- Confirm mock-state UI is wired to `@calibrate/api-client` without changing the established visual states.
- Confirm live food search preserves backend result order.
- Confirm selected day log, weight update, search, confirmation, and save flows use live APIs.
- Confirm selected day log query/mutation behavior, including weight optimistic update and rollback.

Checkpoint 6: End-to-end manual smoke

- `npx nx run backend:test:e2e`
- `npx nx run web:test:e2e`
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

## Phase 3 Task Breakdown

These tasks are ordered by dependency. Each task is intended to fit in a focused implementation session and touch no more than about five files, excluding generated lockfile or route-tree updates when a tool necessarily changes them.

Prefer colocating new tests in the same folder as the code under test. Use a `__tests__` subfolder only when the source folder is getting too cluttered or when updating an existing test that already lives there. Use `*.integration.test.ts` or `*.integration.test.tsx` for tests that should run through `npx nx run <project>:test:integration`, and `*.e2e.test.ts` or `*.e2e.test.tsx` for tests that should run through `npx nx run <project>:test:e2e`.

- [ ] Task: Add shared contracts for weight updates and food search
  - Acceptance: `PATCH /daylogs/:date/weight`, `GET /foods/search?query=<text>`, and optional recent-food response shapes have Zod schemas and exported TypeScript types. Food search returns one ordered `FoodSearchResult` discriminated union with recent-food and USDA variants. All variants share display metadata, calories/macros needed for confirmation, `quantityServing`, `servingLabel`, optional `quantityMass`/`massUnit`, and optional `quantityVolume`/`volumeUnit`; only `quantityServing` and `servingLabel` default to `1` and `"serving"`. Mass and volume fields have no defaults and are omitted unless the result provides a real mass or volume serving basis for the same nutrition values. Source-specific recency and provider metadata stay on their own variants. The food search query enforces the 3-character minimum decided in Phase 2.
  - Verify: `npx nx run backend:typecheck`
  - Files:
    - `packages/api-contracts/src/day-log-requests.ts`
    - `packages/api-contracts/src/day-log-responses.ts`
    - `packages/api-contracts/src/food-search-requests.ts`
    - `packages/api-contracts/src/food-search-responses.ts`
    - `packages/api-contracts/src/index.ts`

- [ ] Task: Add day-log weight behavior to the domain and service layer
  - Acceptance: `DayLog` owns weight mutation through an explicit behavior method, the application DTOs include an update-weight request, and `IDayLogService.updateWeight({ userId, date, weight })` returns the updated `DayLog`. Service tests cover successful update, missing user, empty selected day creation, and validation of the aggregate behavior.
  - Verify: `npx nx run backend:test -- src/domain/entities/__tests__/day-log.test.ts src/application/services/__tests__/day-log-service.test.ts`
  - Files:
    - `apps/backend/src/domain/entities/day-log.ts`
    - `apps/backend/src/domain/entities/__tests__/day-log.test.ts`
    - `apps/backend/src/application/dtos/day-log-dtos.ts`
    - `apps/backend/src/application/services/day-log-service.ts`
    - `apps/backend/src/application/services/__tests__/day-log-service.test.ts`

- [ ] Task: Persist weight updates and fix day-log find-or-create
  - Acceptance: `IDayLogRepository` exposes a targeted `updateWeight(dayLogId, weight)` write, `PostgresDayLogRepository.findOrCreateByDateAndUserId()` creates the requested dated row when none exists, and weight updates persist against the authenticated user's selected day log without bypassing the aggregate boundary.
  - Verify: `npx nx run backend:test:integration`, then `npx nx run backend:typecheck`
  - Files:
    - `apps/backend/src/application/ports/day-log-repository.ts`
    - `apps/backend/src/infrastructure/persistence/repositories/postgres-day-log-repository.ts`
    - `apps/backend/src/infrastructure/persistence/repositories/postgres-day-log-repository.integration.test.ts`

- [ ] Task: Expose the day-log weight HTTP endpoint
  - Acceptance: `PATCH /daylogs/:date/weight` validates route params and body with shared schemas, requires authentication, calls `DayLogService.updateWeight`, and returns the updated `DayLogResponse`. Controller tests cover success, validation failure, unauthenticated access, and service error handling.
  - Verify: `npx nx run backend:test -- src/presentation/controllers/__tests__/day-log-controller.test.ts`, then `npx nx run backend:test:integration`
  - Files:
    - `apps/backend/src/presentation/controllers/day-log-controller.ts`
    - `apps/backend/src/presentation/controllers/__tests__/day-log-controller.test.ts`
    - `apps/backend/src/presentation/controllers/day-log-controller.integration.test.ts`
    - `apps/backend/src/presentation/routes/day-log-routes.ts`
    - `apps/backend/src/presentation/mappers/day-log-response-mapper.ts`

- [ ] Task: Add food-search application contracts and orchestration
  - Acceptance: The application layer has DTOs, a `FoodSearchProvider` port, a recent-food read port, and a small service/query handler that trims input, applies the result limit and 3-character minimum, requests matching recent foods, requests USDA foods, and returns one ordered app-owned result list with recent foods first.
  - Verify: `npx nx run backend:test -- src/application/services/food-search-service.test.ts`
  - Files:
    - `apps/backend/src/application/dtos/food-search-dtos.ts`
    - `apps/backend/src/application/ports/food-search-provider.ts`
    - `apps/backend/src/application/ports/recent-food-query.ts`
    - `apps/backend/src/application/services/food-search-service.ts`
    - `apps/backend/src/application/services/food-search-service.test.ts`

- [ ] Task: Implement the FoodData Central infrastructure adapter
  - Acceptance: Backend startup reads/decrypts `FOODDATA_CENTRAL_API_KEY` with `dotenvx.get`, caches the resolved value in memory, and passes it to the adapter through configuration or constructor injection. The adapter builds FoodData Central requests, maps provider responses into app-owned DTOs, handles provider errors without leaking internals, and keeps USDA ranking logic isolated behind unit-tested functions. Branded-versus-generic ranking is optional; if FoodData Central results do not expose reliable branded data, skip branded-specific handling and use generic USDA ordering for the MVP.
  - Verify: `npx nx run backend:test -- src/infrastructure/food-data-central/food-data-central-food-search-provider.test.ts`
  - Files:
    - `apps/backend/src/infrastructure/food-data-central/food-data-central-food-search-provider.ts`
    - `apps/backend/src/infrastructure/food-data-central/food-data-central-mappers.ts`
    - `apps/backend/src/infrastructure/food-data-central/food-data-central-ranking.ts`
    - `apps/backend/src/infrastructure/food-data-central/food-data-central-food-search-provider.test.ts`
    - `apps/backend/src/infrastructure/index.ts`

- [ ] Task: Implement recent-food read query and dedupe
  - Acceptance: Recent foods are read from the authenticated user's food entries from the past 2 weeks, matched against the search query, deduplicated only against other recent foods by normalized name, brand, serving unit, and nutrition values, and returned with last-used metadata for labels such as `Thur` or `Mar 31`.
  - Verify: `npx nx run backend:test:integration`
  - Files:
    - `apps/backend/src/infrastructure/persistence/repositories/postgres-recent-food-query.ts`
    - `apps/backend/src/infrastructure/persistence/repositories/postgres-recent-food-query.integration.test.ts`
    - `apps/backend/src/infrastructure/persistence/repositories/index.ts`
    - `apps/backend/src/application/dtos/food-search-dtos.ts`

- [ ] Task: Expose backend food search routes and container wiring
  - Acceptance: `GET /foods/search?query=<text>` is authenticated, validates query params with the shared schema, returns backend-ordered results, maps service/provider errors into safe HTTP responses, and is wired through the backend container and route index. No response includes the FoodData Central API key or provider-specific private fields.
  - Verify: `npx nx run backend:test -- src/presentation/controllers/food-search-controller.test.ts`, then `npx nx run backend:test:integration`
  - Files:
    - `apps/backend/src/presentation/controllers/food-search-controller.ts`
    - `apps/backend/src/presentation/controllers/food-search-controller.test.ts`
    - `apps/backend/src/presentation/controllers/food-search-controller.integration.test.ts`
    - `apps/backend/src/presentation/routes/food-search-routes.ts`
    - `apps/backend/src/presentation/routes/index.ts`
    - `apps/backend/src/infrastructure/container.ts`

- [ ] Task: Generate the shared API client package
  - Acceptance: `packages/api-client` exists as package `@calibrate/api-client`, follows workspace package conventions, exports from `src/index.ts`, depends on `@calibrate/api-contracts`, and is visible to Nx/workspaces. Run the generator as a dry run first and compare the generated shape against `packages/api-contracts`.
  - Verify: `npx nx show project @calibrate/api-client --json`
  - Files:
    - `packages/api-client/package.json`
    - `packages/api-client/src/index.ts`
    - `packages/api-client/tsconfig.json`
    - `package.json`
    - `package-lock.json`

- [ ] Task: Add portable API request functions
  - Acceptance: `@calibrate/api-client` exposes a small `ApiTransport` factory that accepts `baseUrl`, injected `fetch`, and auth/session options where needed. Selected day log fetch, food entry save, weight update, food search, and optional recent-food fetch live in file-per-operation modules that accept `ApiTransport`, parse responses through shared schemas where practical, and have no React DOM, TanStack Router, browser global, React Native, or UI primitive dependency. Avoid a central God-object that needs to know every API route.
  - Example shape:
    ```ts
    // packages/api-client/src/transport.ts
    export function createApiTransport(config: ApiTransportConfig): ApiTransport {
      return {
        request({ path, method = "GET", body, parse }) {
          // Build URL from baseUrl, add app-provided auth, call injected fetch, parse response.
        },
      };
    }

    // packages/api-client/src/day-logs/get-day-log.ts
    export function getDayLogQueryOptions(transport: ApiTransport, date: string) {
      return queryOptions({
        queryKey: ["dayLogs", date],
        queryFn: () =>
          transport.request({
            path: `/daylogs/${date}`,
            parse: DayLogResponseSchema.nullable().parse,
          }),
      });
    }
    ```
  - Verify: `npx nx run @calibrate/api-client:typecheck` if a target exists; otherwise `npx nx run web:typecheck`
  - Files:
    - `packages/api-client/src/transport.ts`
    - `packages/api-client/src/day-logs/get-day-log.ts`
    - `packages/api-client/src/day-logs/update-weight.ts`
    - `packages/api-client/src/day-logs/save-food-entry.ts`
    - `packages/api-client/src/foods/search-foods.ts`
    - `packages/api-client/src/errors.ts`
    - `packages/api-client/src/index.ts`

- [ ] Task: Add React Query helpers and approved dependency declarations
  - Acceptance: `@calibrate/api-client` declares `@tanstack/react-query` as peer and dev dependency, `web` declares it as an app dependency, and operation modules export portable query options/hooks/mutation helpers that accept an `ApiTransport` without owning platform provider setup. Prefer exporting query/mutation options even when a hook is also exported, so apps can prefetch, invalidate, and compose behavior outside React components. Before any package install during implementation, present the exact install command if the lockfile needs to change.
  - Example shape:
    ```ts
    export function useSelectedDayLog(transport: ApiTransport, date: string) {
      return useQuery(getDayLogQueryOptions(transport, date));
    }

    export function updateWeightMutationOptions(transport: ApiTransport) {
      return {
        mutationKey: ["dayLogs", "updateWeight"],
        mutationFn: (input: UpdateWeightInput) =>
          transport.request({
            path: `/daylogs/${input.date}/weight`,
            method: "PATCH",
            body: { weight: input.weight },
            parse: DayLogResponseSchema.parse,
          }),
      };
    }
    ```
  - Verify: `npx nx run web:typecheck`
  - Files:
    - `packages/api-client/package.json`
    - `packages/api-client/src/day-logs/get-day-log.ts`
    - `packages/api-client/src/day-logs/update-weight.ts`
    - `packages/api-client/src/foods/search-foods.ts`
    - `packages/api-client/src/index.ts`
    - `apps/web-frontend/package.json`

- [ ] Task: Add selected-date search validation and confirmation route shell
  - Acceptance: `/logs` validates selected-date URL search params through TanStack Router if URL search is used, `/logs/confirm-food` exists as a hidden workflow route, and direct entry or refresh without selected-food context shows a recoverable empty state or returns the user to search. Search-to-confirmation navigation is prepared for per-navigation `viewTransition: true` with normal navigation fallback.
  - Verify: `npx nx run web:test:integration`
  - Files:
    - `apps/web-frontend/src/routes/logs.tsx`
    - `apps/web-frontend/src/routes/logs/confirm-food.tsx`
    - `apps/web-frontend/src/pages/logs/ConfirmFood.tsx`
    - `apps/web-frontend/src/pages/logs/logs-routing.integration.test.tsx`
    - `apps/web-frontend/src/routeTree.gen.ts`

- [ ] Task: Add log-page state helpers and contract-shaped fixtures
  - Acceptance: Pure helpers normalize `DayLogResponse | null` into renderable empty/loaded state, compute daily and meal totals, calculate placeholder target progress, derive yesterday-momentum copy inputs, and provide contract-shaped fixtures for normal, empty, loading, and error UI tests.
  - Verify: `npx nx run web:test -- src/pages/logs/log-page-helpers.test.ts`
  - Files:
    - `apps/web-frontend/src/pages/logs/log-page-helpers.ts`
    - `apps/web-frontend/src/pages/logs/log-page-fixtures.ts`
    - `apps/web-frontend/src/pages/logs/log-page-helpers.test.ts`

- [ ] Task: Build the daily log mobile-first page shell with mock data
  - Acceptance: `/logs` renders date stepper, daily progress summary, weight summary/empty state, meal sections in Breakfast/Lunch/Dinner/Snacks order, empty meal states, meal add actions, and a FAB bottom sheet shell using contract-shaped fixture data and existing UI primitives first.
  - Before implementation: ask the user for screenshots of the current `/logs` page and any nearby app screens that establish mobile layout, spacing, typography, navigation, empty states, and larger-viewport behavior. Explain that this task builds the daily overview shell, not live data wiring.
  - Verify: `npx nx run web:test -- src/pages/logs/Logs.test.tsx`
  - Files:
    - `apps/web-frontend/src/pages/logs/Logs.tsx`
    - `apps/web-frontend/src/pages/logs/components/DateStepper.tsx`
    - `apps/web-frontend/src/pages/logs/components/DailySummary.tsx`
    - `apps/web-frontend/src/pages/logs/components/MealSection.tsx`
    - `apps/web-frontend/src/pages/logs/components/QuickLogDrawer.tsx`

- [ ] Task: Build food search UI against mock results
  - Acceptance: Search can open from the FAB or a meal section, meal-specific add actions preselect the meal, results render in backend-provided order without client re-ranking, recent food entry results show compact recency labels, and loading/empty/error states are represented before live APIs are wired.
  - Before implementation: ask the user for screenshots of any existing search, list, bottom-sheet/page transition, loading, empty, and error UI patterns. Explain that this task builds the mock food-search experience and result rows before live API wiring.
  - Verify: `npx nx run web:test -- src/pages/logs/food-search.test.tsx`, then `npx nx run web:test:integration`
  - Files:
    - `apps/web-frontend/src/pages/logs/components/FoodSearchPage.tsx`
    - `apps/web-frontend/src/pages/logs/components/FoodResultRow.tsx`
    - `apps/web-frontend/src/pages/logs/components/RecentFoodLabel.tsx`
    - `apps/web-frontend/src/pages/logs/food-search.test.tsx`
    - `apps/web-frontend/src/pages/logs/food-search.integration.test.tsx`
    - `apps/web-frontend/src/pages/logs/Logs.tsx`

- [ ] Task: Build confirmation page UI against selected-food state
  - Acceptance: The confirmation page shows selected food details, allows quantity, serving unit, and meal edits, excludes direct calorie editing, handles missing/stale selected-food state safely, and keeps the route hidden from header/drawer navigation.
  - Before implementation: ask the user for screenshots of any existing form, select/input, detail, save/cancel, and error-state patterns. Explain that this task builds the hidden food-confirmation route UI, including quantity, serving unit, meal selection, and missing-context handling.
  - Verify: `npx nx run web:test -- src/pages/logs/ConfirmFood.test.tsx`
  - Files:
    - `apps/web-frontend/src/pages/logs/ConfirmFood.tsx`
    - `apps/web-frontend/src/pages/logs/components/ConfirmFoodForm.tsx`
    - `apps/web-frontend/src/pages/logs/components/ServingUnitSelect.tsx`
    - `apps/web-frontend/src/pages/logs/ConfirmFood.test.tsx`

- [ ] Task: Add web-level query provider and API client configuration
  - Acceptance: The web app owns `QueryClientProvider`, optional devtools/provider wiring, and base API client configuration. Platform setup remains outside `@calibrate/api-client`, and existing router setup continues to render current routes.
  - Verify: `npx nx run web:test:integration`, then `npx nx run web:typecheck`
  - Files:
    - `apps/web-frontend/src/main.tsx`
    - `apps/web-frontend/src/router.tsx`
    - `apps/web-frontend/src/shared/api/api-client.ts`
    - `apps/web-frontend/src/shared/api/query-client.ts`

- [ ] Task: Wire selected-day fetch and optimistic weight mutation
  - Acceptance: `/logs` loads the selected day through `@calibrate/api-client`, renders empty state when the API returns `null`, updates weight optimistically, rolls back on mutation failure, shows an error state, and invalidates/refetches the selected day log after success.
  - Verify: `npx nx run web:test:integration`
  - Files:
    - `apps/web-frontend/src/pages/logs/Logs.tsx`
    - `apps/web-frontend/src/pages/logs/use-selected-day-log.ts`
    - `apps/web-frontend/src/pages/logs/use-update-weight.ts`
    - `apps/web-frontend/src/pages/logs/logs-live-day-log.integration.test.tsx`
    - `apps/web-frontend/src/shared/api/api-client.ts`

- [ ] Task: Wire live food search and confirmation navigation
  - Acceptance: Food search calls `GET /foods/search`, enforces/debounces the 3-character minimum as needed, renders backend-ordered live results, carries selected food and preselected meal context into `/logs/confirm-food`, and uses per-navigation `viewTransition: true` only for the search-to-confirmation transition.
  - Verify: `npx nx run web:test:integration`
  - Files:
    - `apps/web-frontend/src/pages/logs/components/FoodSearchSheet.tsx`
    - `apps/web-frontend/src/pages/logs/use-food-search.ts`
    - `apps/web-frontend/src/pages/logs/food-confirmation-state.ts`
    - `apps/web-frontend/src/pages/logs/food-search-live.integration.test.tsx`
    - `apps/web-frontend/src/pages/logs/Logs.tsx`

- [ ] Task: Wire confirmed food save flow
  - Acceptance: The confirmation page saves through `POST /daylogs/:date/food-entries`, preserves the selected meal unless changed by the user, invalidates/refetches the selected day log after success, navigates back to `/logs`, and surfaces save errors without losing the user's confirmation edits.
  - Verify: `npx nx run web:test:integration`, then `npx nx run web:test:e2e`
  - Files:
    - `apps/web-frontend/src/pages/logs/ConfirmFood.tsx`
    - `apps/web-frontend/src/pages/logs/use-save-food-entry.ts`
    - `apps/web-frontend/src/pages/logs/food-confirmation-state.ts`
    - `apps/web-frontend/src/pages/logs/confirm-food-live.integration.test.tsx`
    - `apps/web-frontend/src/pages/logs/confirm-food-save.e2e.test.tsx`
    - `apps/web-frontend/src/pages/logs/log-page-helpers.ts`

- [ ] Task: Run targeted quality gates and manual smoke verification
  - Acceptance: Backend and frontend targeted tests pass for touched areas, type-aware checks pass for touched projects, backend and frontend dev servers can run together, and the manual smoke path covers previous/next day navigation, empty day display, weight logging, food search, recent food display, confirmation edits, save, and totals update.
  - Verify: `npx nx run backend:test`, `npx nx run backend:test:integration`, `npx nx run backend:test:e2e`, `npx nx run backend:typecheck`, `npx nx run web:test`, `npx nx run web:test:integration`, `npx nx run web:test:e2e`, `npx nx run web:typecheck`, then `npx nx run backend:dev` and `npx nx run web:dev` for manual smoke when ready.
  - Files:
    - `docs/tasks/log-page/PLAN.md`
    - `docs/tasks/log-page/PRD.md`

## Phase 3 Review Gate

- [ ] Task breakdown reviewed.
- [ ] Task order approved.
- [ ] Verification commands approved for implementation sessions.
- [ ] Approved for Phase 4 implementation.
