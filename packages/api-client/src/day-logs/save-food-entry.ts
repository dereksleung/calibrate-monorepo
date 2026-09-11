import {
  CreateFoodEntryRequestRouteParamsSchema,
  CreateFoodEntryRequestSchema,
  CreateFoodEntryResponseSchema,
  normalizeFoodEntryForStorage,
  type CreateFoodEntryRequest,
  type CreateFoodEntryResponse,
} from "@calibrate/api-contracts";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";

import type { ApiTransport } from "../transport.js";

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

export function getSaveFoodEntryMutationOptions(transport: ApiTransport, date: string) {
  return {
    mutationFn: (input: CreateFoodEntryRequest) => saveFoodEntry(transport, date, input),
  };
}

/** Portable save hook. Cache patching belongs to the app's Day Log date-slot cache. */
export function useSaveFoodEntry(
  transport: ApiTransport,
  date: string,
  options?: Omit<UseMutationOptions<CreateFoodEntryResponse, Error, CreateFoodEntryRequest>, "mutationFn">,
) {
  return useMutation({
    ...getSaveFoodEntryMutationOptions(transport, date),
    ...options,
  });
}
