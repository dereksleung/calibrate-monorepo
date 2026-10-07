import type {
  ChangeEntry,
  NutrientAnalyticsModel,
} from "@calibrate/frontend-core/verticals/dashboard/dashboard-v2-model";

import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/shared/components/tabs/Tabs.tsx";
import { ArrowDown, ArrowDownUp, ArrowUpRight, Info } from "lucide-react";
import { useState } from "react";

const CHANGE_SUBTITLE = "Compares the most recent two weeks with the two weeks before.";
const INSUFFICIENT_HISTORY_COPY =
  "More history is needed to compare changes. Foods logged in the last 14 days are shown as New.";

type NutrientAnalyticsTab = "change" | "total";

type NutrientAnalyticsProps = {
  defaultTab?: NutrientAnalyticsTab;
  model: NutrientAnalyticsModel;
};

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}

function formatAmountWithUnit(amount: number, unit: NutrientAnalyticsModel["unit"]) {
  return `${formatAmount(amount)} ${unit}`;
}

function formatShare(share: number) {
  return `${Math.round(share * 100)}%`;
}

function formatChange(change: Exclude<ChangeEntry["change"], "new">) {
  const percent = Math.round(change * 100);

  return `${percent > 0 ? "+" : ""}${percent}%`;
}

function maybeReverse<T>(items: readonly T[], reversed: boolean) {
  return reversed ? [...items].reverse() : items;
}

