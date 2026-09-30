import { apiTransport } from "#/shared/api/api-client.ts";
import { getRollingThirtyDayDateRange } from "#/shared/date/local-date-range.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { useSyncDayLogsForDateRange } from "@calibrate/frontend-core/feature-workflows/day-logs/sync-day-logs";
import { buildDashboardV2ViewModel } from "@calibrate/frontend-core/verticals/dashboard/dashboard-v2-model";
import { useIsRestoring } from "@tanstack/react-query";

import { DashboardV2Page } from "./DashboardV2Page.tsx";
// import { dashboardV2PageViewModelMock } from "@calibrate/frontend-core/verticals/dashboard/__mocks__/dashboard-v2-model";

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
  const { cached, syncResponse } = useSyncDayLogsForDateRange(apiTransport, {
    accountId,
    dateRange,
    enabled: true,
  });
  const viewModel = cached.some((query) => query.data !== undefined)
    ? buildDashboardV2ViewModel({
        endDate: dateRange.endDate,
        dayLogs: cached.map((query) => query.data),
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
      // viewModel={dashboardV2PageViewModelMock}
    />
  );
}
