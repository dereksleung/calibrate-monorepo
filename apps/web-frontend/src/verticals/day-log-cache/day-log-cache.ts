import type { DayLogSlotResult } from "@calibrate/frontend-core/shared/models/day-logs/day-log";
import type { QueryClient } from "@tanstack/react-query";

import { type DayLogResponse, type UpdateDayLogWeightResponse } from "@calibrate/api-contracts";
import {
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
  type CachedDayLog,
} from "@calibrate/frontend-core/verticals/day-log-cache/day-log-slots";

export {
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  dateRange,
  dayLogSlotQueryKeyPrefix,
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
  dayLogSlotVersionQueryKeyPrefix,
  dayLogSyncQueryKey,
  getDayLogSyncManifest,
  getDayLogsWithStalenessState,
  doesDayLogRangeNeedValidation,
  doesDayLogSlotNeedValidation,
  type DayLogSlotSnapshot,
} from "@calibrate/frontend-core/verticals/day-log-cache/day-log-slots";
export {
  DAY_LOG_CACHE_BUSTER,
  DAY_LOG_CACHE_RETENTION_MS,
  isPersistedDayLogClient,
  isPersistableDayLogQueryData,
  isPersistableDayLogQuery,
  prunePersistedDayLogClient,
  type PersistedDayLogClient,
} from "@calibrate/frontend-core/verticals/day-log-cache/persistence-policy";
export { applyDayLogSyncResult } from "@calibrate/frontend-core/feature-workflows/day-logs/sync-day-logs";
export type {
  DayLogSnapshot,
  DayLogSlotResult,
  NotYetLoaded,
} from "@calibrate/frontend-core/shared/models/day-logs/day-log";
export type KnownEmptyResponse = null;
export type { CachedDayLog } from "@calibrate/frontend-core/verticals/day-log-cache/day-log-slots";

type PresentDayLog = Exclude<DayLogResponse, null>;

function emptyPresentDayLog(date: string, dayLogId?: string): PresentDayLog {
  return {
    id: dayLogId ?? crypto.randomUUID(),
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    weight: null,
  };
}

function isPredecessor(
  cached: DayLogSlotResult,
  cachedVersion: number | undefined,
  versionNumber: number,
): boolean {
  if (cached === null) return versionNumber === 1;
  if (cached === undefined) return false;
  return cachedVersion !== undefined && cachedVersion + 1 === versionNumber;
}

function normalizeWeightForStorage(value: number): number {
  return Number(
    value.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 1,
    }),
  );
}

/**
 * Applies a successful weight write without downloading the Day Log. A direct
 * predecessor can be trusted immediately; an unloaded or mismatched slot is
 * shown as a local acknowledgement and remains eligible for ordinary sync.
 */
export async function applyWeightObservationToDayLogCache(
  queryClient: QueryClient,
  accountId: string,
  date: string,
  weight: number,
  result: UpdateDayLogWeightResponse,
  now = Date.now(),
): Promise<{ needsSingleDateSync: boolean }> {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = queryClient.getQueryData<CachedDayLog>(slotKey);
  const cachedVersion = queryClient.getQueryData<number>(versionKey);
  const next = {
    ...(cached ?? emptyPresentDayLog(date, result.createdDayLogId)),
    weight: normalizeWeightForStorage(weight),
  };

  queryClient.setQueryData(slotKey, next, { updatedAt: now });

  if (isPredecessor(cached, cachedVersion, result.versionNumber)) {
    queryClient.setQueryData(versionKey, result.versionNumber, { updatedAt: now });
    return { needsSingleDateSync: false };
  }

  await queryClient.invalidateQueries({ queryKey: slotKey });
  return { needsSingleDateSync: true };
}
