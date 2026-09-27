import type { HabitCardModel } from "#/verticals/dashboard/dashboard-v2-model.ts";

import { cn } from "#/lib/utils.ts";

import { MiniAnalyticsCard } from "./MiniAnalyticsCard.tsx";

const PENDING_HABIT_TITLES = ["Weighing", "Food Logs"] as const;

function HabitCard({ model }: { model: HabitCardModel }) {
  return (
    <MiniAnalyticsCard title={model.title} className="@container">
      <MiniAnalyticsCard.Title>{model.title}</MiniAnalyticsCard.Title>
      <MiniAnalyticsCard.Subtitle>{model.subtitle}</MiniAnalyticsCard.Subtitle>
      <MiniAnalyticsCard.ChartArea
        className="mt-4 grid grid-flow-col grid-cols-10 grid-rows-3 gap-0.75"
        role="img"
        aria-label={`${model.title}: ${model.completedCurrentWeek} of 7 days this week`}
      >
        {model.days.map((day) => (
          <span
            aria-label={`${day.date}: ${day.status}`}
            className={cn(
              "w-full aspect-square",
              day.status === "complete" ? "bg-primary" : "bg-black/[0.055]",
            )}
            key={day.date}
          />
        ))}
      </MiniAnalyticsCard.ChartArea>
      <MiniAnalyticsCard.Separator className="my-4" />
      <MiniAnalyticsCard.BottomSummary interactive={false}>
        <span className="flex min-w-0 items-baseline gap-1.5">
          <MiniAnalyticsCard.SummaryStat>{model.completedCurrentWeek}/7</MiniAnalyticsCard.SummaryStat>
          <span className="truncate text-xs text-on-surface-variant">this week</span>
        </span>
      </MiniAnalyticsCard.BottomSummary>
    </MiniAnalyticsCard>
  );
}

function PendingHabitCard({ title }: { title: (typeof PENDING_HABIT_TITLES)[number] }) {
  return (
    <MiniAnalyticsCard title={title}>
      <MiniAnalyticsCard.Title>{title}</MiniAnalyticsCard.Title>
      <MiniAnalyticsCard.Subtitle>Last 30 Days</MiniAnalyticsCard.Subtitle>
      <MiniAnalyticsCard.ChartArea
        aria-label={`${title}: history unavailable`}
        className="mt-4 grid grid-cols-10 gap-1.5"
        role="img"
      >
        {Array.from({ length: 30 }, (_, index) => (
          <span aria-hidden="true" className="aspect-square rounded-sm bg-black/[0.055]" key={index} />
        ))}
      </MiniAnalyticsCard.ChartArea>
      <MiniAnalyticsCard.Separator className="my-4" />
      <MiniAnalyticsCard.BottomSummary interactive={false}>
        <span aria-hidden="true" className="h-5 w-12 animate-pulse rounded bg-black/[0.055]" />
      </MiniAnalyticsCard.BottomSummary>
    </MiniAnalyticsCard>
  );
}

export { HabitCard, PendingHabitCard, PENDING_HABIT_TITLES };
