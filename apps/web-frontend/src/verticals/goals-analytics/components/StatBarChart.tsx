import type { ReactNode } from "react";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Card, CardContent } from "#/shared/components/base/Card.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/shared/components/base/chart.tsx";

type StatBarChartDatum = {
  eaten: number;
  label: string;
  limit: number;
};

type StatBarChartProps = {
  children: ReactNode;
  data: StatBarChartDatum[];
};

const statBarChartConfig = {
  eaten: {
    label: "Fats",
    color: "var(--color-primary-fixed)",
  },
  limit: {
    label: "Limit",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

export function StatBarChart({ children, data }: StatBarChartProps) {
  const limit = data[0]?.limit ?? 0;
  const maxValue = data.length
    ? Math.max(...data.flatMap(({ eaten, limit }) => [eaten, limit]))
    : 0;
  const yAxisMax = Math.ceil((maxValue * 1.1) / 10) * 10;

  return (
    <Card className="rounded-[14px] border-white/70 bg-white/60 py-0 shadow-[0_28px_70px_-44px_rgba(0,0,0,0.65)]">
      <CardContent className="px-4 pb-7 pt-12 md:px-8 md:pb-9 md:pt-14">
        <div className="text-center">
          <p className="font-heading text-[2.75rem] font-light leading-none text-primary md:text-[3rem]">
            {children}
          </p>
          <p className="mt-3 text-base font-medium text-on-surface md:text-lg">
            Weekly fat average
          </p>
        </div>

        <div className="mt-12 min-w-0 md:mt-16">
          <ChartContainer
            config={statBarChartConfig}
            className="h-[18rem] w-full aspect-auto cursor-pointer md:h-[22rem]"
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 16, right: 8, bottom: 10, left: 8 }}
              responsive
              barCategoryGap="35%"
              className="min-h-[18rem] flex-1 md:min-h-[22rem]"
            >
              <YAxis
                domain={[0, yAxisMax]}
                width="auto"
                tick={{
                  fill: "var(--color-on-surface)",
                  fontSize: 14,
                  fontWeight: 400,
                }}
              />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                tickMargin={16}
                tick={{
                  fill: "var(--color-on-surface)",
                  fontSize: 16,
                  fontWeight: 400,
                }}
                height={48}
              />
              <ChartTooltip
                cursor={{
                  fill: "color-mix(in srgb, var(--color-primary-fixed) 45%, transparent)",
                }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) =>
                      payload[0]?.payload?.label ?? ""
                    }
                    formatter={(value, _, item) => {
                      const payload = item.payload as
                        | StatBarChartDatum
                        | undefined;
                      const percentOfLimit = payload
                        ? Math.round((payload.eaten / payload.limit) * 100)
                        : 0;

                      return (
                        <span className="font-medium text-foreground">
                          {Number(value).toFixed(0)}g / {percentOfLimit}% of
                          limit
                        </span>
                      );
                    }}
                  />
                }
              />
              <ReferenceLine
                y={limit}
                stroke="var(--color-limit)"
                strokeDasharray="6 6"
                ifOverflow="extendDomain"
              />
              <Bar
                dataKey="eaten"
                fill="var(--color-eaten)"
                radius={[8, 8, 8, 8]}
                maxBarSize={48}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export type { StatBarChartDatum };
