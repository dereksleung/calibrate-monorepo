import type { QueryClient } from "@tanstack/react-query";

import type { DayLog, DatedDayLogCacheResult } from "../../shared/models/day-logs/day-log.js";

export type DayLogDateRange = { startDate: string; endDate: string };
export type CachedDayLog = DayLog | null;
export type DayLogCacheReader = Pick<QueryClient, "getQueryState" | "getQueryData">;
export type CachedDayLogState = DatedDayLogCacheResult & {
  dataUpdatedAt: number;
  isError: boolean;
  isInvalidated: boolean;
};

export const DAY_LOG_VALIDATION_FRESHNESS_MS = 60 * 60 * 1_000;

export const dayLogSlotQueryKeyPrefix = (accountId: string) => ["dayLogs", accountId, "slot"] as const;

export const dayLogSlotQueryKey = (accountId: string, date: string) =>
  [...dayLogSlotQueryKeyPrefix(accountId), date] as const;

/** Sync manifest metadata is stored separately from raw API-response slot payloads. */
export const dayLogSlotVersionQueryKey = (accountId: string, date: string) =>
  ["dayLogs", accountId, "slotVersion", date] as const;

export const dayLogSlotVersionQueryKeyPrefix = (accountId: string) =>
  ["dayLogs", accountId, "slotVersion"] as const;

export const dayLogSyncQueryKey = (accountId: string, range: { startDate: string; endDate: string }) =>
  ["dayLogs", accountId, "sync", range.startDate, range.endDate] as const;

export function getDayLogSyncManifest(
  queryClient: DayLogCacheReader,
  accountId: string,
  range: { startDate: string; endDate: string },
): Record<string, number | null> {
  const known: Record<string, number | null> = {};
  for (const date of dateRange(range.startDate, range.endDate)) {
    const queryState = queryClient.getQueryState<CachedDayLog>(dayLogSlotQueryKey(accountId, date));
    if (queryState?.status === "error") continue;
    const data = queryState?.data;
    if (data === undefined) continue;
    if (data === null) {
      known[date] = null;
      continue;
    }
    const version = queryClient.getQueryData<number>(dayLogSlotVersionQueryKey(accountId, date));
    if (version !== undefined) known[date] = version;
  }
  return known;
}

export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);

  while (cursor.toISOString().slice(0, 10) <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function getDayLogsWithStalenessState(
  queryClient: DayLogCacheReader,
  accountId: string,
  range: { startDate: string; endDate: string },
): CachedDayLogState[] {
  return dateRange(range.startDate, range.endDate).map((date) => {
    const queryState = queryClient.getQueryState<CachedDayLog>(dayLogSlotQueryKey(accountId, date));

    return {
      date,
      data: queryState?.data,
      dataUpdatedAt: queryState?.dataUpdatedAt ?? 0,
      isError: queryState?.status === "error",
      isInvalidated: queryState?.isInvalidated ?? false,
    };
  });
}

/**
 * Avoids redundant Day Log API requests when every date in a requested range
 * already has a fresh, trusted cache slot. The Dashboard initially fetches today and
 * the prior six days; when Logs opens a missing day, it fetches that day and
 * the preceding six likely next visits.
 */
export function doesDayLogRangeNeedValidation(
  range: { startDate: string; endDate: string },
  slots: readonly CachedDayLogState[],
  now: number,
): boolean {
  const slotsByDate = new Map(slots.map((slot) => [slot.date, slot]));

  return dateRange(range.startDate, range.endDate).some((date) => {
    const slot = slotsByDate.get(date);
    return slot === undefined || doesDayLogSlotNeedValidation(slot, now);
  });
}

export function doesDayLogSlotNeedValidation(slot: CachedDayLogState, now: number): boolean {
  return (
    slot.data === undefined ||
    slot.isError ||
    slot.isInvalidated ||
    now - slot.dataUpdatedAt >= DAY_LOG_VALIDATION_FRESHNESS_MS
  );
}
