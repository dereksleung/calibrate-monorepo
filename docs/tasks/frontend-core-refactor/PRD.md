# Frontend core refactor

## Objective

Replace the request-only `@calibrate/api-client` package with `@calibrate/frontend-core`, the shared frontend behavior layer for web and future React Native clients. It must provide portable request formation, cohesive vertical functionality, frontend-domain and presentation models, response/request mapping, TanStack Query workflows, cache composition, and view-independent projections without containing browser or React Native UI/runtime code.

The purpose is to stop API contract response shapes from flowing through web features. A response-shape change should normally alter the private endpoint file, including its mapper, not every Logs, Dashboard, cache, or mobile consumer.

## Scope and success criteria

- `@calibrate/frontend-core` replaces `@calibrate/api-client`; no compatibility package remains.
- Application imports use approved direct leaf paths only; there is no public root barrel and no application import of a private `api/**` module.
- Every existing API-client operation, including authentication, is available through a public vertical or feature-workflow surface. No public operation result exposes `@calibrate/api-contracts` response types.
- Private `api/<area>/<endpoint>.ts` modules own network requests: request-body validation, URL/path/query construction, HTTP method, and validation of the returned response. An endpoint needing response conversion also defines its pure validated-response-to-frontend-domain mapper in that file. The request operation returns the validated API response without calling the mapper; the mapper is available to core workflows through an internal import. These modules contain no TanStack Query options, hooks, cache writes, or user-goal policy. Their reasons to change include transport/validator technology, network-request details, and response-shape mapping.
- Public `feature-workflows/<workflow-group>/<goal>` modules own the application-layer orchestration for a cohesive user goal. They map frontend inputs to requests, call private API operations and their co-located response mappers, then coordinate account context, server commands, cache writes required by the result, reconciliation, and fallback behavior through TanStack Query options and hooks. Result-application functions such as `applyDayLogSyncResult`, `applyFoodEntryCreateToDayLogCache`, and `applyWeightObservationToDayLogCache` belong inside their respective `<goal>.ts` workflow files. The workflow group is chosen for discoverability and need not match a vertical or an endpoint; a workflow may use models from several verticals.
- `verticals/<area>/` is a portable feature folder for one cohesive area of functionality shared by web and mobile. It may contain pure calculations, frontend-domain and portable presentation models, reusable QueryClient cache operations, and persistence policy; purity is not required. `verticals/day-log-cache/` groups shared query keys, slot observations, freshness behavior, persistence filtering, persisted-snapshot validation, and pruning, without becoming a collection of result-specific cache writes. Vertical modules do not import API-contract types or platform-specific browser/native APIs; feature workflows call endpoint mappers before passing frontend-domain data to them.
- Day Log cache data uses shared `DayLogSnapshot` with `DayLog | null | undefined`; this preserves loaded, Known-empty, and unloaded semantics. The existing one-hour validation, version reconciliation, 30-day retention, and account-scoped privacy fence remain behaviorally unchanged.
- Core owns portable query keys, shared QueryClient cache observations, query options/hooks, result-specific cache writes, conditional synchronization, and Day Log persistence policy (buster, retention, account-scoped allowlist, validation, and pruning). Shared cache mechanics may live in `verticals/day-log-cache/`; feature workflows own the writes that apply their results. Each app composes the persistence policy and its own persister with `PersistQueryClientProvider`. Web retains the IndexedDB persister, durable cache fence, `window`/`document`/BroadcastChannel behavior, routing, and UI.
- Core exports portable nutrition, meal, recent-food, and Dashboard V2 analytics projections from the appropriate area folders. Move portable behavior from web's `rank-recent-foods-from-cache.ts`, `confirm-food-nutrition.ts`, `log-page-helpers.ts`, and `day-log-cache.ts` by responsibility; do not move mixed files wholesale. Route and display choices specific to web, chart-component props, and visual components remain in web. Browser-dependent `indexed-db-day-log-cache.ts` and `browser-passkey-registration-adapter.ts` remain in web.
- Legacy `dashboard-nutrition-model` is deleted when the production-import audit remains empty.
- Test builders sit in sibling `__mocks__` directories and are available only through explicit test leaf paths.
- No dependencies are added. Transport credentials become configurable with the current `"include"` default.

## Commands

- Package tests: `npx nx run @calibrate/frontend-core:test`
- Package typecheck: `npx nx run @calibrate/frontend-core:typecheck`
- Web fast tests: `npx nx run web:test`
- Web integration tests: `npx nx run web:test:integration`
- Web typecheck: `npx nx run web:typecheck`
- Web lint: `npx nx run web:lint`
- Formatting check: `npx nx run web:fmt:check`

Run the narrow package or colocated test before broader web checks. Do not run a full build unless explicitly requested.

## Target structure

