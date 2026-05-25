import * as z from "zod";

export const FoodEntryBaseSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1).nullable(),
  calories: z.number().nonnegative(),
  totalFatGrams: z.number().nonnegative(),
  saturatedFatGrams: z.number().nonnegative().nullable(),
  cholesterolMg: z.number().nonnegative().nullable(),
  sodiumMg: z.number().nonnegative().nullable(),
  totalCarbohydrateGrams: z.number().nonnegative(),
  fiberGrams: z.number().nonnegative().nullable(),
  sugarGrams: z.number().nonnegative().nullable(),
  proteinGrams: z.number().nonnegative(),
  quantityServing: z.number().positive().default(1),
  servingLabel: z.string().min(1).default("serving"),
  quantityMass: z.number().positive().nullable().default(null),
  massUnit: z.string().min(1).nullable().default(null),
  quantityVolume: z.number().positive().nullable().default(null),
  volumeUnit: z.string().min(1).nullable().default(null),
});
export type FoodEntryBase = z.infer<typeof FoodEntryBaseSchema>;

/** Logged amount the user confirmed (not used on food-search result shapes). */
export const FoodEntryChosenFieldsSchema = z.object({
  chosenQuantity: z.number().positive(),
  chosenUnit: z.string().min(1),
});
export type FoodEntryChosenFields = z.infer<typeof FoodEntryChosenFieldsSchema>;

export const MealNameSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]);
export type MealNameEnumType = z.infer<typeof MealNameSchema>;
