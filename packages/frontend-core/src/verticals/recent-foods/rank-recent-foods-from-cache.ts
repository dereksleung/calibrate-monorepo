import type { DayLog, DayLogSnapshot, FoodEntry, MealName } from "../../shared/models/day-logs/day-log.js";

const MEAL_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const satisfies readonly MealName[];

const dayLogEntriesByMeal = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
} as const satisfies Record<MealName, keyof Pick<DayLog, "breakfast" | "lunch" | "dinner" | "snacks">>;

export type RankedRecentFood = {
  date: string;
  food: FoodEntry;
};

function foodKey(food: Pick<FoodEntry, "name" | "brand">): string {
  return `${food.name}\0${food.brand ?? ""}`;
}

/** Ranks only already-present Day Log cache slots; it never fetches or syncs Day Logs. */
export function rankRecentFoodsFromCache({
  slots,
  today,
  preselectedMeal,
}: {
  slots: readonly DayLogSnapshot[];
  today: string;
  preselectedMeal?: MealName;
}): RankedRecentFood[] {
  const sourceDays = slots
    .filter(
      (slot): slot is DayLogSnapshot & { data: DayLog } =>
        slot.date < today && slot.data !== null && slot.data !== undefined,
    )
    .sort((left, right) => right.date.localeCompare(left.date));
  const seen = new Set<string>();
  const ranked: RankedRecentFood[] = [];

  function addMeal(day: DayLogSnapshot & { data: DayLog }, meal: MealName) {
    for (const food of day.data[dayLogEntriesByMeal[meal]] ?? []) {
      if (ranked.length === 20) return;
      const key = foodKey(food);
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push({ date: day.date, food });
    }
  }

  if (preselectedMeal) {
    for (const day of sourceDays) addMeal(day, preselectedMeal);
    for (const meal of MEAL_ORDER) {
      if (meal === preselectedMeal) continue;
      for (const day of sourceDays) addMeal(day, meal);
    }
  } else {
    for (const day of sourceDays) {
      for (const meal of MEAL_ORDER) addMeal(day, meal);
    }
  }

  return ranked;
}
