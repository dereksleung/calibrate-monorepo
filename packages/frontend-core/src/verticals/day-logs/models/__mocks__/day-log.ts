import type { DayLog, DayLogSnapshot, FoodEntry } from "../day-log.js";

export function createFoodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: "food-entry-1", meal: "BREAKFAST", name: "Oatmeal", brand: null, calories: 280,
    totalFatGrams: 6, saturatedFatGrams: 1, cholesterolMg: null, sodiumMg: 120,
    totalCarbohydrateGrams: 48, fiberGrams: 5, sugarGrams: 1, proteinGrams: 10,
    chosenQuantity: 1, chosenUnit: "serving", quantityServing: 1, servingLabel: "serving",
    quantityMass: null, massUnit: null, quantityVolume: null, volumeUnit: null, ...overrides,
  };
}

export function createDayLog(overrides: Partial<DayLog> = {}): DayLog {
  return { id: "day-log-1", date: "2026-05-21", breakfast: [], lunch: [], dinner: [], snacks: [], weight: null, ...overrides };
}

export function createDayLogSnapshot(overrides: Partial<DayLogSnapshot> = {}): DayLogSnapshot {
  return { date: "2026-05-21", data: createDayLog(), ...overrides };
}
