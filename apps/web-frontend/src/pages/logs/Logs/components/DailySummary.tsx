import { cn } from "#/lib/utils.ts";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  onSaveWeight: (weight: number) => Promise<void>;
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

const MAX_WEIGHT = 999.9;

function normalizeWeight(value: number): number {
  return Number(
    value.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 1,
    }),
  );
}

function formatWeight(weight: number | null): string {
  return weight == null ? "" : weight.toFixed(1);
}

function parseWeight(value: string): number | null {
  if (value.trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  const normalized = normalizeWeight(parsed);
  return normalized > 0 && normalized <= MAX_WEIGHT ? normalized : null;
}

export function DailySummary({ totals, progress, weight, onSaveWeight, weightInputRef }: DailySummaryProps) {
  const caloriesRemaining = Math.max(DAILY_TARGETS.calories - totals.calories, 0);
  const [draft, setDraft] = useState(() => formatWeight(weight));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedWeightRef = useRef(weight);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!isEditing && !isSavingRef.current) {
      savedWeightRef.current = weight;
      setDraft(formatWeight(weight));
    }
  }, [isEditing, weight]);

  function restoreSavedWeight() {
    setDraft(formatWeight(savedWeightRef.current));
    setIsEditing(false);
  }

  function focusWeightInput() {
    weightInputRef?.current?.focus();
  }

  async function saveOnBlur() {
    if (isSavingRef.current) return;

    const nextWeight = parseWeight(draft);
    const savedWeight = savedWeightRef.current;
    if (nextWeight === null || nextWeight === savedWeight) {
      restoreSavedWeight();
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await onSaveWeight(nextWeight);
      savedWeightRef.current = nextWeight;
      setDraft(formatWeight(nextWeight));
      setIsEditing(false);
    } catch {
      restoreSavedWeight();
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

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
          <div className="flex gap-2">
            <Typography variant="labelSpaced" color="onSurface">
              Weight
            </Typography>
            <button
              type="button"
              aria-label={weight == null ? "Log weight" : "Edit weight"}
              className="inline-flex relative -top-2 size-8 items-center justify-center rounded-full text-on-surface-variant/60 transition-colors hover:bg-surface-container-high hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
              disabled={isSaving}
              onClick={focusWeightInput}
            >
              <Pencil aria-hidden className="size-4" strokeWidth={1.5} />
            </button>
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
            {isSaving ? (
              <span className={cn(calorieLimitClassName, "text-right")} role="status">
                Saving..
              </span>
            ) : (
              <input
                ref={weightInputRef}
                aria-label="Weight in pounds"
                className={cn(
                  calorieLimitClassName,
                  "w-24 min-w-0 rounded-lg bg-transparent px-2 py-1 text-right outline-none transition-colors placeholder:text-on-surface-variant/40 focus-visible:bg-surface-container-lowest focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
                )}
                inputMode="decimal"
                onBlur={() => void saveOnBlur()}
                onChange={(event) => {
                  if (isSavingRef.current) return;
                  setIsEditing(true);
                  setDraft(event.target.value);
                }}
                onFocus={() => setIsEditing(true)}
                type="text"
                value={draft}
              />
            )}
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
