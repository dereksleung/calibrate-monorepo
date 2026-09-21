# Frontend core refactor plan

## Current pressure points

`@calibrate/api-client` already has the useful portable transport seam, but its public operations return API-contract types. The requested web areas each then couple directly to contract response shapes:

- Logs renders `DayLogResponse` and `FoodEntryResponse`, while its save workflow writes API-shaped data into the cache.
- Dashboard V2 reads cache slots but keeps an obsolete `DayLogRangeResponse` type alias; its legacy nutrition model has no production import.
- The Day Log cache persists raw Day Log responses and separately reconstructs version/freshness semantics from TanStack Query state.

The refactor must first establish the package identity and direct-import surface, then move one data boundary at a time. It must not change the server sync protocol or the browser cache fence.

## Architecture

```mermaid
flowchart LR
  Web[Web runtime\ntransport, QueryClient, IndexedDB, router] --> Workflow[Public feature workflow\nmap commands and results\nportable query/cache orchestration]
  Mobile[Future mobile runtime\ntransport, QueryClient] --> Workflow
  Workflow --> API[Private API operation\nURL, method, schema validation]
  API --> Contracts[@calibrate/api-contracts]
  Workflow --> Models[Frontend domain models\nand pure projections]
  Workflow --> Query[TanStack Query\naccount-scoped slot cache]
  Query --> Web
```

## Stages

### 1. Establish `@calibrate/frontend-core` without behavior change

Rename the package, project references, lockfile workspace name, and every consuming import. Replace the current root imports with direct leaf imports and an explicit package export map. Use temporary leaf adapters where necessary so this checkpoint remains mechanical; do not retain a compatibility `@calibrate/api-client` package or alter endpoint behavior.

Verify `@calibrate/frontend-core` and web typecheck/test targets before beginning model changes.

### 2. Seal the API boundary and define the public module topology

Create the private `api/<area>` modules and move request details there. Make `package.json` exports a narrow allowlist for public model, workflow, transport/error, and test leaf paths. Add configurable `credentials` to `ApiTransport`, defaulting to `"include"`.

Public feature-workflow inputs are frontend command types. Public successful outputs are frontend-domain models. Private API operation tests can use relative imports; app code cannot import their paths.

### 3. Migrate Day Log and food data first

Create Day Log, Food Entry, Meal, food-search, and Day Log sync/write-acknowledgement models under `verticals/day-logs/models`. Keep `DayLog` meal nullability unchanged. Define `DayLogSnapshot` as `{ date, data: DayLog | null | undefined }` and use its `null`/`undefined` meanings consistently.

Implement mappers beside Day Log and food feature workflows. Move the date-key family, validation helpers, sync acceptance, write patching, and conditional single-date reconciliation into portable workflows. The web cache retains persistence filtering and lifecycle fence ownership but calls core for portable composition.

### 4. Migrate Logs and Dashboard consumers

Logs receives domain models and workflows through direct core imports. Keep calendar/route/display projections that depend on browser/UI behavior in web. Move portable nutrition totals, meal definitions, cache-only recent-food ranking, and Dashboard V2 analytics projections to core. Audit `dashboard-nutrition-model`; delete it and its test when the production-import audit remains empty.

### 5. Migrate authentication and complete the contract firewall

Create `AuthenticatedUserContext` plus auth workflow mappers in core. The web session-restoration gate continues to own browser cache confirmation/revocation, IndexedDB lifecycle handling, and navigation. Migrate all current passkey/email/session operation callers to direct public core leaf paths. Verify no app-facing operation returns a contract type and no requested web scope imports a response type from `@calibrate/api-contracts`.

### 6. Stabilize and remove transitional seams

Delete temporary package-rename adapters once consumers use final workflows/models. Convert shareable fixtures to co-located `__mocks__` builders; retain app-only fixtures in web. Run package and web suites, check direct import/export boundaries, and manually exercise the Logs write/reconciliation plus Dashboard cache-first flow.

## Dependency order

1. Package rename and direct import map
2. Private API/export allowlist and transport configuration
3. Day Log domain types and mappers
4. Sync/cache workflow
5. Save/weight reconciliation workflow
6. Logs and Dashboard migration
7. Auth migration
8. Cleanup and full verification

Tasks 4 and 5 share Day Log model work but can proceed after task 3. Logs and Dashboard can then migrate independently. Authentication is independent of Day Log behavior after the package rename, but finishes after the public export boundary is in place.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A mapper accidentally becomes another public contract leak | Keep API modules unexported; test workflow output types and search app source for contract response imports. |
| A mechanical rename breaks TypeScript/Nx workspace resolution | Make it the first isolated checkpoint; update package, project references, paths, and lockfile together. |
| Moving cache logic changes Known-empty or unverified behavior | Characterize current query-key, timestamp, predecessor-version, sync-204, and fallback behavior before moving it. |
| Browser cache fence moves into core | Keep all IndexedDB, BroadcastChannel, document/window, and provider lifecycle files in web; test this boundary by imports. |
| Future mobile auth does not use browser cookies | Make credentials configurable now; defer token/session storage and platform auth adapters. |
| Direct leaf paths expose implementation files | Use an explicit package export allowlist, not a wildcard export. |

## Verification checkpoints

These checkpoints are scheduled moments to run additional tests, checks, and manual verification after the verification in each defined task in the Phase 3 Task Breakdown. They are not intended to define commit boundaries. Commit according to the incremental implementation rule: each commit should capture one logical change, even if that means committing before, between, or after these verification checkpoints.

- After package rename: `npx nx run @calibrate/frontend-core:typecheck`, `npx nx run @calibrate/frontend-core:test`, and `npx nx run web:typecheck`.
- After Day Log/cache workflows: focused core tests, `npx nx run web:test`, and Day Log cache integration tests.
- After Logs/Dashboard: targeted Logs and Dashboard tests, `npx nx run web:test`, `npx nx run web:typecheck`.
- Before merge: package tests/typecheck, web fast and integration suites, web lint, and format check.

## Task breakdown

See the ordered, independently reviewable tickets in [issues](./issues/). Each ticket lists its acceptance criteria, focused verification, and bounded file ownership.
