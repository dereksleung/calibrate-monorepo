# 02: Replace the Logs day stepper with a title and one Calendar week of rings

**What to build:** On Logs, the previous/next day stepper is gone. The user sees **Today** when the selected date is today, otherwise a short month-and-day title (e.g. **Sep 3**), then the Sunday–Saturday Calendar week that contains the selected date. Each day shows a clockwise calorie ring against the Nutrition target. Tapping a selectable day writes `/logs?date=` and the meals below follow. Upcoming days in that week are gray and not clickable. The week that contains today uses weekday letters; other weeks use day-of-month numbers. Today with no calories eaten yet is the dotted ring. Leftover days in that week (and the previous Calendar week) already have ring data via cache-first sync, even before those days are selected.

**Blocked by:** 01: Move the Day Log range-sync hook into the cache vertical.

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] `DateStepper` is gone. Logs stacks a title and one Calendar week in a layout-only `section` (no extra header component).
- [ ] Title is **Today** when the selected date is today, otherwise month + day (no weekday in the title).
- [ ] The strip is the Calendar week containing the selected date (Sunday–Saturday). Future Calendar weeks are not shown.
- [ ] Each day cell is driven by `{ date, fillRatio, selected }` plus `todayDate` on the scroller. Label, Upcoming, today-mark, and dotted (`today && fillRatio === 0`) are derived. `fillRatio` is eaten / Nutrition target, clamped to 1, drawn clockwise. A 0-calorie Food Logging day looks dotted.
- [ ] Selectable days are links to `/logs?date=`. Upcoming days are not links, are grayed, and do not change the URL.
- [ ] Hybrid labels: weekday letters when this Calendar week contains today; day-of-month numbers otherwise. Today-mark only when that cell is today and selected.
- [ ] Selecting date `D` still cache-first syncs `D−6` through `D`. The scroller also cache-first syncs dates in visible week `W` that are on or before today, plus the previous Calendar week `W−1`. Upcoming dates stay out of both ranges. Both calls use the hook from ticket 01. This is [ADR-0006](../../../adr/0006-logs-calendar-week-scroller-prefetch.md).
- [ ] One week on screen. No horizontal drag, chevrons, peek, or virtualization in this ticket.
- [ ] Prove title, week membership, Upcoming disablement, ring fill, dotted today, hybrid labels, URL selection, and prefetch ranges at the Logs page seam (fast and/or integration tests). No Playwright suite for this ticket.
