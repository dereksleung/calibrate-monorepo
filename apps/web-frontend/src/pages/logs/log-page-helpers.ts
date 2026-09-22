import {
  DAILY_TARGETS,
  getFoodEntryNutritionTotals,
  type NutritionTotals,
} from "@calibrate/frontend-core/verticals/day-logs/models/nutrition";
import { mealSections, type Meal } from "@calibrate/frontend-core/verticals/day-logs/models/meal";
import type { DayLog } from "@calibrate/frontend-core/verticals/day-logs/models/day-log";
import type { FoodEntry } from "@calibrate/frontend-core/verticals/day-logs/models/food-entry";

export { DAILY_TARGETS };

export const MACRO_PROGRESS_COLORS = {
  calories: "#44403C",
  proteinGrams: "#F72585",
  totalCarbohydrateGrams: "#4CC9F0",
  totalFatGrams: "#7209B7",
} as const;

export const MEAL_SECTIONS = mealSections;

export type LogsSearch = {
  date: string;
};

export type FoodSearchRouteSearch = LogsSearch & {
  meal?: Meal;
};

export type { NutritionTotals };

export type ProgressValue = {
  current: number;
  target: number;
  percent: number;
  isOverTarget: boolean;
};

export type CalendarWeekDay = {
  date: string;
  fillRatio: number;
  selected: boolean;
};

export type CalendarWeekGroup = {
  weekStart: string;
  days: CalendarWeekDay[];
};

export type DayLogCacheRecord = {
  data: DayLog | null | undefined;
  key: readonly unknown[];
};

export type NormalizedDayLog = {
  id: string | null;
  date: Date;
  selectedDate: string;
  meals: Record<Meal, FoodEntry[]>;
  weight: number | null;
  isEmpty: boolean;
};

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isIsoDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return formatLocalDate(date) === value;
}

export function getTodayDateString(now = new Date()): string {
  return formatLocalDate(now);
}

