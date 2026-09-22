export type FoodSearchBaseResult = {
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
  sourceLabel: string;
};

export type RecentFoodSearchResult = FoodSearchBaseResult & {
  source: "recent";
  foodEntryId: string;
  chosenQuantity: number;
  chosenUnit: string;
  recency: { lastUsedDate: string; displayLabel: string };
};

export type CatalogFoodSearchResult = FoodSearchBaseResult & {
  source: "catalog";
  catalogFoodId: string;
};

export type FoodSearchResult = RecentFoodSearchResult | CatalogFoodSearchResult;

export type FoodSearchResults = {
  results: FoodSearchResult[];
  nextCursor: string | null;
};
