import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { searchFoods } from "./search-foods.js";

describe("food search workflow", () => {
  it("maps the validated search response to frontend-domain results", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({
        results: [
          {
            source: "catalog",
            catalogFoodId: "a74942b3-78d7-48e8-bd20-dc5eba7f82ff",
            name: "Greek yogurt",
            brand: null,
            calories: 150,
            totalFatGrams: 4,
            saturatedFatGrams: null,
            cholesterolMg: null,
            sodiumMg: null,
            totalCarbohydrateGrams: 8,
            fiberGrams: null,
            sugarGrams: null,
            proteinGrams: 18,
            quantityServing: 1,
            servingLabel: "cup",
            quantityMass: null,
            massUnit: null,
            quantityVolume: null,
            volumeUnit: null,
            sourceLabel: "Catalog",
          },
        ],
        nextCursor: null,
      }),
    );

    await expect(searchFoods({ request } as unknown as ApiTransport, { query: "greek yogurt" })).resolves.toMatchObject({
      results: [{ source: "catalog", catalogFoodId: "a74942b3-78d7-48e8-bd20-dc5eba7f82ff" }],
    });
  });
});
