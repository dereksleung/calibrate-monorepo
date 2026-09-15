import { cn } from "#/lib/utils.ts";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { Plus } from "lucide-react";

import type { SelectedFoodForConfirmation } from "../../food-confirmation-state.ts";

type FoodResultCardProps = {
  food: SelectedFoodForConfirmation;
  onSelect: (food: SelectedFoodForConfirmation) => void;
};

export function FoodResultCard({ food, onSelect }: FoodResultCardProps) {
  const details = [
    `${Math.round(food.calories)} cal`,
    `${food.quantityServing} ${food.servingLabel}`,
    food.brand,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        className={cn(
          "group flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left",
          "transition hover:bg-white/35 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px",
        )}
        aria-label={`Select ${food.name}`}
        onClick={() => onSelect(food)}
      >
        <span className="min-w-0">
          <Typography as="span" className="block truncate text-on-surface" variant="foodListItemTitle">
            {food.name}
          </Typography>
          <Typography
            as="span"
            className="mt-1 block truncate text-on-surface-variant/80"
            variant="foodListItemSubtitle"
          >
            {food.lastUsedLabel ? `${food.lastUsedLabel} • ` : null}
            {details}
          </Typography>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition group-hover:bg-primary-container">
          <Plus aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
      </button>
    </li>
  );
}
