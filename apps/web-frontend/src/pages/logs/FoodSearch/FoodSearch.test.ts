import { describe, expect, it } from "vitest";

import { toFoodEntry } from "./FoodSearch.tsx";

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
  quantityServing: 2,
  servingLabel: "cup",
  quantityMass: null,
  massUnit: null,
  quantityVolume: null,
  volumeUnit: null,
};

describe("toFoodEntry", () => {
  it("posts a catalog food at its Reference serving", () => {
    expect(toFoodEntry(food, "DINNER")).toMatchObject({
      meal: "DINNER",
      chosenQuantity: 2,
      chosenUnit: "cup",
      calories: 150,
    });
  });

  it("posts a Recent food's stored plate without rescaling it", () => {
    expect(
      toFoodEntry({ ...food, calories: 300, chosenQuantity: 4, chosenUnit: "cup" }, "LUNCH"),
    ).toMatchObject({
      meal: "LUNCH",
      chosenQuantity: 4,
      chosenUnit: "cup",
      calories: 300,
    });
  });
});
