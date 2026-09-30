import { describe, expect, it } from "vitest";

import type { DayLog, DayLogSnapshot } from "../../shared/models/day-logs/day-log.js";

import { buildDayLog, buildFoodEntry } from "../../shared/models/day-logs/__mocks__/day-log.js";
import { buildDashboardV2ViewModel, buildNutrientAnalyticsModel } from "./dashboard-v2-model.js";

function buildDay(date: string, overrides: Partial<DayLog> = {}): DayLogSnapshot {
  return {
    date,
    data: buildDayLog({ date, breakfast: [], lunch: [], dinner: [], snacks: [], ...overrides }),
  };
}

function snapshot(date: string, data: DayLogSnapshot["data"]): DayLogSnapshot {
  return {
    date,
    data,
  };
}

describe("buildDashboardV2ViewModel", () => {
  it("preserves targets and distinguishes known-empty from unloaded habit history", () => {
    const model = buildDashboardV2ViewModel({
      endDate: "2026-09-01",
      dayLogs: [undefined, { date: "2026-08-30", data: undefined }, { date: "2026-08-31", data: null }],
    });

    expect(model.sevenDayNutrition.rows.map(({ target }) => target)).toEqual([1800, 120, 60, 220]);
    expect(model.habits.foodLogging.days.slice(-3).map(({ status }) => status)).toEqual([
      "unavailable",
      "incomplete",
      "unavailable",
    ]);
    expect(model.habits.weighIn.days.slice(-3).map(({ status }) => status)).toEqual([
      "unavailable",
      "incomplete",
      "unavailable",
    ]);
    expect(model.analytics.calories.change.showInsufficientHistoryBanner).toBe(false);
    expect(model.nutritionCards.calories.amount).toBe(0);
  });

  it("uses only the inclusive 28-day comparison windows and seven-day totals", () => {
    const model = buildDashboardV2ViewModel({
      endDate: "2026-08-30",
      dayLogs: [
        buildDay("2026-08-02", { breakfast: [buildFoodEntry({ name: "Too old", calories: 999 })] }),
        buildDay("2026-08-03", { breakfast: [buildFoodEntry({ name: "Food", calories: 100 })] }),
        buildDay("2026-08-16", { breakfast: [buildFoodEntry({ name: "Food", calories: 100 })] }),
        buildDay("2026-08-17", { breakfast: [buildFoodEntry({ name: "Food", calories: 50 })] }),
        buildDay("2026-08-24", { breakfast: [buildFoodEntry({ name: "Food", calories: 25 })] }),
        buildDay("2026-08-30", { breakfast: [buildFoodEntry({ name: "Food", calories: 25 })] }),
        buildDay("2026-08-31", { breakfast: [buildFoodEntry({ name: "Future", calories: 999 })] }),
      ],
    });

    expect(model.analytics.calories.total).toEqual({
      amount: 50,
      contributions: [{ name: "Food", amount: 50, share: 1 }],
    });
    expect(model.analytics.calories.change.sections).toEqual({
      reductions: [{ name: "Food", amount: 100, change: -0.5 }],
      increases: [],
      newFoods: [],
    });
  });

  it("derives all nutrition metrics from every meal and preserves seven chronological days", () => {
    const model = buildDashboardV2ViewModel({
      dayLogs: [
        buildDay("2026-08-24", {
          breakfast: [
            buildFoodEntry({ calories: 100, totalFatGrams: 1, proteinGrams: 2, totalCarbohydrateGrams: 3 }),
          ],
          lunch: [
            buildFoodEntry({
              id: "lunch",
              meal: "LUNCH",
              calories: 200,
              totalFatGrams: 4,
              proteinGrams: 5,
              totalCarbohydrateGrams: 6,
            }),
          ],
        }),
        { date: "2026-08-25", data: null },
        buildDay("2026-08-26"),
        { date: "2026-08-27", data: null },
        buildDay("2026-08-28"),
        { date: "2026-08-29", data: null },
        buildDay("2026-08-30", {
          dinner: [
            buildFoodEntry({
              id: "dinner",
              meal: "DINNER",
              calories: 300,
              totalFatGrams: 7,
              proteinGrams: 8,
              totalCarbohydrateGrams: 9,
            }),
          ],
        }),
      ],
    });

    expect(model.sevenDayNutrition.rows.map(({ metric }) => metric)).toEqual([
      "calories",
      "proteinGrams",
      "totalFatGrams",
      "totalCarbohydrateGrams",
    ]);
    expect(model.sevenDayNutrition.rows[0]?.days.map(({ amount }) => amount)).toEqual([
      300, 0, 0, 0, 0, 0, 300,
    ]);
    expect(model.sevenDayNutrition.rows[1]?.days.map(({ amount }) => amount)).toEqual([7, 0, 0, 0, 0, 0, 8]);
    expect(model.sevenDayNutrition.rows[2]?.days.map(({ amount }) => amount)).toEqual([5, 0, 0, 0, 0, 0, 7]);
    expect(model.sevenDayNutrition.rows[3]?.days.map(({ amount }) => amount)).toEqual([9, 0, 0, 0, 0, 0, 9]);
    expect(model.sevenDayNutrition.rows[0]?.days.map(({ hasData }) => hasData)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it("omits unloaded slot queries while keeping known-empty days", () => {
    const model = buildDashboardV2ViewModel({
      dayLogs: [
        snapshot("2026-08-25", null),
        snapshot("2026-08-26", undefined),
        snapshot(
          "2026-08-31",
          buildDay("2026-08-31", { breakfast: [buildFoodEntry({ calories: 40 })] }).data,
        ),
      ],
    });

    expect(model.sevenDayNutrition.rows[0]?.days).toEqual([
      { amount: 0, date: "2026-08-25", hasData: false, label: "T" },
      { amount: 0, date: "2026-08-26", hasData: false, label: "W" },
      { amount: 0, date: "2026-08-27", hasData: false, label: "Th" },
      { amount: 0, date: "2026-08-28", hasData: false, label: "F" },
      { amount: 0, date: "2026-08-29", hasData: false, label: "Sa" },
      { amount: 0, date: "2026-08-30", hasData: false, label: "Sn" },
      { amount: 40, date: "2026-08-31", hasData: true, label: "M" },
    ]);
  });

  it("anchors the seven-day nutrition chart on the response end date and fills missing prior days", () => {
    const model = buildDashboardV2ViewModel({
      dayLogs: [
        snapshot(
          "2026-08-25",
          buildDay("2026-08-25", { breakfast: [buildFoodEntry({ calories: 125 })] }).data,
        ),
        snapshot(
          "2026-08-28",
          buildDay("2026-08-28", { lunch: [buildFoodEntry({ id: "friday", calories: 280, meal: "LUNCH" })] })
            .data,
        ),
        snapshot(
          "2026-08-31",
          buildDay("2026-08-31", {
            dinner: [buildFoodEntry({ id: "today", calories: 310, meal: "DINNER" })],
          }).data,
        ),
      ],
    });

    expect(model.sevenDayNutrition.rows[0]?.days).toEqual([
      { amount: 125, date: "2026-08-25", hasData: true, label: "T" },
      { amount: 0, date: "2026-08-26", hasData: false, label: "W" },
      { amount: 0, date: "2026-08-27", hasData: false, label: "Th" },
      { amount: 280, date: "2026-08-28", hasData: true, label: "F" },
      { amount: 0, date: "2026-08-29", hasData: false, label: "Sa" },
      { amount: 0, date: "2026-08-30", hasData: false, label: "Sn" },
      { amount: 310, date: "2026-08-31", hasData: true, label: "M" },
    ]);
  });

  it("marks unavailable history separately from completed and incomplete live habit days", () => {
    const model = buildDashboardV2ViewModel({
      dayLogs: [
        buildDay("2026-08-24", { weight: 180 }),
        buildDay("2026-08-25", { breakfast: [buildFoodEntry()] }),
        { date: "2026-08-26", data: null },
        buildDay("2026-08-27"),
        buildDay("2026-08-28", { weight: 179 }),
        buildDay("2026-08-29", { snacks: [buildFoodEntry({ id: "snack", meal: "SNACKS" })] }),
        { date: "2026-08-30", data: null },
      ],
    });

    expect(model.habits.weighIn.days).toHaveLength(30);
    expect(model.habits.weighIn.days.slice(0, 23).every(({ status }) => status === "unavailable")).toBe(true);
    expect(model.habits.weighIn.days.slice(-7).map(({ status }) => status)).toEqual([
      "complete",
      "incomplete",
      "incomplete",
      "incomplete",
      "complete",
      "incomplete",
      "incomplete",
    ]);
    expect(model.habits.foodLogging.days.slice(-7).map(({ status }) => status)).toEqual([
      "incomplete",
      "complete",
      "incomplete",
      "incomplete",
      "incomplete",
      "complete",
      "incomplete",
    ]);
    expect(model.habits.weighIn.completedCurrentWeek).toBe(2);
    expect(model.habits.foodLogging.completedCurrentWeek).toBe(2);
  });

  it("groups total food contributions by exact name and sorts them by nutrient amount", () => {
    const model = buildDashboardV2ViewModel({
      dayLogs: [
        buildDay("2026-08-24", { breakfast: [buildFoodEntry({ name: "Pineapple", calories: 50 })] }),
        buildDay("2026-08-25", {
          lunch: [buildFoodEntry({ id: "pineapple-two", name: "Pineapple", meal: "LUNCH", calories: 30 })],
        }),
        buildDay("2026-08-26", {
          dinner: [buildFoodEntry({ id: "lowercase", name: "pineapple", meal: "DINNER", calories: 70 })],
        }),
        buildDay("2026-08-27"),
        buildDay("2026-08-28"),
        buildDay("2026-08-29"),
        buildDay("2026-08-30"),
      ],
    });

    expect(model.analytics.calories.total.contributions).toEqual([
      { name: "Pineapple", amount: 80, share: 0.5333333333333333 },
      { name: "pineapple", amount: 70, share: 0.4666666666666667 },
    ]);
  });

  it("keeps total contributions scoped to the last seven days when older history is available", () => {
    const model = buildDashboardV2ViewModel({
      dayLogs: [
        buildDay("2026-08-03", { breakfast: [buildFoodEntry({ name: "Older food", calories: 250 })] }),
        buildDay("2026-08-24"),
        buildDay("2026-08-25"),
        buildDay("2026-08-26"),
        buildDay("2026-08-27"),
        buildDay("2026-08-28"),
        buildDay("2026-08-29"),
        buildDay("2026-08-30", { breakfast: [buildFoodEntry({ name: "Recent food", calories: 100 })] }),
      ],
    });

    expect(model.analytics.calories.total).toEqual({
      amount: 100,
      contributions: [{ name: "Recent food", amount: 100, share: 1 }],
    });
    expect(model.habits.foodLogging.days.find(({ date }) => date === "2026-08-03")?.status).toBe("complete");
  });

  it("marks all current foods as new and shows the information banner when the previous window has no food entries", () => {
    const analytics = buildNutrientAnalyticsModel({
      contributionDays: [
        buildDay("2026-08-25", { breakfast: [buildFoodEntry({ name: "Pineapple", calories: 60 })] }),
        buildDay("2026-08-30", {
          lunch: [buildFoodEntry({ id: "tofu", name: "Tofu", meal: "LUNCH", calories: 100 })],
        }),
      ],
      metric: "calories",
      endDate: "2026-08-30",
      totalDays: [
        buildDay("2026-08-25", { breakfast: [buildFoodEntry({ name: "Pineapple", calories: 60 })] }),
        buildDay("2026-08-30", {
          lunch: [buildFoodEntry({ id: "tofu", name: "Tofu", meal: "LUNCH", calories: 100 })],
        }),
      ],
    });

    expect(analytics.change.showInsufficientHistoryBanner).toBe(true);
    expect(analytics.change.sections).toEqual({
      reductions: [],
      increases: [],
      newFoods: [
        { name: "Tofu", amount: 100, change: "new" },
        { name: "Pineapple", amount: 60, change: "new" },
      ],
    });
  });

  it("calculates and groups reductions, increases, removals, and new foods from arbitrary dated history", () => {
    const days: DayLogSnapshot[] = [
      buildDay("2026-08-03", { breakfast: [buildFoodEntry({ name: "Tofu", calories: 100 })] }),
      buildDay("2026-08-05", {
        breakfast: [buildFoodEntry({ id: "removed", name: "Crackers", calories: 80 })],
      }),
      buildDay("2026-08-18", {
        breakfast: [buildFoodEntry({ id: "tofu-current", name: "Tofu", calories: 50 })],
      }),
      buildDay("2026-08-20", { breakfast: [buildFoodEntry({ id: "oats", name: "Oats", calories: 40 })] }),
      buildDay("2026-08-21", { breakfast: [buildFoodEntry({ id: "increase", name: "Rice", calories: 50 })] }),
      buildDay("2026-08-10", {
        breakfast: [buildFoodEntry({ id: "rice-prior", name: "Rice", calories: 25 })],
      }),
    ];

    const analytics = buildNutrientAnalyticsModel({
      contributionDays: days,
      metric: "calories",
      endDate: "2026-08-30",
      totalDays: days,
    });

    expect(analytics.change.showInsufficientHistoryBanner).toBe(false);
    expect(analytics.change.sections).toEqual({
      reductions: [
        { name: "Crackers", amount: 0, change: -1 },
        { name: "Tofu", amount: 50, change: -0.5 },
      ],
      increases: [{ name: "Rice", amount: 50, change: 1 }],
      newFoods: [{ name: "Oats", amount: 40, change: "new" }],
    });
  });

  it("provides independently reversible default orderings for each change section", () => {
    const analytics = buildNutrientAnalyticsModel({
      contributionDays: [
        buildDay("2026-08-03", { breakfast: [buildFoodEntry({ name: "A", calories: 100 })] }),
        buildDay("2026-08-04", { breakfast: [buildFoodEntry({ id: "b-prior", name: "B", calories: 50 })] }),
        buildDay("2026-08-05", { breakfast: [buildFoodEntry({ id: "c-prior", name: "C", calories: 10 })] }),
        buildDay("2026-08-06", { breakfast: [buildFoodEntry({ id: "e-prior", name: "E", calories: 20 })] }),
        buildDay("2026-08-20", { breakfast: [buildFoodEntry({ id: "a-current", name: "A", calories: 50 })] }),
        buildDay("2026-08-21", {
          breakfast: [buildFoodEntry({ id: "b-current", name: "B", calories: 100 })],
        }),
        buildDay("2026-08-22", { breakfast: [buildFoodEntry({ id: "d-current", name: "D", calories: 20 })] }),
        buildDay("2026-08-23", { breakfast: [buildFoodEntry({ id: "e-current", name: "E", calories: 30 })] }),
        buildDay("2026-08-24", { breakfast: [buildFoodEntry({ id: "f-current", name: "F", calories: 40 })] }),
      ],
      metric: "calories",
      endDate: "2026-08-30",
      totalDays: [
        buildDay("2026-08-03", { breakfast: [buildFoodEntry({ name: "A", calories: 100 })] }),
        buildDay("2026-08-04", { breakfast: [buildFoodEntry({ id: "b-prior", name: "B", calories: 50 })] }),
        buildDay("2026-08-05", { breakfast: [buildFoodEntry({ id: "c-prior", name: "C", calories: 10 })] }),
        buildDay("2026-08-06", { breakfast: [buildFoodEntry({ id: "e-prior", name: "E", calories: 20 })] }),
        buildDay("2026-08-20", { breakfast: [buildFoodEntry({ id: "a-current", name: "A", calories: 50 })] }),
        buildDay("2026-08-21", {
          breakfast: [buildFoodEntry({ id: "b-current", name: "B", calories: 100 })],
        }),
        buildDay("2026-08-22", { breakfast: [buildFoodEntry({ id: "d-current", name: "D", calories: 20 })] }),
        buildDay("2026-08-23", { breakfast: [buildFoodEntry({ id: "e-current", name: "E", calories: 30 })] }),
        buildDay("2026-08-24", { breakfast: [buildFoodEntry({ id: "f-current", name: "F", calories: 40 })] }),
      ],
    });

    expect(analytics.change.sections).toEqual({
      reductions: [
        { name: "C", amount: 0, change: -1 },
        { name: "A", amount: 50, change: -0.5 },
      ],
      increases: [
        { name: "B", amount: 100, change: 1 },
        { name: "E", amount: 30, change: 0.5 },
      ],
      newFoods: [
        { name: "F", amount: 40, change: "new" },
        { name: "D", amount: 20, change: "new" },
      ],
    });
  });
});
