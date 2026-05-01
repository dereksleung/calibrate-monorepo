import { Card } from "#/shared/components/base/Card.tsx";
import { ChartContainer, type ChartConfig } from "#/shared/components/base/chart.tsx";
import {
  Bar,
  BarChart,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const dailyCalories = {
  eaten: 1150,
  limit: 1650,
}

const dailyCaloriesData = [
  {
    name: "eaten",
    calories: dailyCalories.eaten,
    fill: "url(#daily-calories-gradient)",
  },
  {
    name: "remaining",
    calories: dailyCalories.limit - dailyCalories.eaten,
    fill: "var(--color-remaining)",
  },
]

const weeklyCaloriesData = [
  { day: "MON", calories: 1540, limit: 1650 },
  { day: "TUE", calories: 1600, limit: 1650 },
  { day: "WED", calories: 1625, limit: 1650 },
  { day: "THU", calories: 1420, limit: 1650 },
  { day: "FRI", calories: 2160, limit: 1800 },
  { day: "SAT", calories: 1160, limit: 1800 },
  { day: "SUN", calories: 1060, limit: 1800 },
]

type WeeklyCaloriesDatum = (typeof weeklyCaloriesData)[number]

type WeeklyCaloriesBarShapeProps = {
  background?: {
    y?: number
    height?: number
  }
  height?: number
  payload?: WeeklyCaloriesDatum
  width?: number
  x?: number
  y?: number
}

const weeklyMaxCalories =
  Math.max(
    ...weeklyCaloriesData.flatMap(({ calories, limit }) => [calories, limit])
  ) + 160

const chartConfig = {
  eaten: {
    color: "var(--color-primary)",
    label: "Eaten",
  },
  remaining: {
    color: "var(--color-surface-container-low)",
    label: "Remaining",
  },
  calories: {
    color: "var(--color-primary-fixed)",
    label: "Calories",
  },
} satisfies ChartConfig

const formatCalories = (calories: number) => calories.toLocaleString()

const WeeklyCaloriesBarShape = ({
  background,
  height = 0,
  payload,
  width = 0,
  x = 0,
  y = 0,
}: WeeklyCaloriesBarShapeProps) => {
  if (!payload) {
    return null
  }


  const fullBarHeight = background?.height ?? height
  const fullBarY = background?.y ?? y
  const limitY = fullBarY + fullBarHeight * (1 - payload.limit / weeklyMaxCalories)
  const fill = payload.calories <= payload.limit
    ? "var(--color-calories)"
    : "var(--color-red-600)"

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
  )
}

export const DayAndWeekCalories = () => {
  return (
    <Card className="gap-8 px-6 py-8 md:px-10 lg:flex-row lg:items-center lg:px-12">
      <div className="flex justify-center lg:w-[34%]">
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-[17rem] max-h-full w-full max-w-[17rem]"
          initialDimension={{ width: 272, height: 272 }}
        >
          <PieChart accessibilityLayer>
            <defs>
              <linearGradient
                id="daily-calories-gradient"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--color-primary-fixed)" />
                <stop offset="100%" stopColor="var(--color-primary)" />
              </linearGradient>
            </defs>
            <Pie
              data={dailyCaloriesData}
              dataKey="calories"
              nameKey="name"
              innerRadius={100}
              outerRadius={118}
              paddingAngle={3}
              cornerRadius={18}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                    return null
                  }

                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-primary font-heading text-[2.5rem] font-light"
                      >
                        {formatCalories(dailyCalories.eaten)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 28}
                        className="fill-on-surface font-sans text-[0.75rem] font-medium uppercase tracking-[0.22em]"
                      >
                        of {formatCalories(dailyCalories.limit)} kcal
                      </tspan>
                    </text>
                  )
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
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
