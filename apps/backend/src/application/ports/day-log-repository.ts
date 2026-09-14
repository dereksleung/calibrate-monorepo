import type { DayLog } from "@domain/entities/day-log.js";
import type { FoodEntry } from "@domain/entities/food-entry.js";
import type { Weight } from "@domain/value-objects/weight.js";

export interface FindDayLogByDateAndUserInput {
  userId: string;
  date: string;
}

export interface FindDayLogsByDateRangeAndUserInput {
  userId: string;
  startDate: string;
  endDate: string;
}

export interface FindOrCreateDayLogByDateAndUserInput {
  date: string;
  userId: string;
}

export interface AddFoodEntryResult {
  foodEntryId: string;
  versionNumber: number;
  createdDayLogId?: string;
}

export interface CreateDayLogWithFoodEntryInput {
  userId: string;
  dayLog: DayLog;
  foodEntry: FoodEntry;
}

export interface CreateDayLogWithWeightInput {
  userId: string;
  dayLog: DayLog;
}

export interface RecordWeightResult {
  versionNumber: number;
  createdDayLogId?: string;
}

export interface IDayLogRepository {
  findLogByDateAndUserId({ userId, date }: FindDayLogByDateAndUserInput): Promise<DayLog | null>;

  findLogsByDateRangeAndUserId({
    userId,
    startDate,
    endDate,
  }: FindDayLogsByDateRangeAndUserInput): Promise<DayLog[]>;

  findOrCreateByDateAndUserId({ date, userId }: FindOrCreateDayLogByDateAndUserInput): Promise<DayLog>;

  addFoodEntry(dayLogId: string, foodEntry: FoodEntry): Promise<AddFoodEntryResult>;

  createWithFoodEntry({
    userId,
    dayLog,
    foodEntry,
  }: CreateDayLogWithFoodEntryInput): Promise<AddFoodEntryResult>;

  updateWeight(dayLogId: string, weight: Weight): Promise<RecordWeightResult>;

  createWithWeight({ userId, dayLog }: CreateDayLogWithWeightInput): Promise<RecordWeightResult>;

  countDayLogsByUserId(userId: string): Promise<number>;
}
