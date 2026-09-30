# 09: Migrate Dashboard projections and delete the legacy model

**Blocked by:** 07.

**Status:** implemented

**What to build:** Move the portable Dashboard V2 analytics projection and its nutrition helpers to core so it accepts the Day Log snapshots/domain types delivered by the read workflow in 07. Keep web chart props and components local. Delete `dashboard-nutrition-model.ts` and its test only after a production-import audit proves they are unused.

- [x] Do not make a Dashboard projection depend on API response wrappers.
- [x] Preserve the seven-day and 28-day analytic calculations, order, targets, and insufficient-history behavior.
- [x] Do not delete the legacy model merely because its test is its only obvious caller; audit all production imports first.

**Acceptance:** Dashboard consumes the core Day Log read workflow and a domain-input projection; no production legacy dashboard model remains. This ticket adds no separate endpoint or API response mapper because 07 owns the read boundary.

**Verify:** focused Dashboard model tests, `npx nx run web:test`, `npx nx run web:typecheck`, and an `rg` production-import audit.

**Likely files:** one core Dashboard model/test, Dashboard container imports, and the legacy model/test deletion once proven unused.

## Implementation

- Moved Dashboard V2 projections to `@calibrate/frontend-core/verticals/dashboard/dashboard-v2-model`, accepting domain `DayLogSnapshot` inputs directly. Dashboard retains its core sync/read workflow and passes the cached snapshots into the projection.
- Moved shared nutrition totals and targets to `@calibrate/frontend-core/shared/models/nutrition/nutrition-totals`; migrated Dashboard, Logs, stories, and tests to the explicit core leaves. Chart props and components remain in web.
- Audited the entire repository for the legacy module path and its exported functions before deletion. References were limited to the legacy implementation/test and refactor documentation; there were no production importers. Removed the legacy model/test and the replaced web projection/nutrition files.
- Preserved the nine projection tests using core domain builders; added tests for unloaded/known-empty habit history, targets, inclusive 28-day boundaries, and nutrition totals.
- Verification passed: core tests (75), web fast tests (195), Dashboard integration tests (11), core/web typechecks, web lint, scoped formatting, and final production-import audits.
