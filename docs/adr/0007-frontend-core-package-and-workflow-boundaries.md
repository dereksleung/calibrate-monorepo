# ADR-0007: Frontend core package and workflow boundaries

**Status:** Accepted

**Date:** 2026-09-20

**Supersedes:** [ADR-0001](./0001-api-client-transport-and-operation-modules.md)

Calibrate needs one portable package for the shared frontend behavior of web and future React Native clients, not merely an HTTP client. Rename `@calibrate/api-client` to `@calibrate/frontend-core`. Preserve ADR-0001's stateless transport injection and app-owned `QueryClient` setup, but make the package's public boundary frontend-domain models and user-goal feature workflows rather than API-contract response types.

## Decision

- The package is `packages/frontend-core`, named `@calibrate/frontend-core`. It has no root public barrel: consumers use explicit approved leaf imports. The export map permits public models, feature workflows, transport/error modules, and co-located `__mocks__` test paths; it does not export `src/api/**`.
- `src/api/<area>/` is private implementation code. It owns URL/method/body formation, API-schema validation, and raw API response handling. It may depend on `@calibrate/api-contracts`; applications and vertical models may not.
- `src/feature-workflows/<area>/` owns public request/response adaptation. It accepts frontend command inputs, maps them to API request shapes, maps validated responses to frontend domain models, and may coordinate more than one API operation when needed to complete one user goal. “Roughly one endpoint” is a default for organization, not a correctness constraint.
- `src/verticals/<area>/models/` holds frontend-domain types and pure projections over those types. `src/shared/models/` holds cross-vertical pure models and transforms. API-response mappers remain in feature workflows so vertical models never depend on API contracts.
- Core may contain TanStack Query options, hooks, query-key families, slot composition, cache patching, and reconciliation because they are portable across React and React Native. The consuming app supplies `ApiTransport`, account context, and `QueryClient`.
- `DayLogSnapshot` is the cache-facing shared model: its data is `DayLog | null | undefined`, preserving the distinction between a loaded Day Log, a Known-empty day, and an unloaded day. `DayLog` initially retains the API-equivalent nullable meal collections; the separate mapper establishes the boundary without an unrelated shape redesign.
- Browser-only concerns stay in web: IndexedDB persistence, durable cache-lifecycle fencing, browser lifecycle events, router state, DOM APIs, WebAuthn adapters, and UI components. Core exposes an `AuthenticatedUserContext`; web session restoration remains the coordinator for browser cache fencing and navigation.
- `ApiTransport` credentials are app-configurable and default to the current `"include"` behavior. This preserves web cookies while leaving the future mobile authentication transport explicit.

## Consequences

The web and mobile frontends can share tested request logic, frontend-domain data, TanStack Query behavior, and view-independent projections without sharing a browser runtime. A backend contract change is localized to a private API module and its feature-workflow mapper rather than propagating through consumers.

The first migration checkpoint is intentionally mechanical: rename the workspace package and replace root imports with direct leaf imports before changing model behavior. Later checkpoints remove the temporary API-shaped public adapters, migrate every existing operation (including auth), and verify that application source has no `@calibrate/api-contracts` dependency for data received from core.

The Day Log IndexedDB persistence and cache-lifecycle fence remain governed by [ADR-0004](./0004-bounded-day-log-sync-and-cache-fence.md) and its amendment [ADR-0006](./0006-logs-calendar-week-scroller-prefetch.md). This ADR moves portable in-memory cache composition to core; it does not weaken those privacy or freshness invariants.

## Considered options

- **Keep `@calibrate/api-client` as a request-only package:** rejected because shared frontend domain types, cache reconciliation, and reusable React Query workflows would otherwise fragment across apps.
- **Export raw API operations and contract response types:** rejected because consumers would remain coupled to backend response shape.
- **Put browser persistence and session gates in core:** rejected because IndexedDB, document/window events, router behavior, and cache-fence lifecycle are platform-specific.
- **Use a root barrel:** rejected because it obscures dependency ownership and makes accidental imports of internal or unrelated modules easier.
