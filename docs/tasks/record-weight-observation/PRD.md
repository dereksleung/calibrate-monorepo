# Record a Weight Observation

Status for Matt Pocock skills: ready-for-agent

## Problem Statement

On the Logs page I can see a Weight slot on the daily summary, and I can open a Quick log action called Log weight, but neither one actually records anything. I want to type my weight for the day I am looking at, leave the field, and have that number saved as that day’s weigh-in — including on a day where I have not logged any food yet.

## Solution

I record or replace the day’s Weight observation from one field in the daily summary. Clicking the pencil, or choosing Log weight in Quick log, puts a caret in that field. When I leave the field, a valid number is saved. While it saves I see “Saving..”. If it cannot save, the summary goes back to whatever was last saved (or stays empty). I never have to download the whole day’s meals just to keep the Logs page in sync.

## User Stories

1. As a signed-in user, I want to record a Weight observation for the calendar date I am viewing on Logs, so that the day counts as a Weigh-In day.
2. As a signed-in user, I want to replace that day’s Weight observation with a new number, so that a mistyped or later weigh-in overwrites the previous one instead of stacking history.
3. As a signed-in user on a Known-empty day, I want recording a weight to create an Empty Day Log, so that I can complete Weigh-In without logging food.
4. As a signed-in user with an Empty Day Log, I want recording a weight to leave meals empty, so that Weigh-In stays independent of Food Logging.
5. As a signed-in user with food already on the Day Log, I want recording a weight to keep those Food Entries, so that nutrition for the day is not disturbed.
6. As a signed-in user, I want one Weight observation per Day Log, so that charts and habits read a single number for that date.
7. As a signed-in user, I do not want to clear a Weight observation, so that Weigh-In stays a habit I complete rather than undo.
8. As a signed-in user, I want the pencil in the daily summary to be the editor, so that I am not sent into a second weight form.
9. As a signed-in user with no observation yet, I want the Weight column to show no number, so that an empty slot is not mistaken for a recorded weigh-in.
10. As a signed-in user with no observation yet, I want the pencil to be named Log weight, so that I know I am recording the first observation.
11. As a signed-in user who already has an observation, I want the pencil to be named Edit weight, so that I know I am replacing it.
12. As a signed-in user, I want choosing Log weight in Quick log to dismiss the drawer, scroll that same field into view, focus it, and show a blinking caret, so that I can type immediately.
13. As a signed-in user, I want the field to submit when it loses focus, so that I do not hunt for a save button.
14. As a signed-in user, I want leaving an empty field to restore the last saved observation (or stay empty), so that a stray tap does not send a write.
15. As a signed-in user, I want leaving invalid text (`abc`, `0`, a negative, or a number above 999.9 after rounding) to restore the last saved observation without submitting, so that bad keystrokes never become a weigh-in.
16. As a signed-in user, I want `182.45` to save as `182.5`, so that extra decimals match the one-decimal summary instead of being rejected.
17. As a signed-in user, I want the summary to show “Saving..” after a valid blur until the server answers, so that I do not see the old number flash and I do not see a committed new number before it is saved.
18. As a signed-in user, I want a failed save (network, client error, or cap) to drop “Saving..” and restore the last saved observation (or empty), so that Weigh-In does not look complete when nothing was stored.
19. As a signed-in user, I want a successful save to show the saved number to one decimal, so that what I see matches what was persisted.
20. As a signed-in user, I want pounds to remain the unit with no unit picker, so that every observation is comparable.
21. As a signed-in user, I want assistive text to say the number is pounds, so that the unit is available even when the resting UI does not emphasize it.
22. As a signed-in user at the free Day Log cap, I want a weight-only create on a new date to be rejected, so that weigh-ins cannot bypass the same subscription rule as food.
23. As a signed-in user at the free Day Log cap, I want updating weight on a Day Log that already exists to still succeed, so that the cap is about creating Day Logs, not about editing a weigh-in.
24. As a subscribed user, I want creating an Empty Day Log from a weigh-in to succeed without that cap, so that paid access matches food logging.
25. As a signed-in user, I want a successful create to return the new Day Log id and version only, so that the client can patch the date slot without downloading meals.
26. As a signed-in user, I want a successful update to return only the new version, so that the payload stays small when the Day Log already existed.
27. As a signed-in user whose cached slot is the direct predecessor of the returned version (or Known-empty becoming version 1), I want the cache to stamp the observation and version without a follow-up Day Log GET or extra sync, so that saving weight stays cheap.
28. As a signed-in user whose cached slot is unloaded or version-mismatched, I want the typed observation to stay visible as a local acknowledgement while the slot is marked unverified for ordinary sync, so that meal-time traffic does not immediately re-download the day.
29. As a signed-in user, I want Weigh-In on the Dashboard to complete only after a successful cache patch (or later successful sync), so that a failed or in-flight save does not mark the habit done.
30. As a signed-in user, I want Food Logging completion to ignore weight, so that an Empty Day Log with a Weight observation is not treated as a food day.
31. As a signed-in user viewing another person’s data, I want the write to be rejected, so that Weight observations stay user-scoped like the rest of the Day Log.
32. As a signed-in user, I want unauthenticated calls to be rejected, so that wellness data is not writable anonymously.
33. As a signed-in user, I want `1000.0` and larger to be rejected, so that a number the database cannot store never looks saved.
34. As a signed-in user, I want leaving the field with the same rounded value already saved to avoid a pointless write, so that blur does not bump the Day Log version for no change.
35. As a signed-in user, I want not to start a second edit while “Saving..” is showing, so that two blurs cannot race on the same date.
36. As a signed-in user on a historical Logs date I am allowed to open, I want to record weight for that date, so that catch-up weigh-ins work the same as today.
37. As a signed-in user, I want Upcoming dates to stay non-writable, so that weight follows the same Logs date rules as food.
38. As a signed-in user who then logs food on that Empty Day Log, I want the Weight observation to remain, so that food create does not wipe the weigh-in.
39. As a signed-in user with two devices, I want the server to accept a weight write without a client version precondition, so that a slightly stale cache can still record a weigh-in and reconcile later.
40. As a developer implementing this, I want the write to go through the Day Log aggregate and its repository, so that weight cannot be persisted behind the aggregate’s rules.

