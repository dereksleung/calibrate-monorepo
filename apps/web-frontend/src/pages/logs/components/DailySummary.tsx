import { Pencil } from "lucide-react";

import { cn } from "#/lib/utils.ts";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import type { NutritionTotals, ProgressValue } from "../log-page-helpers.ts";
import { DAILY_TARGETS, MACRO_PROGRESS_COLORS } from "../log-page-helpers.ts";

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
};

function ProgressBar({ progress, color, className }: { progress: ProgressValue; color: string; className?: string }) {
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
      <p className="text-label-sm uppercase tracking-[0.24em] text-on-surface">{label}</p>
      <p className="whitespace-nowrap text-lg font-light text-on-surface md:text-base">
        {Math.round(value)}g <span className="text-on-surface-variant/60">/ {target}g</span>
      </p>
      <ProgressBar progress={progress} color={color} />
    </div>
  );
}

export function DailySummary({ totals, progress, weight }: DailySummaryProps) {
  const caloriesRemaining = Math.max(DAILY_TARGETS.calories - totals.calories, 0);

  return (
    <section
      aria-labelledby="daily-summary-heading"
      className="rounded-[2rem] bg-surface-container-lowest px-8 py-9 shadow-[0_18px_45px_-30px_rgba(26,28,28,0.45)] ring-1 ring-on-surface/5 md:rounded-2xl md:px-12 md:py-10"
    >
      <Typography id="daily-summary-heading" as="h2" variant="label" color="onSurfaceVariant" className="sr-only">
        Daily summary
      </Typography>

      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end md:gap-12">
        <div className="grid grid-cols-[1fr_auto] gap-8 md:block">
          <div>
            <p className="text-label-sm uppercase tracking-[0.24em] text-on-surface">Eaten</p>
            <div className="mt-3 flex flex-wrap items-end gap-x-2">
              <span className="font-heading text-5xl font-light leading-none text-on-surface md:text-6xl">
                {Math.round(totals.calories).toLocaleString()}
              </span>
              <span className="pb-1 text-2xl font-light text-on-surface-variant/65">
                / {DAILY_TARGETS.calories.toLocaleString()}
              </span>
              <span className="basis-full text-2xl font-light text-on-surface md:basis-auto">kcal</span>
            </div>
            <ProgressBar
              progress={progress.calories}
              color={MACRO_PROGRESS_COLORS.calories}
              className="mt-5 max-w-64"
            />
          </div>

          <div className="text-right md:mt-12 md:text-left">
            <div className="flex items-center justify-end gap-2 md:justify-start">
              <p className="text-label-sm uppercase tracking-[0.24em] text-on-surface">Weight</p>
              {weight ? <Pencil aria-hidden className="size-4 text-on-surface-variant/50" strokeWidth={1.5} /> : null}
            </div>
            {weight ? (
              <p className="mt-2 text-3xl font-light text-on-surface md:text-2xl">
                {weight.toFixed(1)} <span className="text-base text-on-surface-variant/70">lb</span>
              </p>
            ) : (
              <p className="mt-2 max-w-44 text-sm text-on-surface-variant/70 md:max-w-none">
                Log today&apos;s weight to keep your trend grounded.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
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

      <p className="mt-7 text-sm text-on-surface-variant/70">
        {caloriesRemaining.toLocaleString()} calories remaining today.
      </p>
    </section>
  );
}
