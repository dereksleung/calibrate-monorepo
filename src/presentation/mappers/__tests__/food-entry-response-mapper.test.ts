import { FoodEntryResponseMapper } from "@presentation";
import { MealNameEnum } from "@domain";
import { buildFoodEntry, buildFoodEntryResponse } from "@factories";

describe("FoodEntryResponseMapper", () => {
  it("should map a fully populated FoodEntry to a FoodEntryResponse", () => {
    const commonProps = {
      id: "entry-1",
      meal: MealNameEnum.LUNCH,
      name: "Chicken Breast",
      brand: "Kirkland",
      iconName: "chicken",
      quantity: 200,
      quantityUnit: "g",
      calories: 330,
      totalFatGrams: 7,
      saturatedFatGrams: 2,
      cholesterolMg: 130,
      sodiumMg: 100,
      totalCarbohydrateGrams: 0,
      fiberGrams: 0,
      sugarGrams: 0,
      proteinGrams: 62,
    };
    const foodEntry = buildFoodEntry(commonProps);

    const result = FoodEntryResponseMapper.toResponse(foodEntry);

    expect(result).toEqual(buildFoodEntryResponse(commonProps));
  });

  it("should map nullable fields as null when not provided", () => {
    const commonProps = {
      id: "entry-2",
      meal: MealNameEnum.DINNER,
      brand: null,
      iconName: null,
      saturatedFatGrams: null,
      cholesterolMg: null,
      sodiumMg: null,
      fiberGrams: null,
      sugarGrams: null,
    };
    const foodEntry = buildFoodEntry(commonProps);

    const result = FoodEntryResponseMapper.toResponse(foodEntry);

    expect(result).toEqual(buildFoodEntryResponse(commonProps));
  });

  it("should not include any extra properties beyond the response interface", () => {
    const foodEntry = buildFoodEntry();

    const result = FoodEntryResponseMapper.toResponse(foodEntry);

    const expectedKeys = [
      "id",
      "meal",
      "name",
      "brand",
      "iconName",
      "quantity",
      "quantityUnit",
      "calories",
      "totalFatGrams",
      "saturatedFatGrams",
      "cholesterolMg",
      "sodiumMg",
      "totalCarbohydrateGrams",
      "fiberGrams",
      "sugarGrams",
      "proteinGrams",
    ];
    expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
  });
});
