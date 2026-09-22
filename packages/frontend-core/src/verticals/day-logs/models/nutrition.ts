import type { DayLog, FoodEntry } from "./day-log.js";

export const DAILY_TARGETS = { calories: 1800, proteinGrams: 120, totalFatGrams: 60, totalCarbohydrateGrams: 220 } as const;
export type NutritionTotals = { calories: number; proteinGrams: number; totalFatGrams: number; totalCarbohydrateGrams: number };
const empty = (): NutritionTotals => ({ calories: 0, proteinGrams: 0, totalFatGrams: 0, totalCarbohydrateGrams: 0 });
export function getFoodEntryNutritionTotals(entries: readonly FoodEntry[]): NutritionTotals {
  return entries.reduce((totals, entry) => ({ calories: totals.calories + entry.calories, proteinGrams: totals.proteinGrams + entry.proteinGrams, totalFatGrams: totals.totalFatGrams + entry.totalFatGrams, totalCarbohydrateGrams: totals.totalCarbohydrateGrams + entry.totalCarbohydrateGrams }), empty());
}
export function getDayLogNutritionTotals(dayLog: DayLog | null | undefined): NutritionTotals {
  return [dayLog?.breakfast ?? [], dayLog?.lunch ?? [], dayLog?.dinner ?? [], dayLog?.snacks ?? []].reduce((totals, entries) => {
    const meal = getFoodEntryNutritionTotals(entries);
    return { calories: totals.calories + meal.calories, proteinGrams: totals.proteinGrams + meal.proteinGrams, totalFatGrams: totals.totalFatGrams + meal.totalFatGrams, totalCarbohydrateGrams: totals.totalCarbohydrateGrams + meal.totalCarbohydrateGrams };
  }, empty());
}
