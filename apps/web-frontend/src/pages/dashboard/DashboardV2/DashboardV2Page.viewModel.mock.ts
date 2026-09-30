import type { DashboardV2ViewModel } from "@calibrate/frontend-core/verticals/dashboard/dashboard-v2-model";

import { getLocalWeekdayAbbreviation } from "#/shared/date/local-date-range.ts";
import { DAILY_TARGETS } from "@calibrate/frontend-core/shared/models/nutrition/nutrition-totals";

const DASHBOARD_END_DATE = "2026-09-27";

function offsetDate(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + offset));

  return result.toISOString().slice(0, 10);
}

function sevenDayAmounts(endDate: string, amounts: number[]) {
  const startDate = offsetDate(endDate, -(amounts.length - 1));

  return amounts.map((amount, index) => {
    const date = offsetDate(startDate, index);

    return {
      amount,
      date,
      hasData: true,
      label: getLocalWeekdayAbbreviation(date),
    };
  });
}

function habitHistory(
  endDate: string,
  dayCount: number,
  resolveStatus: (date: string, index: number) => "complete" | "incomplete" | "unavailable",
) {
  const startDate = offsetDate(endDate, -(dayCount - 1));

  return Array.from({ length: dayCount }, (_, index) => {
    const date = offsetDate(startDate, index);

    return { date, status: resolveStatus(date, index) };
  });
}

const sevenDayCalories = [1580, 1724, 1892, 1645, 2103, 1456, 1847];
const sevenDayProtein = [98, 112, 118, 94, 128, 86, 105];
const sevenDayFat = [52, 58, 61, 49, 67, 44, 56];
const sevenDayCarbs = [168, 184, 201, 176, 228, 152, 198];

const foodLoggingDays = habitHistory(DASHBOARD_END_DATE, 30, (_date, index) => {
  if (index < 4) return "unavailable";
  if (index % 9 === 0) return "incomplete";
  return "complete";
});

const weighInDays = habitHistory(DASHBOARD_END_DATE, 30, (date) => {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return "unavailable";
  return weekday === 1 || weekday === 3 || weekday === 5 ? "complete" : "incomplete";
});

