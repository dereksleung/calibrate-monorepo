import { getRollingThirtyDayDateRange } from "#/shared/date/local-date-range.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { buildDashboardV2ViewModel } from "#/verticals/dashboard/dashboard-v2-model.ts";
import { useSyncDayLogsForDateRange } from "#/verticals/day-log-cache/use-sync-day-logs-for-date-range.ts";
import { useIsRestoring } from "@tanstack/react-query";

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
  const dateRange = getRollingThirtyDayDateRange();
  const { cached, syncResponse } = useSyncDayLogsForDateRange({
    accountId,
    dateRange,
    enabled: true,
  });
  const viewModel = cached.some((query) => query.data !== undefined)
    ? buildDashboardV2ViewModel({
        endDate: dateRange.endDate,
        dayLogs: cached,
      })
    : undefined;

  return (
    <DashboardV2Page
      error={syncResponse.error}
      isPending={syncResponse.isPending || syncResponse.isFetching}
      onRetry={() => {
        void syncResponse.refetch();
      }}
      viewModel={viewModel}
    />
  );
}
