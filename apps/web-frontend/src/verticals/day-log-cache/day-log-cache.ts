import type { DayLogSlotResult } from "@calibrate/frontend-core/shared/models/day-logs/day-log";
import type { QueryClient } from "@tanstack/react-query";

import {
  normalizeFoodEntryForStorage,
  type CreateFoodEntryRequest,
  type CreateFoodEntryResponse,
  type DayLogResponse,
  type FoodEntryResponse,
  type MealNameEnumType,
  type UpdateDayLogWeightResponse,
} from "@calibrate/api-contracts";
import {
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
  type CachedDayLog,
} from "@calibrate/frontend-core/verticals/day-log-cache/day-log-slots";

export {
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  dateRange,
  dayLogSlotQueryKeyPrefix,
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
  dayLogSlotVersionQueryKeyPrefix,
  dayLogSyncQueryKey,
  getDayLogSyncManifest,
  getDayLogsWithStalenessState,
  doesDayLogRangeNeedValidation,
  doesDayLogSlotNeedValidation,
  type DayLogSlotSnapshot,
} from "@calibrate/frontend-core/verticals/day-log-cache/day-log-slots";
export {
  DAY_LOG_CACHE_BUSTER,
  DAY_LOG_CACHE_RETENTION_MS,
  isPersistedDayLogClient,
  isPersistableDayLogQueryData,
  isPersistableDayLogQuery,
  prunePersistedDayLogClient,
  type PersistedDayLogClient,
} from "@calibrate/frontend-core/verticals/day-log-cache/persistence-policy";
export { applyDayLogSyncResult } from "@calibrate/frontend-core/feature-workflows/day-logs/sync-day-logs";
export type {
  DayLogSnapshot,
  DayLogSlotResult,
  NotYetLoaded,
} from "@calibrate/frontend-core/shared/models/day-logs/day-log";
export type KnownEmptyResponse = null;
export type { CachedDayLog } from "@calibrate/frontend-core/verticals/day-log-cache/day-log-slots";

const MEAL_SLOT_BY_NAME = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
} as const satisfies Record<MealNameEnumType, "breakfast" | "lunch" | "dinner" | "snacks">;

type PresentDayLog = Exclude<DayLogResponse, null>;

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
