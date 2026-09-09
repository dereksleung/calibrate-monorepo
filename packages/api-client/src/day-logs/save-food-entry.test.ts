import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../transport.js";

import { dayLogRangeQueryKey } from "./get-day-log-range.js";
import { dayLogQueryKey, dayLogSlotQueryKey } from "./get-day-log.js";
import { invalidateDayLogQueries, saveFoodEntry } from "./save-food-entry.js";

describe("saveFoodEntry", () => {
  it("validates the selected day and posts a confirmed food entry", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({
        id: "entry-1",
        name: "Tofu",
        brand: null,
        meal: "LUNCH",
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
      }),
    );
    const transport = { request } as unknown as ApiTransport;

    await saveFoodEntry(transport, "2026-05-18", {
      name: "Tofu",
      brand: null,
      meal: "LUNCH",
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
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/daylogs/2026-05-18/food-entries",
        body: expect.objectContaining({ meal: "LUNCH" }),
      }),
    );
  });
});

describe("invalidateDayLogQueries", () => {
  it("clears the confirmed account's cached slot so Dashboard revalidates it", async () => {
    const queryClient = new QueryClient();
    const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
    const otherAccountId = "95434f9a-da1f-47dd-8175-a26ff42ee11e";
    const date = "2026-05-18";
    const range = { startDate: "2026-05-12", endDate: date };
    queryClient.setQueryData(dayLogQueryKey(accountId, date), { private: "selected-day" });
    queryClient.setQueryData(dayLogRangeQueryKey(accountId, range), { private: "range" });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), { private: "cached-slot" });
    queryClient.setQueryData(dayLogSlotQueryKey(otherAccountId, date), { private: "other-account-slot" });

    await invalidateDayLogQueries(queryClient, accountId, date);

    expect(queryClient.getQueryState(dayLogQueryKey(accountId, date))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(dayLogRangeQueryKey(accountId, range))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, date))).toBeUndefined();
    expect(queryClient.getQueryData(dayLogSlotQueryKey(otherAccountId, date))).toEqual({
      private: "other-account-slot",
    });
  });
});
