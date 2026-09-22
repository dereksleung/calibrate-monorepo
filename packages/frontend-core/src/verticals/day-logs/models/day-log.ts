export type MealName = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";

export interface FoodEntry {
  id: string;
  meal: MealName;
  name: string;
  brand: string | null;
  calories: number;
  totalFatGrams: number;
  saturatedFatGrams: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbohydrateGrams: number;
  fiberGrams: number | null;
  sugarGrams: number | null;
  proteinGrams: number;
  chosenQuantity: number;
  chosenUnit: string;
  quantityServing: number;
  servingLabel: string;
  quantityMass: number | null;
  massUnit: string | null;
  quantityVolume: number | null;
  volumeUnit: string | null;
}

export interface DayLog {
  id: string;
  date: string;
  breakfast: FoodEntry[] | null;
  lunch: FoodEntry[] | null;
  dinner: FoodEntry[] | null;
  snacks: FoodEntry[] | null;
  weight: number | null;
}

/** `null` means known-empty; `undefined` means the date has not been loaded. */
export interface DayLogSnapshot {
  date: string;
  data: DayLog | null | undefined;
}

export interface DayLogSyncSlot {
  date: string;
  versionNumber: number | null;
  snapshot: DayLogSnapshot;
}

export interface DayLogWriteAcknowledgement {
  versionNumber: number;
  createdDayLogId?: string;
  foodEntryId?: string;
}
