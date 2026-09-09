import { apiTransport } from "#/shared/api/api-client.ts";
import { getRollingSevenDayDateRange } from "#/shared/date/local-date-range.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { buildDashboardV2ViewModel } from "#/verticals/dashboard/dashboard-v2-model.ts";
import {
  applyDayLogSyncResult,
  composeDayLogRangeFromSlots,
  dateRange,
  dayLogSlotQueryKey,
  dayLogSyncQueryKey,
  doesDashboardRangeNeedValidation,
  getDayLogSyncManifest,
  type DayLogSlotResult,
} from "#/verticals/day-log-cache/day-log-cache.ts";
import { syncDayLogs } from "@calibrate/api-client";
import { skipToken, useIsRestoring, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
  const needsValidation = doesDashboardRangeNeedValidation(slots, Date.now());
  const validation = useQuery({
    queryFn: () =>
      syncDayLogs(apiTransport, {
        ...dayLogRange,
        known: getDayLogSyncManifest(queryClient, accountId, dayLogRange),
      }),
    queryKey: dayLogSyncQueryKey(accountId, dayLogRange),
    enabled: needsValidation,
    staleTime: needsValidation ? 0 : Infinity,
  });

  useEffect(() => {
    if (!validation.isFetchedAfterMount || validation.data === undefined) return;
    applyDayLogSyncResult(queryClient, accountId, dayLogRange, validation.data, validation.dataUpdatedAt);
  }, [accountId, queryClient, validation.data, validation.dataUpdatedAt, validation.isFetchedAfterMount]);

  const cachedViewModel = cached.loadedDateCount > 0 ? buildDashboardV2ViewModel(cached.response) : undefined;
  const viewModel = cachedViewModel;

  return (
    <DashboardV2Page
      error={validation.error}
      isPending={!viewModel && validation.isPending}
      onRetry={() => {
        void validation.refetch();
      }}
      viewModel={viewModel}
    />
  );
}
