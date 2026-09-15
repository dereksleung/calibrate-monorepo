# 03: Snap-scroll older Calendar weeks

**What to build:** The Logs Calendar week strip becomes a snap-scrolling, virtualized list of weeks. The user can drag it on desktop and mobile to older Sunday–Saturday weeks. It snaps so the start of a week sits on the left edge. They cannot scroll forward into a week that is past today. Dragging does not change the selected date or the title; only tapping a day does. After a snap, the newly visible week plus the previous Calendar week are already cache-first synced so rings are filled as the overscan week slides in. Desktop shows flanking previous/next-week chevrons (next disabled on the current week). Mobile peeks a sliver of the neighboring week. There is no horizontal scrollbar.

**Blocked by:** 02: Replace the Logs day stepper with a title and one Calendar week of rings.

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] Virtualize by Calendar week with `@tanstack/react-virtual@3.14.10` (this exact version; already confirmed). Overscan is the next older week only; do not mount a long off-screen history. Past weeks are unbounded in the data model.
- [ ] Drag pages weeks on desktop and mobile. Snap aligns the Sunday of a week to the left edge. Overflow is hidden: no horizontal scrollbar.
- [ ] The user cannot snap into a future Calendar week. Upcoming days inside the current week stay visible, gray, and not clickable (ticket 02).
- [ ] Desktop: ghost chevrons flank the week row inside the content column. Previous week is enabled; next week is disabled when the snapped week is the current Calendar week. Chevron click snaps one week and does not write the URL.
- [ ] Mobile: no chevrons. The week is slightly narrower than the padded column so a sliver of the neighboring week’s rings peeks in when that direction exists.
- [ ] Scroll position is view state. Selected date and title stay on the URL until a day link is followed. Changing `selectedDate` snaps that date’s Calendar week into view.
- [ ] Prefetch follows the snapped week: cache-first sync dates in `W` that are on or before today, plus `W−1` ([ADR-0006](../../../adr/0006-logs-calendar-week-scroller-prefetch.md)). Selecting `D` still syncs `D−6` through `D`.
- [ ] Prove snap, future-week clamp, chevron disablement, URL-stable drag, virtualization window, and prefetch-on-snap at the Logs page seam. No Playwright suite for this ticket.
