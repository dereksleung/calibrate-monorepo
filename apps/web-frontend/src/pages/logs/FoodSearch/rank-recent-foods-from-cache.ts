import type { DayLogResponse, FoodEntryResponse, MealNameEnumType } from "@calibrate/api-contracts";

const MEAL_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const satisfies readonly MealNameEnumType[];

type PresentDayLog = NonNullable<DayLogResponse>;

const dayLogEntriesByMeal: Record<
  MealNameEnumType,
  keyof Pick<PresentDayLog, "breakfast" | "lunch" | "dinner" | "snacks">
> = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
};

export type CachedDayLogSlot = {
  date: string;
  data: PresentDayLog | null | undefined;
};

export type RankedRecentFood = {
  date: string;
  food: FoodEntryResponse;
};

function foodKey(food: Pick<FoodEntryResponse, "name" | "brand">): string {
  return `${food.name}\0${food.brand ?? ""}`;
}

/** Ranks only already-present Day Log cache slots; it never fetches or syncs Day Logs. */
export function rankRecentFoodsFromCache({
  slots,
  today,
  preselectedMeal,
}: {
  slots: readonly CachedDayLogSlot[];
  today: string;
  preselectedMeal?: MealNameEnumType;
}): RankedRecentFood[] {
  const sourceDays = slots
    .filter(
      (slot): slot is CachedDayLogSlot & { data: PresentDayLog } =>
        slot.date < today && slot.data !== null && slot.data !== undefined,
    )
    .sort((left, right) => right.date.localeCompare(left.date));
  const seen = new Set<string>();
  const ranked: RankedRecentFood[] = [];

  function addMeal(day: CachedDayLogSlot & { data: PresentDayLog }, meal: MealNameEnumType) {
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
