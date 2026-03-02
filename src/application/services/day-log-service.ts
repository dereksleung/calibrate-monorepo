import { DayLog } from "@domain";
import { GetDayLogRequestDto } from "../dtos/day-log-dtos.js";
import { IDayLogRepository } from "../ports/day-log-repository.js";

export interface IDayLogService {
  getLogForDay({ userId, date }: GetDayLogRequestDto): Promise<DayLog | null>;
}

export class DayLogServiceImpl implements IDayLogService {
  private readonly dayLogRepository: IDayLogRepository;
  constructor(dayLogRepository: IDayLogRepository) {
    this.dayLogRepository = dayLogRepository;
  }

  async getLogForDay({
    userId,
    date,
  }: GetDayLogRequestDto): Promise<DayLog | null> {
    return this.dayLogRepository.findLogByDateAndUserId({ userId, date });
  }
}
