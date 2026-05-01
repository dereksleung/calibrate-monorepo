import { Card } from "#/shared/components/base/Card.tsx";
import { EatenDonutChart } from "#/shared/components/charts/EatenDonutChart.tsx";
import { WeeklyBarChart } from "#/shared/components/charts/WeeklyBarChart.tsx";

/**
 * TODO: Implement actual data fetching and handling.
 * Using mock data for now, just demonstrating the charts, and judgment
 * presenting the most important metrics and data for a normal user
 * trying to stay on track with new habits and weight loss for now.
 */

const dailyCalories = {
  eaten: 1625,
  limit: 1650,
};

const weeklyCaloriesData = [
  { label: "MON", eaten: 1540, limit: 1650 },
  { label: "TUE", eaten: 1600, limit: 1650 },
  { label: "WED", eaten: 1625, limit: 1650 },
  { label: "THU", eaten: 1420, limit: 1650 },
  { label: "FRI", eaten: 2160, limit: 1800 },
  { label: "SAT", eaten: 1160, limit: 1800 },
  { label: "SUN", eaten: 1060, limit: 1800 },
];

export const DayAndWeekCalories = () => {
  return (
    <Card className="gap-8 px-6 py-8 md:px-10 lg:flex-row lg:items-center lg:px-12">
      <div className="flex justify-center lg:w-[34%]">
        <EatenDonutChart
          eaten={dailyCalories.eaten}
          limit={dailyCalories.limit}
        />
      </div>

      <div className="min-h-[17rem] flex-1">
        <WeeklyBarChart
          weeklyData={weeklyCaloriesData}
          className="aspect-auto h-[17rem] w-full"
        />
      </div>
    </Card>
  );
};
