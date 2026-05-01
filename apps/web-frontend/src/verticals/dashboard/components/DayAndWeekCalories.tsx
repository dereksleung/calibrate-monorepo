import { Card } from "#/shared/components/base/Card.tsx";
import {
  ChartContainer,
  type ChartConfig,
} from "#/shared/components/base/chart.tsx";
import { EatenDonutChart } from "#/shared/components/charts/EatenDonutChart.tsx";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

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
  { day: "MON", calories: 1540, limit: 1650 },
  { day: "TUE", calories: 1600, limit: 1650 },
  { day: "WED", calories: 1625, limit: 1650 },
  { day: "THU", calories: 1420, limit: 1650 },
  { day: "FRI", calories: 2160, limit: 1800 },
  { day: "SAT", calories: 1160, limit: 1800 },
  { day: "SUN", calories: 1060, limit: 1800 },
];

type WeeklyCaloriesDatum = (typeof weeklyCaloriesData)[number];

type WeeklyCaloriesBarShapeProps = {
  background?: {
    y?: number;
    height?: number;
  };
  height?: number;
  payload?: WeeklyCaloriesDatum;
  width?: number;
  x?: number;
  y?: number;
};

const weeklyMaxCalories =
  Math.max(
    ...weeklyCaloriesData.flatMap(({ calories, limit }) => [calories, limit]),
  ) + 160;

const chartConfig = {
  calories: {
    color: "var(--color-primary-fixed)",
    label: "Calories",
  },
} satisfies ChartConfig;

const WeeklyCaloriesBarShape = ({
  background,
  height = 0,
  payload,
  width = 0,
  x = 0,
  y = 0,
}: WeeklyCaloriesBarShapeProps) => {
  if (!payload) {
    return null;
  }

  const fullBarHeight = background?.height ?? height;
  const fullBarY = background?.y ?? y;
  const limitY =
    fullBarY + fullBarHeight * (1 - payload.limit / weeklyMaxCalories);
  const fill =
    payload.calories <= payload.limit
      ? "var(--color-calories)"
      : "var(--color-red-600)";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={width / 2}
        fill={fill}
      />
      <line
        x1={x}
        x2={x + width}
        y1={limitY}
        y2={limitY}
        stroke="rgba(255, 255, 255, 0.92)"
        strokeLinecap="round"
        strokeWidth={2}
      />
    </g>
  );
};

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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[17rem] w-full"
          initialDimension={{ width: 720, height: 272 }}
        >
          <BarChart
            accessibilityLayer
            data={weeklyCaloriesData}
            barCategoryGap="42%"
            margin={{ top: 12, right: 10, bottom: 16, left: 10 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tickMargin={16}
              tick={{
                fill: "var(--color-muted-foreground)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.12em",
              }}
            />
            <YAxis domain={[0, weeklyMaxCalories]} />
            <Bar
              dataKey="calories"
              background={{ fill: "transparent" }}
              maxBarSize={42}
              shape={(props) => (
                <WeeklyCaloriesBarShape
                  {...(props as WeeklyCaloriesBarShapeProps)}
                />
              )}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  );
};
