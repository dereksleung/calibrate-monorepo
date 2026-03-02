import { DayLogServiceImpl, IDayLogRepository } from "@application";
import { DayLog, MealNameEnum } from "@domain";
import { vi, MockedObject } from "vitest";
import { buildDayLog, buildFoodEntry } from "@factories";

describe("DayLogServiceImpl", () => {
  let dayLogService: DayLogServiceImpl;
  let mockDayLogRepository: MockedObject<IDayLogRepository>;

  const mockDayLog: DayLog = buildDayLog({
    id: "123",
    date: new Date("2026-02-22"),
    breakfast: [buildFoodEntry({ meal: MealNameEnum.BREAKFAST })],
    lunch: [buildFoodEntry({ meal: MealNameEnum.LUNCH })],
    dinner: [buildFoodEntry({ meal: MealNameEnum.DINNER })],
    snacks: [buildFoodEntry({ meal: MealNameEnum.SNACKS })],
    weight: 140.1,
  });

  beforeEach(() => {
    mockDayLogRepository = {
      findLogByDateAndUserId: vi.fn(),
    } as any;
    dayLogService = new DayLogServiceImpl(mockDayLogRepository);
  });

  describe("getLogForDay", () => {
    it("should return a day log when the repository finds one", async () => {
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(mockDayLog);

      const result = await dayLogService.getLogForDay({
        userId: "user-1",
        date: "2026-02-22",
      });

      expect(mockDayLogRepository.findLogByDateAndUserId).toHaveBeenCalledWith({
        userId: "user-1",
        date: "2026-02-22",
      });
      expect(result).toBe(mockDayLog);
    });

    it("should return null when the repository finds no log", async () => {
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(null);

      const result = await dayLogService.getLogForDay({
        userId: "user-1",
        date: "2026-02-22",
      });

      expect(mockDayLogRepository.findLogByDateAndUserId).toHaveBeenCalledWith({
        userId: "user-1",
        date: "2026-02-22",
      });
      expect(result).toBeNull();
    });

    it("should propagate errors thrown by the repository", async () => {
      mockDayLogRepository.findLogByDateAndUserId.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(
        dayLogService.getLogForDay({
          userId: "user-1",
          date: "2026-02-22",
        }),
      ).rejects.toThrow("Database connection failed");
    });
  });
});
