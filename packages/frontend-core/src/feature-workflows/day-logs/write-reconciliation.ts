import type { DayLog } from "../../verticals/day-logs/models/day-log.js";
import type { FoodEntry } from "../../verticals/day-logs/models/food-entry.js";
import { normalizeFoodEntryForStorage } from "../../verticals/day-logs/models/nutrition.js";
import type {
  FoodEntryWriteAcknowledgement,
  WeightWriteAcknowledgement,
} from "../../verticals/day-logs/models/write-acknowledgement.js";

import { dayLogMealFieldByMeal } from "../../verticals/day-logs/models/meal.js";
import { dayLogSlotQueryKey, dayLogSlotVersionQueryKey } from "./sync-day-logs.js";

type DayLogSlot = DayLog | null | undefined;
type DayLogQueryClient = {
  getQueryData<T>(queryKey: readonly unknown[]): T | undefined;
  invalidateQueries(filters: { queryKey: readonly unknown[] }): Promise<unknown>;
  setQueryData<T>(queryKey: readonly unknown[], data: T, options?: { updatedAt?: number }): unknown;
};

function emptyDayLog(date: string, id?: string): DayLog {
  return {
    id: id ?? crypto.randomUUID(),
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    weight: null,
  };
}

function isTrustedPredecessor(
  cached: DayLogSlot,
  cachedVersion: number | undefined,
  versionNumber: number,
): boolean {
  if (cached === null) return versionNumber === 1;
  return cached !== undefined && cachedVersion !== undefined && cachedVersion + 1 === versionNumber;
}

async function reconcileWrite(
  queryClient: DayLogQueryClient,
  slotKey: readonly unknown[],
  versionKey: readonly unknown[],
  cached: DayLogSlot,
  cachedVersion: number | undefined,
  versionNumber: number,
  now: number,
): Promise<boolean> {
  if (isTrustedPredecessor(cached, cachedVersion, versionNumber)) {
    queryClient.setQueryData(versionKey, versionNumber, { updatedAt: now });
    return false;
  }
  await queryClient.invalidateQueries({ queryKey: slotKey });
  return true;
}

export async function applyFoodEntryAcknowledgement(
  queryClient: DayLogQueryClient,
  accountId: string,
  date: string,
  entry: Omit<FoodEntry, "id">,
  acknowledgement: FoodEntryWriteAcknowledgement,
  now = Date.now(),
): Promise<{ needsSingleDateSync: boolean }> {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = queryClient.getQueryData<DayLogSlot>(slotKey);
  const cachedVersion = queryClient.getQueryData<number>(versionKey);
  const normalizedEntry = normalizeFoodEntryForStorage(entry);
  const mealField = dayLogMealFieldByMeal[normalizedEntry.meal];
  const dayLog = cached ?? emptyDayLog(date, acknowledgement.createdDayLogId);

  queryClient.setQueryData(
    slotKey,
    {
      ...dayLog,
      [mealField]: [...(dayLog[mealField] ?? []), { ...normalizedEntry, id: acknowledgement.foodEntryId }],
    },
    { updatedAt: now },
  );

  return {
    needsSingleDateSync: await reconcileWrite(
      queryClient,
      slotKey,
      versionKey,
      cached,
      cachedVersion,
      acknowledgement.versionNumber,
      now,
    ),
  };
}

export async function applyWeightAcknowledgement(
  queryClient: DayLogQueryClient,
  accountId: string,
  date: string,
  weight: number,
  acknowledgement: WeightWriteAcknowledgement,
  now = Date.now(),
): Promise<{ needsSingleDateSync: boolean }> {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = queryClient.getQueryData<DayLogSlot>(slotKey);
  const cachedVersion = queryClient.getQueryData<number>(versionKey);

  queryClient.setQueryData(
    slotKey,
    {
      ...(cached ?? emptyDayLog(date, acknowledgement.createdDayLogId)),
      weight: Number(weight.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 1 })),
    },
    { updatedAt: now },
  );

  return {
    needsSingleDateSync: await reconcileWrite(
      queryClient,
      slotKey,
      versionKey,
      cached,
      cachedVersion,
      acknowledgement.versionNumber,
      now,
    ),
  };
}
