import { searchFoods as requestSearchFoods, type SearchFoodsInput } from "../../api/foods/search-foods.js";
import type { ApiTransport } from "../../transport.js";
import type { FoodSearchPage } from "../../verticals/day-logs/models/food-search.js";

export type { SearchFoodsInput };

/** Maps the private API result to the structurally equivalent frontend search model. */
export async function searchFoods(transport: ApiTransport, input: SearchFoodsInput, signal?: AbortSignal): Promise<FoodSearchPage> {
  return requestSearchFoods(transport, input, signal);
}
