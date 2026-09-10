import { apiTransport } from "#/shared/api/api-client.ts";
import {
  applyDayLogSyncResult,
  composeDayLogRangeFromSlots,
  dateRange,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  dayLogSlotQueryKey,
  dayLogSyncQueryKey,
  doesDayLogRangeNeedValidation,
  getDayLogSlotSnapshots,
  getDayLogSyncManifest,
  type DayLogSlotResult,
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
  const slotQueries = useQueries({
    queries: dates.map((date) => ({
      queryKey: dayLogSlotQueryKey(accountId, date),
      queryFn: skipToken,
      gcTime: Infinity,
      staleTime: Infinity,
    })),
  });
  const slots = slotQueries.map((query, index) => {
    const date = dates[index]!;
    return {
      date,
      data: query.data as DayLogSlotResult,
      dataUpdatedAt: query.dataUpdatedAt,
      isInvalidated: queryClient.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated ?? false,
    };
  });
  const cached = composeDayLogRangeFromSlots(requestedRange, slots);
  const needsValidation = doesDayLogRangeNeedValidation(requestedRange, slots, Date.now());
  const syncResponse = useQuery({
    enabled,
    queryFn: async () => {
      if (
        !doesDayLogRangeNeedValidation(
          requestedRange,
          getDayLogSlotSnapshots(queryClient, accountId, requestedRange),
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
