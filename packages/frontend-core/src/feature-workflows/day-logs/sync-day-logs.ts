import type { QueryClient } from "@tanstack/react-query";

import { skipToken, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type {
  DayLogSyncResult,
  DatedDayLogCacheResult,
  DayLogSlotResult,
} from "../../shared/models/day-logs/day-log.js";
import type { ApiTransport } from "../../transport.js";

import { syncDayLogs, mapDayLogSyncResponse } from "../../api/day-logs/sync-day-logs.js";
import {
  dateRange,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  dayLogSlotQueryKey,
  dayLogSyncQueryKey,
  doesDayLogRangeNeedValidation,
  getDayLogsWithStalenessState,
  getDayLogSyncManifest,
  dayLogSlotVersionQueryKey,
  type DayLogCacheReader,
} from "../../verticals/day-log-cache/day-log-slots.js";

type DayLogCacheWriter = DayLogCacheReader &
  Pick<QueryClient, "setQueryData"> & {
    removeQueries: (filters: { queryKey: readonly unknown[] }) => void;
  };

type DayLogDateRange = {
  endDate: string;
  startDate: string;
};

export function useSyncDayLogsForDateRange(
  transport: ApiTransport,
  {
    accountId,
    dateRange: requestedRange,
    enabled,
  }: {
    accountId: string;
    dateRange: DayLogDateRange;
    enabled: boolean;
  },
) {
  const queryClient = useQueryClient();
  // Continue observing the requested slots even when network synchronization is
  // disabled. Callers can therefore render cache data while deciding whether the
  // selected date warrants a future range validation.
  const dates = dateRange(requestedRange.startDate, requestedRange.endDate);
  const cached = useQueries({
    queries: dates.map((date) => ({
      queryKey: dayLogSlotQueryKey(accountId, date),
      // skipToken subscribes without fetching: first to what a persister
      // restores under each date slot's queryKey, then to what queryClient.setQueryData in
      // applyDayLogSyncResult stores under each date slot's queryKey when
      // the sync endpoint runs. The returned value ultimately helps cut API
      // traffic by letting a date-range query with any start and end first
      // check staleness for every date in that range, no matter how that
      // date's data first got populated.
      queryFn: skipToken,
      gcTime: Infinity,
      staleTime: Infinity,
      select: (data: DayLogSlotResult): DatedDayLogCacheResult => ({ date, data }),
    })),
  });
  // Errored slot observers still expose cached data. Treat them as unverified:
  // sync the range, and omit those dates from `known` so the server returns a copy.
  const needsValidation = doesDayLogRangeNeedValidation(
    requestedRange,
    getDayLogsWithStalenessState(queryClient, accountId, requestedRange),
    Date.now(),
  );
  const syncResponse = useQuery({
    enabled,
    queryFn: async () => {
      if (
        !doesDayLogRangeNeedValidation(
          requestedRange,
          getDayLogsWithStalenessState(queryClient, accountId, requestedRange),
          Date.now(),
        )
      ) {
        return null;
      }

      return synchronizeDayLogsForRange(transport, queryClient, accountId, requestedRange);
    },
    queryKey: dayLogSyncQueryKey(accountId, requestedRange),
    staleTime: DAY_LOG_VALIDATION_FRESHNESS_MS,
  });

  useEffect(() => {
    if (!enabled || !needsValidation || syncResponse.isError || syncResponse.isFetching) return;
    void syncResponse.refetch();
  }, [enabled, needsValidation, syncResponse.isError, syncResponse.isFetching, syncResponse.refetch]);

  return { cached, syncResponse };
}

/** Apply only mapped frontend data to account-scoped slots. */
export function applyDayLogSyncResult(
  queryClient: DayLogCacheWriter,
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
    if (returned?.dayLog === null) {
      queryClient.removeQueries({ queryKey: dayLogSlotVersionQueryKey(accountId, date) });
    } else if (returned) {
      queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, date), returned.versionNumber, {
        updatedAt: dataUpdatedAt,
      });
    }
  }
}

export async function synchronizeDayLogsForRange(
  transport: ApiTransport,
  queryClient: DayLogCacheWriter,
  accountId: string,
  range: DayLogDateRange,
  now = Date.now(),
): Promise<DayLogSyncResult> {
  const response = await syncDayLogs(transport, {
    ...range,
    known: getDayLogSyncManifest(queryClient, accountId, range),
  });
  const result = mapDayLogSyncResponse(response);
  applyDayLogSyncResult(queryClient, accountId, range, result, now);
  return result;
}
