import { describe, expect, it } from "vitest";

import { buildDayLog, buildFoodEntry } from "./__mocks__/day-log.js";
import { getDayLogNutritionTotals, scaleFoodEntryNutrition } from "./nutrition.js";

describe("Day Log nutrition", () => {
  it("totals every nullable meal collection", () => {
    expect(
      getDayLogNutritionTotals(
        buildDayLog({
          breakfast: [buildFoodEntry({ calories: 100, proteinGrams: 10, totalFatGrams: 5, totalCarbohydrateGrams: 20 })],
          lunch: null,
          dinner: [buildFoodEntry({ calories: 200, proteinGrams: 20, totalFatGrams: 10, totalCarbohydrateGrams: 40 })],
        }),
      ),
    ).toEqual({ calories: 300, proteinGrams: 30, totalFatGrams: 15, totalCarbohydrateGrams: 60 });
  });

  it("scales nullable nutrition while retaining storage precision", () => {
    expect(
      scaleFoodEntryNutrition(buildFoodEntry({ calories: 101.125, saturatedFatGrams: null }), 2),
    ).toMatchObject({ calories: 202.3, saturatedFatGrams: null });
  });
});
