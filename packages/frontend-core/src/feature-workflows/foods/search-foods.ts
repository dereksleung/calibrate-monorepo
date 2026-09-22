import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ApiTransport } from "../../transport.js";
import type { FoodSearchResults } from "../../verticals/day-logs/models/food-search.js";

import { searchFoods as requestFoodSearch, type SearchFoodsRequest } from "../../api/foods/search-foods.js";
import { toFoodSearchResults } from "../day-logs/day-log-mappers.js";

export type SearchFoodsInput = SearchFoodsRequest;
export const foodSearchQueryKey = (input: SearchFoodsInput) => ["foods", "search", input] as const;

export async function searchFoods(
  transport: ApiTransport,
  input: SearchFoodsInput,
  signal?: AbortSignal,
): Promise<FoodSearchResults> {
  return toFoodSearchResults(await requestFoodSearch(transport, input, signal));
}

export function searchFoodsQueryOptions(transport: ApiTransport, input: SearchFoodsInput) {
  return queryOptions({
    queryKey: foodSearchQueryKey(input),
    queryFn: ({ signal }) => searchFoods(transport, input, signal),
  });
}

/** Portable staged-search hook. React Query aborts superseded queries through the request signal. */
export function useFoodSearch(transport: ApiTransport, input: SearchFoodsInput | null) {
  const enabled = input !== null;
  return useQuery({
    queryKey: foodSearchQueryKey(input ?? { query: "" }),
    queryFn: ({ signal }) => {
      if (!input) throw new Error("A search query is required");
      return searchFoods(transport, input, signal);
    },
    enabled,
  });
}
