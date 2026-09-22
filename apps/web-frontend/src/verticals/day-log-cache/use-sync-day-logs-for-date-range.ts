import { apiTransport } from "#/shared/api/api-client.ts";
import { useSyncDayLogsForDateRange as useCoreSyncDayLogsForDateRange } from "@calibrate/frontend-core/feature-workflows/day-logs/sync-day-logs";

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
  return useCoreSyncDayLogsForDateRange({
    accountId,
    dateRange: requestedRange,
    enabled,
    transport: apiTransport,
  });
}
