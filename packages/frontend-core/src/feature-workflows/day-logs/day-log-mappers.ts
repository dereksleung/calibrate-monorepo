import type {
  CreateFoodEntryResponse,
  DayLogResponse,
  DayLogSyncResponse,
  FoodEntryResponse,
  FoodSearchResponse,
  FoodSearchResult as FoodSearchApiResult,
  UpdateDayLogWeightResponse,
} from "@calibrate/api-contracts";

import type { DayLog, DayLogSnapshot } from "../../verticals/day-logs/models/day-log.js";
import type { FoodEntry } from "../../verticals/day-logs/models/food-entry.js";
import type { FoodSearchResult, FoodSearchResults } from "../../verticals/day-logs/models/food-search.js";
import type { DayLogSyncResult } from "../../verticals/day-logs/models/sync.js";
import type {
  FoodEntryWriteAcknowledgement,
  WeightWriteAcknowledgement,
} from "../../verticals/day-logs/models/write-acknowledgement.js";

export function toFoodEntry(response: FoodEntryResponse): FoodEntry {
  return { ...response };
}

export function toDayLog(response: DayLogResponse): DayLog | null {
  if (response === null) return null;
  return {
    ...response,
    breakfast: response.breakfast?.map(toFoodEntry) ?? null,
    lunch: response.lunch?.map(toFoodEntry) ?? null,
    dinner: response.dinner?.map(toFoodEntry) ?? null,
    snacks: response.snacks?.map(toFoodEntry) ?? null,
  };
}

export function toDayLogSnapshot(response: DayLogResponse | undefined, date: string): DayLogSnapshot {
  return { date, data: response === undefined ? undefined : toDayLog(response) };
}

export function toFoodSearchResult(response: FoodSearchApiResult): FoodSearchResult {
  return { ...response };
}

export function toFoodSearchResults(response: FoodSearchResponse): FoodSearchResults {
  return { ...response, results: response.results.map(toFoodSearchResult) };
}

export function toDayLogSyncResult(response: DayLogSyncResponse | null): DayLogSyncResult {
  return response === null
    ? null
    : {
        slots: response.slots.map((slot) => ({
          ...slot,
          dayLog: toDayLog(slot.dayLog),
        })),
      };
}

export function toFoodEntryWriteAcknowledgement(
  response: CreateFoodEntryResponse,
): FoodEntryWriteAcknowledgement {
  return { ...response };
}

export function toWeightWriteAcknowledgement(
  response: UpdateDayLogWeightResponse,
): WeightWriteAcknowledgement {
  return { ...response };
}
