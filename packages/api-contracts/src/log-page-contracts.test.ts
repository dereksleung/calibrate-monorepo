import { describe, expect, it } from "vitest";

import {
  FoodSearchRequestQuerySchema,
  FoodSearchResponseSchema,
  RecentFoodSearchResultSchema,
  UpdateDayLogWeightRequestBodySchema,
  UpdateDayLogWeightRequestRouteParamsSchema,
  UsdaFoodSearchResultSchema,
} from "./index.js";

const baseFoodResult = {
  name: "Greek yogurt",
  brand: "Calibrate Kitchen",
  sourceLabel: "Recent",
  calories: 150,
  totalFatGrams: 4,
  saturatedFatGrams: 2,
  cholesterolMg: 10,
  sodiumMg: 65,
  totalCarbohydrateGrams: 8,
  fiberGrams: 0,
  sugarGrams: 6,
  proteinGrams: 18,
};

describe("log page request contracts", () => {
  it("validates day-log weight updates by date and positive weight", () => {
    expect(UpdateDayLogWeightRequestRouteParamsSchema.parse({ date: "2026-05-20" })).toEqual({
      date: "2026-05-20",
    });

    expect(UpdateDayLogWeightRequestBodySchema.parse({ weight: 180.5 })).toEqual({ weight: 180.5 });
    expect(() => UpdateDayLogWeightRequestRouteParamsSchema.parse({ date: "05/20/2026" })).toThrow();
    expect(() => UpdateDayLogWeightRequestBodySchema.parse({ weight: 0 })).toThrow();
  });

  it("trims and validates food search query params", () => {
    expect(FoodSearchRequestQuerySchema.parse({ query: "  yogurt  " })).toEqual({ query: "yogurt" });
    expect(() => FoodSearchRequestQuerySchema.parse({ query: "   " })).toThrow();
  });
});

describe("log page response contracts", () => {
  it("defaults only serving fields for USDA results", () => {
    const result = UsdaFoodSearchResultSchema.parse({
      ...baseFoodResult,
      sourceLabel: "USDA",
      brand: null,
      source: "usda",
      fdcId: 123456,
    });

    expect(result.quantityServing).toBe(1);
    expect(result.servingLabel).toBe("serving");
    expect(result.quantityMass).toBeNull();
    expect(result.massUnit).toBeNull();
    expect(result.quantityVolume).toBeNull();
    expect(result.volumeUnit).toBeNull();
  });

  it("accepts recent food results with compact recency metadata", () => {
    const result = RecentFoodSearchResultSchema.parse({
      ...baseFoodResult,
      source: "recent",
      foodEntryId: "food-entry-1",
      recency: {
        lastUsedDate: "2026-05-19",
        displayLabel: "Tue",
      },
    });

    expect(result.recency).toEqual({
      lastUsedDate: "2026-05-19",
      displayLabel: "Tue",
    });
  });

  it("models food search as one backend-ordered discriminated result list", () => {
    const response = FoodSearchResponseSchema.parse({
      results: [
        {
          ...baseFoodResult,
          source: "recent",
          foodEntryId: "food-entry-1",
          recency: {
            lastUsedDate: "2026-05-19",
            displayLabel: "Tue",
          },
        },
        {
          ...baseFoodResult,
          sourceLabel: "USDA",
          brand: null,
          source: "usda",
          fdcId: 123456,
        },
      ],
    });

    expect(response.results.map((result) => result.source)).toEqual(["recent", "usda"]);
  });
});
