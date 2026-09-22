import type { DashboardNutritionCardModel } from "@calibrate/frontend-core/verticals/dashboard/models/dashboard-v2";

import { TodayAndWeekNutritionCard } from "#/verticals/dashboard/components/TodayAndWeekNutritionCard.tsx";

export const TodayAndWeekStat = ({ model }: { model: DashboardNutritionCardModel }) => (
  <TodayAndWeekNutritionCard model={model} />
);
