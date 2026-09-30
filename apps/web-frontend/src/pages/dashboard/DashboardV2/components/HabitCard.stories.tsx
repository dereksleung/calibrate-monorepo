import type { HabitCardModel } from "@calibrate/frontend-core/verticals/dashboard/dashboard-v2-model";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { HabitCard, PendingHabitCard } from "./HabitCard.tsx";

const createHabitHistory = (completedIndexes: number[]) =>
  Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    status: completedIndexes.includes(index) ? ("complete" as const) : ("unavailable" as const),
  }));

const weighInModel: HabitCardModel = {
  title: "Weighing",
  subtitle: "Last 30 Days",
  completedCurrentWeek: 2,
  days: createHabitHistory([28, 29]),
};

const foodLoggingModel: HabitCardModel = {
  title: "Food Logs",
  subtitle: "Last 30 Days",
  completedCurrentWeek: 5,
  days: createHabitHistory([25, 26, 27, 28, 29]),
};

const meta = {
  title: "Dashboard V2/Habit Card",
  component: HabitCard,
  parameters: { layout: "padded" },
  args: { model: weighInModel },
  decorators: [
    (Story) => (
      <div className="w-52">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HabitCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Weighing: Story = {};

export const FoodLogs: Story = {
  args: { model: foodLoggingModel },
};

export const LoadedGrid: Story = {
  render: () => (
    <div className="grid w-full max-w-md grid-cols-2 gap-3">
      <HabitCard model={weighInModel} />
      <HabitCard model={foodLoggingModel} />
    </div>
  ),
  decorators: [],
};

export const PendingWeighing: Story = {
  render: () => <PendingHabitCard title="Weighing" />,
};

export const PendingFoodLogs: Story = {
  render: () => <PendingHabitCard title="Food Logs" />,
};
