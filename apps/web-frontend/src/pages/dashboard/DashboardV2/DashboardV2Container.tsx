import { apiTransport } from "#/shared/api/api-client.ts";
import {
  getRollingSevenDayDateRange,
  getRollingTwentyEightDayDateRange,
} from "#/shared/date/local-date-range.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { buildDashboardV2ViewModel } from "#/verticals/dashboard/dashboard-v2-model.ts";
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
import { skipToken, useIsRestoring, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { DashboardV2Page } from "./DashboardV2Page.tsx";

export function DashboardV2Container() {
  const isRestoring = useIsRestoring();

  if (isRestoring) {
    return <DashboardV2Page isPending={isRestoring} />;
  }

  return <DashboardV2Content />;
}

function DashboardV2Content() {
  const session = useAuthenticatedSession();
  const accountId = session!.user.id;
  const queryClient = useQueryClient();
  const dayLogRange = getRollingSevenDayDateRange();
  const analyticsRange = getRollingTwentyEightDayDateRange();
  const [shouldFetch28DayRange, setShouldFetch28DayRange] = useState(false);
  const dates = dateRange(dayLogRange.startDate, dayLogRange.endDate);
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
  const cached = composeDayLogRangeFromSlots(dayLogRange, slots);
  const needsValidation = doesDayLogRangeNeedValidation(dayLogRange, slots, Date.now());
  const validation = useQuery({
    queryFn: async () => {
      if (!doesDayLogRangeNeedValidation(dayLogRange, getDayLogSlotSnapshots(queryClient, accountId, dayLogRange), Date.now())) {
        return null;
      }
      const response = await syncDayLogs(apiTransport, {
        ...dayLogRange,
        known: getDayLogSyncManifest(queryClient, accountId, dayLogRange),
      });
      applyDayLogSyncResult(queryClient, accountId, dayLogRange, response, Date.now());
      return response;
    },
    queryKey: dayLogSyncQueryKey(accountId, dayLogRange),
    staleTime: DAY_LOG_VALIDATION_FRESHNESS_MS,
  });
  useEffect(() => {
    if (!needsValidation || validation.isError || validation.isFetching) return;
    void validation.refetch();
  }, [needsValidation, validation.isError, validation.isFetching, validation.refetch]);

  const analyticsDates = shouldFetch28DayRange ? dateRange(analyticsRange.startDate, analyticsRange.endDate) : [];
  const analyticsSlotQueries = useQueries({
    queries: analyticsDates.map((date) => ({
      queryKey: dayLogSlotQueryKey(accountId, date),
      queryFn: skipToken,
      gcTime: Infinity,
      staleTime: Infinity,
    })),
  });
  const analyticsSlots = analyticsSlotQueries.map((query, index) => {
    const date = analyticsDates[index]!;
    return {
      date,
      data: query.data as DayLogSlotResult,
      dataUpdatedAt: query.dataUpdatedAt,
      isInvalidated: queryClient.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated ?? false,
    };
  });
  const analyticsCached = composeDayLogRangeFromSlots(analyticsRange, analyticsSlots);
  const analyticsNeedsValidation = doesDayLogRangeNeedValidation(analyticsRange, analyticsSlots, Date.now());
  const analyticsValidation = useQuery({
    enabled: shouldFetch28DayRange,
    queryFn: async () => {
      if (
        !doesDayLogRangeNeedValidation(
          analyticsRange,
          getDayLogSlotSnapshots(queryClient, accountId, analyticsRange),
          Date.now(),
        )
      ) {
        return null;
      }
      const response = await syncDayLogs(apiTransport, {
        ...analyticsRange,
        known: getDayLogSyncManifest(queryClient, accountId, analyticsRange),
      });
      applyDayLogSyncResult(queryClient, accountId, analyticsRange, response, Date.now());
      return response;
    },
    queryKey: dayLogSyncQueryKey(accountId, analyticsRange),
    staleTime: DAY_LOG_VALIDATION_FRESHNESS_MS,
  });
  useEffect(() => {
    if (
      !shouldFetch28DayRange ||
      !analyticsNeedsValidation ||
      analyticsValidation.isError ||
      analyticsValidation.isFetching
    ) {
      return;
    }
    void analyticsValidation.refetch();
  }, [
    analyticsNeedsValidation,
    analyticsValidation.isError,
    analyticsValidation.isFetching,
    analyticsValidation.refetch,
    shouldFetch28DayRange,
  ]);

  const cachedViewModel =
    cached.loadedDateCount > 0
      ? buildDashboardV2ViewModel(
          cached.response,
          analyticsCached.loadedDateCount > 0 ? analyticsCached.response.days : undefined,
        )
      : undefined;
  const viewModel = cachedViewModel;

  return (
    <DashboardV2Page
      error={validation.error}
      isPending={!viewModel && validation.isPending}
      onChangeTabOpen={() => setShouldFetch28DayRange(true)}
      onRetry={() => {
        void validation.refetch();
      }}
      viewModel={viewModel}
    />
  );
}
