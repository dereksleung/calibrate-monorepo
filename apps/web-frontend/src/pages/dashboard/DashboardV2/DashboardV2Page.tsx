import type { DashboardNutritionMetric, DashboardV2ViewModel } from "#/verticals/dashboard/dashboard-v2-model.ts";

import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { APP_CONTENT_FRAME_CLASS_NAME } from "#/shared/layout/app-content-frame.ts";
import { useRef, useState } from "react";

import { DashboardAnalyticsDrawer } from "./components/DashboardAnalyticsDrawer.tsx";
import { HabitCard, PendingHabitCard, PENDING_HABIT_TITLES } from "./components/HabitCard.tsx";
import { NutritionCard, PendingNutritionCard, PENDING_NUTRITION_TITLES } from "./components/NutritionCard.tsx";
import { PendingSevenDayNutrition, SevenDayNutrition } from "./components/SevenDayNutrition.tsx";

const NUTRITION_CARD_ORDER: DashboardNutritionMetric[] = [
  "calories",
  "proteinGrams",
  "totalFatGrams",
  "totalCarbohydrateGrams",
];

type DashboardV2PageProps = {
  error?: Error | null;
  isPending?: boolean;
  onRetry?: () => void;
  viewModel?: DashboardV2ViewModel;
};

function DashboardSectionsContent({
  onOpenNutrition,
  viewModel,
}: {
  onOpenNutrition: (metric: DashboardNutritionMetric, trigger: HTMLButtonElement) => void;
  viewModel: DashboardV2ViewModel;
}) {
  return (
    <>
      <section aria-labelledby="seven-day-nutrition-heading" className="space-y-3">
        <Typography
          as="h2"
          className="text-on-primary-fixed"
          id="seven-day-nutrition-heading"
          variant="h2SectionTitle"
        >
          Seven-day nutrition
        </Typography>
        <SevenDayNutrition rows={viewModel.sevenDayNutrition.rows} />
      </section>

      <section aria-labelledby="habits-heading" className="space-y-3">
        <Typography as="h2" className="text-on-primary-fixed" id="habits-heading" variant="h2SectionTitle">
          Habits
        </Typography>
        <div className="grid grid-cols-2 gap-3" data-testid="habit-card-grid">
          <HabitCard model={viewModel.habits.weighIn} />
          <HabitCard model={viewModel.habits.foodLogging} />
        </div>
      </section>

      <section aria-labelledby="nutrition-heading" className="space-y-3">
        <Typography as="h2" className="text-on-primary-fixed" id="nutrition-heading" variant="h2SectionTitle">
          Nutrition
        </Typography>
        <div className="grid grid-cols-2 gap-3" data-testid="nutrition-card-grid">
          {NUTRITION_CARD_ORDER.map((metric) => (
            <NutritionCard
              key={metric}
              model={viewModel.nutritionCards[metric]}
              onOpen={(trigger) => onOpenNutrition(metric, trigger)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function PendingDashboardSections() {
  return (
    <>
      <section aria-labelledby="seven-day-nutrition-heading" className="space-y-3">
        <Typography
          as="h2"
          className="text-on-primary-fixed"
          id="seven-day-nutrition-heading"
          variant="h2SectionTitle"
        >
          Seven-day nutrition
        </Typography>
        <PendingSevenDayNutrition />
      </section>

      <section aria-labelledby="habits-heading" className="space-y-3">
        <Typography as="h2" className="text-on-primary-fixed" id="habits-heading" variant="h2SectionTitle">
          Habits
        </Typography>
        <div className="grid grid-cols-2 gap-3" data-testid="habit-card-grid">
          {PENDING_HABIT_TITLES.map((title) => (
            <PendingHabitCard key={title} title={title} />
          ))}
        </div>
      </section>

      <section aria-labelledby="nutrition-heading" className="space-y-3">
        <Typography as="h2" className="text-on-primary-fixed" id="nutrition-heading" variant="h2SectionTitle">
          Nutrition
        </Typography>
        <div className="grid grid-cols-2 gap-3" data-testid="nutrition-card-grid">
          {PENDING_NUTRITION_TITLES.map((title) => (
            <PendingNutritionCard key={title} title={title} />
          ))}
        </div>
      </section>
    </>
  );
}

function DashboardLoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="glass-card rounded-xl p-4" role="alert">
      <p className="font-heading text-lg font-semibold text-on-primary-fixed">
        Live nutrition is unavailable
      </p>
      <p className="mt-1 text-sm text-on-surface-variant">Your dashboard could not be loaded.</p>
      {onRetry ? (
        <button className="mt-3 self-start text-primary underline" onClick={onRetry} type="button">
          Try again
        </button>
      ) : null}
    </div>
  );
}

function DashboardSections({
  isPending,
  onOpenNutrition,
  viewModel,
}: {
  isPending: boolean;
  onOpenNutrition: (metric: DashboardNutritionMetric, trigger: HTMLButtonElement) => void;
  viewModel?: DashboardV2ViewModel;
}) {
  if (viewModel) {
    return (
      <>
        {/* For background refetches */}
        {isPending ? (
          <p aria-live="polite" className="sr-only">
            Updating…
          </p>
        ) : null}
        <DashboardSectionsContent onOpenNutrition={onOpenNutrition} viewModel={viewModel} />
      </>
    );
  }

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading dashboard" role="status">
        <PendingDashboardSections />
      </div>
    );
  }

  return <PendingDashboardSections />;
}

function DashboardV2Page({ error = null, isPending = false, onRetry, viewModel }: DashboardV2PageProps) {
  const [selectedMetric, setSelectedMetric] = useState<DashboardNutritionMetric | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const selectedModel = viewModel && selectedMetric ? viewModel.analytics[selectedMetric] : null;

  return (
    <>
      <main className="pt-4">
        <div className={APP_CONTENT_FRAME_CLASS_NAME}>
          <h1 className="hidden md:block md:sr-only">Overview</h1>
          <div className="space-y-8">
            {error ? <DashboardLoadError onRetry={onRetry} /> : null}
            <DashboardSections
              isPending={isPending}
              onOpenNutrition={(metric, trigger) => {
                returnFocusRef.current = trigger;
                setSelectedMetric(metric);
              }}
              viewModel={viewModel}
            />
          </div>
        </div>
      </main>

      <DashboardAnalyticsDrawer
        model={selectedModel}
        onClose={() => setSelectedMetric(null)}
        returnFocusRef={returnFocusRef}
      />
    </>
  );
}

export { DashboardV2Page };
export type { DashboardV2PageProps };
