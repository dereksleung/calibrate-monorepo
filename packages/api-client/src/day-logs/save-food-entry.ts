import {
  CreateFoodEntryRequestRouteParamsSchema,
  CreateFoodEntryRequestSchema,
  FoodEntryResponseSchema,
  type CreateFoodEntryRequest,
  type FoodEntryResponse,
} from "@calibrate/api-contracts";
import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiTransport } from "../transport.js";

import { dayLogRangeQueryKeyPrefix } from "./get-day-log-range.js";
import { dayLogQueryKey, dayLogSlotQueryKey } from "./get-day-log.js";
import { dayLogSyncQueryKeyPrefix } from "./sync-day-logs.js";

export function saveFoodEntry(
  transport: ApiTransport,
  date: string,
  input: CreateFoodEntryRequest,
): Promise<FoodEntryResponse> {
  const validDate = CreateFoodEntryRequestRouteParamsSchema.parse({ date }).date;
  const body = CreateFoodEntryRequestSchema.parse(input);

  return transport.request({
    path: `/daylogs/${validDate}/food-entries`,
    method: "POST",
    body,
    responseBodySchema: FoodEntryResponseSchema,
  });
}

export function getSaveFoodEntryMutationOptions(transport: ApiTransport, date: string) {
  return {
    mutationFn: (input: CreateFoodEntryRequest) => saveFoodEntry(transport, date, input),
  };
}

/** Portable save hook. It refreshes the selected day and cached dashboard ranges after a successful entry creation. */
export function useSaveFoodEntry(
  transport: ApiTransport,
  accountId: string,
  date: string,
  options?: Omit<UseMutationOptions<FoodEntryResponse, Error, CreateFoodEntryRequest>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options ?? {};
  return useMutation({
    ...getSaveFoodEntryMutationOptions(transport, date),
    ...mutationOptions,
    onSuccess: async (entry, variables, context, mutation) => {
      await queryClient.invalidateQueries({ queryKey: dayLogSlotQueryKey(accountId, date) });
      await queryClient.invalidateQueries({ queryKey: dayLogQueryKey(accountId, date) });
      await queryClient.invalidateQueries({ queryKey: dayLogRangeQueryKeyPrefix(accountId) });
      await queryClient.invalidateQueries({ queryKey: dayLogSyncQueryKeyPrefix(accountId) });
      await onSuccess?.(entry, variables, context, mutation);
    },
  });
}
