export type FoodUnitOption = {
  unit: string;
  baseQuantity: number;
};

export type FoodNutrition = {
  calories: number;
  totalFatGrams: number;
  saturatedFatGrams: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbohydrateGrams: number;
  fiberGrams: number | null;
  sugarGrams: number | null;
  proteinGrams: number;
};

export type ScaledFoodNutrition = FoodNutrition;

export type ConfirmableFood = FoodNutrition & {
  quantityServing: number;
  servingLabel: string;
  quantityMass: number | null;
  massUnit: string | null;
  quantityVolume: number | null;
  volumeUnit: string | null;
  chosenQuantity?: number;
  chosenUnit?: string;
};

const NUTRITION_FRACTION_DIGITS = 1;

function normalizeNutritionNumber(value: number, maximumFractionDigits: number): number {
  return Number(
    value.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits,
    }),
  );
}

function scaleNullableNutrition(value: number | null, scale: number): number | null {
  return value === null ? null : value * scale;
}

function normalizeScaledNutrition(nutrition: FoodNutrition): ScaledFoodNutrition {
  return {
    calories: normalizeNutritionNumber(nutrition.calories, NUTRITION_FRACTION_DIGITS),
    totalFatGrams: normalizeNutritionNumber(nutrition.totalFatGrams, NUTRITION_FRACTION_DIGITS),
    saturatedFatGrams:
      nutrition.saturatedFatGrams === null
        ? null
        : normalizeNutritionNumber(nutrition.saturatedFatGrams, NUTRITION_FRACTION_DIGITS),
    cholesterolMg:
      nutrition.cholesterolMg === null ? null : normalizeNutritionNumber(nutrition.cholesterolMg, 0),
    sodiumMg: nutrition.sodiumMg === null ? null : normalizeNutritionNumber(nutrition.sodiumMg, 0),
    totalCarbohydrateGrams: normalizeNutritionNumber(
      nutrition.totalCarbohydrateGrams,
      NUTRITION_FRACTION_DIGITS,
    ),
    fiberGrams:
      nutrition.fiberGrams === null
        ? null
        : normalizeNutritionNumber(nutrition.fiberGrams, NUTRITION_FRACTION_DIGITS),
    sugarGrams:
      nutrition.sugarGrams === null
        ? null
        : normalizeNutritionNumber(nutrition.sugarGrams, NUTRITION_FRACTION_DIGITS),
    proteinGrams: normalizeNutritionNumber(nutrition.proteinGrams, NUTRITION_FRACTION_DIGITS),
  };
}

function createUnitOption(quantity: number | null, unit: string | null): FoodUnitOption | null {
  if (quantity === null || !Number.isFinite(quantity) || quantity <= 0 || !unit?.trim()) {
    return null;
  }

  return { unit: unit.trim(), baseQuantity: quantity };
}

/** Returns only catalog units that have a matching, positive reference quantity. */
export function getFoodUnitOptions(food: ConfirmableFood): FoodUnitOption[] {
  const candidates = [
    createUnitOption(food.quantityServing, food.servingLabel),
    createUnitOption(food.quantityMass, food.massUnit),
    createUnitOption(food.quantityVolume, food.volumeUnit),
  ];
  const seenUnits = new Set<string>();

  return candidates.filter((option): option is FoodUnitOption => {
    if (!option || seenUnits.has(option.unit)) {
      return false;
    }

    seenUnits.add(option.unit);
    return true;
  });
}

/** Restores a recent food's stored plate nutrition to its catalog reference serving. */
export function recoverCatalogReferenceNutrition<T extends ConfirmableFood>(food: T): T {
  const selectedUnit = getFoodUnitOptions(food).find((option) => option.unit === food.chosenUnit);
  const chosenQuantity = food.chosenQuantity;
  if (
    !selectedUnit ||
    typeof chosenQuantity !== "number" ||
    !Number.isFinite(chosenQuantity) ||
    chosenQuantity <= 0
  ) {
    return food;
  }

  const scale = selectedUnit.baseQuantity / chosenQuantity;
  return {
    ...food,
    calories: food.calories * scale,
    totalFatGrams: food.totalFatGrams * scale,
    saturatedFatGrams: scaleNullableNutrition(food.saturatedFatGrams, scale),
    cholesterolMg: scaleNullableNutrition(food.cholesterolMg, scale),
    sodiumMg: scaleNullableNutrition(food.sodiumMg, scale),
    totalCarbohydrateGrams: food.totalCarbohydrateGrams * scale,
    fiberGrams: scaleNullableNutrition(food.fiberGrams, scale),
    sugarGrams: scaleNullableNutrition(food.sugarGrams, scale),
    proteinGrams: food.proteinGrams * scale,
  };
}

/** Scales catalog nutrition from the selected unit's catalog reference quantity. */
export function scaleFoodNutrition(
  food: ConfirmableFood,
  chosenQuantity: number,
  chosenUnit: string,
): ScaledFoodNutrition {
  const selectedUnit = getFoodUnitOptions(food).find((option) => option.unit === chosenUnit);
  const scale =
    selectedUnit && Number.isFinite(chosenQuantity) && chosenQuantity >= 0
      ? chosenQuantity / selectedUnit.baseQuantity
      : 0;

  return normalizeScaledNutrition({
    calories: food.calories * scale,
    totalFatGrams: food.totalFatGrams * scale,
    saturatedFatGrams: scaleNullableNutrition(food.saturatedFatGrams, scale),
    cholesterolMg: scaleNullableNutrition(food.cholesterolMg, scale),
    sodiumMg: scaleNullableNutrition(food.sodiumMg, scale),
    totalCarbohydrateGrams: food.totalCarbohydrateGrams * scale,
    fiberGrams: scaleNullableNutrition(food.fiberGrams, scale),
    sugarGrams: scaleNullableNutrition(food.sugarGrams, scale),
    proteinGrams: food.proteinGrams * scale,
  });
}
