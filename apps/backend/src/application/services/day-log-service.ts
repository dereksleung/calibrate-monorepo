import { DayLog } from "@domain/entities/day-log.js";
import { FoodEntry, MealNameEnumType } from "@domain/entities/food-entry.js";
import { BusinessLogicError } from "@domain/errors/business-logic-error.js";

import { IDayLogRepository } from "../ports/day-log-repository.js";
import { type IDayLogSyncQuery } from "../ports/day-log-sync-query.js";
import { IUserRepository } from "../ports/user-repository.js";

export interface GetDayLogInput {
  userId: string;
  date: string;
}

export interface GetDayLogRangeInput {
  userId: string;
  startDate: string;
  endDate: string;
}

export type KnownDayLogRevision = number | null;

export interface SyncLogsForDateRangeInput {
  userId: string;
  startDate: string;
  endDate: string;
  known: Readonly<Record<string, KnownDayLogRevision>>;
}

export interface ChangedDayLogSlot {
  date: string;
  versionNumber: number | null;
  dayLog: DayLog | null;
}

export type SyncLogsForDateRangeResult =
  | { status: "unchanged" }
  | { status: "changed"; slots: ChangedDayLogSlot[] };

export interface AddFoodEntryInput {
  userId: string;
  date: string;
  foodEntry: {
    meal: MealNameEnumType;
    name: string;
    brand: string | null;
    iconName: string | null;
    chosenQuantity: number;
    chosenUnit: string;
    quantityServing: number;
    servingLabel: string;
    quantityMass: number | null;
    massUnit: string | null;
    quantityVolume: number | null;
    volumeUnit: string | null;
    calories: number;
    totalFatGrams: number;
    saturatedFatGrams: number | null;
    cholesterolMg: number | null;
    sodiumMg: number | null;
    totalCarbohydrateGrams: number;
    fiberGrams: number | null;
    sugarGrams: number | null;
    proteinGrams: number;
  };
}

export interface AddFoodEntryResult {
  foodEntry: FoodEntry;
  dayLogVersionNumber: number;
}

export interface IDayLogService {
  getLogForDay({ userId, date }: GetDayLogInput): Promise<DayLog | null>;
  getLogsForDateRange({ userId, startDate, endDate }: GetDayLogRangeInput): Promise<DayLog[]>;
  syncLogsForDateRange(input: SyncLogsForDateRangeInput): Promise<SyncLogsForDateRangeResult>;
  addFoodEntry({ userId, date, foodEntry }: AddFoodEntryInput): Promise<AddFoodEntryResult>;
}

export class DayLogServiceImpl implements IDayLogService {
  private readonly dayLogRepository: IDayLogRepository;
  private readonly userRepository: IUserRepository;
  private readonly dayLogSyncQuery: IDayLogSyncQuery;
  constructor(
    dayLogRepository: IDayLogRepository,
    userRepository: IUserRepository,
    dayLogSyncQuery: IDayLogSyncQuery,
  ) {
    this.dayLogRepository = dayLogRepository;
    this.userRepository = userRepository;
    this.dayLogSyncQuery = dayLogSyncQuery;
  }

  async getLogForDay({ userId, date }: GetDayLogInput): Promise<DayLog | null> {
    return this.dayLogRepository.findLogByDateAndUserId({ userId, date });
  }

  async getLogsForDateRange({ userId, startDate, endDate }: GetDayLogRangeInput): Promise<DayLog[]> {
    return this.dayLogRepository.findLogsByDateRangeAndUserId({ userId, startDate, endDate });
  }

  async syncLogsForDateRange(input: SyncLogsForDateRangeInput): Promise<SyncLogsForDateRangeResult> {
    const result = await this.dayLogSyncQuery.getChangesForRange(input);

    if (result.status === "unchanged") {
      return { status: "unchanged" };
    }

    return {
      status: "changed",
      slots: result.slots.map((slot) => ({
        date: slot.date,
        versionNumber: slot.versionNumber,
        dayLog: slot.dayLog,
      })),
    };
  }

  async addFoodEntry({ userId, date, foodEntry }: AddFoodEntryInput): Promise<AddFoodEntryResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessLogicError("User not found");
    }

    const dayLogCount = await this.dayLogRepository.countDayLogsByUserId(userId);

    // Business rule: A user cannot have more than 7 day logs before subscribing
    // Service layer can coordinate and enforce business logic of other aggregates/entities
    if (!user.tier.isSubscribed() && dayLogCount > 7) {
      throw new BusinessLogicError("User has reached the maximum number of day logs before subscribing");
    }

    const dayLog = await this.dayLogRepository.findOrCreateByDateAndUserId({
      date,
      userId,
    });

    // Create a new food entry domain entity, applying the domain's validation rules
    const newFoodEntry = FoodEntry.create({
      ...foodEntry,
      dayLogId: dayLog.id,
    });

    // Apply domain aggregate's business rules - each day log has a maximum of 25 food entries per meal
    const entry = dayLog.addFoodEntry(newFoodEntry);
    const persisted = await this.dayLogRepository.addFoodEntry(dayLog.id, entry);

    return {
      foodEntry: persisted.foodEntry,
      dayLogVersionNumber: persisted.dayLogVersionNumber,
    };
  }
}
