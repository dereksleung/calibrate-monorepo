import { MealNameSchema } from "@domain";
import * as z from "zod";

export const CommonFoodEntryFieldsSchema = z.object({
  meal: MealNameSchema,
  name: z.string(),
  brand: z.string().nullable(),
  iconName: z.string().nullable(),
  quantity: z.number(),
  quantityUnit: z.string(),
  calories: z.number(),
  totalFatGrams: z.number(),
  saturatedFatGrams: z.number().nullable(),
  cholesterolMg: z.number().nullable(),
  sodiumMg: z.number().nullable(),
  totalCarbohydrateGrams: z.number(),
  fiberGrams: z.number().nullable(),
  sugarGrams: z.number().nullable(),
  proteinGrams: z.number(),
});

export const CreateFoodEntryRequestSchema = CommonFoodEntryFieldsSchema;

export const CreateFoodEntryRequestRouteParamsSchema = z.object({
  date: z.iso.date(),
});

export type CreateFoodEntryRequestRouteParams = z.infer<typeof CreateFoodEntryRequestRouteParamsSchema>;