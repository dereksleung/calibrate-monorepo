import { apiTransport } from "#/shared/api/api-client.ts";
import { useSyncDayLogsForDateRange as useCoreSyncDayLogsForDateRange } from "@calibrate/frontend-core/feature-workflows/day-logs/sync-day-logs";

export function useSyncDayLogsForDateRange(input: {
  accountId: string;
  dateRange: { startDate: string; endDate: string };
  enabled: boolean;
}) {
  return useCoreSyncDayLogsForDateRange(apiTransport, input);
}
