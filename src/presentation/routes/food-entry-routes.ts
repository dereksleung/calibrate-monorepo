import { Router } from "express";

import { FoodEntryController } from "../controllers/food-entry-controller.js";

export function createFoodEntryRoutes(foodEntryController: FoodEntryController): Router {
  const router = Router();

  router.post("/food-entries", (req, res) => foodEntryController.createFoodEntry(req, res));
  return router;
}
