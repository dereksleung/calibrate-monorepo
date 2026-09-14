import { IDayLogRepository } from "@application/ports/day-log-repository.js";
import { IDayLogSyncQuery } from "@application/ports/day-log-sync-query.js";
import { IUserRepository } from "@application/ports/user-repository.js";
import { DayLogServiceImpl } from "@application/services/day-log-service.js";
import { DayLog } from "@domain/entities/day-log.js";
import { MealNameEnum } from "@domain/entities/food-entry.js";
import { User } from "@domain/entities/user.js";
import { Weight } from "@domain/value-objects/weight.js";
import { buildDayLog } from "@factories/day-log.js";
import { buildFoodEntry, buildFoodEntryResponse } from "@factories/food-entry.js";
import { vi, MockedObject } from "vitest";

describe("DayLogServiceImpl", () => {
  let dayLogService: DayLogServiceImpl;
  let mockDayLogRepository: MockedObject<IDayLogRepository>;
  let mockUserRepository: MockedObject<IUserRepository>;
  let mockDayLogSyncQuery: MockedObject<IDayLogSyncQuery>;
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
    mockUserRepository = {
      findById: vi.fn(),
    } as any;
    mockDayLogRepository = {
      findLogByDateAndUserId: vi.fn(),
      findLogsByDateRangeAndUserId: vi.fn(),
      findOrCreateByDateAndUserId: vi.fn(),
      addFoodEntry: vi.fn(),
      createWithFoodEntry: vi.fn(),
      updateWeight: vi.fn(),
      createWithWeight: vi.fn(),
      countDayLogsByUserId: vi.fn(),
    } as any;
    mockDayLogSyncQuery = {
      getChangesForRange: vi.fn(),
    } as any;
    dayLogService = new DayLogServiceImpl(mockDayLogRepository, mockUserRepository, mockDayLogSyncQuery);
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
      mockDayLogRepository.findLogByDateAndUserId.mockRejectedValue(new Error("Database connection failed"));

      await expect(
        dayLogService.getLogForDay({
          userId: "user-1",
          date: "2026-02-22",
        }),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("getLogsForDateRange", () => {
    it("delegates the authenticated user and inclusive bounds to the repository", async () => {
      mockDayLogRepository.findLogsByDateRangeAndUserId.mockResolvedValue([mockDayLog]);

      const result = await dayLogService.getLogsForDateRange({
        userId: "user-1",
        startDate: "2026-02-16",
        endDate: "2026-02-22",
      });

      expect(mockDayLogRepository.findLogsByDateRangeAndUserId).toHaveBeenCalledWith({
        userId: "user-1",
        startDate: "2026-02-16",
        endDate: "2026-02-22",
      });
      expect(result).toEqual([mockDayLog]);
    });

    it("propagates an empty repository result without creating day logs", async () => {
      mockDayLogRepository.findLogsByDateRangeAndUserId.mockResolvedValue([]);

      await expect(
        dayLogService.getLogsForDateRange({
          userId: "user-1",
          startDate: "2026-02-16",
          endDate: "2026-02-22",
        }),
      ).resolves.toEqual([]);

      expect(mockDayLogRepository.findOrCreateByDateAndUserId).not.toHaveBeenCalled();
    });

    it("propagates repository errors", async () => {
      mockDayLogRepository.findLogsByDateRangeAndUserId.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(
        dayLogService.getLogsForDateRange({
          userId: "user-1",
          startDate: "2026-02-16",
          endDate: "2026-02-22",
        }),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("syncLogsForDateRange", () => {
    it("delegates the authenticated user and sparse manifest to the coherent snapshot port", async () => {
      mockDayLogSyncQuery.getChangesForRange.mockResolvedValue({ status: "unchanged" });
      const input = {
        userId: "user-1",
        startDate: "2026-08-06",
        endDate: "2026-08-12",
        known: { "2026-08-06": 1, "2026-08-07": null },
      };

      await expect(dayLogService.syncLogsForDateRange(input)).resolves.toEqual({ status: "unchanged" });
      expect(mockDayLogSyncQuery.getChangesForRange).toHaveBeenCalledWith(input);
    });

    it("propagates a sparse changed snapshot", async () => {
      const result = {
        status: "changed" as const,
        slots: [{ date: "2026-08-07", versionNumber: null, dayLog: null }],
      };
      mockDayLogSyncQuery.getChangesForRange.mockResolvedValue(result);

      await expect(
        dayLogService.syncLogsForDateRange({
          userId: "user-1",
          startDate: "2026-08-06",
          endDate: "2026-08-07",
          known: {},
        }),
      ).resolves.toEqual(result);
    });
  });

  describe("addFoodEntry", () => {
    it("returns the persisted food entry id with the updated parent version", async () => {
      const foodEntryInput = { ...buildFoodEntryResponse(), iconName: null };
      const persistedResult = {
        foodEntryId: "entry-1",
        versionNumber: 2,
      };
      mockUserRepository.findById.mockResolvedValue(
        User.create({ email: "user@example.com", passwordHash: "hash" }),
      );
      mockDayLogRepository.countDayLogsByUserId.mockResolvedValue(1);
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(mockDayLog);
      mockDayLogRepository.addFoodEntry.mockResolvedValue(persistedResult);

      await expect(
        dayLogService.addFoodEntry({
          userId: "user-1",
          date: "2026-02-22",
          foodEntry: foodEntryInput,
        }),
      ).resolves.toEqual(persistedResult);
      expect(mockDayLogRepository.findOrCreateByDateAndUserId).not.toHaveBeenCalled();
      expect(mockDayLogRepository.createWithFoodEntry).not.toHaveBeenCalled();
    });

    it("creates a missing day log with the first food entry at version 1", async () => {
      const foodEntryInput = { ...buildFoodEntryResponse(), iconName: null };
      const persistedResult = {
        foodEntryId: "entry-1",
        versionNumber: 1,
        createdDayLogId: "day-log-1",
      };
      mockUserRepository.findById.mockResolvedValue(
        User.create({ email: "user@example.com", passwordHash: "hash" }),
      );
      mockDayLogRepository.countDayLogsByUserId.mockResolvedValue(1);
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(null);
      mockDayLogRepository.createWithFoodEntry.mockResolvedValue(persistedResult);

      await expect(
        dayLogService.addFoodEntry({
          userId: "user-1",
          date: "2026-02-22",
          foodEntry: foodEntryInput,
        }),
      ).resolves.toEqual(persistedResult);
      expect(mockDayLogRepository.addFoodEntry).not.toHaveBeenCalled();
      expect(mockDayLogRepository.createWithFoodEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          dayLog: expect.objectContaining({ versionNumber: 1 }),
        }),
      );
    });
  });

  describe("recordWeight", () => {
    it("replaces an existing observation without checking the create cap", async () => {
      const user = User.create({ email: "user@example.com", passwordHash: "hash" });
      const persistedResult = { versionNumber: 8 };
      mockUserRepository.findById.mockResolvedValue(user);
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(mockDayLog);
      mockDayLogRepository.updateWeight.mockResolvedValue(persistedResult);

      await expect(
        dayLogService.recordWeight({ userId: "user-1", date: "2026-02-22", weight: 182.45 }),
      ).resolves.toEqual(persistedResult);

      expect(mockDayLogRepository.countDayLogsByUserId).not.toHaveBeenCalled();
      expect(mockDayLogRepository.updateWeight).toHaveBeenCalledWith(mockDayLog.id, expect.any(Weight));
      expect(mockDayLogRepository.updateWeight.mock.calls[0]?.[1]?.value).toBe(182.5);
      expect(mockDayLog.weight).toBe(182.5);
    });

    it("creates a weight-only Empty Day Log at version 1", async () => {
      const user = User.create({ email: "user@example.com", passwordHash: "hash" });
      const persistedResult = {
        versionNumber: 1,
        createdDayLogId: "day-log-weight-1",
      };
      mockUserRepository.findById.mockResolvedValue(user);
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(null);
      mockDayLogRepository.countDayLogsByUserId.mockResolvedValue(1);
      mockDayLogRepository.createWithWeight.mockResolvedValue(persistedResult);

      await expect(
        dayLogService.recordWeight({ userId: "user-1", date: "2026-02-23", weight: 182.45 }),
      ).resolves.toEqual(persistedResult);

      expect(mockDayLogRepository.createWithWeight).toHaveBeenCalledWith({
        userId: "user-1",
        dayLog: expect.objectContaining({
          weight: 182.5,
          versionNumber: 1,
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: [],
        }),
      });
      expect(mockDayLogRepository.updateWeight).not.toHaveBeenCalled();
    });

    it("rejects a new weight-only Day Log at the free-user cap", async () => {
      mockUserRepository.findById.mockResolvedValue(
        User.create({ email: "user@example.com", passwordHash: "hash" }),
      );
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(null);
      mockDayLogRepository.countDayLogsByUserId.mockResolvedValue(8);

      await expect(
        dayLogService.recordWeight({ userId: "user-1", date: "2026-02-23", weight: 182.5 }),
      ).rejects.toThrow("maximum number of day logs");

      expect(mockDayLogRepository.createWithWeight).not.toHaveBeenCalled();
    });

    it("allows a subscribed user to create new weight-only Day Logs without the free user 7 day log limit", async () => {
      const user = User.reconstitute({
        id: "user-1",
        email: "user@example.com",
        passwordHash: "hash",
        tier: "PREMIUM",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });
      mockUserRepository.findById.mockResolvedValue(user);
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(null);
      mockDayLogRepository.createWithWeight.mockResolvedValue({
        versionNumber: 1,
        createdDayLogId: "day-log-weight-1",
      });

      await expect(
        dayLogService.recordWeight({ userId: "user-1", date: "2026-02-23", weight: 182.5 }),
      ).resolves.toEqual({ versionNumber: 1, createdDayLogId: "day-log-weight-1" });

      expect(mockDayLogRepository.countDayLogsByUserId).not.toHaveBeenCalled();
    });

    it("rejects invalid weight before creating or updating a Day Log", async () => {
      mockUserRepository.findById.mockResolvedValue(
        User.create({ email: "user@example.com", passwordHash: "hash" }),
      );
      mockDayLogRepository.findLogByDateAndUserId.mockResolvedValue(mockDayLog);

      await expect(
        dayLogService.recordWeight({ userId: "user-1", date: "2026-02-22", weight: 1000 }),
      ).rejects.toThrow("Weight");

      expect(mockDayLogRepository.updateWeight).not.toHaveBeenCalled();
      expect(mockDayLogRepository.createWithWeight).not.toHaveBeenCalled();
    });
  });
});
