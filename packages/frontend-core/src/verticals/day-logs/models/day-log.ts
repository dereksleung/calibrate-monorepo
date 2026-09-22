import type { FoodEntry } from "./food-entry.js";

export type DayLog = {
  id: string;
  date: string;
  // Nullability matches the current server representation and is intentionally retained.
  breakfast: FoodEntry[] | null;
  lunch: FoodEntry[] | null;
  dinner: FoodEntry[] | null;
  snacks: FoodEntry[] | null;
  weight: number | null;
};

/**
 * A Day Log cache slot. `null` is a loaded, Known-empty day; `undefined` is
 * an unloaded day whose server state has not yet been observed.
 */
export type DayLogSnapshot = {
  date: string;
  data: DayLog | null | undefined;
};
