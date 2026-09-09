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

type DayLogQueryInvalidator = {
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => Promise<void>;
  resetQueries: (filters: { queryKey: readonly unknown[] }) => Promise<void>;
};

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

export async function invalidateDayLogQueries(
  queryClient: DayLogQueryInvalidator,
  accountId: string,
  date: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: dayLogQueryKey(accountId, date) });
  await queryClient.invalidateQueries({ queryKey: dayLogRangeQueryKeyPrefix(accountId) });
  await queryClient.resetQueries({ queryKey: dayLogSlotQueryKey(accountId, date) });
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
      await invalidateDayLogQueries(queryClient, accountId, date);
      await onSuccess?.(entry, variables, context, mutation);
    },
  });
}
