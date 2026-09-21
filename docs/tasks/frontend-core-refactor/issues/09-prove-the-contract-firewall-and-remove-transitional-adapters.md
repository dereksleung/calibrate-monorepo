# 09: Prove the contract firewall and remove transitional adapters

**Blocked by:** 06, 07, 08.

**Status:** ready-for-agent

**What to build:** Remove temporary package-rename adapters, verify the explicit export allowlist, and prove the intended dependency boundary with tests and source audits.

- [ ] Assert approved core leaves resolve and private `api/**` leaves do not.
- [ ] Audit web feature source for API response/request-type imports that core now owns; retain direct API-contract imports only where a presentation contract genuinely belongs to web and document each exception.
- [ ] Confirm all reusable fixtures use co-located `__mocks__` builders and that no production entry exports them.
- [ ] Keep documentation and ADR links current; do not rewrite completed historical task artifacts merely because they name the old package.

**Acceptance:** The final package surface is direct, narrow, portable, and free of public API-contract response leakage.

**Verify:** `npx nx run @calibrate/frontend-core:test`, `npx nx run @calibrate/frontend-core:typecheck`, `npx nx run web:test`, `npx nx run web:test:integration`, `npx nx run web:typecheck`, `npx nx run web:lint`, `npx nx run web:fmt:check`.

**Likely files:** final package export map/tests, focused documentation updates, and bounded cleanup edits.
