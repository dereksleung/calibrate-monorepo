import {
  DayLogSyncRequestSchema,
  DayLogSyncResponseSchema,
  type DayLogSyncRequest,
  type DayLogSyncResponse,
  type FoodEntryResponse,
} from "@calibrate/api-contracts";
import { z } from "zod";

import type { DayLog, DayLogSyncResult, FoodEntry } from "../../shared/models/day-logs/day-log.js";
import type { ApiTransport } from "../../transport.js";

const responseSchema = z.union([DayLogSyncResponseSchema, z.null()]);

export function syncDayLogs(
  transport: ApiTransport,
  input: DayLogSyncRequest,
): Promise<DayLogSyncResponse | null> {
  return transport.request({
    path: "/daylogs:sync",
    method: "POST",
    body: DayLogSyncRequestSchema.parse(input),
    responseBodySchema: responseSchema,
  });
}

function mapFoodEntry(entry: FoodEntryResponse): FoodEntry {
  return {
    id: entry.id,
    meal: entry.meal,
    name: entry.name,
    brand: entry.brand,
    calories: entry.calories,
    totalFatGrams: entry.totalFatGrams,
    saturatedFatGrams: entry.saturatedFatGrams,
    cholesterolMg: entry.cholesterolMg,
    sodiumMg: entry.sodiumMg,
    totalCarbohydrateGrams: entry.totalCarbohydrateGrams,
    fiberGrams: entry.fiberGrams,
    sugarGrams: entry.sugarGrams,
    proteinGrams: entry.proteinGrams,
    quantityServing: entry.quantityServing,
    servingLabel: entry.servingLabel,
    quantityMass: entry.quantityMass,
    massUnit: entry.massUnit,
    quantityVolume: entry.quantityVolume,
    volumeUnit: entry.volumeUnit,
    chosenQuantity: entry.chosenQuantity,
    chosenUnit: entry.chosenUnit,
  };
}

function mapDayLog(dayLog: NonNullable<DayLogSyncResponse["slots"][number]["dayLog"]>): DayLog {
  return {
    id: dayLog.id,
    date: dayLog.date,
    breakfast: dayLog.breakfast?.map(mapFoodEntry) ?? null,
    lunch: dayLog.lunch?.map(mapFoodEntry) ?? null,
    dinner: dayLog.dinner?.map(mapFoodEntry) ?? null,
    snacks: dayLog.snacks?.map(mapFoodEntry) ?? null,
    weight: dayLog.weight,
  };
}

export function mapDayLogSyncResponse(response: DayLogSyncResponse | null): DayLogSyncResult {
  if (response === null) return null;
  return {
    slots: response.slots.map((slot) => ({
      date: slot.date,
      versionNumber: slot.versionNumber,
      dayLog: slot.dayLog === null ? null : mapDayLog(slot.dayLog),
    })),
  };
}
