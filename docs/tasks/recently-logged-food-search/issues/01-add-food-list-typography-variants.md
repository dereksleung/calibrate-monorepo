# 01: Add food-list typography variants on Logs meal rows

**What to build:** Logs meal-card Food Entries use two new Typography variants, `foodListItemTitle` and `foodListItemSubtitle`, so later search rows can share size, weight, and family without extracting a shared list-item component. Color stays on the call site. Logs should look the same as today aside from using those variants.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] `foodListItemTitle` is `text-base font-semibold` and `foodListItemSubtitle` is `text-xs`. Variants do not set color, tracking, or margin.
- [ ] Meal-card Food Entry title and nutrient/portion subtitle consume those variants. Search is unchanged in this ticket.
- [ ] Storybook lists the two new variants.
- [ ] Prove this at the Logs meal-card seam (existing Meal section tests). No Playwright suite for this ticket.
