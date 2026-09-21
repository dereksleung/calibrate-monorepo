# 01: Rename the package and establish direct imports

**Blocked by:** None.

**Status:** ready-for-agent

**What to build:** Rename `packages/api-client` to `packages/frontend-core` and its workspace name to `@calibrate/frontend-core`. Update workspace/project references, TypeScript paths, package metadata, and the lockfile. Replace root package imports with direct leaf imports through temporary leaf adapters so this checkpoint changes no endpoint or model behavior.

- [ ] Do not retain `@calibrate/api-client` as a compatibility package.
- [ ] Do not expose a root `index.ts` import path.
- [ ] Split caller and test import edits into compiler-guided batches of at most five files; each batch must preserve the old behavior.
- [ ] Preserve current test coverage while import mocks move to the direct paths.

**Acceptance:** The renamed package and web application typecheck; no workspace source imports `@calibrate/api-client`; direct leaves resolve; request behavior is unchanged.

**Verify:** `npx nx run @calibrate/frontend-core:typecheck`, `npx nx run @calibrate/frontend-core:test`, `npx nx run web:typecheck`.

**Likely files:** `packages/frontend-core/package.json`, `tsconfig.json`, `apps/web-frontend/tsconfig.json`, `apps/web-frontend/package.json`, plus bounded import batches.
