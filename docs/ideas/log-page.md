# Daily Log Page

## Problem Statement

How might we help casual calorie trackers quickly log a day of eating while giving enough progress feedback to stay motivated and feel on track?

## Recommended Direction

Build a mobile-first daily log page with three layers: a compact daily progress summary, meal-based food logs, and a floating action button for fast logging.

The top summary should show calories eaten vs target, three simple macro progress bars for protein/carbs/fat, and the day's weight. For now, targets can be placeholders until goals are wired. The meal sections below should remain the primary record of the day: Breakfast, Lunch, Dinner, Snacks, each with totals, entries, and a meal-specific add action.

The FAB opens a mobile bottom sheet for logging actions. The first serious food workflow should be typed search through USDA FoodData Central, routed through the backend. Selecting a food opens a confirmation step before saving so the user can adjust quantity, serving unit, meal, and calories.

## MVP Scope

- Single-day log view.
- Date selector.
- Daily calories summary with placeholder target.
- Macro progress bars using placeholder targets.
- Daily weight shown in the summary.
- Four meal sections: Breakfast, Lunch, Dinner, Snacks.
- Per-meal add buttons that preselect the meal.
- Floating action button.
- Bottom sheet actions: Search food, Recent foods, Log weight.
- USDA FoodData Central search via backend proxy.
- Branded and generic food results, ranked by relevance.
- Quantity confirmation before saving a food entry.
- Global recent foods, not meal-specific.
- Mobile rows showing food name, quantity, calories.
- Larger views showing macro detail.

## Not Doing

- Barcode scanning in MVP, because search gives faster product value.
- Voice logging in MVP, because correction UX is likely expensive.
- Full exercise logging yet, because it needs domain/API decisions.
- Goal-driven targets yet, because placeholders are enough to design the page.
- Clinical micronutrient tracking, because this app is focused on weight and athletic health.

## Key Assumptions to Validate

- [ ] Calories plus macro bars are motivating rather than overwhelming.
- [ ] Users understand placeholder targets once goals are not wired yet.
- [ ] Search plus confirmation feels fast enough for casual daily use.
- [ ] Branded and generic results can be ranked well enough to avoid noisy search.
- [ ] Global recent foods are more flexible than meal-specific recents.
- [ ] Meal-specific add buttons and the global FAB complement each other.

## Open Implementation Questions

- What placeholder calorie/macro targets should we use in seed/demo data?
- Should USDA search results be grouped by "Common foods" and "Branded foods," or mixed into one ranked list?
- Should the confirmation UI allow calorie override, or only quantity/serving changes?
- Where should backend FDC configuration live, and what env var name should hold the API key?

## External Dependency Notes

USDA FoodData Central should be integrated through the backend rather than called directly from the frontend, because FoodData Central API requests require a data.gov API key and the key must not be exposed publicly.

