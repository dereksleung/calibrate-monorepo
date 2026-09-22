import type { DayLogSnapshot } from "./day-log.js";
import type { FoodEntry } from "./food-entry.js";
import { dayLogMealFieldByMeal, type Meal } from "./meal.js";

const mealOrder = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const satisfies readonly Meal[];

export type RankedRecentFood = { date: string; food: FoodEntry };

function foodKey(food: Pick<FoodEntry, "name" | "brand">): string {
  return `${food.name}\0${food.brand ?? ""}`;
}

/** Ranks only supplied cache slots; this projection never fetches or synchronizes. */
export function rankRecentFoodsFromCache({
  slots,
  today,
  preselectedMeal,
}: {
  slots: readonly DayLogSnapshot[];
  today: string;
  preselectedMeal?: Meal;
}): RankedRecentFood[] {
  const sourceDays = slots
    .filter((slot): slot is DayLogSnapshot & { data: NonNullable<DayLogSnapshot["data"]> } => slot.date < today && slot.data != null)
    .sort((left, right) => right.date.localeCompare(left.date));
  const seen = new Set<string>();
  const ranked: RankedRecentFood[] = [];
  const addMeal = (day: (typeof sourceDays)[number], meal: Meal) => {
    for (const food of day.data[dayLogMealFieldByMeal[meal]] ?? []) {
      if (ranked.length === 20) return;
      const key = foodKey(food);
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push({ date: day.date, food });
    }
  };

  if (preselectedMeal) {
    for (const day of sourceDays) addMeal(day, preselectedMeal);
    for (const meal of mealOrder) if (meal !== preselectedMeal) for (const day of sourceDays) addMeal(day, meal);
  } else {
    for (const day of sourceDays) for (const meal of mealOrder) addMeal(day, meal);
  }
  return ranked;
}
