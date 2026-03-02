import * as z from "zod";
import { MealNameSchema } from "@domain";

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

export const CreateFoodEntryRequestSchema = z.object({
  ...CommonFoodEntryFieldsSchema.shape,
  dayLogId: z.string(),
});
