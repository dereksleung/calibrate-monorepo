import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import {
  buildCatalogFoodSearchResult,
  buildFoodSearchPage,
  buildRecentFoodSearchResult,
} from "../../verticals/foods/models/__mocks__/search-foods.js";
import { mapFoodSearchResponse, searchFoods } from "./search-foods.js";

const catalogResponse = {
  source: "catalog" as const,
  catalogFoodId: "2d38c136-5633-4b22-9553-b8a587dd6ba6",
  sourceLabel: "USDA FoodData Central",
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
  chosenQuantity: 2,
  chosenUnit: "cups",
};

const recentResponse = {
  source: "recent" as const,
  foodEntryId: "food-entry-1",
  sourceLabel: "Recent",
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
  recency: { lastUsedDate: "2026-05-19", displayLabel: "Tue" },
  chosenQuantity: 2,
  chosenUnit: "cups",
};

describe("searchFoods", () => {
  it("trims the query, applies the default limit, and requests the staged-search endpoint", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ results: [], nextCursor: null }),
    );

    await expect(
      searchFoods({ request } as unknown as ApiTransport, { query: "  greek yogurt " }),
    ).resolves.toEqual({ results: [], nextCursor: null });

    expect(request).toHaveBeenCalledWith({
      path: "/foods/search",
      query: { query: "greek yogurt", limit: 20 },
      signal: undefined,
      responseBodySchema: expect.any(Object),
    });
  });

  it("forwards a cursor, limit, and abort signal", async () => {
    const signal = new AbortController().signal;
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ results: [], nextCursor: "offset:40" }),
    );

    await searchFoods(
      { request } as unknown as ApiTransport,
      { query: "greek yogurt", cursor: "offset:20", limit: 10 },
      signal,
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/foods/search",
        query: { query: "greek yogurt", cursor: "offset:20", limit: 10 },
        signal,
      }),
    );
  });

  it("rejects a query that is too short before making a request", () => {
    const request = vi.fn();

    expect(() => searchFoods({ request } as unknown as ApiTransport, { query: "yo" })).toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a response that is not a search page", async () => {
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse({ foods: [] }));

    await expect(
      searchFoods({ request } as unknown as ApiTransport, { query: "greek yogurt" }),
    ).rejects.toThrow();
  });

  it("returns the validated API page without mapping identifiers", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ results: [catalogResponse], nextCursor: null }),
    );

    const response = await searchFoods({ request } as unknown as ApiTransport, { query: "greek yogurt" });

    expect(response.results[0]).toMatchObject({
      source: "catalog",
      catalogFoodId: catalogResponse.catalogFoodId,
    });
    expect(response.results[0]).not.toHaveProperty("chosenQuantity");
  });
});

describe("mapFoodSearchResponse", () => {
  it("converts catalog and recent results into domain foods and keeps page order", () => {
    expect(
      mapFoodSearchResponse({
        results: [recentResponse, catalogResponse],
        nextCursor: "offset:20",
      }),
    ).toEqual(
      buildFoodSearchPage({
        results: [buildRecentFoodSearchResult(), buildCatalogFoodSearchResult()],
        nextCursor: "offset:20",
      }),
    );
  });

  it("maps an empty page to an empty domain page", () => {
    expect(mapFoodSearchResponse({ results: [], nextCursor: null })).toEqual({
      results: [],
      nextCursor: null,
    });
  });
});
