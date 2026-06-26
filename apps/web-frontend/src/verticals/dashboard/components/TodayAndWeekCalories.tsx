import { Card } from "#/shared/components/base/Card.tsx";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { EatenDonutChart } from "#/shared/components/charts/EatenDonutChart.tsx";
import { WeeklyBarChart } from "#/shared/components/charts/WeeklyBarChart.tsx";
import { TodayAndWeekChartTextAlternative } from "#/verticals/dashboard/components/TodayAndWeekChartTextAlternative.tsx";
import { useId } from "react";

/**
 * TODO: Implement actual data fetching and handling.
 * Using mock data for now, just demonstrating the charts, and judgment
 * presenting the most important metrics and data for a normal user
 * trying to stay on track with new habits and weight loss for now.
 */

const todayCalories = {
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
export const TodayAndWeekCalories = () => {
  const headingId = useId();
  const summaryId = useId();

  return (
    <Card
      aria-describedby={summaryId}
      aria-labelledby={headingId}
      className="p-4 md:p-6 gap-4 flex-col lg:items-center"
      role="region"
    >
      <Typography
        id={headingId}
        as="h2"
        variant="cardTitle"
        color="primary"
        className="self-start ml-3 mt-3"
      >
        Calories
      </Typography>
      <TodayAndWeekChartTextAlternative
        describedById={summaryId}
        today={todayCalories}
        metricLabel="Calories"
        unit="calorie"
        weeklyData={weeklyCaloriesData}
      />
      <div className="flex flex-1 self-stretch gap-4">
        <div className="flex min-w-0 flex-1 justify-center">
          <EatenDonutChart
            eaten={todayCalories.eaten}
            limit={todayCalories.limit}
            metricLabel="Calories"
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
