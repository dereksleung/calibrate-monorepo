import type { DayLog, FoodEntry, MealName } from "./day-log.js";
const MEALS: readonly MealName[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
const slots = { BREAKFAST: "breakfast", LUNCH: "lunch", DINNER: "dinner", SNACKS: "snacks" } as const;
export type CachedDayLogSlot = { date: string; data: DayLog | null | undefined };
export type RankedRecentFood = { date: string; food: FoodEntry };
export function rankRecentFoodsFromCache({ slots: cacheSlots, today, preselectedMeal }: { slots: readonly CachedDayLogSlot[]; today: string; preselectedMeal?: MealName }): RankedRecentFood[] {
  const days = cacheSlots.filter((slot): slot is CachedDayLogSlot & { data: DayLog } => slot.date < today && slot.data !== null && slot.data !== undefined).sort((a, b) => b.date.localeCompare(a.date));
  const ranked: RankedRecentFood[] = []; const seen = new Set<string>();
  const add = (day: CachedDayLogSlot & { data: DayLog }, meal: MealName) => { for (const food of day.data[slots[meal]] ?? []) { if (ranked.length === 20) return; const key = `${food.name}\0${food.brand ?? ""}`; if (!seen.has(key)) { seen.add(key); ranked.push({ date: day.date, food }); } } };
  if (preselectedMeal) { for (const day of days) add(day, preselectedMeal); for (const meal of MEALS) if (meal !== preselectedMeal) for (const day of days) add(day, meal); }
  else for (const day of days) for (const meal of MEALS) add(day, meal);
  return ranked;
}
