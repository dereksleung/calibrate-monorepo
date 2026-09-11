# 05: Patch a Day Log cache safely from Food Entry writes

**What to build:** A successful Food Entry write immediately updates the exact cached Day Log by stamping the server Food Entry ID onto the one entry that create just added, then raising that slot's `versionNumber` when the write is a complete predecessor. The write is not version-preconditioned: the client does not send `versionNumber`, and the server always adds the Food Entry and advances the Day Log version it currently has. Success bodies stay tiny to limit server egress. A version mismatch syncs only that date. It avoids an immediate `sync` on a matching write and avoids globally invalidating all historical ranges during meal-time bursts.

**Blocked by:** 03: Add bounded Day Log synchronization; 04: Compose Dashboard and Logs from validated date slots.

**Status:** ready-for-agent

- [ ] Do not require or accept a client `versionNumber` on `addFoodEntry`. Even if the client's cache is behind, the request represents the client's wish to add that Food Entry. The server adds it through the aggregate-root write and advances the `versionNumber` it already has. The version is never a write precondition.
- [ ] Do not add a client-only Food Entry ID. Create writes add one Food Entry at a time; the client does not track a queue of unconfirmed entries. If the request fails, the user stays on that Food Entry's page.
- [ ] Have the aggregate-root write persist the Food Entry and advance `versionNumber` atomically. It does not calculate a mutation delta.
- [ ] On a successful create, return only `{ foodEntryId, versionNumber }`: the new server Food Entry ID and the Day Log's resulting `versionNumber`. Do not echo the Food Entry, `previousVersionNumber`, `dayLogId`, or any other change-set. This applies to the success body only; error responses and their status mapping stay unchanged.
- [ ] Patch the cached date slot by placing `foodEntryId` on the Food Entry from that create attempt. When the cached slot is a complete predecessor (cached version plus one equals the returned `versionNumber`, or Known-empty becoming version 1), raise the cached Day Log `versionNumber` to the returned value and do not trigger a follow-up sync.
- [ ] On an unloaded or version-mismatched slot, preserve the locally acknowledged result but mark the slot unverified (`isInvalidated: true`), then run the sync endpoint on just that date as the date range to reconcile server truth. Do not globally invalidate unrelated historical data.
- [ ] Cover current and historical writes, create-from-known-empty, success-body payload shape, unchanged error responses, matching patch that raises `versionNumber` without sync, version-mismatch/unloaded single-date sync, a stale client that can still add without sending a version, failed create remaining on the Food Entry page, and proof that a matching successful write does not immediately request synchronization.

## Comments

- 2026-09-10: AC updated so the aggregate-root write does not calculate a mutation delta. `addFoodEntry` also does not take a client `versionNumber`: a behind client still expresses a wish to add the entry, and the server appends it and advances the version it has.
- 2026-09-10: Success-body egress minimized. Error responses stay the same. Success body includes `{ foodEntryId, versionNumber }`. A matching predecessor uses `versionNumber` to raise the cached slot version without sync; a mismatch uses it to decide to sync only that date.
- 2026-09-10: Dropped `clientFoodEntryId`. Create adds one Food Entry at a time and the client does not track multiple unconfirmed entries; a failed request stays on that Food Entry's page, so a client-only correlation ID is unnecessary.
