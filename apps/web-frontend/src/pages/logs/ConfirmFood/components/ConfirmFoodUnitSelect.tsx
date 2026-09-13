import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";

import type { FoodUnitOption } from "../confirm-food-nutrition.ts";

/** Matches the Confirm Food card: min(viewport, 450px) minus 24px. */
export const CONFIRM_FOOD_UNIT_SELECT_POPUP_MAX_WIDTH_CLASS = "max-w-[calc(min(100vw,450px)-24px)]";

type ConfirmFoodUnitSelectProps = {
  id: string;
  onValueChange: (unit: string) => void;
  options: FoodUnitOption[];
  value: string;
};

export function ConfirmFoodUnitSelect({ id, onValueChange, options, value }: ConfirmFoodUnitSelectProps) {
  return (
    <Select.Root
      id={id}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue);
        }
      }}
      items={options.map((option) => ({ label: option.unit, value: option.unit }))}
      modal={false}
    >
      <Select.Trigger className="flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-surface-container-low px-4 text-left text-base font-medium text-on-surface outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30">
        <Select.Value className="min-w-0 truncate" />
        <Select.Icon className="inline-flex shrink-0 text-primary">
          <ChevronDown aria-hidden className="size-4" strokeWidth={1.75} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          align="end"
          alignItemWithTrigger={false}
          className={`z-50 ${CONFIRM_FOOD_UNIT_SELECT_POPUP_MAX_WIDTH_CLASS} outline-none`}
          side="top"
          sideOffset={4}
        >
          <Select.Popup
            className={`${CONFIRM_FOOD_UNIT_SELECT_POPUP_MAX_WIDTH_CLASS} min-w-(--anchor-width) overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_18px_45px_-32px_rgba(26,28,28,0.42)] ring-1 ring-on-surface/10`}
          >
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.unit}
                  value={option.unit}
                  className="cursor-pointer px-4 py-2.5 text-base font-medium whitespace-normal text-on-surface outline-none select-none data-highlighted:bg-primary/10 data-selected:text-primary"
                >
                  <Select.ItemText className="break-words whitespace-normal">{option.unit}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
