import { apiTransport } from "#/shared/api/api-client.ts";
import { getRollingSevenDayDateRange } from "#/shared/date/local-date-range.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { buildDashboardV2ViewModel } from "#/verticals/dashboard/dashboard-v2-model.ts";
import {
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  composeDayLogRangeFromSlots,
  dateRange,
  dayLogSlotQueryKey,
  doesDashboardRangeNeedValidation,
  type DayLogSlotResult,
} from "#/verticals/day-log-cache/day-log-cache.ts";
import { getDayLogRange, getDayLogRangeQueryOptions } from "@calibrate/api-client";
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
  const oldestValidation = cached.slots.length
    ? Math.min(...cached.slots.map(({ dataUpdatedAt }) => dataUpdatedAt))
    : undefined;
  const { queryKey } = getDayLogRangeQueryOptions(apiTransport, accountId, dayLogRange);
  const validation = useQuery({
    queryFn: () => getDayLogRange(apiTransport, dayLogRange),
    queryKey,
    initialData: cached.loadedDateCount > 0 ? cached.response : undefined,
    initialDataUpdatedAt: oldestValidation,
    staleTime: needsValidation ? 0 : DAY_LOG_VALIDATION_FRESHNESS_MS,
  });

  useEffect(() => {
    if (!validation.data || !validation.isFetchedAfterMount) return;
    for (const { date, dayLog } of validation.data.days) {
      /**
       * TODO: Can move this logic into packages/api-client as part of a bigger refactor where 
       * we make it less narrowly focused on defining a configured fetch / api-transport, and allowed to
       * know a queryClient and other shared dependencies between web and mobile, 
       * such as turning that into a packages/core.
       * 
       * Saw this, and considered simplifying by having the queryFn in getDayLogRangeQueryOptions 
       * in packages/api-client/src/day-logs/get-day-log-range.ts delegate to a mapper function 
       * to transform the data to slots, and run queryClient.setQueryData for each slot in the range.
       * Then it would come already in slot form in the queryClient, both from a fresh API response and 
       * after restoring from IndexedDB.
       * 
       * Problem is that retries, cancellation, or overlapping requests could write slot data 
       * independently of which range result TanStack ultimately accepts as current.
       * 
       * The useEffect is actually the safe way to convert the range query into saved responses per day, 
       * so that we can cut API requests for existing days.
       * 
       */
      queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), dayLog, {
        updatedAt: validation.dataUpdatedAt,
      });
    }
  }, [accountId, queryClient, validation.data, validation.dataUpdatedAt, validation.isFetchedAfterMount]);

  const cachedViewModel = cached.loadedDateCount > 0 ? buildDashboardV2ViewModel(cached.response) : undefined;
  const viewModel =
    cachedViewModel ?? (validation.data ? buildDashboardV2ViewModel(validation.data) : undefined);

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
