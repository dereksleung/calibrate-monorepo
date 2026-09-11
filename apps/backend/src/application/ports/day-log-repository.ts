import type { DayLog } from "@domain/entities/day-log.js";
import type { FoodEntry } from "@domain/entities/food-entry.js";

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
}

export interface CreateDayLogWithFoodEntryInput {
  userId: string;
  dayLog: DayLog;
  foodEntry: FoodEntry;
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

  countDayLogsByUserId(userId: string): Promise<number>;
}
