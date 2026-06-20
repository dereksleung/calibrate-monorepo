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

const todayStat = {
  eaten: 48,
  limit: 58,
};

const weeklyStatData = [
  { label: "M", eaten: 48, limit: 58 },
  { label: "T", eaten: 48, limit: 58 },
  { label: "W", eaten: 48, limit: 58 },
  { label: "Th", eaten: 48, limit: 58 },
  { label: "F", eaten: 48, limit: 58 },
  { label: "Sa", eaten: 75, limit: 68 },
  { label: "Sn", eaten: 48, limit: 68 },
];

export const TodayAndWeekStat = ({ title }: { title: string }) => {
  const headingId = useId();
  const summaryId = useId();

  return (
    <Card
      aria-describedby={summaryId}
      aria-labelledby={headingId}
      className="p-4 md:px-6 gap-4 flex-col lg:items-center"
      role="region"
    >
      <Typography
        id={headingId}
        as="h3"
        variant="capsCardTitle"
        color="primary"
        className="self-start ml-3"
      >
        {title}
      </Typography>
      <TodayAndWeekChartTextAlternative
        describedById={summaryId}
        today={todayStat}
        metricLabel={title}
        unit="gram"
        weeklyData={weeklyStatData}
      />
      <div className="flex flex-1 self-stretch gap-4 md:gap-8">
        <div className="flex min-w-0 flex-1 justify-center">
          <EatenDonutChart eaten={todayStat.eaten} limit={todayStat.limit} metricLabel={title} />
        </div>

        <div className="min-w-0 flex-2">
          <WeeklyBarChart
            weeklyData={weeklyStatData}
            seriesLabel={title}
            className="aspect-auto min-h-[8rem] md:min-h-[13rem] max-h-[17rem] w-full"
          />
        </div>
      </div>
    </Card>
  );
};
