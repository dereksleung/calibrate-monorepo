/** A meal section on a Day Log. */
export type Meal = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";

export type DayLogMealField = "breakfast" | "lunch" | "dinner" | "snacks";

export const dayLogMealFieldByMeal: Record<Meal, DayLogMealField> = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
};

export const mealSections: ReadonlyArray<{ meal: Meal; title: string }> = [
  { meal: "BREAKFAST", title: "Breakfast" },
  { meal: "LUNCH", title: "Lunch" },
  { meal: "DINNER", title: "Dinner" },
  { meal: "SNACKS", title: "Snacks" },
];
