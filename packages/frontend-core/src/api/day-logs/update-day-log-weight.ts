import {
  UpdateDayLogWeightRequestBodySchema,
  UpdateDayLogWeightRequestRouteParamsSchema,
  UpdateDayLogWeightResponseSchema,
  type UpdateDayLogWeightRequestBody,
  type UpdateDayLogWeightResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";

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
