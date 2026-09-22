import { updateDayLogWeight as requestUpdateDayLogWeight } from "../../api/day-logs/update-day-log-weight.js";
import { syncDayLogs } from "../../api/day-logs/sync-day-logs.js";
import type { ApiTransport } from "../../transport.js";
import type { DayLogWriteAcknowledgement } from "../../verticals/day-logs/models/day-log.js";
import { toDayLogSyncSlot } from "./day-log-mappers.js";
import { applyWeightAcknowledgement } from "./day-log-write-cache.js";
import { applyDayLogSyncResult, getDayLogSyncManifest, type DayLogQueryCache } from "./day-log-sync.js";

export async function updateDayLogWeightAndReconcile(transport: ApiTransport, cache: DayLogQueryCache, accountId: string, date: string, weight: number): Promise<DayLogWriteAcknowledgement> {
  const response = await requestUpdateDayLogWeight(transport, date, { weight });
  const acknowledgement = { versionNumber: response.versionNumber, createdDayLogId: response.createdDayLogId };
  if ((await applyWeightAcknowledgement(cache, accountId, date, weight, acknowledgement)).needsSingleDateSync) {
    const range = { startDate: date, endDate: date };
    try {
      const sync = await syncDayLogs(transport, { ...range, known: getDayLogSyncManifest(cache, accountId, range) });
      applyDayLogSyncResult(cache, accountId, range, sync?.slots.map(toDayLogSyncSlot) ?? null, Date.now());
    } catch { /* preserve the local acknowledgement for normal validation */ }
  }
  return acknowledgement;
}
