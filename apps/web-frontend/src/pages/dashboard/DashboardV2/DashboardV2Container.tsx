import {
  getRollingSevenDayDateRange,
  getRollingTwentyEightDayDateRange,
} from "#/shared/date/local-date-range.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { buildDashboardV2ViewModel } from "@calibrate/frontend-core/verticals/dashboard/models/dashboard-v2";
import { useSyncDayLogsForDateRange } from "#/verticals/day-log-cache/use-sync-day-logs-for-date-range.ts";
import { useIsRestoring } from "@tanstack/react-query";
import { useState } from "react";

import { DashboardV2Page } from "./DashboardV2Page.tsx";

export function DashboardV2Container() {
  const isRestoring = useIsRestoring();
  const session = useAuthenticatedSession();

  if (isRestoring || !session) {
    return <DashboardV2Page isPending />;
  }

  return <DashboardV2Content accountId={session.user.id} />;
}

function DashboardV2Content({ accountId }: { accountId: string }) {
  const initialDataDateRange = getRollingSevenDayDateRange();
  const deeperAnalyticsDateRange = getRollingTwentyEightDayDateRange();
  const [shouldFetch28DayRange, setShouldFetch28DayRange] = useState(false);
  const { cached, syncResponse } = useSyncDayLogsForDateRange({
    accountId,
    dateRange: initialDataDateRange,
    enabled: true,
  });
  const { cached: twentyEightDayData } = useSyncDayLogsForDateRange({
    accountId,
    dateRange: deeperAnalyticsDateRange,
    enabled: shouldFetch28DayRange,
  });
  const viewModel = cached.some((query) => query.data !== undefined)
    ? buildDashboardV2ViewModel({
        endDate: initialDataDateRange.endDate,
        initialSevenDayData: cached,
        twentyEightDayData: twentyEightDayData.some((query) => query.data !== undefined)
          ? twentyEightDayData
          : undefined,
      })
    : undefined;

  return (
    <DashboardV2Page
      error={syncResponse.error}
      isPending={!viewModel && (syncResponse.isPending || syncResponse.isFetching)}
      onChangeTabOpen={() => setShouldFetch28DayRange(true)}
      onRetry={() => {
        void syncResponse.refetch();
      }}
      viewModel={viewModel}
    />
  );
}