```text
packages/frontend-core/
  src/
    api/<area>/<endpoint>.ts             private request operation, schema validation, response mapper
    feature-workflows/<group>/<goal>.ts  public user-goal orchestration, hooks/options, request shaping
    verticals/<area>/                    cohesive portable area functionality, pure or stateful
      models/                             frontend-domain and portable presentation models, __mocks__
    verticals/day-log-cache/            shared cache mechanics and persistence policy
    shared/models/                       cross-vertical pure transforms and __mocks__
    transport.ts                         injected, runtime-neutral transport
    errors.ts                            transport errors
```

`api/<area>` is a source-code location, not an exported package path. Public consumers use specific leaf modules, for example:

```ts
import { useSaveFoodEntry } from "@calibrate/frontend-core/feature-workflows/day-logs/save-food-entry";
import type { DayLogSnapshot } from "@calibrate/frontend-core/verticals/day-logs/models/day-log";
```

The existing `packages/api-client/src/day-logs/save-food-entry.ts` combines three responsibilities. Split it as follows:

| Source file after migration | Responsibility | Example exports |
| --- | --- | --- |
| `src/api/day-logs/save-food-entry.ts` | Validate/form `POST /daylogs/{date}/food-entries`, execute it through `ApiTransport`, return the validated API response, and define a pure mapper for that response in the same file. The request operation does not call the mapper. | `saveFoodEntry`, internal response mapper |
| `src/feature-workflows/day-logs/save-food-entry.ts` | Complete the Save Food Entry goal through TanStack Query options/hooks, request shaping, an explicit call to the endpoint response mapper, Day Log cache patching, conditional sync, and fallback behavior. | `getSaveFoodEntryMutationOptions`, `useSaveFoodEntry` |

The workflow resolves account context through a portable input or host-supplied accessor; web may pass the current account from its authenticated-session hook. It does not import that web hook. The workflow can obtain the app's `QueryClient` through TanStack Query or receive it as an input. After the server accepts the save, it maps the acknowledgement, patches the account-scoped Day Log slot, synchronizes one date when the cached version cannot be trusted, and keeps the locally acknowledged entry eligible for later validation if reconciliation fails. The option factory and hook share this policy so they do not offer different save semantics.

The private endpoint file defines the mapper, and the workflow calls it after the request completes:

```ts
// src/api/day-logs/get-day-log.ts
export function toDayLogSnapshot(response: DayLogResponse | null | undefined, date: string): DayLogSnapshot {
  return { date, data: response === undefined ? undefined : response === null ? null : toDayLog(response) };
}

// src/feature-workflows/day-logs/get-day-log.ts
const response = await getDayLog(transport, date);
const snapshot = toDayLogSnapshot(response, date);
```

The API contract type in this example remains inside core. The public `DayLogSnapshot` and `DayLog` types do not import it, and public workflow results contain frontend-domain data. A workflow's internal dependency on `api/**` includes both the request operation and its response mapper; the export map still prevents application imports of private `api/**` paths. Vertical modules do not depend on API contracts.

## Testing strategy

- Unit-test each private API request operation's method, path, request-body and response validation; test its co-located response mapper with representative validated responses.
- Exercise `getSaveFoodEntryMutationOptions` and `useSaveFoodEntry` through their public behavior so both paths complete the same cache and reconciliation policy.
- Unit-test endpoint response mappers and portable vertical behavior with co-located builders, including pure functions and shared injected-QueryClient cache operations. Test that workflows actually call the mapper before returning or caching domain data.
- Test query-key identity and cache observations in the vertical; test sync acceptance, result-specific cache writes, predecessor-version behavior, and reconciliation fallback through the owning workflows without a platform persister.
- Test Day Log persistence allowlisting, account isolation, retention, validation, and pruning in core; test the web persister and lifecycle fence in web integration tests.
- Keep browser-level IndexedDB, cache-fence, BroadcastChannel, router, and UI integration tests in `apps/web-frontend`.
- Add migration guards: package typecheck plus a repository search/assertion that web feature source no longer imports API response types from `@calibrate/api-contracts`.

## Boundaries

- **Always:** preserve injected transport and app-owned QueryClient, direct leaf imports, domain mapping, account-scoped keys, and the ADR-0004 cache fence; run focused verification before commits.
- **Ask first:** dependencies, backend/API-contract changes, mobile authentication behavior beyond transport configuration, cache lifecycle semantics, database changes, CI configuration, or publishing changes.
- **Never:** export private `api/**`, add a root barrel, store tokens in core, import DOM/IndexedDB/router/UI code or a platform persister into core, remove a failing test, or weaken Known-empty/unloaded/privacy semantics.

## Open questions

None. The future mobile authentication implementation is deliberately deferred; only its transport configuration seam is included here.
