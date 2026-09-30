import { describe, expect, it } from "vitest";

import { buildDayLog, buildFoodEntry } from "../day-logs/__mocks__/day-log.js";
import { getDayLogNutritionTotals, getFoodEntryNutritionTotals } from "./nutrition-totals.js";

describe("nutrition totals", () => {
  it("returns zero totals for absent logs and empty meals", () => {
    const zero = { calories: 0, proteinGrams: 0, totalFatGrams: 0, totalCarbohydrateGrams: 0 };
    expect(getDayLogNutritionTotals(null)).toEqual(zero);
    expect(getDayLogNutritionTotals(undefined)).toEqual(zero);
    expect(getDayLogNutritionTotals(buildDayLog())).toEqual(zero);
    expect(getFoodEntryNutritionTotals([])).toEqual(zero);
  });

  it("adds all four nutrients across every meal without rounding", () => {
    const entry = buildFoodEntry({
      calories: 1.25,
      proteinGrams: 2.5,
      totalFatGrams: 3.75,
      totalCarbohydrateGrams: 4.5,
    });
    expect(
      getDayLogNutritionTotals(
        buildDayLog({
          breakfast: [entry],
          lunch: [entry],
          dinner: [entry],
          snacks: [entry],
        }),
      ),
    ).toEqual({ calories: 5, proteinGrams: 10, totalFatGrams: 15, totalCarbohydrateGrams: 18 });
  });
});
