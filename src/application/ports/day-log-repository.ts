import { DayLog } from "@domain";
import { GetDayLogByDateAndUserDto } from "../dtos/day-log-dtos.js";

export interface IDayLogRepository {
  findLogByDateAndUserId({
    userId,
    date,
  }: GetDayLogByDateAndUserDto): Promise<DayLog | null>;
}
