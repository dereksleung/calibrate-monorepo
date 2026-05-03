import type { ReactNode } from "react";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { cn } from "#/lib/utils.ts";
import { Card, CardContent } from "#/shared/components/base/Card.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/shared/components/base/chart.tsx";

type StatBarChartDatum = {
  label: string;
  limit: number;
  value: number;
};

type StatBarChartProps = {
  ariaLabel?: string;
  chartConfig: ChartConfig;
  children: ReactNode;
  data: StatBarChartDatum[];
  onClick?: () => void;
  valueUnit?: string;
};

export function StatBarChart({
  ariaLabel,
  chartConfig,
  children,
  data,
  onClick,
  valueUnit,
}: StatBarChartProps) {
  const limit = data[0]?.limit ?? 0;
  const maxValue = data.length
    ? Math.max(...data.flatMap(({ value, limit }) => [value, limit]))
    : 0;
  const yAxisMax = Math.ceil((maxValue * 1.1) / 10) * 10;

  return (
    <Card
      aria-label={ariaLabel}
      className={cn(
        "rounded-[14px] border-white/70 bg-white/60 py-0 shadow-[0_28px_70px_-44px_rgba(0,0,0,0.65)]",
        onClick &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="px-4 pb-7 pt-12 md:px-8 md:pb-9 md:pt-14">
        {children}

        <div className="mt-12 min-w-0 md:mt-16">
          <ChartContainer
            config={chartConfig}
            className={cn(
              "h-[18rem] w-full aspect-auto md:h-[22rem]",
              onClick && "cursor-pointer",
            )}
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
                  fill: "color-mix(in srgb, var(--color-value) 45%, transparent)",
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
                        ? Math.round(
                            (payload.value / (payload.limit || 1)) * 100,
                          )
                        : 0;
                      const unitLabel = valueUnit ?? "";

                      return (
                        <span className="font-medium text-foreground">
                          {Number(value).toFixed(0)}
                          {unitLabel} / {percentOfLimit}% of limit
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
                dataKey="value"
                fill="var(--color-value)"
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
