import type { DayLog, DayLogSnapshot } from "../../day-logs/models/day-log.js";
import type { FoodEntry } from "../../day-logs/models/food-entry.js";

import {
  DAILY_NUTRITION_TARGETS,
  getDayLogNutritionTotals,
  type NutritionTotals,
} from "../../day-logs/models/nutrition.js";

export type DashboardNutritionMetric = keyof NutritionTotals;
export type DashboardHistoryDay = { date: string; dayLog: DayLog | null };
export type DashboardV2Projection = {
  sevenDayNutrition: { rows: SevenDayNutritionRow[] };
  habits: { weighIn: HabitProjection; foodLogging: HabitProjection };
  nutritionCards: Record<DashboardNutritionMetric, NutritionCardProjection>;
  analytics: Record<DashboardNutritionMetric, NutrientAnalyticsProjection>;
};
export type SevenDayNutritionRow = {
  metric: DashboardNutritionMetric;
  title: NutrientConfiguration["title"];
  unit: NutrientConfiguration["unit"];
  target: number;
  days: Array<{ amount: number; date: string; hasData: boolean }>;
};
export type HabitProjection = {
  completedCurrentWeek: number;
  days: Array<{ date: string; status: "complete" | "incomplete" | "unavailable" }>;
  subtitle: "Last 30 Days";
  title: "Weighing" | "Food Logs";
};
export type NutritionCardProjection = {
  amount: number;
  metric: DashboardNutritionMetric;
  target: number;
  title: NutrientConfiguration["title"];
  unit: NutrientConfiguration["unit"];
};
export type FoodContribution = { amount: number; name: string; share: number };
export type ChangeEntry = { amount: number; change: "new" | number; name: string };
export type NutrientAnalyticsProjection = {
  change: {
    sections: { reductions: ChangeEntry[]; increases: ChangeEntry[]; newFoods: ChangeEntry[] };
    showInsufficientHistoryBanner: boolean;
  };
  metric: DashboardNutritionMetric;
  title: NutrientConfiguration["title"];
  total: { contributions: FoodContribution[]; amount: number };
  unit: NutrientConfiguration["unit"];
};

type NutrientConfiguration = {
  metric: DashboardNutritionMetric;
  title: "Calories" | "Protein" | "Fats" | "Carbs";
  unit: "kcal" | "g";
};

const NUTRIENT_CONFIGURATIONS: readonly NutrientConfiguration[] = [
  { metric: "calories", title: "Calories", unit: "kcal" },
  { metric: "proteinGrams", title: "Protein", unit: "g" },
  { metric: "totalFatGrams", title: "Fats", unit: "g" },
  { metric: "totalCarbohydrateGrams", title: "Carbs", unit: "g" },
];

/** Pure Dashboard data projection. Hosts add display-only props such as local weekday labels. */
export function buildDashboardV2Projection({
  endDate: endDateInput,
  initialSevenDayData,
  twentyEightDayData = initialSevenDayData,
}: {
  endDate?: string;
  initialSevenDayData: ReadonlyArray<DayLogSnapshot | undefined>;
  twentyEightDayData?: ReadonlyArray<DayLogSnapshot | undefined>;
}): DashboardV2Projection {
  const sevenDayHistory = historyDaysFromSnapshots(initialSevenDayData);
  const twentyEightDayHistory = historyDaysFromSnapshots(twentyEightDayData);
  const endDate =
    endDateInput ??
    endDateFromSnapshots(initialSevenDayData) ??
    sevenDayHistory[sevenDayHistory.length - 1]?.date ??
    "";
  const rows = NUTRIENT_CONFIGURATIONS.map((configuration) =>
    buildSevenDayNutritionRow(sevenDayHistory, endDate, configuration),
  );
  const nutritionCards = NUTRIENT_CONFIGURATIONS.reduce<Partial<DashboardV2Projection["nutritionCards"]>>(
    (cards, configuration) => {
      cards[configuration.metric] = {
        amount: rows.find(({ metric }) => metric === configuration.metric)?.days.slice(-1)[0]?.amount ?? 0,
        metric: configuration.metric,
        target: DAILY_NUTRITION_TARGETS[configuration.metric],
        title: configuration.title,
        unit: configuration.unit,
      };
      return cards;
    },
    {},
  ) as DashboardV2Projection["nutritionCards"];
  const analytics = NUTRIENT_CONFIGURATIONS.reduce<Partial<DashboardV2Projection["analytics"]>>(
    (models, configuration) => {
      models[configuration.metric] = buildNutrientAnalyticsProjection({
        contributionDays: twentyEightDayHistory,
        endDate,
        metric: configuration.metric,
        totalDays: sevenDayHistory,
      });
      return models;
    },
    {},
  ) as DashboardV2Projection["analytics"];
  return {
    analytics,
    habits: buildHabitProjections(sevenDayHistory, endDate),
    nutritionCards,
    sevenDayNutrition: { rows },
  };
}

export function buildNutrientAnalyticsProjection({
  contributionDays,
  endDate,
  metric,
  totalDays,
}: {
  contributionDays: readonly DashboardHistoryDay[];
  endDate: string;
  metric: DashboardNutritionMetric;
  totalDays: readonly DashboardHistoryDay[];
}): NutrientAnalyticsProjection {
  const configuration = getNutrientConfiguration(metric);
  const totalContributions = collectFoodContributions(totalDays, metric);
  const totalAmount = sumContributions(totalContributions);
  const currentWindowStart = offsetDate(endDate, -13);
  const previousWindowStart = offsetDate(endDate, -27);
  const previousWindowEnd = offsetDate(endDate, -14);
  const current = collectFoodContributions(
    contributionDays.filter(({ date }) => date >= currentWindowStart && date <= endDate),
    metric,
  );
  const previous = collectFoodContributions(
    contributionDays.filter(({ date }) => date >= previousWindowStart && date <= previousWindowEnd),
    metric,
  );
  return {
    change: {
      sections: buildChangeSections(current, previous),
      showInsufficientHistoryBanner: current.size > 0 && previous.size === 0,
    },
    metric,
    title: configuration.title,
    total: {
      amount: totalAmount,
      contributions: [...totalContributions.entries()]
        .map(([name, amount]) => ({ amount, name, share: totalAmount === 0 ? 0 : amount / totalAmount }))
        .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name)),
    },
    unit: configuration.unit,
  };
}

