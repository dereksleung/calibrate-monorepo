import type { DayLog, FoodEntry } from "../day-log.js";

export function buildFoodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: "entry-1",
    meal: "LUNCH",
    name: "Tofu",
    brand: null,
    calories: 100,
    totalFatGrams: 5,
    saturatedFatGrams: null,
    cholesterolMg: null,
    sodiumMg: null,
    totalCarbohydrateGrams: 3,
    fiberGrams: null,
    sugarGrams: null,
    proteinGrams: 10,
    quantityServing: 1,
    servingLabel: "serving",
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
    chosenQuantity: 1,
    chosenUnit: "serving",
    ...overrides,
  };
}

export function buildDayLog(overrides: Partial<DayLog> = {}): DayLog {
  return {
    id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
    date: "2026-09-03",
    breakfast: null,
    lunch: null,
    dinner: null,
    snacks: null,
    weight: null,
    ...overrides,
  };
}
