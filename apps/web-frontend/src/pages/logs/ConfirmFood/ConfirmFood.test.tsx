// @vitest-environment jsdom

import { APP_CONTENT_FRAME_CLASS_NAME } from "#/shared/layout/app-content-frame.ts";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmFood } from "./ConfirmFood.tsx";

afterEach(cleanup);

const confirmation = {
  food: {
    id: "tofu",
    name: "Organic Extra Firm Tofu",
    brand: "Calibrate Kitchen",
    calories: 222,
    totalFatGrams: 12.7,
    saturatedFatGrams: 1.8,
    cholesterolMg: 0,
    sodiumMg: 100,
    totalCarbohydrateGrams: 3.2,
    fiberGrams: 1,
    sugarGrams: 0,
    proteinGrams: 23.9,
    quantityServing: 1,
    servingLabel: "serving",
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
  },
  preselectedMeal: "LUNCH" as const,
};

describe("ConfirmFood", () => {
  it("uses the shared 450px content frame for its desktop header and page content", () => {
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={vi.fn()} />);

    const main = screen.getByRole("main");
    expect(main.querySelectorAll(`.${APP_CONTENT_FRAME_CLASS_NAME}`)).toHaveLength(2);
    expect(main.querySelector(`.${APP_CONTENT_FRAME_CLASS_NAME} > .grid`)?.className).not.toContain(
      "md:grid-cols",
    );
  });

  it("places nutrition at a glance above the quantity and meal card", () => {
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={vi.fn()} />);

    const foodName = screen.getByRole("heading", { name: "Organic Extra Firm Tofu" });
    const nutritionAtGlance = screen.getByRole("region", { name: "Nutrition at a glance" });
    const quantity = screen.getByLabelText("Quantity");
    const dailyGoals = screen.getByRole("region", { name: "Percent of Daily Goals" });

    expect(
      foodName.compareDocumentPosition(nutritionAtGlance) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      nutritionAtGlance.compareDocumentPosition(quantity) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(quantity.compareDocumentPosition(dailyGoals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("focuses the quantity input when the screen opens", () => {
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByLabelText("Quantity"));
  });

  it("recalculates the displayed and submitted nutrition when the quantity changes", () => {
    const onSave = vi.fn();
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={onSave} />);

    const nutritionAtGlance = screen.getByRole("region", { name: "Nutrition at a glance" });
    const dailyGoals = screen.getByRole("region", { name: "Percent of Daily Goals" });

    expect(within(nutritionAtGlance).getByText("222 cal")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lunch" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Dinner" }));

    expect(within(nutritionAtGlance).getByText("444 cal")).toBeTruthy();
    expect(within(nutritionAtGlance).getByText("47.8g")).toBeTruthy();
    expect(within(dailyGoals).getByText("25%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chosenQuantity: 2,
        chosenUnit: "serving",
        meal: "DINNER",
        calories: 444,
        totalFatGrams: 25.4,
        saturatedFatGrams: 3.6,
        cholesterolMg: 0,
        sodiumMg: 200,
        totalCarbohydrateGrams: 6.4,
        fiberGrams: 2,
        sugarGrams: 0,
        proteinGrams: 47.8,
      }),
    );
  });

  it("initializes a recent food to its last logged plate and rescales from its catalog reference", () => {
    const onSave = vi.fn();
    render(
      <ConfirmFood
        confirmation={{
          ...confirmation,
          food: {
            ...confirmation.food,
            calories: 444,
            totalFatGrams: 25.4,
            saturatedFatGrams: 3.6,
            cholesterolMg: 0,
            sodiumMg: 200,
            totalCarbohydrateGrams: 6.4,
            fiberGrams: 2,
            sugarGrams: 0,
            proteinGrams: 47.8,
            chosenQuantity: 2,
            chosenUnit: "serving",
          },
        }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    expect((screen.getByLabelText("Quantity") as HTMLInputElement).value).toBe("2");
    expect(
      within(screen.getByRole("region", { name: "Nutrition at a glance" })).getByText("444 cal"),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chosenQuantity: 1,
        chosenUnit: "serving",
        calories: 222,
        proteinGrams: 23.9,
      }),
    );
  });

  it("falls back to the catalog serving when a recent food's chosen unit is unavailable", () => {
    render(
      <ConfirmFood
        confirmation={{
          ...confirmation,
          food: { ...confirmation.food, chosenQuantity: 2, chosenUnit: "unavailable" },
        }}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect((screen.getByLabelText("Quantity") as HTMLInputElement).value).toBe("1");
  });

  it("uses storage precision for the displayed and submitted nutrition", () => {
    const onSave = vi.fn();
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "0.33" } });

    expect(
      within(screen.getByRole("region", { name: "Nutrition at a glance" })).getByText("7.9g"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chosenQuantity: 0.33,
        calories: 73.3,
        totalFatGrams: 4.2,
        proteinGrams: 7.9,
      }),
    );
  });

  it("rejects quantities with more than two decimal places", () => {
    const onSave = vi.fn();
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "0.333" } });
    fireEvent.submit(screen.getByRole("button", { name: "Done" }).closest("form")!);

    expect(screen.getByRole("alert").textContent).toContain("no more than two decimal places");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("offers only complete catalog quantity and unit pairs, then scales using the selected unit", () => {
    const onSave = vi.fn();
    render(
      <ConfirmFood
        confirmation={{
          ...confirmation,
          food: {
            ...confirmation.food,
            quantityMass: 85,
            massUnit: "g",
            quantityVolume: 0.5,
            volumeUnit: "cup",
          },
        }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    const unitTrigger = screen.getByLabelText("Unit");
    fireEvent.click(unitTrigger);

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "serving",
      "g",
      "cup",
    ]);

    const gramsOption = screen.getByRole("option", { name: "g" });
    fireEvent.pointerDown(gramsOption);
    fireEvent.click(gramsOption);
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "170" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chosenQuantity: 170,
        chosenUnit: "g",
        calories: 444,
        proteinGrams: 47.8,
      }),
    );
  });

  it("does not offer an incomplete mass or volume pair as a unit", () => {
    render(
      <ConfirmFood
        confirmation={{
          ...confirmation,
          food: {
            ...confirmation.food,
            quantityMass: null,
            massUnit: "g",
            quantityVolume: 250,
            volumeUnit: null,
          },
        }}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Unit"));

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["serving"]);
  });

  it("shows the complete scaled nutrition fact list", () => {
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={vi.fn()} />);

    const nutritionFacts = screen.getByRole("region", { name: "Nutrition Facts" });

    expect(within(nutritionFacts).getByRole("heading", { name: "Nutrition Facts" })).toBeTruthy();
    expect(within(nutritionFacts).getByText("Calories")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Total fat")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Saturated fat")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Cholesterol")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Sodium")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Total carbohydrates")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Fiber")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Sugar")).toBeTruthy();
    expect(within(nutritionFacts).getByText("Protein")).toBeTruthy();
  });

  it("keeps an invalid quantity on the page and explains how to fix it", () => {
    const onSave = vi.fn();
    render(<ConfirmFood confirmation={confirmation} onCancel={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByRole("alert").textContent).toContain("greater than 0");
    expect(onSave).not.toHaveBeenCalled();
  });
});
