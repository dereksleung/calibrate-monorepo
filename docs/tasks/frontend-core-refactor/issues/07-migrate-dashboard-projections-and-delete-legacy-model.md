# 07: Migrate Dashboard projections and delete the legacy model

**Blocked by:** 04.

**Status:** ready-for-agent

**What to build:** Move the portable Dashboard V2 analytics projection and its nutrition helpers to core so it accepts Day Log snapshots/domain types. Keep web chart props and components local. Delete `dashboard-nutrition-model.ts` and its test only after a production-import audit proves they are unused.

- [ ] Do not make a Dashboard projection depend on API response wrappers.
- [ ] Preserve the seven-day and 28-day analytic calculations, order, targets, and insufficient-history behavior.
- [ ] Do not delete the legacy model merely because its test is its only obvious caller; audit all production imports first.

**Acceptance:** Dashboard consumes a core domain-input projection and no production legacy dashboard model remains.

**Verify:** focused Dashboard model tests, `npx nx run web:test`, `npx nx run web:typecheck`, and an `rg` production-import audit.

**Likely files:** one core Dashboard model/test, Dashboard container imports, and the legacy model/test deletion once proven unused.
