import type { DayLog, DayLogWriteAcknowledgement, FoodEntry, MealName } from "../../verticals/day-logs/models/day-log.js";
import type { SaveFoodEntryCommand } from "../../verticals/day-logs/models/food-search.js";
import { dayLogSlotQueryKey, dayLogSlotVersionQueryKey, type DayLogQueryCache } from "./day-log-sync.js";

const MEAL_SLOT_BY_NAME = { BREAKFAST: "breakfast", LUNCH: "lunch", DINNER: "dinner", SNACKS: "snacks" } as const satisfies Record<MealName, "breakfast" | "lunch" | "dinner" | "snacks">;

function emptyDayLog(date: string, id?: string): DayLog {
  return { id: id ?? crypto.randomUUID(), date, breakfast: [], lunch: [], dinner: [], snacks: [], weight: null };
}

function normalize(value: number, digits: number): number {
  return Number(value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: digits }));
}

function normalizeFoodEntry(command: SaveFoodEntryCommand): SaveFoodEntryCommand {
  return {
    ...command,
    chosenQuantity: normalize(command.chosenQuantity, 2), quantityServing: normalize(command.quantityServing, 2),
    quantityMass: command.quantityMass === null ? null : normalize(command.quantityMass, 2),
    quantityVolume: command.quantityVolume === null ? null : normalize(command.quantityVolume, 2),
    calories: normalize(command.calories, 1), totalFatGrams: normalize(command.totalFatGrams, 1),
    saturatedFatGrams: command.saturatedFatGrams === null ? null : normalize(command.saturatedFatGrams, 1),
    cholesterolMg: command.cholesterolMg === null ? null : normalize(command.cholesterolMg, 0),
    sodiumMg: command.sodiumMg === null ? null : normalize(command.sodiumMg, 0),
    totalCarbohydrateGrams: normalize(command.totalCarbohydrateGrams, 1),
    fiberGrams: command.fiberGrams === null ? null : normalize(command.fiberGrams, 1),
    sugarGrams: command.sugarGrams === null ? null : normalize(command.sugarGrams, 1),
    proteinGrams: normalize(command.proteinGrams, 1),
  };
}

function isPredecessor(cached: DayLog | null | undefined, version: number | undefined, nextVersion: number): boolean {
  return cached === null ? nextVersion === 1 : cached !== undefined && version !== undefined && version + 1 === nextVersion;
}

async function applyAcknowledgement(cache: DayLogQueryCache, accountId: string, date: string, next: DayLog, acknowledgement: DayLogWriteAcknowledgement, now: number) {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = cache.getQueryData<DayLog | null>(slotKey);
  const version = cache.getQueryData<number>(versionKey);
  cache.setQueryData(slotKey, next, { updatedAt: now });
  if (isPredecessor(cached, version, acknowledgement.versionNumber)) {
    cache.setQueryData(versionKey, acknowledgement.versionNumber, { updatedAt: now });
    return { needsSingleDateSync: false };
  }
  await cache.invalidateQueries({ queryKey: slotKey });
  return { needsSingleDateSync: true };
}

export async function applyFoodEntryAcknowledgement(cache: DayLogQueryCache, accountId: string, date: string, command: SaveFoodEntryCommand, acknowledgement: DayLogWriteAcknowledgement, now = Date.now()) {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const cached = cache.getQueryData<DayLog | null>(slotKey);
  const normalized = normalizeFoodEntry(command);
  const entry: FoodEntry = { ...normalized, id: acknowledgement.foodEntryId ?? "" };
  const next = cached ?? emptyDayLog(date, acknowledgement.createdDayLogId);
  const meal = MEAL_SLOT_BY_NAME[normalized.meal];
  return applyAcknowledgement(cache, accountId, date, { ...next, [meal]: [...(next[meal] ?? []), entry] }, acknowledgement, now);
}

export async function applyWeightAcknowledgement(cache: DayLogQueryCache, accountId: string, date: string, weight: number, acknowledgement: DayLogWriteAcknowledgement, now = Date.now()) {
  const cached = cache.getQueryData<DayLog | null>(dayLogSlotQueryKey(accountId, date));
  return applyAcknowledgement(cache, accountId, date, { ...(cached ?? emptyDayLog(date, acknowledgement.createdDayLogId)), weight: normalize(weight, 1) }, acknowledgement, now);
}
