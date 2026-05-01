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
  { label: "M", eaten: 1540, limit: 1650 },
  { label: "T", eaten: 1600, limit: 1650 },
  { label: "W", eaten: 1625, limit: 1650 },
  { label: "Th", eaten: 1420, limit: 1650 },
  { label: "F", eaten: 2160, limit: 1800 },
  { label: "Sa", eaten: 1160, limit: 1800 },
  { label: "Sn", eaten: 1060, limit: 1800 },
];

export const DayAndWeekCalories = () => {
  return (
    <Card className="p-4 md:py-8 md:px-10 flex-row lg:items-center lg:px-12">
      <div className="flex flex-1 gap-4 md:gap-8">
        <div className="flex min-w-0 flex-1 justify-center">
          <EatenDonutChart
            eaten={dailyCalories.eaten}
            limit={dailyCalories.limit}
          />
        </div>

        <div className="min-w-0 flex-2">
          <WeeklyBarChart
            weeklyData={weeklyCaloriesData}
            className="aspect-auto min-h-[10rem] max-h-[17rem] w-full"
          />
        </div>
      </div>
    </Card>
  );
};
