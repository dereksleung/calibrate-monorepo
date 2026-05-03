import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import type { ChartConfig } from "#/shared/components/base/chart.tsx";
import {
  StatBarChart,
  type StatBarChartDatum,
} from "#/verticals/goals-analytics/components/StatBarChart.tsx";

type FatBarChartDatum = {
  eaten: number;
  label: string;
  limit: number;
};

type FatBarChartProps = {
  ariaLabel?: string;
  data: FatBarChartDatum[];
  onClick?: () => void;
};

const fatBarChartConfig = {
  value: {
    label: "Fats",
    color: "var(--color-primary-fixed)",
  },
  limit: {
    label: "Limit",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

export function FatBarChart({ ariaLabel, data, onClick }: FatBarChartProps) {
  const dailyLimitGrams = data[0]?.limit ?? 0;
  const chartData: StatBarChartDatum[] = data.map(({ eaten, label, limit }) => ({
    label,
    limit,
    value: eaten,
  }));
  const averageFatLimitPercent = data.length
    ? Math.round(
        (data.reduce(
          (total, day) => total + (day.limit ? day.eaten / day.limit : 0),
          0,
        ) /
          data.length) *
          100,
      )
    : 0;

  return (
    <StatBarChart
      ariaLabel={ariaLabel}
      chartConfig={fatBarChartConfig}
      data={chartData}
      onClick={onClick}
      valueUnit="g"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Typography className="text-sm font-medium uppercase tracking-[0.28em] text-on-surface md:text-base">
          Fat
        </Typography>
        <p className="font-heading text-[2.75rem] font-light leading-none text-primary md:text-[3rem]">
          {averageFatLimitPercent}% of {dailyLimitGrams}g
        </p>
        <p className="mt-3 text-base font-medium text-on-surface md:text-lg">
          Avg eaten daily over selected time versus limit
        </p>
      </div>
    </StatBarChart>
  );
}
