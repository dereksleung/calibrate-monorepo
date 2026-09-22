import type { DayLog } from "@calibrate/frontend-core/verticals/day-logs/models/day-log";
import type { FoodEntry } from "@calibrate/frontend-core/verticals/day-logs/models/food-entry";
import type { Meal } from "@calibrate/frontend-core/verticals/day-logs/models/meal";

import { describe, expect, it } from "vitest";

import { rankRecentFoodsFromCache } from "./rank-recent-foods-from-cache.ts";

function entry(id: string, name: string, brand: string | null, meal: Meal): FoodEntry {
  return {
    id,
    name,
    brand,
    meal,
    calories: 100,
    totalFatGrams: 1,
    saturatedFatGrams: null,
    cholesterolMg: null,
    sodiumMg: null,
    totalCarbohydrateGrams: 10,
    fiberGrams: null,
    sugarGrams: null,
    proteinGrams: 5,
    quantityServing: 1,
    servingLabel: "serving",
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
    chosenQuantity: 1,
    chosenUnit: "serving",
  };
}

function dayLog(
  date: string,
  meals: Partial<Record<"breakfast" | "lunch" | "dinner" | "snacks", FoodEntry[]>>,
): DayLog {
  return {
    id: `log-${date}`,
    date,
    breakfast: meals.breakfast ?? [],
    lunch: meals.lunch ?? [],
    dinner: meals.dinner ?? [],
    snacks: meals.snacks ?? [],
    weight: null,
  };
}

describe("rankRecentFoodsFromCache", () => {
  it("skips today, unloaded, and known-empty slots while preferring the selected Meal across days", () => {
    const ranked = rankRecentFoodsFromCache({
      today: "2026-05-18",
      preselectedMeal: "LUNCH",
      slots: [
        {
          date: "2026-05-18",
          data: dayLog("2026-05-18", { lunch: [entry("today", "Today food", null, "LUNCH")] }),
        },
        {
          date: "2026-05-17",
          data: dayLog("2026-05-17", {
            breakfast: [entry("breakfast", "Breakfast food", null, "BREAKFAST")],
            lunch: [entry("lunch-yesterday", "Lunch yesterday", null, "LUNCH")],
          }),
        },
        {
          date: "2026-05-16",
          data: dayLog("2026-05-16", {
            lunch: [entry("lunch-earlier", "Lunch earlier", null, "LUNCH")],
            dinner: [entry("dinner", "Dinner food", null, "DINNER")],
          }),
        },
        { date: "2026-05-15", data: null },
        { date: "2026-05-14", data: undefined },
      ],
    });

    expect(ranked.map(({ food }) => food.name)).toEqual([
      "Lunch yesterday",
      "Lunch earlier",
      "Breakfast food",
      "Dinner food",
    ]);
    expect(ranked.map(({ date }) => date)).toEqual(["2026-05-17", "2026-05-16", "2026-05-17", "2026-05-16"]);
  });

  it("walks each newest cached day in Meal order, collapses exact name-brand keys, and caps at 20", () => {
    const newestBreakfast = entry("new", "Chicken", "Kitchen", "BREAKFAST");
    const olderBreakfast = entry("old", "Chicken", "Kitchen", "BREAKFAST");
    const sameNameDifferentBrand = entry("other-brand", "Chicken", "Other", "LUNCH");
    const many = Array.from({ length: 22 }, (_, index) =>
      entry(`food-${index}`, `Food ${index}`, null, "DINNER"),
    );
    const ranked = rankRecentFoodsFromCache({
      today: "2026-05-18",
      slots: [
        {
          date: "2026-05-17",
          data: dayLog("2026-05-17", {
            breakfast: [newestBreakfast],
            lunch: [sameNameDifferentBrand],
            dinner: many,
          }),
        },
        { date: "2026-05-16", data: dayLog("2026-05-16", { breakfast: [olderBreakfast] }) },
      ],
    });

    expect(ranked).toHaveLength(20);
    expect(ranked.slice(0, 2).map(({ food }) => food.id)).toEqual(["new", "other-brand"]);
    expect(ranked.some(({ food }) => food.id === "old")).toBe(false);
  });
});
