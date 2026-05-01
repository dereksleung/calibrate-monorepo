import {
  ChartContainer,
  type ChartConfig,
} from "#/shared/components/base/chart.tsx";
import { useIsMobile } from "#/shared/hooks/use-media-query";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

const Y_AXIS_PADDING = 160;

export type WeeklyDatum = {
  label: string;
  eaten: number;
  limit: number;
};

type WeeklyBarChartProps = {
  weeklyData: WeeklyDatum[];
  className?: string;
  seriesLabel?: string;
};

type EatenLimitBarShapeProps = {
  background?: {
    y?: number;
    height?: number;
  };
  height?: number;
  payload?: WeeklyDatum;
  width?: number;
  x?: number;
  y?: number;
  yAxisMax: number;
};

const EatenLimitBarShape = ({
  background,
  height = 0,
  payload,
  width = 0,
  x = 0,
  y = 0,
  yAxisMax,
}: EatenLimitBarShapeProps) => {
  if (!payload) {
    return null;
  }

  const fullBarHeight = background?.height ?? height;
  const fullBarY = background?.y ?? y;
  const limitY = fullBarY + fullBarHeight * (1 - payload.limit / yAxisMax);
  const fill =
    payload.eaten <= payload.limit
      ? "var(--color-primary-fixed)"
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

export const WeeklyBarChart = ({
  weeklyData,
  className,
  seriesLabel = "Calories",
}: WeeklyBarChartProps) => {
  const maxValue = weeklyData.length
    ? Math.max(...weeklyData.flatMap(({ eaten, limit }) => [eaten, limit]))
    : 0;
  const yAxisMax = maxValue + Y_AXIS_PADDING;

  const chartConfig = {
    eaten: {
      label: seriesLabel,
    },
  } satisfies ChartConfig;

  const isMobile = useIsMobile();

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      // initialDimension={{ width: 720, height: 272 }}
    >
      <BarChart
        accessibilityLayer
        data={weeklyData}
        barCategoryGap="42%"
        className="flex-1 min-h-10"
        responsive
      >
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={isMobile ? 8 : 16}
          tick={{
            fill: "var(--color-muted-foreground)",
            fontSize: isMobile ? 9 : 12,
            fontWeight: 500,
            letterSpacing: isMobile ? "0.02em" : "0.12em",
          }}
        />
        <YAxis 
          domain={[0, yAxisMax]} 
          tick={{
            fontWeight: isMobile ? 300 : 500,
            fill: "var(--color-muted-foreground)",
            fontSize: isMobile ? 9 : 12,
          }}
          width="auto"
          label={false}
        />
        <Bar
          dataKey="eaten"
          background={{ fill: "transparent" }}
          maxBarSize={42}
          shape={(props) => (
            <EatenLimitBarShape
              {...(props as Omit<EatenLimitBarShapeProps, "yAxisMax">)}
              yAxisMax={yAxisMax}
            />
          )}
        />
      </BarChart>
    </ChartContainer>
  );
};
