import { Card } from "#/shared/components/base/Card.tsx";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
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

// TO-DO: Reuse DayAndWeekStat component, make it more generic to handle both calories and macros, and just pass in the appropriate data and labels for each case. For now, just duplicating the component for development speed, but will refactor soon.
export const DayAndWeekCalories = () => {
  return (
    <Card className="p-4 md:px-6 gap-4 flex-col lg:items-center">
      <Typography as="h3" variant="bodyLg" color="primary" weight="semibold" className="self-start ml-3">
        Calories
      </Typography>
      <div className="flex flex-1 self-stretch gap-4 md:gap-8">
        <div className="flex min-w-0 flex-1 justify-center">
          <EatenDonutChart
            eaten={dailyCalories.eaten}
            limit={dailyCalories.limit}
          />
        </div>

        <div className="min-w-0 flex-2">
          <WeeklyBarChart
            weeklyData={weeklyCaloriesData}
            className="aspect-auto min-h-[8rem] md:min-h-[13rem] max-h-[17rem] w-full"
          />
        </div>
      </div>
    </Card>
  );
};
