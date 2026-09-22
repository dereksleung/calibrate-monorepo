import type { FoodEntry, MealName } from "./day-log.js";

export type FoodSearchResult =
  | (Omit<FoodEntry, "id" | "meal" | "chosenQuantity" | "chosenUnit"> & {
      source: "catalog";
      sourceLabel: string;
      catalogFoodId: string;
    })
  | (Omit<FoodEntry, "id" | "meal"> & {
      source: "recent";
      sourceLabel: string;
      foodEntryId: string;
      recency: { lastUsedDate: string; displayLabel: string };
    });

export interface FoodSearchPage {
  results: FoodSearchResult[];
  nextCursor: string | null;
}

export interface SaveFoodEntryCommand extends Omit<FoodEntry, "id"> {
  meal: MealName;
}