export function formatDateHeading(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatCompactDateHeading(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function isToday(selectedDate: string, now = new Date()): boolean {
  return selectedDate === getTodayDateString(now);
}

export function normalizeLogsSearch(search: Record<string, unknown>, now = new Date()): LogsSearch {
  return {
    date: isIsoDateOnly(search.date) ? search.date : getTodayDateString(now),
  };
}

export function normalizeFoodSearchRouteSearch(
  search: Record<string, unknown>,
  now = new Date(),
): FoodSearchRouteSearch {
  const validMeal = MEAL_SECTIONS.find((section) => section.meal === search.meal)?.meal;

  return {
    date: isIsoDateOnly(search.date) ? search.date : getTodayDateString(now),
    ...(validMeal ? { meal: validMeal } : {}),
  };
}

export function addDaysToIsoDate(date: string, days: number): string {
  if (!isIsoDateOnly(date)) {
    throw new Error(`Expected an ISO date-only string, received "${date}".`);
  }

  const [year, month, day] = date.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  localDate.setDate(localDate.getDate() + days);

  return formatLocalDate(localDate);
}

export function getDateFromDayLogSlotQueryKey(queryKey: readonly unknown[]): string | undefined {
  const date = queryKey[3];
  if (queryKey[2] !== "slot" || typeof date !== "string") {
    return undefined;
  }

  return date;
}

export function toCalendarDays(
  allDayLogs: ReadonlyArray<DayLogCacheRecord>,
  selectedDate: string,
): CalendarWeekDay[] {
  const calendarDays: CalendarWeekDay[] = [];
  const seenDates = new Set<string>();

  for (const query of allDayLogs) {
    const date = getDateFromDayLogSlotQueryKey(query.key);
    if (date === undefined || seenDates.has(date)) {
      continue;
    }

    seenDates.add(date);
    const calories = getDailyTotals(normalizeDayLogForRender(query.data ?? null, date)).calories;
    calendarDays.push({
      date,
      fillRatio: Math.min(calories / DAILY_TARGETS.calories, 1),
      selected: date === selectedDate,
    });
  }

  return calendarDays;
}

function getSundayWeekStart(date: string): string {
  return addDaysToIsoDate(date, -new Date(`${date}T00:00:00`).getDay());
}

export function toCalendarWeeks(
  allDayLogs: ReadonlyArray<DayLogCacheRecord> | undefined,
  selectedDate: string,
  todayDate = getTodayDateString(),
): CalendarWeekGroup[] {
  const todayWeekStart = getSundayWeekStart(todayDate);
  const records: DayLogCacheRecord[] = [...(allDayLogs ?? [])];
  const knownDates = new Set<string>();

  for (const query of records) {
    const date = getDateFromDayLogSlotQueryKey(query.key);
    if (date !== undefined) {
      knownDates.add(date);
    }
  }

  for (let index = 0; index < 7; index += 1) {
    const date = addDaysToIsoDate(todayWeekStart, index);
    if (knownDates.has(date)) {
      continue;
    }

    // Upcoming days cannot have logs yet; fill remaining holes so today's week stays Sunday–Saturday.
    records.push({
      key: ["dayLogs", "placeholder", "slot", date],
      data: null,
    });
  }

  const weeks = new Map<string, CalendarWeekDay[]>();

  for (const day of toCalendarDays(records, selectedDate)) {
    const weekStart = getSundayWeekStart(day.date);
    const days = weeks.get(weekStart);

    if (days === undefined) {
      weeks.set(weekStart, [day]);
      continue;
    }

    days.push(day);
  }

  return [...weeks.entries()]
    .sort(([leftWeekStart], [rightWeekStart]) => leftWeekStart.localeCompare(rightWeekStart))
    .map(([weekStart, days]) => ({
      weekStart,
      days: [...days].sort((left, right) => left.date.localeCompare(right.date)),
    }));
}

export function normalizeDayLogForRender(
  dayLog: DayLog | null,
  selectedDate: string,
): NormalizedDayLog {
  const date = dayLog?.date ? new Date(dayLog.date) : new Date(`${selectedDate}T00:00:00`);

  return {
    id: dayLog?.id ?? null,
    date,
    selectedDate,
    meals: {
      BREAKFAST: dayLog?.breakfast ?? [],
      LUNCH: dayLog?.lunch ?? [],
      DINNER: dayLog?.dinner ?? [],
      SNACKS: dayLog?.snacks ?? [],
    },
    weight: dayLog?.weight ?? null,
    isEmpty:
      !dayLog ||
      [dayLog.breakfast, dayLog.lunch, dayLog.dinner, dayLog.snacks].every(
        (entries) => (entries?.length ?? 0) === 0,
      ),
  };
}

export function getMealTotals(entries: FoodEntry[]): NutritionTotals {
  return getFoodEntryNutritionTotals(entries);
}

export function getDailyTotals(dayLog: NormalizedDayLog): NutritionTotals {
  return MEAL_SECTIONS.reduce<NutritionTotals>(
    (totals, section) => {
      const mealTotals = getMealTotals(dayLog.meals[section.meal]);

      return {
        calories: totals.calories + mealTotals.calories,
        proteinGrams: totals.proteinGrams + mealTotals.proteinGrams,
        totalFatGrams: totals.totalFatGrams + mealTotals.totalFatGrams,
        totalCarbohydrateGrams: totals.totalCarbohydrateGrams + mealTotals.totalCarbohydrateGrams,
      };
    },
    {
      calories: 0,
      proteinGrams: 0,
      totalFatGrams: 0,
      totalCarbohydrateGrams: 0,
    },
  );
}

export function getTargetProgress(current: number, target: number): ProgressValue {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return {
    current,
    target,
    percent,
    isOverTarget: current > target,
  };
}

export function getDailyProgress(totals: NutritionTotals) {
  return {
    calories: getTargetProgress(totals.calories, DAILY_TARGETS.calories),
    proteinGrams: getTargetProgress(totals.proteinGrams, DAILY_TARGETS.proteinGrams),
    totalFatGrams: getTargetProgress(totals.totalFatGrams, DAILY_TARGETS.totalFatGrams),
    totalCarbohydrateGrams: getTargetProgress(
      totals.totalCarbohydrateGrams,
      DAILY_TARGETS.totalCarbohydrateGrams,
    ),
  };
}
