import {
  CreateFoodEntryRequestRouteParamsSchema,
  CreateFoodEntryRequestSchema,
  CreateFoodEntryResponseSchema,
  normalizeFoodEntryForStorage,
  type CreateFoodEntryRequest,
  type CreateFoodEntryResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";

export function saveFoodEntry(
  transport: ApiTransport,
  date: string,
  input: CreateFoodEntryRequest,
): Promise<CreateFoodEntryResponse> {
  const validDate = CreateFoodEntryRequestRouteParamsSchema.parse({ date }).date;
  const body = normalizeFoodEntryForStorage(CreateFoodEntryRequestSchema.parse(input));

  return transport.request({
    path: `/daylogs/${validDate}/food-entries`,
    method: "POST",
    body,
    responseBodySchema: CreateFoodEntryResponseSchema,
  });
}
