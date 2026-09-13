import type { Meta, StoryObj } from "@storybook/react-vite";

import { useState } from "react";

import type { FoodUnitOption } from "../confirm-food-nutrition.ts";

import "../../../../styles.css";
import { ConfirmFoodUnitSelect } from "./ConfirmFoodUnitSelect.tsx";

const typicalUnits: FoodUnitOption[] = [
  { unit: "serving", baseQuantity: 1 },
  { unit: "g", baseQuantity: 85 },
  { unit: "cup", baseQuantity: 0.5 },
];

const longNameUnits: FoodUnitOption[] = [
  { unit: "serving", baseQuantity: 1 },
  { unit: "container (about 14 oz extra firm tofu, drained)", baseQuantity: 1 },
  { unit: "g", baseQuantity: 397 },
];

function InteractiveConfirmFoodUnitSelect({
  id,
  options,
  value: initialValue,
}: {
  id: string;
  options: FoodUnitOption[];
  value: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <label className="min-w-0" htmlFor={id}>
      <span className="block text-[0.625rem] font-medium tracking-[0.12em] text-on-surface-variant/70 uppercase">
        Unit
      </span>
      <span className="mt-2 block">
        <ConfirmFoodUnitSelect id={id} onValueChange={setValue} options={options} value={value} />
      </span>
    </label>
  );
}

const meta = {
  title: "Logs/Confirm Food Unit Select",
  component: ConfirmFoodUnitSelect,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[min(100%,450px)] pt-48 font-sans">
        <section className="rounded-2xl bg-surface-container-lowest px-6 py-6 shadow-[0_18px_45px_-32px_rgba(26,28,28,0.42)]">
          <div className="grid grid-cols-2 gap-4">
            <label className="min-w-0">
              <span className="block text-[0.625rem] font-medium tracking-[0.12em] text-on-surface-variant/70 uppercase">
                Quantity
              </span>
              <input
                className="mt-2 h-12 w-full rounded-xl bg-surface-container-low px-4 text-base font-medium tabular-nums text-on-surface outline-none"
                readOnly
                value="1"
              />
            </label>
            <Story />
          </div>
        </section>
      </div>
    ),
  ],
} satisfies Meta<typeof ConfirmFoodUnitSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TypicalUnits: Story = {
  args: {
    id: "serving-unit",
    onValueChange: () => undefined,
    options: typicalUnits,
    value: "serving",
  },
  render: (args) => (
    <InteractiveConfirmFoodUnitSelect id={args.id} options={args.options} value={args.value} />
  ),
};

export const LongUnitName: Story = {
  args: {
    id: "serving-unit-long",
    onValueChange: () => undefined,
    options: longNameUnits,
    value: "serving",
  },
  render: (args) => (
    <InteractiveConfirmFoodUnitSelect id={args.id} options={args.options} value={args.value} />
  ),
};
