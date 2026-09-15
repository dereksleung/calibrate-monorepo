// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { oatmealFixture } from "../../log-page-fixtures.ts";

vi.mock("#/shared/components/base/typography/Typography.tsx", () => ({
  Typography: ({
    children,
    color: _color,
    variant,
    ...props
  }: {
    children: React.ReactNode;
    color?: string;
    variant?: string;
  }) => (
    <p data-variant={variant} {...props}>
      {children}
    </p>
  ),
}));

import { MealSection } from "./MealSection.tsx";

afterEach(cleanup);

describe("MealSection", () => {
  it("uses the food list typography variants for a food entry and its nutrient subtitle", () => {
    render(<MealSection entries={[oatmealFixture]} meal="BREAKFAST" onAddFood={vi.fn()} title="Breakfast" />);

    expect(screen.getByText("Oatmeal").getAttribute("data-variant")).toBe("foodListItemTitle");
    expect(
      screen
        .getByLabelText("280 calories, 190 grams protein, 150 grams fat, 210 grams carbohydrate, 2 serving")
        .getAttribute("data-variant"),
    ).toBe("foodListItemSubtitle");
  });
});
