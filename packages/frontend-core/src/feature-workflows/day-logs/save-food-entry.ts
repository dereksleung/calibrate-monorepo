import { saveFoodEntry as requestSaveFoodEntry } from "../../api/day-logs/save-food-entry.js";
import { syncDayLogs } from "../../api/day-logs/sync-day-logs.js";
import type { ApiTransport } from "../../transport.js";
import type { DayLogWriteAcknowledgement } from "../../verticals/day-logs/models/day-log.js";
import type { SaveFoodEntryCommand } from "../../verticals/day-logs/models/food-search.js";
import { toDayLogSyncSlot } from "./day-log-mappers.js";
import { applyFoodEntryAcknowledgement } from "./day-log-write-cache.js";
import { applyDayLogSyncResult, getDayLogSyncManifest, type DayLogQueryCache } from "./day-log-sync.js";

export async function saveFoodEntryAndReconcile(transport: ApiTransport, cache: DayLogQueryCache, accountId: string, date: string, command: SaveFoodEntryCommand): Promise<DayLogWriteAcknowledgement> {
  const response = await requestSaveFoodEntry(transport, date, command);
  const acknowledgement = { foodEntryId: response.foodEntryId, versionNumber: response.versionNumber, createdDayLogId: response.createdDayLogId };
  if ((await applyFoodEntryAcknowledgement(cache, accountId, date, command, acknowledgement)).needsSingleDateSync) {
    const range = { startDate: date, endDate: date };
    try {
      const sync = await syncDayLogs(transport, { ...range, known: getDayLogSyncManifest(cache, accountId, range) });
      applyDayLogSyncResult(cache, accountId, range, sync?.slots.map(toDayLogSyncSlot) ?? null, Date.now());
    } catch { /* preserve the local acknowledgement for normal validation */ }
  }
  return acknowledgement;
}
