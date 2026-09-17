import { cn } from "#/lib/utils.ts";
import { Plus } from "lucide-react";

import type { SelectedFoodForConfirmation } from "../../food-confirmation-state.ts";

type FoodResultCardProps = {
  food: SelectedFoodForConfirmation;
  onSelect: (food: SelectedFoodForConfirmation) => void;
};

export function FoodResultCard({ food, onSelect }: FoodResultCardProps) {
  const servingQuantity = food.chosenQuantity ?? food.quantityServing;
  const servingUnit = food.chosenUnit ?? food.servingLabel;
  const details = [`${Math.round(food.calories)} cal`, `${servingQuantity} ${servingUnit}`, food.brand]
    .filter(Boolean)
    .join(" · ");
  const recentDate = food.lastUsedDate
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
        new Date(`${food.lastUsedDate}T00:00:00Z`),
      )
    : undefined;
  const subtitle = recentDate ? `${recentDate} · ${details}` : details;

  return (
    <li>
      <button
        type="button"
        className={cn(
          "glass-card group flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left",
          "transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px",
        )}
        aria-label={`Select ${food.name}`}
        onClick={() => onSelect(food)}
      >
        <span className="min-w-0">
          <span className="block truncate font-heading text-base font-semibold text-on-surface">
            {food.name}
          </span>
          <span className="mt-1 block truncate text-sm text-on-surface-variant/80">{subtitle}</span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition group-hover:bg-primary-container">
          <Plus aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
      </button>
    </li>
  );
}
