import { describe, expect, it } from "vitest";

import { normalDayLogFixture, selectedDateFixture } from "./log-page-fixtures.ts";
import {
  addDaysToIsoDate,
  getDailyProgress,
  getDailyTotals,
  getMealTotals,
  getTargetProgress,
  normalizeDayLogForRender,
  normalizeLogsSearch,
} from "./log-page-helpers.ts";

describe("log page helpers", () => {
  it("defaults missing and invalid selected-date search to the local current day", () => {
    const now = new Date(2026, 4, 21, 23, 30);

    expect(normalizeLogsSearch({}, now)).toEqual({ date: "2026-05-21" });
    expect(normalizeLogsSearch({ date: "2026-02-31" }, now)).toEqual({ date: "2026-05-21" });
  });

  it("keeps a valid selected-date search value", () => {
    expect(normalizeLogsSearch({ date: "2026-04-30" }, new Date(2026, 4, 21))).toEqual({
      date: "2026-04-30",
    });
  });

  it("moves selected dates one day at a time", () => {
    expect(addDaysToIsoDate("2026-05-01", -1)).toBe("2026-04-30");
    expect(addDaysToIsoDate("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("normalizes an empty day into renderable meal buckets", () => {
    expect(normalizeDayLogForRender(null, selectedDateFixture)).toMatchObject({
      id: null,
      selectedDate: selectedDateFixture,
      meals: {
        BREAKFAST: [],
        LUNCH: [],
        DINNER: [],
        SNACKS: [],
      },
      weight: null,
      isEmpty: true,
    });
  });

  it("computes meal and daily nutrition totals", () => {
    const dayLog = normalizeDayLogForRender(normalDayLogFixture, selectedDateFixture);

    expect(getMealTotals(dayLog.meals.BREAKFAST)).toEqual({
      calories: 310,
      proteinGrams: 12,
      totalFatGrams: 8,
      totalCarbohydrateGrams: 52,
    });
    expect(getDailyTotals(dayLog)).toEqual({
      calories: 930,
      proteinGrams: 58,
      totalFatGrams: 26,
      totalCarbohydrateGrams: 116,
    });
  });

  it("calculates placeholder target progress and caps visual percent", () => {
    expect(getTargetProgress(900, 1800)).toEqual({
      current: 900,
      target: 1800,
      percent: 50,
      isOverTarget: false,
    });
    expect(getTargetProgress(2200, 1800)).toEqual({
      current: 2200,
      target: 1800,
      percent: 100,
      isOverTarget: true,
    });
  });

  it("returns progress for calories and macros", () => {
    const progress = getDailyProgress({
      calories: 930,
      proteinGrams: 58,
      totalFatGrams: 26,
      totalCarbohydrateGrams: 116,
    });

    expect(progress.calories.target).toBe(1800);
    expect(progress.proteinGrams.target).toBe(120);
    expect(progress.totalFatGrams.target).toBe(60);
    expect(progress.totalCarbohydrateGrams.target).toBe(220);
  });
});
