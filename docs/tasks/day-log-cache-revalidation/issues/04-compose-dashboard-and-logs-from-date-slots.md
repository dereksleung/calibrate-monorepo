# 04: Compose Dashboard and Logs from validated date slots

**What to build:** Dashboard and Logs compose cache-first Day Log views from account-scoped date slots and use bounded sync only when the user's active data needs validation. Logs displays calendar weeks naturally while avoiding requests from passive historical browsing.

**Blocked by:** 01: Restore a private Day Log cache with a lifecycle fence; 03: Add bounded Day Log synchronization.

**Status:** ready-for-agent

- [ ] Normalize every successful sync into account-scoped date-slot queries whose data is `DayLogResponse | null`; `null` is `KnownEmptyResponse`, while a missing query entry is `NotYetLoaded`. Let TanStack Query own freshness through each query's `dataUpdatedAt` and repair eligibility through `isInvalidated`; do not persist a second freshness or unverified field in slot data.
- [ ] Compose Dashboard's rolling `today - 6` through today view from those slots. Cache-first rendering remains available when a sync is in flight, offline, or fails; later eligible activation can retry without blanking known data.
- [ ] Add the Logs Sunday-to-Saturday Calendar week presentation. The current Calendar week reuses Dashboard's rolling slots; future dates are disabled Upcoming state, never Known-empty. Prevent navigation to future weeks.
- [ ] Ensure merely scrolling historical weeks performs no sync. When the user explicitly selects historical date `D`, evaluate freshness only for D; if `NotYetLoaded`, invalidated, or one-hour stale according to `dataUpdatedAt`, sync `D - 6` through D in the background after rendering cache first.
- [ ] Reuse fresh slot `dataUpdatedAt` values for nearby historic selections, deduplicate equivalent in-flight syncs, and never reintroduce a special date-rollover overlap request.
- [ ] Cover the `KnownEmptyResponse`/`NotYetLoaded` distinction, per-slot `dataUpdatedAt` and invalidation behavior, Dashboard reuse, Sunday/DST/year boundaries, future Upcoming state, history-scroll silence, historic `D-6..D` action, neighboring fresh skip, and offline/error cache-first behavior.
