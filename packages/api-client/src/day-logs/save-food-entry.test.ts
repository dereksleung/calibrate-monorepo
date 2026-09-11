import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../transport.js";

import { saveFoodEntry } from "./save-food-entry.js";

const tofuEntry = {
  name: "Tofu",
  brand: null,
  meal: "LUNCH" as const,
  chosenQuantity: 1,
  chosenUnit: "serving",
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
};

describe("saveFoodEntry", () => {
  it("validates the selected day and posts a confirmed food entry", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({
        foodEntryId: "entry-1",
        versionNumber: 2,
      }),
    );
    const transport = { request } as unknown as ApiTransport;

    await expect(saveFoodEntry(transport, "2026-05-18", tofuEntry)).resolves.toEqual({
      foodEntryId: "entry-1",
      versionNumber: 2,
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/daylogs/2026-05-18/food-entries",
        body: expect.objectContaining({ meal: "LUNCH" }),
      }),
    );
    expect(request.mock.calls[0]?.[0].body).not.toHaveProperty("versionNumber");
  });
});
