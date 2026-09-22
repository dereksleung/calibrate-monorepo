import type { CreateFoodEntryRequest, CreateFoodEntryResponse } from "@calibrate/api-contracts";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";

import { saveFoodEntry } from "../api/day-logs/save-food-entry.js";
import type { ApiTransport } from "../transport.js";

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
