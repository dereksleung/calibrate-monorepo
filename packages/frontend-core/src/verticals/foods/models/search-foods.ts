export type FoodSearchCursor = string;

export type FoodSearchQuery = {
  query: string;
  cursor?: FoodSearchCursor;
  limit?: number;
};

type FoodSearchNutrition = {
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
};

export type CatalogFoodSearchResult = FoodSearchNutrition & {
  source: "catalog";
  id: string;
  sourceLabel: string;
};

export type RecentFoodSearchResult = FoodSearchNutrition & {
  source: "recent";
  id: string;
  sourceLabel: string;
  recency: {
    lastUsedDate: string;
    displayLabel: string;
  };
  chosenQuantity: number;
  chosenUnit: string;
};

export type FoodSearchResult = CatalogFoodSearchResult | RecentFoodSearchResult;

export type FoodSearchPage = {
  results: FoodSearchResult[];
  nextCursor: FoodSearchCursor | null;
};
