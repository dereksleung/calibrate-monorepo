import type { DayLog } from "./day-log.js";
import type { FoodEntry } from "./food-entry.js";

export const DAILY_NUTRITION_TARGETS = {
  calories: 1800,
  proteinGrams: 120,
  totalFatGrams: 60,
  totalCarbohydrateGrams: 220,
} as const;

export type NutritionTotals = {
  [Metric in keyof typeof DAILY_NUTRITION_TARGETS]: number;
};

export function getFoodEntryNutritionTotals(entries: readonly FoodEntry[]): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (totals, entry) => addNutritionTotals(totals, entry),
    emptyNutritionTotals(),
  );
}

export function getDayLogNutritionTotals(dayLog: DayLog | null | undefined): NutritionTotals {
  return [dayLog?.breakfast ?? [], dayLog?.lunch ?? [], dayLog?.dinner ?? [], dayLog?.snacks ?? []].reduce(
    (totals, entries) => addNutritionTotals(totals, getFoodEntryNutritionTotals(entries)),
    emptyNutritionTotals(),
  );
}

function addNutritionTotals(
  left: NutritionTotals,
  right: Pick<NutritionTotals, keyof NutritionTotals>,
): NutritionTotals {
  return {
    calories: left.calories + right.calories,
    proteinGrams: left.proteinGrams + right.proteinGrams,
    totalFatGrams: left.totalFatGrams + right.totalFatGrams,
    totalCarbohydrateGrams: left.totalCarbohydrateGrams + right.totalCarbohydrateGrams,
  };
}

function emptyNutritionTotals(): NutritionTotals {
  return { calories: 0, proteinGrams: 0, totalFatGrams: 0, totalCarbohydrateGrams: 0 };
}
