// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FoodResultCard } from "./FoodResultCard.tsx";

afterEach(cleanup);

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

  it("keeps the row confirmation action separate from the preselected Meal plus action", () => {
    const onSelect = vi.fn();
    const onQuickAdd = vi.fn();
    render(
      <FoodResultCard food={food} onQuickAdd={onQuickAdd} onSelect={onSelect} preselectedMeal="LUNCH" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add Greek yogurt to Lunch/i }));

    expect(onQuickAdd).toHaveBeenCalledWith(food, "LUNCH");
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /select Greek yogurt/i }));

    expect(onSelect).toHaveBeenCalledWith(food);
  });

  it("chooses a Meal from the upward-opening plus Select when no Meal is preselected", () => {
    const onQuickAdd = vi.fn();
    render(<FoodResultCard food={food} onQuickAdd={onQuickAdd} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox", { name: /add Greek yogurt/i }));

    expect(screen.getByRole("listbox")).toBeTruthy();
    const dinner = screen.getByRole("option", { name: "Dinner" });
    fireEvent.pointerDown(dinner);
    fireEvent.pointerUp(dinner);
    fireEvent.click(dinner);

    expect(onQuickAdd).toHaveBeenCalledWith(food, "DINNER");
  });

  it("cancels the Meal Select without saving on Escape", () => {
    const onQuickAdd = vi.fn();
    render(<FoodResultCard food={food} onQuickAdd={onQuickAdd} onSelect={vi.fn()} />);

    const plus = screen.getByRole("combobox", { name: /add Greek yogurt/i });
    fireEvent.click(plus);
    fireEvent.keyDown(plus, { key: "Escape" });

    expect(onQuickAdd).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("disables only the in-flight plus", () => {
    render(
      <ul>
        <FoodResultCard
          food={food}
          isAdding
          onQuickAdd={vi.fn()}
          onSelect={vi.fn()}
          preselectedMeal="BREAKFAST"
        />
        <FoodResultCard
          food={{ ...food, id: "food-2", name: "Second yogurt" }}
          onQuickAdd={vi.fn()}
          onSelect={vi.fn()}
          preselectedMeal="BREAKFAST"
        />
      </ul>,
    );

    expect(
      (screen.getByRole("button", { name: /add Greek yogurt to Breakfast/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /add Second yogurt to Breakfast/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
