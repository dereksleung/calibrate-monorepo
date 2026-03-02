import { IDayLogService } from "@application";
import { validate } from "@validation";
import { Request, Response } from "express";
import { CreateFoodEntryRequestSchema } from "../http/food-entry-requests.js";

export class FoodEntryController {
  constructor(private dayLogService: IDayLogService) {}

  async createFoodEntry(req: Request, res: Response): Promise<void> {
    const validatedInput = validate(CreateFoodEntryRequestSchema, req.body);
    if (!validatedInput.isValid) {
      res.status(400).json({
        error: "Validation failed",
        details: validatedInput.errors,
      });
      return;
    }

    const stubUserId = "59802894-b4ad-49dc-83dd-72a6fa571cd3";

    const { data } = validatedInput;
    const { dayLogId, ...restFoodEntry } = data;
    const entry = await this.dayLogService.addFoodEntry({
      userId: stubUserId,
      dayLogId,
      foodEntry: restFoodEntry,
    });
    res.status(201).json(entry);
  }
}
