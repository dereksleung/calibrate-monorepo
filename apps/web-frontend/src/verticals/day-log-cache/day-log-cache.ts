import type { DayLog, DayLogSnapshot } from "@calibrate/frontend-core/verticals/day-logs/models/day-log";
import type { DehydratedState, QueryClient } from "@tanstack/react-query";

import {
  DayLogResponseSchema,
  normalizeFoodEntryForStorage,
  type CreateFoodEntryRequest,
  type CreateFoodEntryResponse,
  type FoodEntryResponse,
  type MealNameEnumType,
  type UpdateDayLogWeightResponse,
} from "@calibrate/api-contracts";
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

const MEAL_SLOT_BY_NAME = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
} as const satisfies Record<MealNameEnumType, "breakfast" | "lunch" | "dinner" | "snacks">;

type PresentDayLog = DayLog;

function emptyPresentDayLog(date: string, dayLogId?: string): PresentDayLog {
  return {
    id: dayLogId ?? crypto.randomUUID(),
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    weight: null,
  };
}

function withCreatedFoodEntry(
  dayLog: PresentDayLog,
  created: CreateFoodEntryRequest,
  foodEntryId: string,
): PresentDayLog {
  const slot = MEAL_SLOT_BY_NAME[created.meal];
  const foodEntry: FoodEntryResponse = { ...created, id: foodEntryId };
  return {
    ...dayLog,
    [slot]: [...(dayLog[slot] ?? []), foodEntry],
  };
}

function isPredecessor(
  cached: DayLogSlotResult,
  cachedVersion: number | undefined,
  versionNumber: number,
): boolean {
  if (cached === null) return versionNumber === 1;
  if (cached === undefined) return false;
  return cachedVersion !== undefined && cachedVersion + 1 === versionNumber;
}

/**
 * Helps cut API requests from queryClient.invalidateQueries, and server outbound egress.
 * Allows the server response for creating a food entry to be very minimal.
 * On a success, stamps the server Food Entry ID onto the create payload and writes that
 * entry into the date slot. If the existing day log version number is the direct predecessor
 * of what the server returns, it raises `versionNumber`
 * without sync; otherwise it treats the change as locally acknowledged but unverified,
 * and invalidates the day log slot for syncing with the latest server state.
 */
export async function applyFoodEntryCreateToDayLogCache(
  queryClient: QueryClient,
  accountId: string,
  date: string,
  created: CreateFoodEntryRequest,
  result: CreateFoodEntryResponse,
  now = Date.now(),
): Promise<{ needsSingleDateSync: boolean }> {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = queryClient.getQueryData<CachedDayLog>(slotKey);
  const cachedVersion = queryClient.getQueryData<number>(versionKey);
  const normalizedCreated = normalizeFoodEntryForStorage(created);
  const next = withCreatedFoodEntry(
    cached ?? emptyPresentDayLog(date, result.createdDayLogId),
    normalizedCreated,
    result.foodEntryId,
  );

  queryClient.setQueryData(slotKey, next, { updatedAt: now });

  if (isPredecessor(cached, cachedVersion, result.versionNumber)) {
    queryClient.setQueryData(versionKey, result.versionNumber, { updatedAt: now });
    return { needsSingleDateSync: false };
  }

  await queryClient.invalidateQueries({ queryKey: slotKey });
  return { needsSingleDateSync: true };
}

function normalizeWeightForStorage(value: number): number {
  return Number(
    value.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 1,
    }),
  );
}

/**
 * Applies a successful weight write without downloading the Day Log. A direct
 * predecessor can be trusted immediately; an unloaded or mismatched slot is
 * shown as a local acknowledgement and remains eligible for ordinary sync.
 */
export async function applyWeightObservationToDayLogCache(
  queryClient: QueryClient,
  accountId: string,
  date: string,
  weight: number,
  result: UpdateDayLogWeightResponse,
  now = Date.now(),
): Promise<{ needsSingleDateSync: boolean }> {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = queryClient.getQueryData<CachedDayLog>(slotKey);
  const cachedVersion = queryClient.getQueryData<number>(versionKey);
  const next = {
    ...(cached ?? emptyPresentDayLog(date, result.createdDayLogId)),
    weight: normalizeWeightForStorage(weight),
  };

  queryClient.setQueryData(slotKey, next, { updatedAt: now });

  if (isPredecessor(cached, cachedVersion, result.versionNumber)) {
    queryClient.setQueryData(versionKey, result.versionNumber, { updatedAt: now });
    return { needsSingleDateSync: false };
  }

  await queryClient.invalidateQueries({ queryKey: slotKey });
  return { needsSingleDateSync: true };
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
