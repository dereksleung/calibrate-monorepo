import {
  FoodSearchRequestQuerySchema,
  FoodSearchResponseSchema,
  type FoodSearchRequestQuery,
  type FoodSearchResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type {
  FoodSearchPage,
  FoodSearchQuery,
  FoodSearchResult,
} from "../../verticals/foods/models/search-foods.js";

export function formFoodSearchRequestQuery(input: FoodSearchQuery): FoodSearchRequestQuery {
  return FoodSearchRequestQuerySchema.parse(input);
}

export function searchFoods(
  transport: ApiTransport,
  input: FoodSearchQuery,
  signal?: AbortSignal,
): Promise<FoodSearchResponse> {
  return transport.request({
    path: "/foods/search",
    query: formFoodSearchRequestQuery(input),
    signal,
    responseBodySchema: FoodSearchResponseSchema,
  });
}

function mapFoodSearchResult(result: FoodSearchResponse["results"][number]): FoodSearchResult {
  const nutrition = {
    name: result.name,
    brand: result.brand,
    calories: result.calories,
    totalFatGrams: result.totalFatGrams,
    saturatedFatGrams: result.saturatedFatGrams,
    cholesterolMg: result.cholesterolMg,
    sodiumMg: result.sodiumMg,
    totalCarbohydrateGrams: result.totalCarbohydrateGrams,
    fiberGrams: result.fiberGrams,
    sugarGrams: result.sugarGrams,
    proteinGrams: result.proteinGrams,
    quantityServing: result.quantityServing,
    servingLabel: result.servingLabel,
    quantityMass: result.quantityMass,
    massUnit: result.massUnit,
    quantityVolume: result.quantityVolume,
    volumeUnit: result.volumeUnit,
  };

  if (result.source === "catalog") {
    return {
      source: "catalog",
      id: result.catalogFoodId,
      sourceLabel: result.sourceLabel,
      ...nutrition,
    };
  }

  return {
    source: "recent",
    id: result.foodEntryId,
    sourceLabel: result.sourceLabel,
    ...nutrition,
    recency: {
      lastUsedDate: result.recency.lastUsedDate,
      displayLabel: result.recency.displayLabel,
    },
    chosenQuantity: result.chosenQuantity,
    chosenUnit: result.chosenUnit,
  };
}

export function mapFoodSearchResponse(response: FoodSearchResponse): FoodSearchPage {
  return {
    results: response.results.map(mapFoodSearchResult),
    nextCursor: response.nextCursor,
  };
}
