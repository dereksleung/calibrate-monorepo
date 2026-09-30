import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiTransport } from "../../transport.js";
import type { FoodSearchPage, FoodSearchQuery } from "../../verticals/foods/models/search-foods.js";

import {
  formFoodSearchRequestQuery,
  mapFoodSearchResponse,
  searchFoods,
} from "../../api/foods/search-foods.js";

export function foodSearchQueryKey(input: FoodSearchQuery): readonly ["foods", "search", FoodSearchQuery] {
  return ["foods", "search", input];
}

export function searchFoodsQueryOptions(transport: ApiTransport, input: FoodSearchQuery) {
  const query = formFoodSearchRequestQuery(input);
  return queryOptions({
    queryKey: foodSearchQueryKey(query),
    queryFn: async ({ signal }): Promise<FoodSearchPage> =>
      mapFoodSearchResponse(await searchFoods(transport, query, signal)),
  });
}

/** Portable staged-search hook. React Query aborts superseded queries through the request signal. */
export function useFoodSearch(transport: ApiTransport, input: FoodSearchQuery | null) {
  const enabled = input !== null;
  return useQuery({
    queryKey: foodSearchQueryKey(input ?? { query: "" }),
    queryFn: async ({ signal }): Promise<FoodSearchPage> => {
      if (!input) throw new Error("A search query is required");
      return mapFoodSearchResponse(await searchFoods(transport, input, signal));
    },
    enabled,
  });
}
