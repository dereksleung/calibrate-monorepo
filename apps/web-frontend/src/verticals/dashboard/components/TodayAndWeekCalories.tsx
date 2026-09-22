import type { NutritionCardModel as DashboardNutritionCardModel } from "@calibrate/frontend-core/verticals/dashboard/models/dashboard-v2";

import { TodayAndWeekNutritionCard } from "#/verticals/dashboard/components/TodayAndWeekNutritionCard.tsx";

export const TodayAndWeekCalories = ({ model }: { model: DashboardNutritionCardModel }) => (
  <TodayAndWeekNutritionCard model={model} />
);
