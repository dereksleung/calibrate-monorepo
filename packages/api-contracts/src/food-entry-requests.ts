import * as z from "zod";

import {
  FoodEntryBaseSchema,
  FoodEntryChosenFieldsSchema,
  MealNameSchema,
} from "./common/food-entry-base.js";

export const CommonFoodEntryFieldsSchema = FoodEntryBaseSchema.extend(FoodEntryChosenFieldsSchema.shape).extend({
  meal: MealNameSchema,
});

export const CreateFoodEntryRequestSchema = CommonFoodEntryFieldsSchema;

export const CreateFoodEntryRequestRouteParamsSchema = z.object({
  date: z.iso.date(),
});

export type CreateFoodEntryRequest = z.infer<typeof CreateFoodEntryRequestSchema>;
export type CreateFoodEntryRequestRouteParams = z.infer<typeof CreateFoodEntryRequestRouteParamsSchema>;
