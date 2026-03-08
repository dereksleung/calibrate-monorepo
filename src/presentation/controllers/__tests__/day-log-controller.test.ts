import { DayLogServiceImpl } from "@application";
import { BusinessLogicError, DayLog, MealNameEnum } from "@domain";
import { buildDayLogResponse, buildFoodEntry, buildFoodEntryResponse } from "@factories";
import { DayLogResponse, GetDayLogRequestRouteParams } from "@presentation";
import { Request } from "express";
import { DayLogController } from "src/presentation/controllers/day-log-controller.js";
import { vi, MockedObject } from "vitest";

describe("DayLogController", () => {
  let dayLogController: DayLogController;
  let mockDayLogService: MockedObject<DayLogServiceImpl>;
  const mockDayLog: DayLog = DayLog.reconstitute({
    id: "123",
    date: new Date("2026-02-22"),
    breakfast: [buildFoodEntry({ meal: MealNameEnum.BREAKFAST })],
    lunch: [buildFoodEntry({ meal: MealNameEnum.LUNCH })],
    dinner: [buildFoodEntry({ meal: MealNameEnum.DINNER })],
    snacks: [buildFoodEntry({ meal: MealNameEnum.SNACKS })],
    weight: 140.1,
  });
  const mockDayLogResponse: DayLogResponse = buildDayLogResponse({
    id: "123",
    date: new Date("2026-02-22"),
    breakfast: [buildFoodEntryResponse({ meal: MealNameEnum.BREAKFAST })],
    lunch: [buildFoodEntryResponse({ meal: MealNameEnum.LUNCH })],
    dinner: [buildFoodEntryResponse({ meal: MealNameEnum.DINNER })],
    snacks: [buildFoodEntryResponse({ meal: MealNameEnum.SNACKS })],
    weight: 140.1,
  });

  beforeEach(() => {
    mockDayLogService = {
      getLogForDay: vi.fn(),
      // any is acceptable here because this is a test file,
      // the type assertion will not spread beyond the test file and beforeEach handler.
    } as any;
    dayLogController = new DayLogController(mockDayLogService);
  });

  it("should get a log when given a valid YYYY-MM-DD date", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "2026-02-22",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    mockDayLogService.getLogForDay.mockResolvedValue(mockDayLog);

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(mockDayLogService.getLogForDay).toHaveBeenCalledWith({
      userId: "59802894-b4ad-49dc-83dd-72a6fa571cd3",
      date: "2026-02-22",
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(mockDayLogResponse);
  });

  it("should return 400 when date param is invalid", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "not-a-date",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(mockDayLogService.getLogForDay).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        details: expect.any(Array),
      }),
    );
  });

  it("should return 404 when service throws a 'not found' error", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "2026-02-22",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    mockDayLogService.getLogForDay.mockRejectedValue(new Error("Resource not found"));

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Resource not found" });
  });

  it("should return 403 when service throws a 'permission' error", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "2026-02-22",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    mockDayLogService.getLogForDay.mockRejectedValue(new Error("Insufficient permission for this resource"));

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Permission denied" });
  });

  it("should return 500 with error message for all other Errors", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "2026-02-22",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    mockDayLogService.getLogForDay.mockRejectedValue(new Error("Database connection failed"));

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Database connection failed",
    });
  });

  it("should return 500 with generic message for non-Error throw", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "2026-02-22",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    mockDayLogService.getLogForDay.mockRejectedValue("some string error");

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "An unknown error occurred",
    });
  });

  it("should return 200 with null when service returns null", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "2026-02-22",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    mockDayLogService.getLogForDay.mockResolvedValue(null);

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(null);
  });

  it("should return 400 when service throws a BusinessLogicError", async () => {
    const req = {
      get: vi.fn(),
      params: {
        date: "2026-02-22",
      },
    } as unknown as Request<GetDayLogRequestRouteParams>;

    mockDayLogService.getLogForDay.mockRejectedValue(new BusinessLogicError("Invalid date"));

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await dayLogController.getLogForDay(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid date" });
  });
});
