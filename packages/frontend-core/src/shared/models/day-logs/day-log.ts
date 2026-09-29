export type MealName = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";

export type FoodEntry = {
  id: string;
  meal: MealName;
  name: string;
  brand: string | null;
  calories: number;
  totalFatGrams: number;
  saturatedFatGrams: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbohydrateGrams: number;
  fiberGrams: number | null;
  sugarGrams: number | null;
  proteinGrams: number;
  quantityServing: number;
  servingLabel: string;
  quantityMass: number | null;
  massUnit: string | null;
  quantityVolume: number | null;
  volumeUnit: string | null;
  chosenQuantity: number;
  chosenUnit: string;
};

export type Meal = FoodEntry[] | null;

export type DayLog = {
  id: string;
  date: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal;
  weight: number | null;
};

export type KnownEmpty = null;
export type NotYetLoaded = undefined;
export type DayLogSlotResult = DayLog | KnownEmpty | NotYetLoaded;
export type DayLogSnapshot = { date: string; data: DayLogSlotResult };

export type DayLogSyncSlot = {
  date: string;
  versionNumber: number | null;
  dayLog: DayLog | KnownEmpty;
};

export type DayLogSyncResult = { slots: DayLogSyncSlot[] } | null;

const nonnegative = z.number().nonnegative();
const positive = z.number().positive();

export const FoodEntrySchema: z.ZodType<FoodEntry> = z.object({
  id: z.string().min(1),
  meal: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]),
  name: z.string().min(1),
  brand: z.string().min(1).nullable(),
  calories: nonnegative,
  totalFatGrams: nonnegative,
  saturatedFatGrams: nonnegative.nullable(),
  cholesterolMg: nonnegative.nullable(),
  sodiumMg: nonnegative.nullable(),
  totalCarbohydrateGrams: nonnegative,
  fiberGrams: nonnegative.nullable(),
  sugarGrams: nonnegative.nullable(),
  proteinGrams: nonnegative,
  quantityServing: positive,
  servingLabel: z.string().min(1),
  quantityMass: positive.nullable(),
  massUnit: z.string().min(1).nullable(),
  quantityVolume: positive.nullable(),
  volumeUnit: z.string().min(1).nullable(),
  chosenQuantity: positive,
  chosenUnit: z.string().min(1),
});

export const DayLogSchema: z.ZodType<DayLog> = z.object({
  id: z.uuid(),
  date: z.iso.date(),
  breakfast: z.array(FoodEntrySchema).nullable(),
  lunch: z.array(FoodEntrySchema).nullable(),
  dinner: z.array(FoodEntrySchema).nullable(),
  snacks: z.array(FoodEntrySchema).nullable(),
  weight: positive.max(999.9).nullable(),
});
import { z } from "zod";
