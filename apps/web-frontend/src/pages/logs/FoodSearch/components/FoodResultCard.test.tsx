// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FoodResultCard } from "./FoodResultCard.tsx";

const food = {
  id: "food-1",
  name: "Greek yogurt",
  brand: "Calibrate Kitchen",
  calories: 150,
  totalFatGrams: 4,
  saturatedFatGrams: 2,
  cholesterolMg: 10,
  sodiumMg: 65,
  totalCarbohydrateGrams: 8,
  fiberGrams: 0,
  sugarGrams: 6,
  proteinGrams: 18,
  quantityServing: 1,
  servingLabel: "cup",
  quantityMass: null,
  massUnit: null,
  quantityVolume: null,
  volumeUnit: null,
};

describe("FoodResultCard", () => {
  it("prefixes a Recent food subtitle with its Food Logging day", () => {
    render(<FoodResultCard food={{ ...food, lastUsedDate: "2026-10-03" }} onSelect={vi.fn()} />);

    expect(screen.getByText("Oct 3 • 150 cal · 1 cup · Calibrate Kitchen")).toBeTruthy();
  });

  it("does not prefix a catalog subtitle with a date", () => {
    render(<FoodResultCard food={food} onSelect={vi.fn()} />);

    expect(screen.getByText("150 cal · 1 cup · Calibrate Kitchen")).toBeTruthy();
  });
});
