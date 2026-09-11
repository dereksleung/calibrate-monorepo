import * as z from "zod";

import {
  FoodEntryBaseSchema,
  FoodEntryChosenFieldsSchema,
  MealNameSchema,
} from "./common/food-entry-base.js";

export const CommonFoodEntryFieldsSchema = FoodEntryBaseSchema.extend(
  FoodEntryChosenFieldsSchema.shape,
).extend({
  meal: MealNameSchema,
});

export const CreateFoodEntryRequestSchema = CommonFoodEntryFieldsSchema;

const FOOD_ENTRY_QUANTITY_FRACTION_DIGITS = 2;
const FOOD_ENTRY_NUTRITION_FRACTION_DIGITS = 1;

type FoodEntryNutrition = Pick<
  CreateFoodEntryRequest,
  | "calories"
  | "totalFatGrams"
  | "saturatedFatGrams"
  | "cholesterolMg"
  | "sodiumMg"
  | "totalCarbohydrateGrams"
  | "fiberGrams"
  | "sugarGrams"
  | "proteinGrams"
>;

function normalizeFoodEntryNumber(value: number, maximumFractionDigits: number): number {
  return Number(
    value.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits,
    }),
  );
}

function normalizeNullableFoodEntryNumber(
  value: number | null,
  maximumFractionDigits: number,
): number | null {
  return value === null ? null : normalizeFoodEntryNumber(value, maximumFractionDigits);
}

export function normalizeFoodEntryQuantity(value: number): number {
  return normalizeFoodEntryNumber(value, FOOD_ENTRY_QUANTITY_FRACTION_DIGITS);
}

export function normalizeFoodEntryNutrition(nutrition: FoodEntryNutrition): FoodEntryNutrition {
  return {
    calories: normalizeFoodEntryNumber(nutrition.calories, FOOD_ENTRY_NUTRITION_FRACTION_DIGITS),
    totalFatGrams: normalizeFoodEntryNumber(nutrition.totalFatGrams, FOOD_ENTRY_NUTRITION_FRACTION_DIGITS),
    saturatedFatGrams: normalizeNullableFoodEntryNumber(
      nutrition.saturatedFatGrams,
      FOOD_ENTRY_NUTRITION_FRACTION_DIGITS,
    ),
    cholesterolMg: normalizeNullableFoodEntryNumber(nutrition.cholesterolMg, 0),
    sodiumMg: normalizeNullableFoodEntryNumber(nutrition.sodiumMg, 0),
    totalCarbohydrateGrams: normalizeFoodEntryNumber(
      nutrition.totalCarbohydrateGrams,
      FOOD_ENTRY_NUTRITION_FRACTION_DIGITS,
    ),
    fiberGrams: normalizeNullableFoodEntryNumber(nutrition.fiberGrams, FOOD_ENTRY_NUTRITION_FRACTION_DIGITS),
    sugarGrams: normalizeNullableFoodEntryNumber(nutrition.sugarGrams, FOOD_ENTRY_NUTRITION_FRACTION_DIGITS),
    proteinGrams: normalizeFoodEntryNumber(nutrition.proteinGrams, FOOD_ENTRY_NUTRITION_FRACTION_DIGITS),
  };
}

export function normalizeFoodEntryForStorage(entry: CreateFoodEntryRequest): CreateFoodEntryRequest {
  return {
    ...entry,
    chosenQuantity: normalizeFoodEntryQuantity(entry.chosenQuantity),
    ...normalizeFoodEntryNutrition(entry),
    quantityServing: normalizeFoodEntryQuantity(entry.quantityServing),
    quantityMass: normalizeNullableFoodEntryNumber(entry.quantityMass, FOOD_ENTRY_QUANTITY_FRACTION_DIGITS),
    quantityVolume: normalizeNullableFoodEntryNumber(
      entry.quantityVolume,
      FOOD_ENTRY_QUANTITY_FRACTION_DIGITS,
    ),
  };
}

export const CreateFoodEntryRequestRouteParamsSchema = z.object({
  date: z.iso.date(),
});

export type CreateFoodEntryRequest = z.infer<typeof CreateFoodEntryRequestSchema>;
export type CreateFoodEntryRequestRouteParams = z.infer<typeof CreateFoodEntryRequestRouteParamsSchema>;