function buildSevenDayNutritionRow(
  days: readonly DashboardHistoryDay[],
  endDate: string,
  configuration: NutrientConfiguration,
): SevenDayNutritionRow {
  const daysByDate = new Map(days.map((day) => [day.date, day]));
  const startDate = offsetDate(endDate, -6);
  return {
    days: Array.from({ length: 7 }, (_, index) => {
      const date = offsetDate(startDate, index);
      const day = daysByDate.get(date);
      return {
        amount: getDayLogNutritionTotals(day?.dayLog)[configuration.metric],
        date,
        hasData: Boolean(day?.dayLog),
      };
    }),
    metric: configuration.metric,
    target: DAILY_NUTRITION_TARGETS[configuration.metric],
    title: configuration.title,
    unit: configuration.unit,
  };
}

function historyDaysFromSnapshots(
  snapshots: ReadonlyArray<DayLogSnapshot | undefined>,
): DashboardHistoryDay[] {
  return snapshots.flatMap((snapshot) =>
    snapshot?.data === undefined ? [] : [{ date: snapshot.date, dayLog: snapshot.data }],
  );
}

function endDateFromSnapshots(snapshots: ReadonlyArray<DayLogSnapshot | undefined>): string | undefined {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index];
    if (snapshot?.date) return snapshot.date;
  }
  return undefined;
}

function buildHabitProjections(
  days: readonly DashboardHistoryDay[],
  endDate: string,
): DashboardV2Projection["habits"] {
  const historyDates = Array.from({ length: 30 }, (_, index) => offsetDate(endDate, index - 29));
  const liveDays = new Map(days.map((day) => [day.date, day]));
  const buildHabit = (
    title: HabitProjection["title"],
    isComplete: (day: DashboardHistoryDay) => boolean,
  ): HabitProjection => {
    const days = historyDates.map((date) => {
      const day = liveDays.get(date);
      return { date, status: day ? (isComplete(day) ? "complete" : "incomplete") : "unavailable" } as const;
    });
    return {
      completedCurrentWeek: days.slice(-7).filter(({ status }) => status === "complete").length,
      days,
      subtitle: "Last 30 Days",
      title,
    };
  };
  return {
    foodLogging: buildHabit("Food Logs", (day) => getFoodEntries(day).length > 0),
    weighIn: buildHabit("Weighing", (day) => day.dayLog?.weight !== null && day.dayLog?.weight !== undefined),
  };
}

function buildChangeSections(
  current: ReadonlyMap<string, number>,
  previous: ReadonlyMap<string, number>,
): NutrientAnalyticsProjection["change"]["sections"] {
  const reductions: ChangeEntry[] = [];
  const increases: ChangeEntry[] = [];
  const newFoods: ChangeEntry[] = [];
  for (const name of new Set([...current.keys(), ...previous.keys()])) {
    const currentAmount = current.get(name) ?? 0;
    const previousAmount = previous.get(name) ?? 0;
    if (previousAmount === 0 && currentAmount > 0)
      newFoods.push({ amount: currentAmount, change: "new", name });
    else if (previousAmount !== 0) {
      const change = (currentAmount - previousAmount) / previousAmount;
      if (change < 0) reductions.push({ amount: currentAmount, change, name });
      else if (change > 0) increases.push({ amount: currentAmount, change, name });
    }
  }
  return {
    reductions: reductions.sort(
      (left, right) =>
        (left.change as number) - (right.change as number) || left.name.localeCompare(right.name),
    ),
    increases: increases.sort(
      (left, right) =>
        (right.change as number) - (left.change as number) || left.name.localeCompare(right.name),
    ),
    newFoods: newFoods.sort(
      (left, right) => right.amount - left.amount || left.name.localeCompare(right.name),
    ),
  };
}

function collectFoodContributions(
  days: readonly DashboardHistoryDay[],
  metric: DashboardNutritionMetric,
): Map<string, number> {
  return days.reduce((contributions, day) => {
    for (const entry of getFoodEntries(day))
      if (entry[metric] > 0)
        contributions.set(entry.name, (contributions.get(entry.name) ?? 0) + entry[metric]);
    return contributions;
  }, new Map<string, number>());
}

function getFoodEntries(day: DashboardHistoryDay): FoodEntry[] {
  return [
    ...(day.dayLog?.breakfast ?? []),
    ...(day.dayLog?.lunch ?? []),
    ...(day.dayLog?.dinner ?? []),
    ...(day.dayLog?.snacks ?? []),
  ];
}

function getNutrientConfiguration(metric: DashboardNutritionMetric): NutrientConfiguration {
  const configuration = NUTRIENT_CONFIGURATIONS.find((candidate) => candidate.metric === metric);
  if (!configuration) throw new Error(`Unsupported dashboard nutrient metric: ${metric}`);
  return configuration;
}

function offsetDate(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

function sumContributions(contributions: ReadonlyMap<string, number>): number {
  return [...contributions.values()].reduce((sum, amount) => sum + amount, 0);
}
