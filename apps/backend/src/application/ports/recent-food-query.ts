import type { FoodCatalogInput } from "./food-catalog-writer.js";

export interface RecentFoodRecord extends Omit<
  FoodCatalogInput,
  "source" | "sourceFoodId" | "normalizedGtin" | "verificationState"
> {
  foodEntryId: string;
  catalogFoodId: string | null;
  lastUsedDate: string;
  chosenQuantity: number;
  chosenUnit: string;
}

export interface IRecentFoodQuery {
  search(input: { userId: string; query: string; limit: number }): Promise<RecentFoodRecord[]>;
}
