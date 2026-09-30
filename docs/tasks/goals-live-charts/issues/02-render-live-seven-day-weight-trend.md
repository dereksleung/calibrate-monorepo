# 02: Render the live seven-day weight trend on Goals

**What to build:** Complete the Goals seven-day view by replacing the weight fixture with the user’s weight recordings on Day Logs from the already-live range response. The chart should show the current weekday labels, weight trend, and first-to-last change while keeping missing weights visually connected without inventing values.

**Blocked by:** 01: Render the live seven-day fat chart on Goals.

**Status:** ready-for-agent

**Status for Matt Pocock skills:** ready-for-agent

- [ ] Weight values come from actual Day Log weights across all seven requested slots.
- [ ] Missing weight recordings remain missing data, are not converted to zero or inferred points, and are visually bridged by the chart.
- [ ] The weight-change label uses the earliest and latest available weights in the range.
- [ ] Fewer than two available weights produce a neutral change placeholder rather than a fabricated delta.
- [ ] The x-axis uses seven dynamically derived weekday abbreviations in chronological order.
- [ ] The tooltip describes the value as weight in pounds and no longer says “pounds lost.”
- [ ] The old weight fixture is removed and the existing Goals layout, chart interaction, and 28-day drawer behavior remain intact.
- [ ] Focused tests cover missing weights, change calculation, dynamic labels, and the completed live seven-day Goals view.
