# 01: Record or replace a Weight observation from the daily summary

**What to build:** On Logs, the daily-summary pencil is the editor for that date’s Weight observation. Click it, type, leave the field, and a valid number saves. If the date already has a Day Log, the observation is replaced. If the date is Known-empty, the server creates an Empty Day Log with that observation (a Weigh-In day, not a Food Logging day). While the write is in flight the summary shows “Saving..”; on success the one-decimal pounds value appears; on failure or invalid/empty blur it returns to the last saved observation (or stays empty). The client patches the date-slot cache from the compact write result and does not GET the Day Log.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

Status for Matt Pocock skills: ready-for-agent

- [ ] `PUT` of a valid weight on an existing Day Log replaces that date’s one Weight observation, keeps Food Entries, advances `versionNumber`, and returns only `{ versionNumber }`.
- [ ] `PUT` of a valid weight on a Known-empty day creates an Empty Day Log at version 1 with that observation and empty meals, and returns `{ versionNumber, createdDayLogId }`.
- [ ] Domain `Weight` plus `DayLog.recordWeight` reject non-positive values and values above 999.9 after rounding to one decimal (`182.45` → `182.5`); the HTTP weight max is tightened from 9999.9 to 999.9.
- [ ] Unauthenticated writes are rejected. The unsubscribed Day Log cap applies only to create; updating weight on an existing Day Log still succeeds at the cap. A cap failure is a failed write, not a paywall screen.
- [ ] The client does not send `versionNumber` as a write precondition. A predecessor cache slot (or Known-empty becoming version 1) stamps the submitted weight and version without sync or a Day Log GET; a mismatched or unloaded slot stays locally acknowledged and unverified for ordinary sync.
- [ ] The pencil is a real control: **Log weight** when there is no observation (no placeholder number), **Edit weight** when there is one. Valid blur shows “Saving..” from local pending state (cache unchanged until success). Invalid, empty, or unchanged blur does not write. Failed write drops “Saving..” and restores the last saved observation (or empty). Further edits are ignored until the in-flight write settles.
- [ ] Weigh-In stays incomplete until a successful cache patch (or later successful sync). An Empty Day Log with a Weight observation is not a Food Logging day.
- [ ] Prove this at the two spec seams: the Day Log HTTP write plus persistence integration, and the Logs daily-summary editor plus date-slot cache helper. No Playwright suite for this ticket.
