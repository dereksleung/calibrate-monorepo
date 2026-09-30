import type { FoodEntry } from "../../../shared/models/day-logs/day-log.js";

export type SaveFoodEntryCommand = Omit<FoodEntry, "id">;

export type SaveFoodEntryAcknowledgement = {
  foodEntry: FoodEntry;
  versionNumber: number;
  dayLogId?: string;
};
