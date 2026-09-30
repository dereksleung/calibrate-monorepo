import type { DayLog, FoodEntry } from "../day-logs/day-log.js";

export const DAILY_TARGETS = {
  calories: 1800,
  proteinGrams: 120,
  totalFatGrams: 60,
  totalCarbohydrateGrams: 220,
} as const;

export type NutritionTotals = {
  calories: number;
  proteinGrams: number;
  totalFatGrams: number;
  totalCarbohydrateGrams: number;
};

const emptyNutritionTotals = (): NutritionTotals => ({
  calories: 0,
  proteinGrams: 0,
  totalFatGrams: 0,
  totalCarbohydrateGrams: 0,
});

export function getFoodEntryNutritionTotals(entries: readonly FoodEntry[]): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      proteinGrams: totals.proteinGrams + entry.proteinGrams,
      totalFatGrams: totals.totalFatGrams + entry.totalFatGrams,
      totalCarbohydrateGrams: totals.totalCarbohydrateGrams + entry.totalCarbohydrateGrams,
    }),
    emptyNutritionTotals(),
  );
}

export function getDayLogNutritionTotals(dayLog: DayLog | null | undefined): NutritionTotals {
  return [dayLog?.breakfast ?? [], dayLog?.lunch ?? [], dayLog?.dinner ?? [], dayLog?.snacks ?? []].reduce(
    (totals, mealEntries) => {
      const mealTotals = getFoodEntryNutritionTotals(mealEntries);

      return {
        calories: totals.calories + mealTotals.calories,
        proteinGrams: totals.proteinGrams + mealTotals.proteinGrams,
        totalFatGrams: totals.totalFatGrams + mealTotals.totalFatGrams,
        totalCarbohydrateGrams: totals.totalCarbohydrateGrams + mealTotals.totalCarbohydrateGrams,
      };
    },
    emptyNutritionTotals(),
  );
}