## Implementation Decisions

- This is a replace-in-place Weight observation on the existing Day Log aggregate, not a new aggregate and not a per-day history of weigh-ins.
- Introduce a small domain `Weight` value object (pounds by convention, not a stored unit). It accepts a finite number strictly greater than 0 and at most 999.9 after rounding to one decimal. `DayLog.recordWeight` uses it. Reconstitute from persistence still trusts stored values the same way other Day Log fields do today.
- Presentation Zod contracts stay independent of the domain type. Map at the HTTP boundary. Tighten every Day Log weight wire max from 9999.9 to 999.9 so it matches `numeric(5, 1)`.
- Round half toward the conventional one-decimal display before validating (`182.45` → `182.5`). Persist the rounded number.
- `PUT /daylogs/:date/weight` with the existing update-weight request params (`date`) and body (`{ weight }`). Keep those contract names. This upsert creates an Empty Day Log when the date is Known-empty and replaces the observation when a Day Log already exists.
- Success body mirrors create-food-entry compactness: always `versionNumber`; `createdDayLogId` only when this write created the Day Log. Do not echo weight, meals, previous version, or the full Day Log. Do not treat client `versionNumber` as a write precondition.
- Each response-visible write advances the Day Log version atomically in the aggregate-root repository transaction. A newly created Empty Day Log starts at version 1 with the observation already set. Do not create with `weight: null` and then update in a second write.
- Targeted repository writes, not a full aggregate save: one create-with-weight path and one update-weight path, same trade-off as adding a Food Entry.
- The unsubscribed Day Log cap uses the same service rule as food create, and only on create. Updates on an existing Day Log skip the cap. There is no new paywall screen; a cap failure is a failed write and the summary reverts.
- Add the shared API client operation planned for weight updates. Apps inject transport the same way they do for food-entry create.
- Client cache patching copies the Food Entry helper: stamp the submitted weight onto the date slot (building a present Empty Day Log from `createdDayLogId` when the slot was Known-empty); if the cached version is the direct predecessor of the returned version (or Known-empty → 1), raise `versionNumber` and skip sync; otherwise keep the local view, mark unverified, and let ordinary single-date sync catch up. Never `GET` the Day Log as part of this mutation.
- Daily summary owns editor UI state. Parent owns the mutation. Resting: no number when null; one-decimal number when saved. Pencil is a real control (`Log weight` / `Edit weight`). Valid blur → “Saving..” from local pending state (cache unchanged) → cache patch on success. Failure or invalid/empty blur → last saved or empty.
- Quick log Log weight does not collect a number. It dismisses the drawer and focuses the daily-summary field (scroll into view, visible caret).
- Skip the network when the rounded value equals the already saved observation. Ignore further edits until an in-flight write settles.
- No schema migration: `day_logs.weight` already exists and stays nullable.
- No new glossary terms and no new ADR; this follows Day Log / Weight observation / Empty Day Log language, ADR-0001 aggregate writes, and ADR-0004 compact mutation + version rules.

