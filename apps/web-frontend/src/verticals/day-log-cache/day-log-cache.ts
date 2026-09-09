import type { DehydratedState, QueryClient } from "@tanstack/react-query";

import { dayLogSlotQueryKey as createDayLogSlotQueryKey } from "@calibrate/api-client";
import {
  DayLogResponseSchema,
  type DayLogSyncResponse,
  type DayLogRangeResponse,
  type DayLogResponse,
} from "@calibrate/api-contracts";

export const DAY_LOG_VALIDATION_FRESHNESS_MS = 60 * 60 * 1_000;
export const DAY_LOG_CACHE_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
export const DAY_LOG_CACHE_BUSTER = "day-log-cache-v1";

export type KnownEmptyResponse = null;
export type NotYetLoaded = undefined;
export type CachedDayLog = DayLogResponse | KnownEmptyResponse;
export type DayLogSlotResult = CachedDayLog | NotYetLoaded;

export type DayLogSlotSnapshot = {
  date: string;
  data: DayLogSlotResult;
  dataUpdatedAt: number;
  isInvalidated: boolean;
};

export type PersistedDayLogClient = {
  buster: string;
  timestamp: number;
  clientState: DehydratedState;
};

function isDehydratedState(value: unknown): value is DehydratedState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DehydratedState>;
  return Array.isArray(candidate.mutations) && Array.isArray(candidate.queries);
}

export function isPersistedDayLogClient(value: unknown): value is PersistedDayLogClient {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedDayLogClient>;
  return (
    typeof candidate.buster === "string" &&
    typeof candidate.timestamp === "number" &&
    Number.isFinite(candidate.timestamp) &&
    isDehydratedState(candidate.clientState)
  );
}

export const dayLogSlotQueryKeyPrefix = (accountId: string) => ["dayLogs", accountId, "slot"] as const;

export const dayLogSlotQueryKey = createDayLogSlotQueryKey;

/** Runtime-only sync manifest data; slot payloads themselves remain raw API responses. */
export const dayLogSlotVersionQueryKey = (accountId: string, date: string) =>
  ["dayLogs", accountId, "slotVersion", date] as const;

export const dayLogSlotVersionQueryKeyPrefix = (accountId: string) =>
  ["dayLogs", accountId, "slotVersion"] as const;

export const dayLogSyncQueryKey = (accountId: string, range: { startDate: string; endDate: string }) =>
  ["dayLogs", accountId, "sync", range.startDate, range.endDate] as const;

export function getDayLogSyncManifest(
  queryClient: QueryClient,
  accountId: string,
  range: { startDate: string; endDate: string },
): Record<string, number | null> {
  const known: Record<string, number | null> = {};
  for (const date of dateRange(range.startDate, range.endDate)) {
    const data = queryClient.getQueryData<CachedDayLog>(dayLogSlotQueryKey(accountId, date));
    if (data === undefined) continue;
    if (data === null) {
      known[date] = null;
      continue;
    }
    const version = queryClient.getQueryData<number>(dayLogSlotVersionQueryKey(accountId, date));
    if (version !== undefined) known[date] = version;
  }
  return known;
}

