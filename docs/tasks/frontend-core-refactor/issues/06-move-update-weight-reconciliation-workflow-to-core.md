# 06: Move Update Weight reconciliation workflow to core

**Blocked by:** 04.

**Status:** ready-for-agent

**What to build:** Deliver Update Weight as a separate complete slice. Add frontend weight-command, observation, and acknowledgement models/builders to the Day Log vertical. Move the weight endpoint's request formation, request/response validation, and pure response mapper together into private `src/api/day-logs/update-day-log-weight.ts`; the operation returns the validated API response. Put the public option factory/hook and result-specific `applyWeightObservationToDayLogCache` logic in `src/feature-workflows/day-logs/update-day-log-weight.ts`.

- [ ] Map frontend command input to the API request inside the workflow; call the endpoint's mapper before returning or caching frontend-domain data.
- [ ] Preserve account-scoped cache keys, aggregate creation, predecessor-version acceptance, unverified acknowledgements, conditional single-date sync, and reconciliation-failure fallback.
- [ ] Keep request and mapper free of TanStack Query/cache policy; keep the workflow free of browser APIs and web session imports.
- [ ] Make the option factory and hook use the same update/reconciliation policy.
- [ ] Test request method/path/body/response validation, mapper conversion, and workflow cache behavior including version mismatch and failed sync.

**Acceptance:** Update Weight is independently usable and testable through a public domain-typed workflow, with the current cache correctness rules preserved.

**Verify:** focused endpoint/mapper and weight workflow tests first; then `npx nx run @calibrate/frontend-core:test`, `npx nx run @calibrate/frontend-core:typecheck`, and targeted web cache tests.

**Likely files:** `src/verticals/day-logs/models/` and sibling `__mocks__`, `src/api/day-logs/update-day-log-weight.ts`, `src/feature-workflows/day-logs/update-day-log-weight.ts`, their tests, and bounded web weight caller edits.