export const dashboardV2PageViewModelMock: DashboardV2ViewModel = {
  sevenDayNutrition: {
    rows: [
      {
        metric: "calories",
        title: "Calories",
        unit: "kcal",
        target: DAILY_TARGETS.calories,
        days: sevenDayAmounts(DASHBOARD_END_DATE, sevenDayCalories),
      },
      {
        metric: "proteinGrams",
        title: "Protein",
        unit: "g",
        target: DAILY_TARGETS.proteinGrams,
        days: sevenDayAmounts(DASHBOARD_END_DATE, sevenDayProtein),
      },
      {
        metric: "totalFatGrams",
        title: "Fats",
        unit: "g",
        target: DAILY_TARGETS.totalFatGrams,
        days: sevenDayAmounts(DASHBOARD_END_DATE, sevenDayFat),
      },
      {
        metric: "totalCarbohydrateGrams",
        title: "Carbs",
        unit: "g",
        target: DAILY_TARGETS.totalCarbohydrateGrams,
        days: sevenDayAmounts(DASHBOARD_END_DATE, sevenDayCarbs),
      },
    ],
  },
  habits: {
    weighIn: {
      title: "Weighing",
      subtitle: "Last 30 Days",
      completedCurrentWeek: weighInDays.slice(-7).filter(({ status }) => status === "complete").length,
      days: weighInDays,
    },
    foodLogging: {
      title: "Food Logs",
      subtitle: "Last 30 Days",
      completedCurrentWeek: foodLoggingDays.slice(-7).filter(({ status }) => status === "complete").length,
      days: foodLoggingDays,
    },
  },
  nutritionCards: {
    calories: {
      amount: sevenDayCalories.at(-1) ?? 0,
      metric: "calories",
      target: DAILY_TARGETS.calories,
      title: "Calories",
      unit: "kcal",
    },
    proteinGrams: {
      amount: sevenDayProtein.at(-1) ?? 0,
      metric: "proteinGrams",
      target: DAILY_TARGETS.proteinGrams,
      title: "Protein",
      unit: "g",
    },
    totalFatGrams: {
      amount: sevenDayFat.at(-1) ?? 0,
      metric: "totalFatGrams",
      target: DAILY_TARGETS.totalFatGrams,
      title: "Fats",
      unit: "g",
    },
    totalCarbohydrateGrams: {
      amount: sevenDayCarbs.at(-1) ?? 0,
      metric: "totalCarbohydrateGrams",
      target: DAILY_TARGETS.totalCarbohydrateGrams,
      title: "Carbs",
      unit: "g",
    },
  },
  analytics: {
    calories: {
      metric: "calories",
      title: "Calories",
      unit: "kcal",
      total: {
        amount: 12_247,
        contributions: [
          { amount: 3_420, name: "Grilled salmon", share: 3_420 / 12_247 },
          { amount: 2_880, name: "Chicken thigh bowl", share: 2_880 / 12_247 },
          { amount: 2_140, name: "Greek yogurt & berries", share: 2_140 / 12_247 },
          { amount: 1_965, name: "Avocado toast", share: 1_965 / 12_247 },
          { amount: 1_842, name: "Overnight oats", share: 1_842 / 12_247 },
        ],
      },
      change: {
        showInsufficientHistoryBanner: false,
        sections: {
          reductions: [
            { amount: 420, change: -0.28, name: "Pepperoni pizza" },
            { amount: 310, change: -0.19, name: "Chocolate chip cookie" },
          ],
          increases: [
            { amount: 1_965, change: 0.34, name: "Avocado toast" },
            { amount: 2_140, change: 0.22, name: "Greek yogurt & berries" },
          ],
          newFoods: [{ amount: 890, change: "new", name: "Turkey chili" }],
        },
      },
    },
    proteinGrams: {
      metric: "proteinGrams",
      title: "Protein",
      unit: "g",
      total: {
        amount: 741,
        contributions: [
          { amount: 248, name: "Grilled salmon", share: 248 / 741 },
          { amount: 196, name: "Chicken thigh bowl", share: 196 / 741 },
          { amount: 162, name: "Greek yogurt & berries", share: 162 / 741 },
          { amount: 135, name: "Turkey chili", share: 135 / 741 },
        ],
      },
      change: {
        showInsufficientHistoryBanner: false,
        sections: {
          reductions: [{ amount: 18, change: -0.41, name: "Protein bar" }],
          increases: [
            { amount: 248, change: 0.18, name: "Grilled salmon" },
            { amount: 135, change: 0.12, name: "Turkey chili" },
          ],
          newFoods: [],
        },
      },
    },
    totalFatGrams: {
      metric: "totalFatGrams",
      title: "Fats",
      unit: "g",
      total: {
        amount: 387,
        contributions: [
          { amount: 118, name: "Avocado toast", share: 118 / 387 },
          { amount: 96, name: "Grilled salmon", share: 96 / 387 },
          { amount: 84, name: "Chicken thigh bowl", share: 84 / 387 },
          { amount: 52, name: "Greek yogurt & berries", share: 52 / 387 },
        ],
      },
      change: {
        showInsufficientHistoryBanner: false,
        sections: {
          reductions: [{ amount: 14, change: -0.36, name: "Pepperoni pizza" }],
          increases: [{ amount: 118, change: 0.27, name: "Avocado toast" }],
          newFoods: [{ amount: 22, change: "new", name: "Walnuts" }],
        },
      },
    },
    totalCarbohydrateGrams: {
      metric: "totalCarbohydrateGrams",
      title: "Carbs",
      unit: "g",
      total: {
        amount: 1_307,
        contributions: [
          { amount: 412, name: "Overnight oats", share: 412 / 1_307 },
          { amount: 318, name: "Chicken thigh bowl", share: 318 / 1_307 },
          { amount: 286, name: "Avocado toast", share: 286 / 1_307 },
          { amount: 194, name: "Greek yogurt & berries", share: 194 / 1_307 },
        ],
      },
      change: {
        showInsufficientHistoryBanner: false,
        sections: {
          reductions: [{ amount: 48, change: -0.31, name: "Chocolate chip cookie" }],
          increases: [{ amount: 412, change: 0.15, name: "Overnight oats" }],
          newFoods: [{ amount: 96, change: "new", name: "Sweet potato" }],
        },
      },
    },
  },
};
