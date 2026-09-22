import type { Meal } from "@calibrate/frontend-core/verticals/day-logs/models/meal";

export type SelectedFoodForConfirmation = {
  id: string;
  name: string;
  brand?: string;
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
  chosenQuantity?: number;
  chosenUnit?: string;
  lastUsedLabel?: string;
  lastUsedDate?: string;
};

export type FoodConfirmationState = {
  food: SelectedFoodForConfirmation;
  preselectedMeal?: Meal;
};

declare module "@tanstack/history" {
  interface HistoryState {
    foodConfirmation?: FoodConfirmationState;
  }
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/** Validates the transient router state so a direct route entry is safely recoverable. */
export function parseFoodConfirmationState(value: unknown): FoodConfirmationState | null {
  if (!value || typeof value !== "object") return null;

  const state = value as { food?: unknown; preselectedMeal?: unknown };
  const food = state.food;
  if (!food || typeof food !== "object") return null;

  const candidate = food as Record<string, unknown>;
  const hasRequiredNumbers = [
    "calories",
    "totalFatGrams",
    "totalCarbohydrateGrams",
    "proteinGrams",
    "quantityServing",
  ].every((key) => typeof candidate[key] === "number");
  const hasNullableNumbers = [
    "saturatedFatGrams",
    "cholesterolMg",
    "sodiumMg",
    "fiberGrams",
    "sugarGrams",
    "quantityMass",
    "quantityVolume",
  ].every((key) => isNullableNumber(candidate[key]));
  const hasNullableStrings = ["massUnit", "volumeUnit"].every((key) => isNullableString(candidate[key]));

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    !isOptionalString(candidate.brand) ||
    !isOptionalNumber(candidate.chosenQuantity) ||
    !isOptionalString(candidate.chosenUnit) ||
    !isOptionalString(candidate.lastUsedLabel) ||
    !isOptionalString(candidate.lastUsedDate) ||
    typeof candidate.servingLabel !== "string" ||
    !hasRequiredNumbers ||
    !hasNullableNumbers ||
    !hasNullableStrings ||
    !["BREAKFAST", "LUNCH", "DINNER", "SNACKS", undefined].includes(state.preselectedMeal as never)
  )
    return null;

  return value as FoodConfirmationState;
}
