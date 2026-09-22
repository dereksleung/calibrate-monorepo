import type { DayLog } from "./day-log.js";
import type { FoodEntry } from "./food-entry.js";

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

export type FoodEntryNutrition = Pick<
  FoodEntry,
  | "calories"
  | "totalFatGrams"
  | "saturatedFatGrams"
  | "cholesterolMg"
  | "sodiumMg"
  | "totalCarbohydrateGrams"
  | "fiberGrams"
  | "sugarGrams"
  | "proteinGrams"
>;

const emptyNutritionTotals = (): NutritionTotals => ({
  calories: 0,
  proteinGrams: 0,
  totalFatGrams: 0,
  totalCarbohydrateGrams: 0,
});

const normalizeNumber = (value: number, maximumFractionDigits: number) =>
  Number(value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits }));

const scaleNullableNutrition = (value: number | null, scale: number): number | null =>
  value === null ? null : value * scale;

export function normalizeFoodEntryQuantity(value: number): number {
  return normalizeNumber(value, 2);
}

export function normalizeFoodEntryNutrition(nutrition: FoodEntryNutrition): FoodEntryNutrition {
  return {
    calories: normalizeNumber(nutrition.calories, 1),
    totalFatGrams: normalizeNumber(nutrition.totalFatGrams, 1),
    saturatedFatGrams:
      nutrition.saturatedFatGrams === null ? null : normalizeNumber(nutrition.saturatedFatGrams, 1),
    cholesterolMg: nutrition.cholesterolMg === null ? null : normalizeNumber(nutrition.cholesterolMg, 0),
    sodiumMg: nutrition.sodiumMg === null ? null : normalizeNumber(nutrition.sodiumMg, 0),
    totalCarbohydrateGrams: normalizeNumber(nutrition.totalCarbohydrateGrams, 1),
    fiberGrams: nutrition.fiberGrams === null ? null : normalizeNumber(nutrition.fiberGrams, 1),
    sugarGrams: nutrition.sugarGrams === null ? null : normalizeNumber(nutrition.sugarGrams, 1),
    proteinGrams: normalizeNumber(nutrition.proteinGrams, 1),
  };
}

export function normalizeFoodEntryForStorage(entry: Omit<FoodEntry, "id">): Omit<FoodEntry, "id"> {
  return {
    ...entry,
    chosenQuantity: normalizeFoodEntryQuantity(entry.chosenQuantity),
    quantityServing: normalizeFoodEntryQuantity(entry.quantityServing),
    quantityMass: entry.quantityMass === null ? null : normalizeFoodEntryQuantity(entry.quantityMass),
    quantityVolume: entry.quantityVolume === null ? null : normalizeFoodEntryQuantity(entry.quantityVolume),
    ...normalizeFoodEntryNutrition(entry),
  };
}

export function scaleFoodEntryNutrition(food: FoodEntryNutrition, scale: number): FoodEntryNutrition {
  return normalizeFoodEntryNutrition({
    calories: food.calories * scale,
    totalFatGrams: food.totalFatGrams * scale,
    saturatedFatGrams: scaleNullableNutrition(food.saturatedFatGrams, scale),
    cholesterolMg: scaleNullableNutrition(food.cholesterolMg, scale),
    sodiumMg: scaleNullableNutrition(food.sodiumMg, scale),
    totalCarbohydrateGrams: food.totalCarbohydrateGrams * scale,
    fiberGrams: scaleNullableNutrition(food.fiberGrams, scale),
    sugarGrams: scaleNullableNutrition(food.sugarGrams, scale),
    proteinGrams: food.proteinGrams * scale,
  });
}

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

export function getDayLogNutritionTotals(dayLog: DayLog): NutritionTotals {
  return [dayLog.breakfast ?? [], dayLog.lunch ?? [], dayLog.dinner ?? [], dayLog.snacks ?? []].reduce(
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
