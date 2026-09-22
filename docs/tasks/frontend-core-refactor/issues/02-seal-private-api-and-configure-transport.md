# 02: Seal private API modules and configure transport credentials

**Blocked by:** 01.

**Status:** ready-for-agent

**What to build:** Establish `src/api/<area>` as the private home of network request operations and make the package export map an explicit allowlist of public transport/error, workflow, model, and `__mocks__` leaf paths. Add app-configurable credentials to `ApiTransport`, preserving `"include"` as the default. In particular, move `saveFoodEntry` to `src/api/day-logs/save-food-entry.ts`: it validates and forms `POST /daylogs/{date}/food-entries`, executes it through the injected transport, and returns the validated API response.

- [ ] Keep URL/path/query, HTTP method, request-body validation, transport execution, response-schema validation, and HTTP-error handling inside private API modules. These modules change for network/transport/validator details, not for cache or user-goal policy.
- [ ] Leave `getSaveFoodEntryMutationOptions` and `useSaveFoodEntry` for the public feature-workflow module in ticket 05; private `api/**` modules must not import TanStack Query or update the cache.
- [ ] Do not export `api/**` or use a wildcard export that makes it reachable.
- [ ] Prove `credentials` passes through the injected transport and defaults to today’s behavior.
- [ ] Do not introduce mobile token storage or alter web session behavior.

**Acceptance:** An application can import approved leaf modules but cannot resolve `@calibrate/frontend-core/api/**`; the private `saveFoodEntry` operation handles network details and returns a validated response without React Query/cache behavior; browser credential behavior is unchanged by default.

**Verify:** focused transport tests, `npx nx run @calibrate/frontend-core:typecheck`, `npx nx run @calibrate/frontend-core:test`.

**Likely files:** `packages/frontend-core/package.json`, `src/transport.ts`, `src/transport.test.ts`, `src/api/day-logs/save-food-entry.ts`, and its focused test. Keep the public mutation adapter compiling until ticket 05 migrates it.
