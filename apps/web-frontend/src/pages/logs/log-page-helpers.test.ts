import type { DayLogResponse } from "@calibrate/api-contracts";

import { describe, expect, it } from "vitest";

import { normalDayLogFixture, selectedDateFixture } from "./log-page-fixtures.ts";
import {
  addDaysToIsoDate,
  formatCompactDateHeading,
  formatDateHeading,
  getDailyProgress,
  getDailyTotals,
  getMealTotals,
  getTargetProgress,
  normalizeDayLogForRender,
  normalizeLogsSearch,
  toCalendarDays,
  toCalendarWeeks,
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

  it("formats selected dates for desktop and compact mobile headings", () => {
    const date = new Date(2026, 4, 18);

    expect(formatDateHeading(date)).toBe("Monday, May 18");
    expect(formatCompactDateHeading(date)).toBe("Mon, May 18");
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
      calories: 282,
      proteinGrams: 190,
      totalFatGrams: 150,
      totalCarbohydrateGrams: 210,
    });
    expect(getDailyTotals(dayLog)).toEqual({
      calories: 282,
      proteinGrams: 190,
      totalFatGrams: 150,
      totalCarbohydrateGrams: 210,
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

  it("maps cached day-log records to calendar day fill values", () => {
    const laterDuplicate = { ...normalDayLogFixture, weight: 1 } as DayLogResponse;

    expect(
      toCalendarDays(
        [
          { key: ["dayLogs", "account", "sync", "2026-05-18"], data: normalDayLogFixture },
          { key: ["dayLogs", "account", "slot", "2026-05-18"], data: normalDayLogFixture },
          { key: ["dayLogs", "account", "slot", "2026-05-19"], data: null },
          { key: ["dayLogs", "account", "slot", "2026-05-20"], data: undefined },
          { key: ["dayLogs", "account", "slot", "2026-05-18"], data: laterDuplicate },
        ],
        "2026-05-18",
      ),
    ).toEqual([
      { date: "2026-05-18", fillRatio: 282 / 1800, selected: true },
      { date: "2026-05-19", fillRatio: 0, selected: false },
      { date: "2026-05-20", fillRatio: 0, selected: false },
    ]);
  });

  it("returns no calendar days when no slot records have a date", () => {
    expect(toCalendarDays([], "2026-05-18")).toEqual([]);
    expect(toCalendarDays([{ key: ["dayLogs", "account"], data: undefined }], "2026-05-18")).toEqual([]);
  });

  it("groups calendar days into Sunday-to-Saturday weeks", () => {
    expect(
      toCalendarWeeks(
        [
          { key: ["dayLogs", "account", "slot", "2026-05-20"], data: null },
          { key: ["dayLogs", "account", "slot", "2026-05-16"], data: null },
          { key: ["dayLogs", "account", "slot", "2026-05-18"], data: normalDayLogFixture },
          { key: ["dayLogs", "account", "slot", "2026-05-17"], data: null },
        ],
        "2026-05-18",
        "2026-05-23",
      ),
    ).toEqual([
      {
        weekStart: "2026-05-10",
        days: [{ date: "2026-05-16", fillRatio: 0, selected: false }],
      },
      {
        weekStart: "2026-05-17",
        days: [
          { date: "2026-05-17", fillRatio: 0, selected: false },
          { date: "2026-05-18", fillRatio: 282 / 1800, selected: true },
          { date: "2026-05-19", fillRatio: 0, selected: false },
          { date: "2026-05-20", fillRatio: 0, selected: false },
          { date: "2026-05-21", fillRatio: 0, selected: false },
          { date: "2026-05-22", fillRatio: 0, selected: false },
          { date: "2026-05-23", fillRatio: 0, selected: false },
        ],
      },
    ]);
  });

  it("always includes today's week and fills upcoming days with empty placeholders", () => {
    expect(
      toCalendarWeeks(
        [
          { key: ["dayLogs", "account", "slot", "2026-05-17"], data: null },
          { key: ["dayLogs", "account", "slot", "2026-05-18"], data: normalDayLogFixture },
        ],
        "2026-05-18",
        "2026-05-18",
      ),
    ).toEqual([
      {
        weekStart: "2026-05-17",
        days: [
          { date: "2026-05-17", fillRatio: 0, selected: false },
          { date: "2026-05-18", fillRatio: 282 / 1800, selected: true },
          { date: "2026-05-19", fillRatio: 0, selected: false },
          { date: "2026-05-20", fillRatio: 0, selected: false },
          { date: "2026-05-21", fillRatio: 0, selected: false },
          { date: "2026-05-22", fillRatio: 0, selected: false },
          { date: "2026-05-23", fillRatio: 0, selected: false },
        ],
      },
    ]);
  });

  it("creates today's week even when cached logs belong to an earlier week", () => {
    expect(
      toCalendarWeeks(
        [{ key: ["dayLogs", "account", "slot", "2026-05-18"], data: normalDayLogFixture }],
        "2026-05-18",
        "2026-09-20",
      ),
    ).toEqual([
      {
        weekStart: "2026-05-17",
        days: [{ date: "2026-05-18", fillRatio: 282 / 1800, selected: true }],
      },
      {
        weekStart: "2026-09-20",
        days: [
          { date: "2026-09-20", fillRatio: 0, selected: false },
          { date: "2026-09-21", fillRatio: 0, selected: false },
          { date: "2026-09-22", fillRatio: 0, selected: false },
          { date: "2026-09-23", fillRatio: 0, selected: false },
          { date: "2026-09-24", fillRatio: 0, selected: false },
          { date: "2026-09-25", fillRatio: 0, selected: false },
          { date: "2026-09-26", fillRatio: 0, selected: false },
        ],
      },
    ]);
  });

  it("creates today's week from empty cache with null upcoming day logs", () => {
    expect(toCalendarWeeks([], "2026-05-18", "2026-05-18")).toEqual([
      {
        weekStart: "2026-05-17",
        days: [
          { date: "2026-05-17", fillRatio: 0, selected: false },
          { date: "2026-05-18", fillRatio: 0, selected: true },
          { date: "2026-05-19", fillRatio: 0, selected: false },
          { date: "2026-05-20", fillRatio: 0, selected: false },
          { date: "2026-05-21", fillRatio: 0, selected: false },
          { date: "2026-05-22", fillRatio: 0, selected: false },
          { date: "2026-05-23", fillRatio: 0, selected: false },
        ],
      },
    ]);
    expect(
      toCalendarWeeks([{ key: ["dayLogs", "account"], data: undefined }], "2026-05-18", "2026-05-18"),
    ).toEqual([
      {
        weekStart: "2026-05-17",
        days: [
          { date: "2026-05-17", fillRatio: 0, selected: false },
          { date: "2026-05-18", fillRatio: 0, selected: true },
          { date: "2026-05-19", fillRatio: 0, selected: false },
          { date: "2026-05-20", fillRatio: 0, selected: false },
          { date: "2026-05-21", fillRatio: 0, selected: false },
          { date: "2026-05-22", fillRatio: 0, selected: false },
          { date: "2026-05-23", fillRatio: 0, selected: false },
        ],
      },
    ]);
  });
});
