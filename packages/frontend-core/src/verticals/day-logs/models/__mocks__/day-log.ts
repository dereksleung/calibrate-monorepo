import type { DayLog } from "../day-log.js";
import type { FoodEntry } from "../food-entry.js";

export function buildFoodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: "food-entry-1",
    meal: "LUNCH",
    name: "Tofu",
    brand: null,
    calories: 180,
    totalFatGrams: 11,
    saturatedFatGrams: 1.5,
    cholesterolMg: 0,
    sodiumMg: 420,
    totalCarbohydrateGrams: 8,
    fiberGrams: 3,
    sugarGrams: 2,
    proteinGrams: 18,
    chosenQuantity: 1,
    chosenUnit: "serving",
    quantityServing: 1,
    servingLabel: "serving",
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
    ...overrides,
  };
}

export function buildDayLog(overrides: Partial<DayLog> = {}): DayLog {
  return {
    id: "day-log-1",
    date: "2026-09-22",
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    weight: null,
    ...overrides,
  };
}
