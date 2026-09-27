import type { NutritionCardModel } from "#/verticals/dashboard/dashboard-v2-model.ts";

import { MiniAnalyticsCard } from "./MiniAnalyticsCard.tsx";

const NUTRITION_COLORS = {
  calories: "bg-calories-stone",
  proteinGrams: "bg-protein-vibrant-rose",
  totalFatGrams: "bg-fats-vibrant-violet",
  totalCarbohydrateGrams: "bg-carbs-vibrant-azure",
} as const;

const PENDING_NUTRITION_TITLES = ["Calories", "Protein", "Fats", "Carbs"] as const;

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}

function NutritionCard({
  model,
  onOpen,
}: {
  model: NutritionCardModel;
  onOpen: (trigger: HTMLButtonElement) => void;
}) {
  const fillPercentage = Math.min((model.amount / (model.target * 1.25)) * 100, 100);

  return (
    <MiniAnalyticsCard title={model.title}>
      <MiniAnalyticsCard.Title>{model.title}</MiniAnalyticsCard.Title>
      <MiniAnalyticsCard.Subtitle>Today</MiniAnalyticsCard.Subtitle>
      <MiniAnalyticsCard.ChartArea className="mt-5">
        <div
          aria-label={`${formatAmount(model.amount)} ${model.unit} of ${formatAmount(model.target)} ${model.unit}`}
          className="relative h-2 overflow-visible rounded-full bg-black/[0.055]"
          role="img"
        >
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${NUTRITION_COLORS[model.metric]}`}
            style={{ width: `${fillPercentage}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute -top-0.5 bottom-[-0.125rem] left-[80%] w-0.5 rounded-full bg-on-surface-variant/70"
          />
        </div>
      </MiniAnalyticsCard.ChartArea>
      <MiniAnalyticsCard.Separator className="my-4" />
      <MiniAnalyticsCard.BottomSummary
        accessibleName={`Open ${model.title} analytics`}
        interactive
        onClick={(event) => onOpen(event.currentTarget)}
      >
        <span className="flex min-w-0 items-baseline gap-1">
          <MiniAnalyticsCard.SummaryStat>{formatAmount(model.amount)}</MiniAnalyticsCard.SummaryStat>
          <span className="truncate text-xs text-on-surface-variant">{model.unit}</span>
        </span>
      </MiniAnalyticsCard.BottomSummary>
    </MiniAnalyticsCard>
  );
}

function PendingNutritionCard({ title }: { title: (typeof PENDING_NUTRITION_TITLES)[number] }) {
  return (
    <MiniAnalyticsCard title={title}>
      <MiniAnalyticsCard.Title>{title}</MiniAnalyticsCard.Title>
      <MiniAnalyticsCard.Subtitle>Today</MiniAnalyticsCard.Subtitle>
      <MiniAnalyticsCard.ChartArea className="mt-5">
        <div aria-hidden="true" className="h-2 animate-pulse rounded-full bg-black/[0.055]" />
      </MiniAnalyticsCard.ChartArea>
      <MiniAnalyticsCard.Separator className="my-4" />
      <MiniAnalyticsCard.BottomSummary interactive={false}>
        <span aria-hidden="true" className="h-5 w-16 animate-pulse rounded bg-black/[0.055]" />
      </MiniAnalyticsCard.BottomSummary>
    </MiniAnalyticsCard>
  );
}

export { NutritionCard, PendingNutritionCard, PENDING_NUTRITION_TITLES };
