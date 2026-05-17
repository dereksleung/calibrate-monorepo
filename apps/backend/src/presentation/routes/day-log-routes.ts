import { Request, RequestHandler, Router } from "express";
import { DayLogController } from "src/presentation/controllers/day-log-controller.js";
import { CreateFoodEntryRequestRouteParams } from "src/presentation/http/food-entry-requests.js";

import { GetDayLogRequestRouteParams } from "../http/day-log-requests.js";

export function createDayLogRoutes(
  dayLogController: DayLogController,
  authenticationMiddleware: RequestHandler,
): Router {
  const router = Router();

  router.get("/daylogs/:date", authenticationMiddleware, (req, res) =>
    dayLogController.getLogForDay(req as Request<GetDayLogRequestRouteParams>, res),
  );
  router.post("/daylogs/:date/food-entries", authenticationMiddleware, (req, res) =>
    dayLogController.createFoodEntry(req as Request<CreateFoodEntryRequestRouteParams>, res),
  );
  return router;
}
