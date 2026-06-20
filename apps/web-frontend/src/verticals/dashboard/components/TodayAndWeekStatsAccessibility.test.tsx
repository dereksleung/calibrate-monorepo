// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TodayAndWeekCalories } from "./TodayAndWeekCalories.tsx";
import { TodayAndWeekStat } from "./TodayAndWeekStat.tsx";

vi.mock("#/shared/components/charts/EatenDonutChart.tsx", () => ({
  EatenDonutChart: ({ metricLabel }: { metricLabel?: string }) => (
    <div data-testid={`donut-chart-${metricLabel ?? "Calories"}`} />
  ),
}));

vi.mock("#/shared/components/charts/WeeklyBarChart.tsx", () => ({
  WeeklyBarChart: ({ seriesLabel }: { seriesLabel?: string }) => (
    <div data-testid={`weekly-chart-${seriesLabel ?? "Calories"}`} />
  ),
}));

afterEach(() => {
  cleanup();
});

describe("dashboard day and week stats accessibility", () => {
  it("exposes calories chart data as text and a table", () => {
    render(<TodayAndWeekCalories />);

    const card = screen.getByRole("region", { name: "Calories" });
    expect(
      within(card).getByText(
        "Today: 1,625 calories eaten out of a 1,650 calorie limit, 25 calories under limit. Friday was over its limit by an average of 20%, or 360 calories. Monday, Tuesday, Wednesday, Thursday, Saturday, and Sunday were under their limits by an average of 17%, the lowest being Sunday at 41% under, or 740 calories.",
      ),
    ).toBeTruthy();

    const table = within(card).getByRole("table", {
      name: "Weekly calories eaten and limits",
    });
    expect(within(table).getByRole("columnheader", { name: "Day" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Eaten" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Limit" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Status" })).toBeTruthy();
    expect(within(table).getByRole("cell", { name: "360 calories over limit" })).toBeTruthy();
  });

  it("labels macro chart summaries with the requested stat", () => {
    render(<TodayAndWeekStat title="Fats" />);

    const card = screen.getByRole("region", { name: "Fats" });
    expect(
      within(card).getByText(
        "Today: 48 grams of fats eaten out of a 58 gram limit, 10 grams under limit. Saturday was over its limit by an average of 10%, or 7 grams. Monday, Tuesday, Wednesday, Thursday, Friday, and Sunday were under their limits by an average of 19%, the lowest being Sunday at 29% under, or 20 grams.",
      ),
    ).toBeTruthy();
    expect(
      within(card).getByRole("table", {
        name: "Weekly fats eaten and limits",
      }),
    ).toBeTruthy();
    expect(screen.getByTestId("donut-chart-Fats")).toBeTruthy();
    expect(screen.getByTestId("weekly-chart-Fats")).toBeTruthy();
  });
});
