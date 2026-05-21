import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  GetDayLogRequestRouteParamsSchema,
  type DayLogResponse,
  type FoodEntryResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../transport.js";

type DayLogJsonResponse =
  | (Omit<DayLogResponse, "date" | "breakfast" | "lunch" | "dinner" | "snacks"> & {
      date: string | Date;
      breakfast: FoodEntryResponse[] | null;
      lunch: FoodEntryResponse[] | null;
      dinner: FoodEntryResponse[] | null;
      snacks: FoodEntryResponse[] | null;
    })
  | null;

export const dayLogQueryKey = (date: string) => ["dayLogs", date] as const;

function parseDayLogResponse(body: unknown): DayLogResponse | null {
  const response = body as DayLogJsonResponse;

  if (response === null) {
    return null;
  }

  return {
    ...response,
    date: response.date instanceof Date ? response.date : new Date(response.date),
  };
}

export function getDayLog(transport: ApiTransport, date: string): Promise<DayLogResponse | null> {
  const { date: validDate } = GetDayLogRequestRouteParamsSchema.parse({ date });

  return transport.request({
    path: `/daylogs/${validDate}`,
    parse: parseDayLogResponse,
  });
}

export function getDayLogQueryOptions(transport: ApiTransport, date: string) {
  return queryOptions({
    queryKey: dayLogQueryKey(date),
    queryFn: () => getDayLog(transport, date),
  });
}

export function useSelectedDayLog(transport: ApiTransport, date: string) {
  return useQuery(getDayLogQueryOptions(transport, date));
}
