import { apiTransport } from "#/shared/api/api-client.ts";
import {
  applyDayLogSyncResult,
  dateRange,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  dayLogSlotQueryKey,
  dayLogSyncQueryKey,
  doesDayLogRangeNeedValidation,
  getDayLogsWithStalenessState,
  getDayLogSyncManifest,
  type DayLogSlotResult,
  type DayLogSnapshot,
} from "#/verticals/day-log-cache/day-log-cache.ts";
import { syncDayLogs } from "@calibrate/api-client";
import { skipToken, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type DayLogDateRange = {
  endDate: string;
  startDate: string;
};

export function useSyncDayLogsForDateRange({
  accountId,
  dateRange: requestedRange,
  enabled,
}: {
  accountId: string;
  dateRange: DayLogDateRange;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const dates = enabled ? dateRange(requestedRange.startDate, requestedRange.endDate) : [];
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
      select: (data: DayLogSlotResult): DayLogSnapshot => ({ date, data }),
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

      const response = await syncDayLogs(apiTransport, {
        ...requestedRange,
        known: getDayLogSyncManifest(queryClient, accountId, requestedRange),
      });
      applyDayLogSyncResult(queryClient, accountId, requestedRange, response, Date.now());
      return response;
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
