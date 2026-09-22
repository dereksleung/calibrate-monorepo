import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { getSaveFoodEntryMutationOptions } from "./save-food-entry.js";
import { dayLogSlotQueryKey, dayLogSlotVersionQueryKey } from "./sync-day-logs.js";

const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const date = "2026-09-03";
const now = Date.parse("2026-09-03T18:00:00.000Z");
const entry = {
  meal: "LUNCH" as const,
  name: "Tofu",
  brand: null,
  calories: 73.926,
  totalFatGrams: 4.191,
  saturatedFatGrams: 0.594,
  cholesterolMg: 0.333,
  sodiumMg: 33.3,
  totalCarbohydrateGrams: 1.066,
  fiberGrams: 0.333,
  sugarGrams: 0.333,
  proteinGrams: 7.959,
  chosenQuantity: 0.333,
  chosenUnit: "serving",
  quantityServing: 1.234,
  servingLabel: "serving",
  quantityMass: null,
  massUnit: null,
  quantityVolume: null,
  volumeUnit: null,
};

function presentSlot() {
  return { id: "day-log-1", date, breakfast: [], lunch: [], dinner: [], snacks: [], weight: null };
}

describe("Save Food Entry workflow", () => {
  it("maps the acknowledgement and advances a trusted predecessor without a sync", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), presentSlot(), { updatedAt: now });
    queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, date), 7, { updatedAt: now });
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ foodEntryId: "entry-1", versionNumber: 8 }),
    );

    const result = await getSaveFoodEntryMutationOptions(
      { accountId, queryClient, transport: { request } as unknown as ApiTransport },
      date,
    ).mutationFn(entry);

    expect(result).toEqual({ foodEntryId: "entry-1", versionNumber: 8 });
    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      ...presentSlot(),
      lunch: [expect.objectContaining({ id: "entry-1", chosenQuantity: 0.33, calories: 73.9 })],
    });
    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(8);
    expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated).toBe(false);
  });

  it("creates from Known-empty at version one, then retains an unverified acknowledgement when reconciliation fails", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), null, { updatedAt: now });
    const request = vi.fn(async ({ responseBodySchema, path }) => {
      if (path.endsWith("food-entries"))
        return responseBodySchema.parse({
          foodEntryId: "entry-1",
          versionNumber: 1,
          createdDayLogId: "created-day-log",
        });
      throw new Error("sync unavailable");
    });

    await getSaveFoodEntryMutationOptions(
      { accountId, queryClient, transport: { request } as unknown as ApiTransport },
      date,
    ).mutationFn(entry);

    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      id: "created-day-log",
      date,
      breakfast: [],
      lunch: [expect.objectContaining({ id: "entry-1" })],
      dinner: [],
      snacks: [],
      weight: null,
    });
    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(1);
  });

  it("keeps a version-mismatched acknowledgement and leaves only its slot invalidated after a failed sync", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), presentSlot(), { updatedAt: now });
    queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, date), 4, { updatedAt: now });
    const request = vi.fn(async ({ responseBodySchema, path }) => {
      if (path.endsWith("food-entries"))
        return responseBodySchema.parse({ foodEntryId: "entry-1", versionNumber: 7 });
      throw new Error("sync unavailable");
    });

    await getSaveFoodEntryMutationOptions(
      { accountId, queryClient, transport: { request } as unknown as ApiTransport },
      date,
    ).mutationFn(entry);

    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(4);
    expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      ...presentSlot(),
      lunch: [expect.objectContaining({ id: "entry-1" })],
    });
  });
});
