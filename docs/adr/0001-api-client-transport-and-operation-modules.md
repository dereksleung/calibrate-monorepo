# ADR-0001: Use transport injection and operation modules for the shared API client

## Status

Accepted

## Date

2026-05-20

## Context

The log page work introduces a shared `@calibrate/api-client` package for web and future React Native clients. The package needs reusable request logic for day logs, food entries, weight updates, and food search while staying portable across runtimes.

Key constraints:

- The web app and future React Native app each own platform setup such as base URL, auth/session storage, `fetch` behavior, React Query provider setup, and runtime focus/online handling.
- The API client should parse backend responses through `@calibrate/api-contracts` where practical.
- The API client should not depend on React DOM, TanStack Router, browser globals, React Native-specific APIs, or UI primitives.
- A single large `ApiClient` object that knows every route would make unrelated request modules change together and encourage a God-object shape.
- A package-level mutable singleton for injected fetch would create initialization-order issues, make tests leak configuration across cases, and make multiple client instances awkward.

## Decision

Use a small `ApiTransport` factory plus file-per-operation modules.

`@calibrate/api-client` will expose a transport abstraction responsible for runtime-neutral request mechanics:

- building URLs from an app-provided `baseUrl`
- using an app-provided `fetch` implementation when supplied
- applying app-provided auth/session headers when configured
- handling JSON request/response mechanics
- converting failed HTTP responses into API-client errors

Individual API operations will live in feature folders, one file per route/use case where practical. For example:

- `packages/api-client/src/day-logs/get-day-log.ts`
- `packages/api-client/src/day-logs/update-weight.ts`
- `packages/api-client/src/day-logs/save-food-entry.ts`
- `packages/api-client/src/foods/search-foods.ts`

Operation modules accept an `ApiTransport` argument instead of importing a configured singleton. React Query helpers may live beside the operation they support and should export query/mutation option factories even when they also export hooks.

Example:

```ts
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

export function useSelectedDayLog(transport: ApiTransport, date: string) {
  return useQuery(getDayLogQueryOptions(transport, date));
}
```

Consuming apps own the configured transport instance:

```ts
export const apiTransport = createApiTransport({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  getAccessToken: () => localStorage.getItem("accessToken"),
});
```

When `fetch` is omitted, each request uses the current `globalThis.fetch` (so tests can `vi.spyOn(globalThis, "fetch")`). Pass an explicit `fetch` when the app needs a stable reference (for example a wrapped client with tracing).

## Alternatives Considered

### Central `ApiClient` object

A central client could expose methods such as `client.dayLogs.getByDate()` and `client.foods.search()`.

Pros:

- Easy to discover all API methods from one object.
- Common in generated clients and small applications.

Cons:

- Tends to grow into a God-object as routes are added.
- Forces central files to change for unrelated feature requests.
- Makes feature-level ownership less clear.

Rejected because the shared package is expected to grow across web and mobile clients, and file-per-operation modules keep changes more focused.

### Package-level injected fetch singleton

The package could expose a mutable configured fetch or request function that operation modules import directly.

Pros:

- Very terse call sites inside operation modules.
- Avoids passing transport through helper functions.

Cons:

- Creates initialization-order hazards if a request module is used before configuration.
- Makes tests easier to contaminate across files unless global state is reset carefully.
- Makes multiple API instances difficult, such as multi-tenant tests, SSR, preview environments, or alternate base URLs.
- Risks storing user/session state in shared package globals.

Rejected because the consuming app should own runtime configuration and the shared package should stay stateless.

### Direct global `fetch`

Operation modules could call `globalThis.fetch` directly.

Pros:

- Minimal abstraction.
- Works in many modern runtimes.

Cons:

- Hides the runtime dependency.
- Makes auth wrapping, request tracing, tests, and React Native-specific behavior less explicit.
- Quietly assumes the global fetch implementation is present and configured correctly.

Rejected because explicit transport injection better preserves portability.

## Consequences

- API-client modules stay small and independently changeable.
- The consuming app must pass a configured `ApiTransport` into shared query options/hooks.
- Query option factories remain reusable for prefetching, invalidation, tests, and non-component composition.
- The shared package remains stateless with respect to runtime configuration.
- Some call sites are slightly more verbose than a package-level singleton, but app-local wrapper hooks can hide that where useful.
