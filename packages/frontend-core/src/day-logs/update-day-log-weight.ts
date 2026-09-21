import {
  UpdateDayLogWeightRequestBodySchema,
  UpdateDayLogWeightRequestRouteParamsSchema,
  UpdateDayLogWeightResponseSchema,
  type UpdateDayLogWeightRequestBody,
  type UpdateDayLogWeightResponse,
} from "@calibrate/api-contracts";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";

import type { ApiTransport } from "../transport.js";

export function updateDayLogWeight(
  transport: ApiTransport,
  date: string,
  input: UpdateDayLogWeightRequestBody,
): Promise<UpdateDayLogWeightResponse> {
  const validDate = UpdateDayLogWeightRequestRouteParamsSchema.parse({ date }).date;
  const body = UpdateDayLogWeightRequestBodySchema.parse(input);

  return transport.request({
    path: `/daylogs/${validDate}/weight`,
    method: "PUT",
    body,
    responseBodySchema: UpdateDayLogWeightResponseSchema,
  });
}

export function getUpdateDayLogWeightMutationOptions(transport: ApiTransport, date: string) {
  return {
    mutationFn: (input: UpdateDayLogWeightRequestBody) => updateDayLogWeight(transport, date, input),
  };
}

export function useUpdateDayLogWeight(
  transport: ApiTransport,
  date: string,
  options?: Omit<
    UseMutationOptions<UpdateDayLogWeightResponse, Error, UpdateDayLogWeightRequestBody>,
    "mutationFn"
  >,
) {
  return useMutation({
    ...getUpdateDayLogWeightMutationOptions(transport, date),
    ...options,
  });
}
