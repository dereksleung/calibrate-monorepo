import { describe, expect, it } from "vitest";

import { buildDayLog, buildFoodEntry } from "../../day-logs/models/__mocks__/day-log.js";
import { buildDashboardV2Projection } from "./dashboard-v2.js";

describe("buildDashboardV2Projection", () => {
  it("projects seven-day nutrition from domain snapshots without a response wrapper", () => {
    const model = buildDashboardV2Projection({
      endDate: "2026-08-30",
      initialSevenDayData: [
        {
          date: "2026-08-24",
          data: buildDayLog({
            date: "2026-08-24",
            breakfast: [buildFoodEntry({ calories: 100, proteinGrams: 2 })],
            lunch: [buildFoodEntry({ calories: 200, meal: "LUNCH", proteinGrams: 5 })],
          }),
        },
        { date: "2026-08-25", data: null },
        { date: "2026-08-26", data: undefined },
        {
          date: "2026-08-30",
          data: buildDayLog({
            date: "2026-08-30",
            dinner: [buildFoodEntry({ calories: 300, meal: "DINNER", proteinGrams: 8 })],
          }),
        },
      ],
    });

    expect(model.sevenDayNutrition.rows.map(({ metric }) => metric)).toEqual([
      "calories",
      "proteinGrams",
      "totalFatGrams",
      "totalCarbohydrateGrams",
    ]);
    expect(model.sevenDayNutrition.rows[0]?.days).toEqual([
      { amount: 300, date: "2026-08-24", hasData: true },
      { amount: 0, date: "2026-08-25", hasData: false },
      { amount: 0, date: "2026-08-26", hasData: false },
      { amount: 0, date: "2026-08-27", hasData: false },
      { amount: 0, date: "2026-08-28", hasData: false },
      { amount: 0, date: "2026-08-29", hasData: false },
      { amount: 300, date: "2026-08-30", hasData: true },
    ]);
  });

  it("marks recent foods as new when the prior window has no history", () => {
    const sevenDays = [
      {
        date: "2026-08-30",
        data: buildDayLog({
          date: "2026-08-30",
          breakfast: [buildFoodEntry({ calories: 100, name: "Recent food" })],
        }),
      },
    ];
    const model = buildDashboardV2Projection({
      endDate: "2026-08-30",
      initialSevenDayData: sevenDays,
    });

    expect(model.analytics.calories.total).toEqual({
      amount: 100,
      contributions: [{ amount: 100, name: "Recent food", share: 1 }],
    });
    expect(model.analytics.calories.change).toEqual({
      sections: {
        reductions: [],
        increases: [],
        newFoods: [{ amount: 100, change: "new", name: "Recent food" }],
      },
      showInsufficientHistoryBanner: true,
    });
  });
});
