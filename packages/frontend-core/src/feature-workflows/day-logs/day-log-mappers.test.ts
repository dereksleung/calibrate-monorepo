import type {
  CreateFoodEntryResponse,
  DayLogResponse,
  DayLogSyncResponse,
  FoodSearchResponse,
  UpdateDayLogWeightResponse,
} from "@calibrate/api-contracts";

import { describe, expect, it } from "vitest";

import { buildDayLog, buildFoodEntry } from "../../verticals/day-logs/models/__mocks__/day-log.js";
import {
  toDayLog,
  toDayLogSnapshot,
  toDayLogSyncResult,
  toFoodSearchResult,
  toFoodSearchResults,
  toFoodEntryWriteAcknowledgement,
  toWeightWriteAcknowledgement,
} from "./day-log-mappers.js";

describe("Day Log response mappers", () => {
  it("maps every Day Log and Food Entry field without exposing contract types", () => {
    const response: Exclude<DayLogResponse, null> = {
      ...buildDayLog(),
      breakfast: [
        {
          ...buildFoodEntry(),
          id: "entry-1",
          meal: "BREAKFAST",
          name: "Tofu scramble",
          brand: "Calibrate",
          calories: 183.5,
          totalFatGrams: 11.2,
          saturatedFatGrams: 1.4,
          cholesterolMg: 0,
          sodiumMg: 420,
          totalCarbohydrateGrams: 7.8,
          fiberGrams: 3.1,
          sugarGrams: 2.2,
          proteinGrams: 18.6,
          chosenQuantity: 1.25,
          chosenUnit: "serving",
          quantityServing: 0.5,
          servingLabel: "cup",
          quantityMass: 125,
          massUnit: "g",
          quantityVolume: 0.5,
          volumeUnit: "cup",
        },
      ],
      lunch: null,
      dinner: [],
      snacks: null,
      weight: 182.4,
    };

    expect(toDayLog(response)).toEqual(response);
  });

  it("preserves known-empty and unloaded snapshot slot meanings", () => {
    expect(toDayLogSnapshot(null, "2026-09-22")).toEqual({ date: "2026-09-22", data: null });
    expect(toDayLogSnapshot(undefined, "2026-09-22")).toEqual({ date: "2026-09-22", data: undefined });
  });

  it("maps food-search, sync, and write acknowledgements to frontend models", () => {
    const searchResponse: FoodSearchResponse = {
      nextCursor: "next-page",
      results: [
        {
          ...buildFoodEntry(),
          source: "recent",
          sourceLabel: "Your recent foods",
          foodEntryId: "entry-1",
          recency: { lastUsedDate: "2026-09-21", displayLabel: "Yesterday" },
        },
        {
          ...buildFoodEntry(),
          source: "catalog",
          sourceLabel: "USDA",
          catalogFoodId: "95434f9a-da1f-47dd-8175-a26ff42ee11e",
        },
      ],
    };
    const syncResponse: DayLogSyncResponse = {
      slots: [{ date: "2026-09-22", versionNumber: 3, dayLog: buildDayLog() }],
    };
    const foodAcknowledgement: CreateFoodEntryResponse = {
      foodEntryId: "entry-2",
      versionNumber: 4,
      createdDayLogId: "day-log-1",
    };
    const weightAcknowledgement: UpdateDayLogWeightResponse = { versionNumber: 5 };

    expect(toFoodSearchResults(searchResponse)).toEqual(searchResponse);
    expect(toFoodSearchResult(searchResponse.results[0]!)).toEqual(searchResponse.results[0]);
    expect(toDayLogSyncResult(syncResponse)).toEqual(syncResponse);
    expect(toFoodEntryWriteAcknowledgement(foodAcknowledgement)).toEqual(foodAcknowledgement);
    expect(toWeightWriteAcknowledgement(weightAcknowledgement)).toEqual(weightAcknowledgement);
  });
});
