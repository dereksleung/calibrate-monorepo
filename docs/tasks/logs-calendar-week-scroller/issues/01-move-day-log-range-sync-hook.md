# 01: Move the Day Log range-sync hook into the cache vertical

**What to build:** Dashboard still loads its rolling seven-day Day Log view the same way, but the cache-first date-range sync hook now lives with the Day Log cache. Later Logs work can call it without importing a Dashboard page module.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [x] Dashboard’s seven-day composition still uses the same cache-first range-sync hook (subscribe to date slots, sync only when the range needs validation, apply the result into those slots).
- [x] The hook is exported from the Day Log cache vertical. Dashboard imports it from there, not from a Dashboard page module.
- [x] No user-visible Dashboard change: same ranges, same freshness rules, same Upcoming exclusion.
- [x] Existing tests that covered this hook still pass from its new home. No Playwright suite for this ticket.
