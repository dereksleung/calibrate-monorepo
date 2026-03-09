import { Router } from "express";
import { DayLogController } from "src/presentation/controllers/day-log-controller.js";

export function createDayLogRoutes(dayLogController: DayLogController): Router {
  const router = Router();

  router.get("/daylogs/:date", (req, res) =>
    dayLogController.getLogForDay(req, res),
  );
  router.post("/daylogs/:date/food-entries", (req, res) =>
    dayLogController.createFoodEntry(req, res),
  );
  return router;
}
