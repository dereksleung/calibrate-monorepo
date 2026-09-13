import type { Meta, StoryObj } from "@storybook/react-vite";

import { getDailyProgress } from "../../log-page-helpers.ts";
import { DailySummary } from "./DailySummary.tsx";

const totals = {
  calories: 80,
  proteinGrams: 6,
  totalFatGrams: 2,
  totalCarbohydrateGrams: 14,
};

const meta = {
  title: "Logs / Daily Summary",
  component: DailySummary,
  parameters: { layout: "padded" },
  args: {
    totals,
    progress: getDailyProgress(totals),
    weight: 184.2,
  },
  decorators: [
    (Story) => (
      <div className="w-[32rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DailySummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithWeight: Story = {};

export const WithoutWeight: Story = {
  args: { weight: null },
};
