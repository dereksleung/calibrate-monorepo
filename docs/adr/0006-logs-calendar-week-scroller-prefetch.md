# ADR-0006: Logs Calendar week scroller prefetch

**Status:** Accepted

**Date:** 2026-09-15

**Amends:** [ADR-0004](./0004-bounded-day-log-sync-and-cache-fence.md) Logs view behavior only

ADR-0004 kept historical Calendar week scrolling network-silent so browsing Logs would not cost a sync. The Logs week scroller paints per-day calorie rings from cached slots; a silent overscan week shows empty rings on first drag.

When Logs snaps Calendar week `W`, it cache-first synchronizes the dates in `W` that are on or before today, plus the previous Sunday–Saturday Calendar week `W−1`. Upcoming dates stay out of the range. Selecting date `D` still synchronizes `D−6` through `D` as in ADR-0004; that selected-date freshness check is unchanged. Both ranges use the shared `useSyncDayLogsForDateRange` hook, which skips the network when every slot in the range is already fresh. The hook lives in `apps/web-frontend/src/verticals/day-log-cache/`, not under Dashboard.

This prefers ready rings over zero browse traffic. It does not enable future Calendar weeks, does not treat Upcoming dates as Known-empty, and does not change Dashboard’s rolling seven-day range or Nutrient Analytics’ 28-day drawer action.

## Considered Options

- **Keep ADR-0004 silent historical scroll:** no extra traffic, but the overscan week’s rings stay empty until the user selects a day in it. Rejected for the scroller.
- **Prefetch only `W−1`:** the overscan week is ready, but leftover days in visible `W` after selected `D` can still miss `D−6..D`. Rejected.
- **Sync on snap of `W` plus `W−1` (chosen):** one extra cache-first range, at most fourteen dates, inside the 31-date sync cap.

## Consequences

- Logs makes two hook calls: selected `D−6..D`, and `[W.start − 7, min(W.end, today)]`.
- A later reader should not “fix” the scroller by restoring network-silent historical scroll from ADR-0004.
- Fresh slots still short-circuit the request; prefetch is not an unconditional download.
