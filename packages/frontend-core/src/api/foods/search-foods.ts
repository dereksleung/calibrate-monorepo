import { FoodSearchRequestQuerySchema, FoodSearchResponseSchema, type FoodSearchResponse } from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";

export type SearchFoodsRequest = { query: string; cursor?: string; limit?: number };

export function searchFoods(transport: ApiTransport, input: SearchFoodsRequest, signal?: AbortSignal): Promise<FoodSearchResponse> {
  const validatedInput = FoodSearchRequestQuerySchema.parse(input);
  return transport.request({ path: "/foods/search", query: validatedInput, signal, responseBodySchema: FoodSearchResponseSchema });
}
