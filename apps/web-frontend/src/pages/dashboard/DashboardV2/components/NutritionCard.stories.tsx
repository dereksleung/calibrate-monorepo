import type { DashboardNutritionMetric, NutritionCardModel } from "#/verticals/dashboard/dashboard-v2-model.ts";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { NutritionCard, PendingNutritionCard } from "./NutritionCard.tsx";

const nutritionModels: Record<DashboardNutritionMetric, NutritionCardModel> = {
  calories: { amount: 661, metric: "calories", target: 1800, title: "Calories", unit: "kcal" },
  proteinGrams: { amount: 55.5, metric: "proteinGrams", target: 120, title: "Protein", unit: "g" },
  totalFatGrams: { amount: 16.8, metric: "totalFatGrams", target: 60, title: "Fats", unit: "g" },
  totalCarbohydrateGrams: {
    amount: 70.8,
    metric: "totalCarbohydrateGrams",
    target: 220,
    title: "Carbs",
    unit: "g",
  },
};

const meta = {
  title: "Dashboard V2/Nutrition Card",
  component: NutritionCard,
  parameters: { layout: "padded" },
  args: {
    model: nutritionModels.calories,
    onOpen: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-52">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NutritionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Calories: Story = {};

export const Protein: Story = {
  args: { model: nutritionModels.proteinGrams },
};

export const Fats: Story = {
  args: { model: nutritionModels.totalFatGrams },
};

export const Carbs: Story = {
  args: { model: nutritionModels.totalCarbohydrateGrams },
};

export const LoadedGrid: Story = {
  render: () => (
    <div className="grid w-full max-w-md grid-cols-2 gap-3">
      {(Object.keys(nutritionModels) as DashboardNutritionMetric[]).map((metric) => (
        <NutritionCard key={metric} model={nutritionModels[metric]} onOpen={() => undefined} />
      ))}
    </div>
  ),
  decorators: [],
};

export const PendingCalories: Story = {
  render: () => <PendingNutritionCard title="Calories" />,
};

export const PendingProtein: Story = {
  render: () => <PendingNutritionCard title="Protein" />,
};

export const PendingFats: Story = {
  render: () => <PendingNutritionCard title="Fats" />,
};

export const PendingCarbs: Story = {
  render: () => <PendingNutritionCard title="Carbs" />,
};
