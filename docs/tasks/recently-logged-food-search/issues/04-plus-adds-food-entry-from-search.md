# 04: Plus adds a Food Entry from search

**What to build:** On food search, tapping the row (title/subtitle) still opens confirm. The plus control saves a Food Entry onto the selected date and stays on search. With a preselected Meal it adds immediately. With no Meal it opens a Base UI Select of Breakfast / Lunch / Dinner / Snacks that expands upward; choosing a Meal adds. Recents post the last plate; catalog posts the Reference serving. Success and failure are toasted; a second plus logs a second copy.

**Blocked by:** 02: Typed Recent foods use the last logged plate; 03: Idle Recently logged list from the Day Log cache.

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] Row tap (title/subtitle) still navigates to confirm. Plus / Select does not fire the row tap.
- [ ] With a preselected Meal, plus creates the Food Entry immediately on `selectedDate` using existing create + Day Log cache patch, and does not navigate away.
- [ ] With no preselected Meal, plus is a Select trigger (plus pill chrome, not the confirm unit-field chrome). Positioner `side="top"`. Items are Breakfast, Lunch, Dinner, Snacks. Choosing a Meal closes the menu and saves. Overlay or escape cancels without saving. The plus does not show a selected Meal label.
- [ ] Recent food plus posts stored plate nutrition with `chosenQuantity` / `chosenUnit`. Catalog plus posts the Reference serving using existing confirm scale math.
- [ ] Success toast is `Added to {Meal display name}`. Failure toast matches confirm: `We couldn't save that food.` Only the in-flight plus is disabled; other rows stay usable. A second plus logs a second copy.
- [ ] Prove this at the search-page plus vs row seam (fast tests) using the same save path confirm already uses. No Playwright suite for this ticket.
