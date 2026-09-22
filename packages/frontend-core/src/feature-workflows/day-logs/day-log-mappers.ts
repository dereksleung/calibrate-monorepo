import type { DayLogResponse, DayLogSyncSlot, FoodEntryResponse } from "@calibrate/api-contracts";

import type { DayLog, DayLogSnapshot, DayLogSyncSlot as DomainDayLogSyncSlot, FoodEntry } from "../../verticals/day-logs/models/day-log.js";

export function toFoodEntry(response: FoodEntryResponse): FoodEntry {
  return { ...response };
}

export function toDayLog(response: Exclude<DayLogResponse, null>): DayLog {
  return {
    ...response,
    breakfast: response.breakfast?.map(toFoodEntry) ?? null,
    lunch: response.lunch?.map(toFoodEntry) ?? null,
    dinner: response.dinner?.map(toFoodEntry) ?? null,
    snacks: response.snacks?.map(toFoodEntry) ?? null,
  };
}

export function toDayLogSnapshot(response: DayLogResponse | undefined, date: string): DayLogSnapshot {
  return { date, data: response === undefined ? undefined : response === null ? null : toDayLog(response) };
}

export function toDayLogSyncSlot(slot: DayLogSyncSlot): DomainDayLogSyncSlot {
  return { date: slot.date, versionNumber: slot.versionNumber, snapshot: toDayLogSnapshot(slot.dayLog, slot.date) };
}
