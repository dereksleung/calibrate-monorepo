import { skipToken, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { ApiTransport } from "../../transport.js";
import type { DayLogSnapshot } from "../../verticals/day-logs/models/day-log.js";
import type { DayLogSyncResult } from "../../verticals/day-logs/models/sync.js";

import { syncDayLogs as requestDayLogSync } from "../../api/day-logs/sync-day-logs.js";
import { toDayLogSyncResult } from "./day-log-mappers.js";

export const DAY_LOG_VALIDATION_FRESHNESS_MS = 60 * 60 * 1_000;

export type DayLogDateRange = { startDate: string; endDate: string };
export type DayLogSlotResult = DayLogSnapshot["data"];
export type DayLogSlotSnapshot = DayLogSnapshot & {
  dataUpdatedAt: number;
  isError: boolean;
  isInvalidated: boolean;
};
type DayLogQueryClient = {
  getQueryData<T>(queryKey: readonly unknown[]): T | undefined;
  getQueryState<T>(
    queryKey: readonly unknown[],
  ): { data?: T; dataUpdatedAt?: number; isInvalidated?: boolean; status?: string } | undefined;
  removeQueries(filters: { queryKey: readonly unknown[] }): unknown;
  setQueryData<T>(queryKey: readonly unknown[], data: T, options?: { updatedAt?: number }): unknown;
};

export const dayLogSlotQueryKeyPrefix = (accountId: string) => ["dayLogs", accountId, "slot"] as const;
export const dayLogSlotQueryKey = (accountId: string, date: string) =>
  [...dayLogSlotQueryKeyPrefix(accountId), date] as const;
export const dayLogSlotVersionQueryKey = (accountId: string, date: string) =>
  ["dayLogs", accountId, "slotVersion", date] as const;
export const dayLogSlotVersionQueryKeyPrefix = (accountId: string) =>
  ["dayLogs", accountId, "slotVersion"] as const;
export const dayLogSyncQueryKey = (accountId: string, range: DayLogDateRange) =>
  ["dayLogs", accountId, "sync", range.startDate, range.endDate] as const;

export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);

  while (cursor.toISOString().slice(0, 10) <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function getDayLogSyncManifest(
  queryClient: DayLogQueryClient,
  accountId: string,
  range: DayLogDateRange,
): Record<string, number | null> {
  const known: Record<string, number | null> = {};
  for (const date of dateRange(range.startDate, range.endDate)) {
    const state = queryClient.getQueryState<DayLogSlotResult>(dayLogSlotQueryKey(accountId, date));
    if (state?.status === "error" || state?.data === undefined) continue;
    if (state.data === null) known[date] = null;
    else {
      const version = queryClient.getQueryData<number>(dayLogSlotVersionQueryKey(accountId, date));
      if (version !== undefined) known[date] = version;
    }
  }
  return known;
}

export function getDayLogsWithStalenessState(
  queryClient: DayLogQueryClient,
  accountId: string,
  range: DayLogDateRange,
): DayLogSlotSnapshot[] {
  return dateRange(range.startDate, range.endDate).map((date) => {
    const state = queryClient.getQueryState<DayLogSlotResult>(dayLogSlotQueryKey(accountId, date));
    return {
      date,
      data: state?.data,
      dataUpdatedAt: state?.dataUpdatedAt ?? 0,
      isError: state?.status === "error",
      isInvalidated: state?.isInvalidated ?? false,
    };
  });
}

export function doesDayLogSlotNeedValidation(slot: DayLogSlotSnapshot, now: number): boolean {
  return (
    slot.data === undefined ||
    slot.isError ||
    slot.isInvalidated ||
    now - slot.dataUpdatedAt >= DAY_LOG_VALIDATION_FRESHNESS_MS
  );
}

export function doesDayLogRangeNeedValidation(
  range: DayLogDateRange,
  slots: readonly DayLogSlotSnapshot[],
  now: number,
): boolean {
  const slotsByDate = new Map(slots.map((slot) => [slot.date, slot]));
  return dateRange(range.startDate, range.endDate).some((date) => {
    const slot = slotsByDate.get(date);
    return slot === undefined || doesDayLogSlotNeedValidation(slot, now);
  });
}

export function applyDayLogSyncResult(
  queryClient: DayLogQueryClient,
  accountId: string,
  range: DayLogDateRange,
  response: DayLogSyncResult,
  dataUpdatedAt: number,
): void {
  const returnedByDate = new Map(response?.slots.map((slot) => [slot.date, slot]));
  for (const date of dateRange(range.startDate, range.endDate)) {
    const returned = returnedByDate.get(date);
    const current = queryClient.getQueryData<DayLogSlotResult>(dayLogSlotQueryKey(accountId, date));
    const next = returned ? returned.dayLog : current;
    if (next === undefined) continue;
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), next, { updatedAt: dataUpdatedAt });
    if (returned?.dayLog === null)
      queryClient.removeQueries({ queryKey: dayLogSlotVersionQueryKey(accountId, date) });
    else if (returned)
      queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, date), returned.versionNumber, {
        updatedAt: dataUpdatedAt,
      });
  }
}

export async function syncDayLogs(
  transport: ApiTransport,
  input: DayLogDateRange & { known: Record<string, number | null> },
): Promise<DayLogSyncResult> {
  return toDayLogSyncResult(await requestDayLogSync(transport, input));
}

export function useSyncDayLogsForDateRange({
  accountId,
  dateRange: requestedRange,
  enabled,
  transport,
}: {
  accountId: string;
  dateRange: DayLogDateRange;
  enabled: boolean;
  transport: ApiTransport;
}) {
  const queryClient = useQueryClient();
  const dates = dateRange(requestedRange.startDate, requestedRange.endDate);
  const cached = useQueries({
    queries: dates.map((date) => ({
      queryKey: dayLogSlotQueryKey(accountId, date),
      queryFn: skipToken,
      gcTime: Infinity,
      staleTime: Infinity,
      select: (data: DayLogSlotResult): DayLogSnapshot => ({ date, data }),
    })),
  });
  const needsValidation = doesDayLogRangeNeedValidation(
    requestedRange,
    getDayLogsWithStalenessState(queryClient, accountId, requestedRange),
    Date.now(),
  );
  const syncResponse = useQuery({
    enabled,
    queryKey: dayLogSyncQueryKey(accountId, requestedRange),
    staleTime: DAY_LOG_VALIDATION_FRESHNESS_MS,
    queryFn: async () => {
      if (
        !doesDayLogRangeNeedValidation(
          requestedRange,
          getDayLogsWithStalenessState(queryClient, accountId, requestedRange),
          Date.now(),
        )
      )
        return null;
      const response = await syncDayLogs(transport, {
        ...requestedRange,
        known: getDayLogSyncManifest(queryClient, accountId, requestedRange),
      });
      applyDayLogSyncResult(queryClient, accountId, requestedRange, response, Date.now());
      return response;
    },
  });
  useEffect(() => {
    if (!enabled || !needsValidation || syncResponse.isError || syncResponse.isFetching) return;
    void syncResponse.refetch();
  }, [enabled, needsValidation, syncResponse.isError, syncResponse.isFetching, syncResponse.refetch]);
  return { cached, syncResponse };
}