## Testing Decisions

Good tests assert behavior at a seam: HTTP status and body, persisted Day Log state, cache slot contents, and what the user can see or focus. They do not lock onto private component state, CSS class strings, or repository SQL.

Two existing seams. Do not add a third product seam.

1. **Server Day Log weight write.** Highest point that already exists for this aggregate: the Day Log HTTP write, plus the persistence integration that today’s HTTP tests mock away. Cover `PUT` create-from-Known-empty, update-in-place, compact success body, validation (0, negative, over 999.9, bad date), auth, create-only subscription cap, version 1 on create, version bump on update, and no client version precondition. Prior art: Food Entry create on the Day Log controller/routes, Day Log application service create-vs-existing tests, Postgres Day Log repository integration for atomic versioned writes, and the existing update-weight request contract tests (extend them for the 999.9 max and the compact response).

2. **Logs weight editor through the Day Log cache.** Highest client point already used for live Logs: the Logs page (pencil, Quick log Log weight focusing the same field, blur, “Saving..”, revert on failure) together with the date-slot cache helper that Food Entry create already uses. Cover Known-empty → present Empty Day Log via `createdDayLogId`, predecessor patch without sync, mismatch/unverified without an immediate full-log GET, and Weigh-In remaining incomplete until success. Prior art: Logs live Day Log integration tests, `applyFoodEntryCreateToDayLogCache` tests, the save-food-entry hook’s post-success cache/sync behavior, and Daily summary / Logs tests for the Log weight control.

Domain `Weight` / `recordWeight` fast tests are supporting evidence for seam 1, not a separate product seam. Browser Playwright coverage is not required for this delivery; Logs integration is the user-facing client seam.

## Out of Scope

- Clearing or deleting a Weight observation, or deleting an Empty Day Log after a weigh-in
- Kilograms, user-selected units, or a stored unit field
- Multiple observations per date, or a weight history aggregate
- A second weight form inside Quick log
- Optimistic cache writes that complete Weigh-In before the server succeeds
- Returning the full Day Log from the write, or a follow-up GET of that date in the mutation path
- Using client `versionNumber` as a write precondition
- A dedicated paywall or upsell screen when the Day Log cap rejects a create
- Changing Upcoming / historical Logs navigation rules
- Dashboard or Goals chart redesign (they already read Weight observations)
- Removing or restyling the Quick log Log weight row beyond wiring it to the summary field

## Further Notes

- “Saving..” is the in-flight copy (two dots), not a Weight observation and not the pending number.
- Empty Day Log with a Weight observation is a Weigh-In day and is still not a Food Logging day.
- The request schemas for this write already exist; the missing work is the route, domain/application/repository write, compact response, API client operation, cache helper, and the daily-summary editor.
