import { describe, expect, it } from "vitest";

import type { SelectedFoodForConfirmation } from "../food-confirmation-state.ts";

import { recoverCatalogReferenceNutrition, scaleFoodNutrition } from "./confirm-food-nutrition.ts";

const food: SelectedFoodForConfirmation = {
  id: "food-1",
  name: "Greek yogurt",
  brand: "Calibrate Kitchen",
  calories: 300,
  totalFatGrams: 10,
  saturatedFatGrams: null,
  cholesterolMg: 20,
  sodiumMg: 100,
  totalCarbohydrateGrams: 40,
  fiberGrams: 6,
  sugarGrams: null,
  proteinGrams: 12,
  quantityServing: 1,
  servingLabel: "cup",
  quantityMass: null,
  massUnit: null,
  quantityVolume: null,
  volumeUnit: null,
  chosenQuantity: 2,
  chosenUnit: "cup",
};

describe("recoverCatalogReferenceNutrition", () => {
  it("scales stored plate nutrition back to the selected catalog serving", () => {
    expect(recoverCatalogReferenceNutrition(food)).toEqual({
      ...food,
      calories: 150,
      totalFatGrams: 5,
      saturatedFatGrams: null,
      cholesterolMg: 10,
      sodiumMg: 50,
      totalCarbohydrateGrams: 20,
      fiberGrams: 3,
      sugarGrams: null,
      proteinGrams: 6,
    });
  });

  it("leaves food unchanged when the stored serving metadata is invalid", () => {
    const invalidFood = { ...food, chosenQuantity: 0 };

    expect(recoverCatalogReferenceNutrition(invalidFood)).toBe(invalidFood);
  });

  it("recovers recent nutrition from the exact catalog reference quantity", () => {
    const recentlyLoggedFood = {
      ...food,
      calories: 100,
      quantityServing: 3.236,
      chosenQuantity: 3.2,
    };

    expect(recoverCatalogReferenceNutrition(recentlyLoggedFood).calories).toBeCloseTo(101.125, 10);
  });
});

describe("scaleFoodNutrition", () => {
  it("scales nutrition from an exact catalog unit quantity", () => {
    const foodWithPreciseVolume = {
      ...food,
      calories: 100,
      quantityVolume: 3.236,
      volumeUnit: "ml",
    };

    expect(scaleFoodNutrition(foodWithPreciseVolume, 3.2, "ml").calories).toBe(98.9);
  });
});
