import type {
  CatalogFoodSearchResult,
  FoodSearchPage,
  FoodSearchQuery,
  RecentFoodSearchResult,
} from "../search-foods.js";

const greekYogurt = {
  name: "Greek yogurt",
  brand: "Calibrate Kitchen" as string | null,
  calories: 150,
  totalFatGrams: 4,
  saturatedFatGrams: 2,
  cholesterolMg: 10,
  sodiumMg: 65,
  totalCarbohydrateGrams: 8,
  fiberGrams: 0,
  sugarGrams: 6,
  proteinGrams: 18,
  quantityServing: 1,
  servingLabel: "cup",
  quantityMass: null,
  massUnit: null,
  quantityVolume: null,
  volumeUnit: null,
};

export function buildFoodSearchQuery(overrides: Partial<FoodSearchQuery> = {}): FoodSearchQuery {
  return { query: "greek yogurt", ...overrides };
}

export function buildCatalogFoodSearchResult(
  overrides: Partial<CatalogFoodSearchResult> = {},
): CatalogFoodSearchResult {
  return {
    source: "catalog",
    id: "2d38c136-5633-4b22-9553-b8a587dd6ba6",
    sourceLabel: "USDA FoodData Central",
    ...greekYogurt,
    ...overrides,
  };
}

export function buildRecentFoodSearchResult(
  overrides: Partial<RecentFoodSearchResult> = {},
): RecentFoodSearchResult {
  return {
    source: "recent",
    id: "food-entry-1",
    sourceLabel: "Recent",
    ...greekYogurt,
    recency: { lastUsedDate: "2026-05-19", displayLabel: "Tue" },
    chosenQuantity: 2,
    chosenUnit: "cups",
    ...overrides,
  };
}

export function buildFoodSearchPage(overrides: Partial<FoodSearchPage> = {}): FoodSearchPage {
  return {
    results: [buildCatalogFoodSearchResult()],
    nextCursor: null,
    ...overrides,
  };
}
