import type {
  ChangeEntry,
  DashboardNutritionMetric,
  DashboardV2Projection,
  HabitProjection,
  NutrientAnalyticsProjection,
  NutritionCardProjection,
  SevenDayNutritionRow,
} from "@calibrate/frontend-core/verticals/dashboard/models/dashboard-v2";

import { getLocalWeekdayAbbreviation } from "#/shared/date/local-date-range.ts";

export type { ChangeEntry, DashboardNutritionMetric };
export type DashboardV2ViewModel = Omit<DashboardV2Projection, "sevenDayNutrition"> & {
  sevenDayNutrition: { rows: SevenDayNutritionRowModel[] };
};
export type SevenDayNutritionRowModel = Omit<SevenDayNutritionRow, "days"> & {
  days: Array<{ amount: number; date: string; hasData?: boolean; label: string }>;
};
export type HabitCardModel = HabitProjection;
export type NutritionCardModel = NutritionCardProjection;
export type NutrientAnalyticsModel = NutrientAnalyticsProjection;

/** Adds browser-local chart labels to the portable Dashboard projection. */
export function toDashboardV2ViewModel(projection: DashboardV2Projection): DashboardV2ViewModel {
  return {
    ...projection,
    sevenDayNutrition: {
      rows: projection.sevenDayNutrition.rows.map((row) => ({
        ...row,
        days: row.days.map((day) => ({ ...day, label: getLocalWeekdayAbbreviation(day.date) })),
      })),
    },
  };
}