export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);

  while (cursor.toISOString().slice(0, 10) <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function composeDayLogRangeFromSlots(
  range: { startDate: string; endDate: string },
  slots: readonly DayLogSlotSnapshot[],
) {
  const loadedSlots = slots.filter(
    (slot): slot is DayLogSlotSnapshot & { data: CachedDayLog } => slot.data !== undefined,
  );

  return {
    isComplete: loadedSlots.length === dateRange(range.startDate, range.endDate).length,
    loadedDateCount: loadedSlots.length,
    response: {
      ...range,
      days: loadedSlots.map((slot) => ({
        date: slot.date,
        dayLog: slot.data,
      })),
    } satisfies DayLogRangeResponse,
    slots: loadedSlots,
  };
}

export function doesDashboardRangeNeedValidation(slots: readonly DayLogSlotSnapshot[], now: number): boolean {
  return (
    slots.length !== 7 ||
    slots.some(
      ({ data, dataUpdatedAt, isInvalidated }) =>
        data === undefined || isInvalidated || now - dataUpdatedAt >= DAY_LOG_VALIDATION_FRESHNESS_MS,
    )
  );
}

export function doesDayLogSlotNeedValidation(slot: DayLogSlotSnapshot, now: number): boolean {
  return (
    slot.data === undefined ||
    slot.isInvalidated ||
    now - slot.dataUpdatedAt >= DAY_LOG_VALIDATION_FRESHNESS_MS
  );
}

/**
 * Applies only an accepted sync response. TanStack's query state remains the
 * single source for a slot's validation timestamp and invalidation flag.
 */
export function applyDayLogSyncResult(
  queryClient: QueryClient,
  accountId: string,
  range: { startDate: string; endDate: string },
  response: DayLogSyncResponse | null,
  dataUpdatedAt: number,
): void {
  const returnedByDate = new Map(response?.slots.map((slot) => [slot.date, slot]));

  for (const date of dateRange(range.startDate, range.endDate)) {
    const returned = returnedByDate.get(date);
    const current = queryClient.getQueryData<CachedDayLog>(dayLogSlotQueryKey(accountId, date));
    const next = returned ? returned.dayLog : current;

    if (next === undefined) continue;

    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), next, { updatedAt: dataUpdatedAt });

    if (returned?.dayLog === null) {
      queryClient.removeQueries({ queryKey: dayLogSlotVersionQueryKey(accountId, date) });
    } else if (returned) {
      queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, date), returned.versionNumber, {
        updatedAt: dataUpdatedAt,
      });
    }
  }
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCachedDayLog(value: unknown, date: string): value is CachedDayLog {
  if (value === null) return true;
  const result = DayLogResponseSchema.safeParse(value);
  return result.success && result.data !== null && result.data.date === date;
}

export function isPersistableDayLogQueryData(
  queryKey: readonly unknown[],
  data: unknown,
  accountId: string,
): boolean {
  if (queryKey.length !== 4 || queryKey[0] !== "dayLogs" || queryKey[1] !== accountId || !isIsoDate(queryKey[3])) {
    return false;
  }

  if (queryKey[2] === "slot") return isCachedDayLog(data, queryKey[3]);
  return queryKey[2] === "slotVersion" && typeof data === "number" && Number.isSafeInteger(data) && data > 0;
}

export function isPersistableDayLogQuery(
  query: DehydratedState["queries"][number],
  accountId: string,
  now = Date.now(),
): boolean {
  if (!query || typeof query !== "object") return false;
  const candidate = query as { queryKey?: unknown; state?: { data?: unknown; dataUpdatedAt?: unknown } };
  if (!Array.isArray(candidate.queryKey) || !candidate.state || typeof candidate.state !== "object") {
    return false;
  }
  return (
    typeof candidate.state.dataUpdatedAt === "number" &&
    Number.isFinite(candidate.state.dataUpdatedAt) &&
    candidate.state.dataUpdatedAt <= now &&
    now - candidate.state.dataUpdatedAt < DAY_LOG_CACHE_RETENTION_MS &&
    isPersistableDayLogQueryData(candidate.queryKey, candidate.state.data, accountId)
  );
}

export function prunePersistedDayLogClient(
  persistedClient: PersistedDayLogClient,
  accountId: string,
  now = Date.now(),
): PersistedDayLogClient | undefined {
  if (!isPersistedDayLogClient(persistedClient)) return undefined;

  return {
    ...persistedClient,
    clientState: {
      mutations: [],
      queries: persistedClient.clientState.queries.filter((query) =>
        isPersistableDayLogQuery(query, accountId, now),
      ),
    },
  };
}