function NutrientAnalytics({ defaultTab = "total", model }: NutrientAnalyticsProps) {
  const [reversed, setReversed] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-analytics-surface text-on-surface">
      <Tabs className="flex min-h-0 flex-1 flex-col gap-0" defaultValue={defaultTab}>
        <div className="flex shrink-0 flex-col gap-3 px-5 pt-6">
          <div className="-mx-5 -mt-6 space-y-4 bg-primary-fixed px-5 pb-5 pt-6">
            <Typography
              color="onPrimaryFixedVariant"
              as="p"
              className="pr-12 text-3xl leading-9"
              variant="h2SectionTitle"
              weight="bold"
            >
              {model.title}
            </Typography>
            <div className="space-y-1.5">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-heading text-4xl font-bold leading-tight tabular-nums tracking-[-0.02em] [overflow-wrap:anywhere]">
                  {formatAmount(model.total.amount)}
                </span>
                <span className="text-base font-medium text-on-primary-fixed-variant">
                  {model.unit} logged
                </span>
              </p>
              <p className="text-sm text-on-primary-fixed-variant">Last 14 days</p>
            </div>
          </div>

          <TabsList
            aria-label={`${model.title} analytics views`}
            className="justify-start gap-6 border-b border-outline-variant/50"
            variant="line"
          >
            <TabsTrigger
              className="min-h-11 min-w-11 flex-none px-1 text-sm data-active:text-surface-tint after:bg-surface-tint group-data-horizontal/tabs:after:bottom-[-1px]"
              value="total"
            >
              Total
            </TabsTrigger>
            <TabsTrigger
              className="min-h-11 min-w-11 flex-none px-1 text-sm data-active:text-surface-tint after:bg-surface-tint group-data-horizontal/tabs:after:bottom-[-1px]"
              value="change"
            >
              Change
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-5"
          value="total"
        >
          <TotalContributions model={model} />
        </TabsContent>

        <TabsContent
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-5"
          value="change"
        >
          <ContributionChange
            model={model}
            onReverse={() => setReversed((current) => !current)}
            reversed={reversed}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TotalContributions({ model }: { model: NutrientAnalyticsModel }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-1">
        <Typography color="inherit" as="h2" variant="h3">{`${model.title} by food`}</Typography>
        <p className="text-sm text-on-surface-variant">Share of your logged total</p>
      </div>

      <div className="overflow-hidden rounded-md border border-outline-variant/40 bg-surface-container-lowest">
        {model.total.contributions.length === 0 ? (
          <div className="space-y-1 p-4">
            <p className="font-medium">No foods logged in the last 14 days.</p>
            <p className="text-sm text-on-surface-variant">Log a meal to see your food breakdown.</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/30">
            {model.total.contributions.map((contribution) => (
              <li className="flex flex-col gap-2 px-4 py-4" key={contribution.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <Typography
                    color="inherit"
                    as="p"
                    className="min-w-0 flex-1 leading-5 [overflow-wrap:anywhere]"
                    variant="body"
                    weight="medium"
                  >
                    {contribution.name}
                  </Typography>
                  <Typography
                    color="inherit"
                    as="p"
                    className="shrink-0 whitespace-nowrap text-sm leading-5 tabular-nums"
                    variant="body"
                    weight="semibold"
                  >
                    {formatAmountWithUnit(contribution.amount, model.unit)}
                  </Typography>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-analytics-track"
                  >
                    <div
                      className="h-full rounded-full bg-surface-tint"
                      style={{ width: `${Math.min(contribution.share * 100, 100)}%` }}
                    />
                  </div>
                  <Typography
                    color="inherit"
                    as="p"
                    className="w-10 shrink-0 text-right text-sm leading-4 tabular-nums text-on-surface-variant"
                    variant="body"
                    weight="normal"
                  >
                    {formatShare(contribution.share)}
                  </Typography>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {model.total.contributions.length > 0 ? (
        <p className="text-sm text-on-surface-variant">Percentages are rounded.</p>
      ) : null}
    </section>
  );
}

function ContributionChange({
  model,
  onReverse,
  reversed,
}: {
  model: NutrientAnalyticsModel;
  onReverse: () => void;
  reversed: boolean;
}) {
  const { increases, newFoods, reductions } = model.change.sections;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Typography color="inherit" as="h2" variant="h3">
            Food contribution change
          </Typography>
          <Typography as="p" className="text-sm" color="onSurfaceVariant" variant="body" weight="normal">
            {CHANGE_SUBTITLE}
          </Typography>
        </div>
        <button
          aria-label="Reverse contribution change order"
          aria-pressed={reversed}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-analytics-track aria-pressed:bg-analytics-track focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface-tint motion-reduce:transition-none"
          onClick={onReverse}
          type="button"
        >
          <ArrowDownUp aria-hidden="true" className="size-5" />
        </button>
      </div>

      {model.change.showInsufficientHistoryBanner ? (
        <div
          className="flex items-start gap-3 rounded-md bg-analytics-track px-4 py-3 text-sm leading-5 text-on-surface-variant"
          role="status"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{INSUFFICIENT_HISTORY_COPY}</span>
        </div>
      ) : null}

      <ChangeSection
        emptyLabel="No reductions"
        rows={maybeReverse(reductions, reversed)}
        title="Reductions"
        unit={model.unit}
      />
      <ChangeSection
        emptyLabel="No increases"
        rows={maybeReverse(increases, reversed)}
        title="Increases"
        unit={model.unit}
      />
      <ChangeSection
        emptyLabel="No new foods"
        rows={maybeReverse(newFoods, reversed)}
        title="New Foods"
        unit={model.unit}
      />
    </section>
  );
}

function ChangeSection({
  emptyLabel,
  rows,
  title,
  unit,
}: {
  emptyLabel: string;
  rows: readonly ChangeEntry[];
  title: "Increases" | "New Foods" | "Reductions";
  unit: NutrientAnalyticsModel["unit"];
}) {
  const headingId = `${title.toLowerCase().replaceAll(" ", "-")}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <Typography as="h3" color="onSurfaceVariant" id={headingId} variant="h3">
        {title}
      </Typography>
      {rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-md border border-outline-variant/40 bg-surface-container-lowest">
          {rows.map((entry) => (
            <li className="flex items-baseline justify-between gap-3 px-4 py-4" key={entry.name}>
              <Typography
                color="inherit"
                as="p"
                className="min-w-0 flex-1 leading-5 [overflow-wrap:anywhere]"
                variant="body"
                weight="medium"
              >
                {entry.name}
              </Typography>
              <ChangeValue entry={entry} unit={unit} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChangeValue({ entry, unit }: { entry: ChangeEntry; unit: NutrientAnalyticsModel["unit"] }) {
  if (entry.change === "new") {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Typography
          color="inherit"
          as="p"
          className="whitespace-nowrap text-sm tabular-nums"
          variant="body"
          weight="medium"
        >
          {formatAmountWithUnit(entry.amount, unit)}
        </Typography>
        <span className="text-sm text-on-surface-variant">New</span>
      </div>
    );
  }

  const Icon = entry.change < 0 ? ArrowDown : ArrowUpRight;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1 text-on-surface">
      <div className="flex items-center gap-1">
        <Icon aria-hidden="true" className="size-4" />
        <Typography
          color="inherit"
          as="p"
          className="whitespace-nowrap text-sm tabular-nums"
          variant="body"
          weight="medium"
        >
          {formatChange(entry.change)}
        </Typography>
      </div>
      <p className="whitespace-nowrap text-sm tabular-nums text-on-surface-variant">
        {formatAmountWithUnit(entry.amount, unit)} logged
      </p>
    </div>
  );
}

export { NutrientAnalytics };
export type { NutrientAnalyticsProps };
