/** A meal section on a Day Log. */
export type Meal = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";

export type DayLogMealField = "breakfast" | "lunch" | "dinner" | "snacks";

export const dayLogMealFieldByMeal: Record<Meal, DayLogMealField> = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
};
