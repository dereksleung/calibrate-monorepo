import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  GetDayLogRequestRouteParamsSchema,
  DayLogResponseSchema,
  type DayLogResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../transport.js";

export const dayLogQueryKey = (date: string) => ["dayLogs", date] as const;

export function getDayLog(transport: ApiTransport, date: string): Promise<DayLogResponse | null> {
  const { date: validDate } = GetDayLogRequestRouteParamsSchema.parse({ date });
  const url = `/daylogs/${validDate}`;

  return transport.request({
    path: url,
    responseBodySchema: DayLogResponseSchema,
  });
}

export function getDayLogQueryOptions(transport: ApiTransport, date: string) {
  return queryOptions({
    queryKey: dayLogQueryKey(date),
    queryFn: () => getDayLog(transport, date),
  });
}

/**
 * Portable hook for GET `/daylogs/:date` (ISO `YYYY-MM-DD`). Pass the app-owned `ApiTransport`
 * (for example the web `apiTransport` singleton); do not wrap this operation in app-local fetch hooks.
 */
export function useSelectedDayLog(transport: ApiTransport, date: string) {
  return useQuery(getDayLogQueryOptions(transport, date));
}
