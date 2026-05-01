import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  type ChartConfig,
} from "#/shared/components/base/chart.tsx"

type EatenDonutChartProps = {
  eaten: number
  limit: number
}

const chartConfig = {
  eaten: {
    color: "var(--color-primary)",
    label: "Eaten",
  },
  remaining: {
    color: "var(--color-surface-container-low)",
    label: "Remaining",
  },
} satisfies ChartConfig

const formatEatenChartValue = (value: number) => value.toLocaleString()

export const EatenDonutChart = ({ eaten, limit }: EatenDonutChartProps) => {
  const uniqueId = React.useId().replace(/:/g, "")
  const gradientId = `${uniqueId}-eaten-gradient`
  const redGradientId = `${uniqueId}-eaten-over-limit-gradient`
  const eatenLimitDelta = limit - eaten
  const isUnderLimit = eatenLimitDelta >= 0
  const eatenLimitComparisonLabel = isUnderLimit ? "Under" : "Over"
  const eatenLimitComparisonTone = isUnderLimit
    ? "fill-primary"
    : "fill-destructive"
  const activeGradientId = isUnderLimit ? gradientId : redGradientId
  const chartData = [
    {
      name: "eaten",
      value: Math.min(eaten, limit),
      fill: `url(#${activeGradientId})`,
    },
    {
      name: "remaining",
      value: Math.max(eatenLimitDelta, 0),
      fill: "var(--color-remaining)",
    },
  ]

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-square h-[17rem] max-h-full w-full max-w-[17rem]"
      initialDimension={{ width: 272, height: 272 }}
    >
      <PieChart accessibilityLayer>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-fixed)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
          <linearGradient id={redGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-orange-500)" />
            <stop offset="100%" stopColor="var(--color-red-600)" />
          </linearGradient>
        </defs>
        <Pie
          data={chartData}
          dataKey="value"
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
                    className={`${eatenLimitComparisonTone} font-heading text-[2.5rem] font-light`}
                  >
                    {formatEatenChartValue(Math.abs(eatenLimitDelta))}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) + 28}
                    className={`${eatenLimitComparisonTone} font-sans text-[0.75rem] font-medium uppercase tracking-[0.22em]`}
                  >
                    {eatenLimitComparisonLabel}
                  </tspan>
                </text>
              )
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
