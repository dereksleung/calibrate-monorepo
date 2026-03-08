import { DayLog, FoodEntry } from "@domain";
import { FindOrCreateDayLogByIdRepositoryDto, GetDayLogByDateAndUserDto } from "../dtos/day-log-dtos.js";

export interface IDayLogRepository {
  findLogByDateAndUserId({ userId, date }: GetDayLogByDateAndUserDto): Promise<DayLog | null>;

  findOrCreateById({ id, userId }: FindOrCreateDayLogByIdRepositoryDto): Promise<DayLog>;

  addFoodEntry(dayLogId: string, foodEntry: FoodEntry): Promise<FoodEntry>;

  countDayLogsByUserId(userId: string): Promise<number>;
}
