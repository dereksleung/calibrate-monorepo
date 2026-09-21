# 02: Seal private API modules and configure transport credentials

**Blocked by:** 01.

**Status:** ready-for-agent

**What to build:** Establish `src/api/<area>` as the private home of raw HTTP operations and make the package export map an explicit allowlist of public transport/error, workflow, model, and `__mocks__` leaf paths. Add app-configurable credentials to `ApiTransport`, preserving `"include"` as the default.

- [ ] Keep URL, method, request-body, response-schema, and HTTP-error handling inside private API modules.
- [ ] Do not export `api/**` or use a wildcard export that makes it reachable.
- [ ] Prove `credentials` passes through the injected transport and defaults to today’s behavior.
- [ ] Do not introduce mobile token storage or alter web session behavior.

**Acceptance:** An application can import approved leaf modules but cannot resolve a private API path; browser credential behavior is unchanged by default.

**Verify:** focused transport tests, `npx nx run @calibrate/frontend-core:typecheck`, `npx nx run @calibrate/frontend-core:test`.

**Likely files:** `packages/frontend-core/package.json`, `src/transport.ts`, `src/transport.test.ts`, and bounded API module moves.
