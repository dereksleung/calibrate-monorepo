import { cn } from "#/lib/utils.ts";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { Pencil } from "lucide-react";
import type { RefObject } from "react";

import type { NutritionTotals, ProgressValue } from "../../log-page-helpers.ts";

import { DAILY_TARGETS, MACRO_PROGRESS_COLORS } from "../../log-page-helpers.ts";

type DailyProgress = {
  calories: ProgressValue;
  proteinGrams: ProgressValue;
  totalFatGrams: ProgressValue;
  totalCarbohydrateGrams: ProgressValue;
};

type DailySummaryProps = {
  totals: NutritionTotals;
  progress: DailyProgress;
  weight: number | null;
  weightInputRef?: RefObject<HTMLInputElement | null>;
};

function ProgressBar({
  progress,
  color,
  className,
}: {
  progress: ProgressValue;
  color: string;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-container-high", className)}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${progress.percent}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

function MacroStat({
  label,
  value,
  target,
  progress,
  color,
}: {
  label: string;
  value: number;
  target: number;
  progress: ProgressValue;
  color: string;
}) {
  return (
    <div className="min-w-0 space-y-3">
      <Typography variant="labelSpaced" color="onSurface">
        {label}
      </Typography>
      <p className="whitespace-nowrap text-[0.8125rem] font-light leading-6 text-on-surface sm:text-lg sm:leading-7 md:text-base md:leading-6">
        {Math.round(value)}g{" "}
        <span className="text-xs text-on-surface-variant/60 sm:text-lg md:text-base">/ {target}g</span>
      </p>
      <ProgressBar progress={progress} color={color} />
    </div>
  );
}

const calorieLimitClassName = "text-xl font-light leading-none text-on-surface-variant/65";

export function DailySummary({ totals, progress, weight, weightInputRef }: DailySummaryProps) {
  const caloriesRemaining = Math.max(DAILY_TARGETS.calories - totals.calories, 0);

  return (
    <section
      aria-labelledby="daily-summary-heading"
      className="glass-card w-full rounded-[2rem] px-3 py-5 md:rounded-2xl"
    >
      <Typography
        id="daily-summary-heading"
        as="h2"
        variant="label"
        color="onSurfaceVariant"
        className="sr-only"
      >
        Daily summary
      </Typography>

      <div className="grid gap-8 md:gap-10">
        <div className="grid grid-cols-[minmax(min-content,1fr)_auto] gap-x-4">
          <Typography variant="labelSpaced" color="onSurface">
            Eaten
          </Typography>
          <div className="flex items-center gap-2">
            <Typography variant="labelSpaced" color="onSurface">
              Weight
            </Typography>
            <Pencil aria-hidden className="size-4 text-on-surface-variant/50" strokeWidth={1.5} />
          </div>
          <div className="col-span-2 mt-3 grid grid-cols-subgrid items-baseline">
            <div className="flex items-baseline">
              <span className="font-heading text-4xl font-light leading-none text-on-surface md:text-6xl">
                {Math.round(totals.calories).toLocaleString()}
              </span>
              <span className={calorieLimitClassName}>/ {DAILY_TARGETS.calories.toLocaleString()}</span>
              <p className="ml-4 hidden text-sm leading-none text-on-surface-variant/70 md:block">
                {caloriesRemaining.toLocaleString()} left
              </p>
            </div>
            <input
              ref={weightInputRef}
              aria-label="Weight in pounds"
              className={cn(
                calorieLimitClassName,
                "w-24 min-w-0 rounded-lg bg-transparent px-2 py-1 text-right outline-none transition-colors placeholder:text-on-surface-variant/40 focus-visible:bg-surface-container-lowest focus-visible:ring-2 focus-visible:ring-primary/20",
              )}
              defaultValue={weight != null ? weight.toFixed(1) : ""}
              inputMode="decimal"
              placeholder="—"
              type="text"
            />
          </div>
          <div className="col-span-2 w-2/3 md:w-full">
            <ProgressBar
              progress={progress.calories}
              color={MACRO_PROGRESS_COLORS.calories}
              className="mt-5"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:gap-5 md:gap-10">
          <MacroStat
            label="Protein"
            value={totals.proteinGrams}
            target={DAILY_TARGETS.proteinGrams}
            progress={progress.proteinGrams}
            color={MACRO_PROGRESS_COLORS.proteinGrams}
          />
          <MacroStat
            label="Carbs"
            value={totals.totalCarbohydrateGrams}
            target={DAILY_TARGETS.totalCarbohydrateGrams}
            progress={progress.totalCarbohydrateGrams}
            color={MACRO_PROGRESS_COLORS.totalCarbohydrateGrams}
          />
          <MacroStat
            label="Fat"
            value={totals.totalFatGrams}
            target={DAILY_TARGETS.totalFatGrams}
            progress={progress.totalFatGrams}
            color={MACRO_PROGRESS_COLORS.totalFatGrams}
          />
        </div>
      </div>
    </section>
  );
}
