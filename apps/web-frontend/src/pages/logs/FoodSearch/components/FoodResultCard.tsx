import type { MealNameEnumType } from "@calibrate/api-contracts";

import { cn } from "#/lib/utils.ts";
import { Select } from "@base-ui/react/select";
import { Plus } from "lucide-react";

import type { SelectedFoodForConfirmation } from "../../food-confirmation-state.ts";

type FoodResultCardProps = {
  food: SelectedFoodForConfirmation;
  onSelect: (food: SelectedFoodForConfirmation) => void;
  onQuickAdd?: (food: SelectedFoodForConfirmation, meal: MealNameEnumType) => void;
  preselectedMeal?: MealNameEnumType;
  isAdding?: boolean;
};

const meals: Array<{ value: MealNameEnumType; label: string }> = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACKS", label: "Snacks" },
];

const plusPillClassName =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition hover:bg-primary-container focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

export function FoodResultCard({
  food,
  isAdding = false,
  onQuickAdd,
  onSelect,
  preselectedMeal,
}: FoodResultCardProps) {
  const servingQuantity = food.chosenQuantity ?? food.quantityServing;
  const servingUnit = food.chosenUnit ?? food.servingLabel;
  const details = [`${Math.round(food.calories)} cal`, `${servingQuantity} ${servingUnit}`, food.brand]
    .filter(Boolean)
    .join(" · ");
  const labelFromDate = food.lastUsedDate
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
      new Date(`${food.lastUsedDate}T00:00:00Z`),
    )
    : undefined;
  const lastUsedLabel = food.lastUsedLabel ?? labelFromDate;
  const subtitle = lastUsedLabel ? `${lastUsedLabel} · ${details}` : details;

  return (
    <li className="flex items-center gap-4 rounded-xl">
      <button
        type="button"
        className={cn(
          "truncate group flex w-full items-center justify-between gap-4 py-2 text-left",
          "transition hover:bg-white/35 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px",
        )}
        aria-label={`Select ${food.name}`}
        onClick={() => onSelect(food)}
      >
        <span className="min-w-0">
          <span className="block truncate font-heading text-base font-semibold text-on-surface">
            {food.name}
          </span>
          <span className="mt-1 block truncate text-xs text-on-surface-variant/80">{subtitle}</span>
        </span>
      </button>
      {preselectedMeal ? (
        <button
          aria-label={`Add ${food.name} to ${meals.find((meal) => meal.value === preselectedMeal)?.label}`}
          className={plusPillClassName}
          disabled={isAdding}
          onClick={(event) => {
            event.stopPropagation();
            onQuickAdd?.(food, preselectedMeal);
          }}
          type="button"
        >
          <Plus aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      ) : (
        <Select.Root
          items={meals}
          modal={false}
          onValueChange={(meal) => {
            if (meal) onQuickAdd?.(food, meal as MealNameEnumType);
          }}
        >
          <Select.Trigger
            aria-label={`Add ${food.name}`}
            className={plusPillClassName}
            disabled={isAdding}
            onClick={(event) => event.stopPropagation()}
          >
            <Plus aria-hidden className="size-5" strokeWidth={1.75} />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner align="end" className="z-50 outline-none" side="top" sideOffset={4}>
              <Select.Popup className="min-w-(--anchor-width) overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_18px_45px_-32px_rgba(26,28,28,0.42)] ring-1 ring-on-surface/10">
                <Select.List>
                  {meals.map((meal) => (
                    <Select.Item
                      key={meal.value}
                      value={meal.value}
                      className="cursor-pointer px-4 py-2.5 text-base font-medium text-on-surface outline-none select-none data-highlighted:bg-primary/10"
                    >
                      <Select.ItemText>{meal.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      )}
    </li>
  );
}
