# Frontend core refactor

## Objective

Replace the request-only `@calibrate/api-client` package with `@calibrate/frontend-core`, the shared frontend behavior layer for web and future React Native clients. It must provide portable request formation, frontend-domain models, response/request mapping, TanStack Query workflows, cache composition, and pure view-independent projections without containing browser or React Native UI/runtime code.

The purpose is to stop API contract response shapes from flowing through web features. A contract change should normally alter a private API operation and one feature-workflow mapper, not every Logs, Dashboard, cache, or mobile consumer.

## Scope and success criteria

- `@calibrate/frontend-core` replaces `@calibrate/api-client`; no compatibility package remains.
- Application imports use approved direct leaf paths only; there is no public root barrel and no application import of a private `api/**` module.
- Every existing API-client operation, including authentication, is available through a public domain-model or feature-workflow surface. No public operation result exposes `@calibrate/api-contracts` response types.
- Private `api/<area>` modules own endpoint details and schema validation. Feature workflows own request/response mapping and may compose multiple operations to finish a user goal.
- Day Log cache data uses shared `DayLogSnapshot` with `DayLog | null | undefined`; this preserves loaded, Known-empty, and unloaded semantics. The existing one-hour validation, version reconciliation, 30-day retention, and account-scoped privacy fence remain behaviorally unchanged.
- Core owns portable query keys, query options/hooks, cache patching, and conditional synchronization. Web retains IndexedDB, `window`/`document`/BroadcastChannel behavior, routing, and UI.
- Core exports portable nutrition, meal, recent-food, and Dashboard V2 analytics projections. Web-only route parsing, date presentation, chart-component props, and visual components remain in web.
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
    api/<area>/                         private HTTP operations and schemas
    feature-workflows/<area>/           public portable hooks/options/mappers
    verticals/<area>/models/             domain types, pure area projections, __mocks__
    shared/models/                       cross-vertical pure transforms and __mocks__
    transport.ts                         injected, runtime-neutral transport
    errors.ts                            transport errors
```

`api/<area>` is intentionally not an exported package path. Public consumers use specific leaf modules, for example:

```ts
import { useSaveFoodEntry } from "@calibrate/frontend-core/feature-workflows/day-logs/save-food-entry";
import type { DayLogSnapshot } from "@calibrate/frontend-core/verticals/day-logs/models/day-log";
```

Inside a feature workflow, raw contract values end at the mapper boundary:

```ts
export function toDayLogSnapshot(response: DayLogResponse | null | undefined, date: string): DayLogSnapshot {
  return { date, data: response === undefined ? undefined : response === null ? null : toDayLog(response) };
}
```

The API contract type in this example remains private to the feature-workflow implementation. The public `DayLogSnapshot` and `DayLog` types do not import it.

## Testing strategy

- Unit-test each API request operation's method, path, request mapping, schema failure, and response mapping at the core boundary.
- Unit-test domain mappers and pure projections with co-located domain builders.
- Test query-key identity, sync acceptance, cache patching, predecessor-version behavior, and reconciliation fallback without browser persistence.
- Keep browser-level IndexedDB, cache-fence, BroadcastChannel, router, and UI integration tests in `apps/web-frontend`.
- Add migration guards: package typecheck plus a repository search/assertion that web feature source no longer imports API response types from `@calibrate/api-contracts`.

## Boundaries

- **Always:** preserve injected transport and app-owned QueryClient, direct leaf imports, domain mapping, account-scoped keys, and the ADR-0004 cache fence; run focused verification before commits.
- **Ask first:** dependencies, backend/API-contract changes, mobile authentication behavior beyond transport configuration, cache lifecycle semantics, database changes, CI configuration, or publishing changes.
- **Never:** export private `api/**`, add a root barrel, store tokens in core, import DOM/IndexedDB/router/UI code into core, remove a failing test, or weaken Known-empty/unloaded/privacy semantics.

## Open questions

None. The future mobile authentication implementation is deliberately deferred; only its transport configuration seam is included here.
