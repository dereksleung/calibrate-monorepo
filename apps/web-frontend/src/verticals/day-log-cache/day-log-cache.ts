import type { DayLog, DayLogSnapshot } from "@calibrate/frontend-core/verticals/day-logs/models/day-log";
import type { DehydratedState } from "@tanstack/react-query";

import { DayLogResponseSchema } from "@calibrate/api-contracts";
import {
  applyDayLogSyncResult,
  dateRange,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  dayLogSlotQueryKey,
  dayLogSlotQueryKeyPrefix,
  dayLogSlotVersionQueryKey,
  dayLogSlotVersionQueryKeyPrefix,
  dayLogSyncQueryKey,
  doesDayLogRangeNeedValidation,
  doesDayLogSlotNeedValidation,
  getDayLogSyncManifest,
  getDayLogsWithStalenessState,
  type DayLogSlotSnapshot,
} from "@calibrate/frontend-core/feature-workflows/day-logs/sync-day-logs";

export const DAY_LOG_CACHE_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
export const DAY_LOG_CACHE_BUSTER = "day-log-cache-v1";

export type KnownEmptyResponse = null;
export type NotYetLoaded = undefined;
export type CachedDayLog = DayLog | KnownEmptyResponse;
export type DayLogSlotResult = CachedDayLog | NotYetLoaded;

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

export {
  applyDayLogSyncResult,
  dateRange,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  dayLogSlotQueryKey,
  dayLogSlotQueryKeyPrefix,
  dayLogSlotVersionQueryKey,
  dayLogSlotVersionQueryKeyPrefix,
  dayLogSyncQueryKey,
  doesDayLogRangeNeedValidation,
  doesDayLogSlotNeedValidation,
  getDayLogSyncManifest,
  getDayLogsWithStalenessState,
};
export type { DayLogSlotSnapshot, DayLogSnapshot };

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
  if (
    queryKey.length !== 4 ||
    queryKey[0] !== "dayLogs" ||
    queryKey[1] !== accountId ||
    !isIsoDate(queryKey[3])
  ) {
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
