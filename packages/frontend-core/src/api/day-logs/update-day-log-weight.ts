import {
  UpdateDayLogWeightRequestBodySchema,
  UpdateDayLogWeightRequestRouteParamsSchema,
  UpdateDayLogWeightResponseSchema,
  type UpdateDayLogWeightRequestBody,
  type UpdateDayLogWeightResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type {
  UpdateDayLogWeightAcknowledgement,
  UpdateDayLogWeightCommand,
} from "../../verticals/day-logs/models/update-day-log-weight.js";

function normalizeWeightForStorage(value: number): number {
  return Number(
    value.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 1,
    }),
  );
}

function weightForStorage(weight: number): number {
  const normalized = normalizeWeightForStorage(UpdateDayLogWeightRequestBodySchema.parse({ weight }).weight);
  return UpdateDayLogWeightRequestBodySchema.parse({ weight: normalized }).weight;
}

export function updateDayLogWeight(
  transport: ApiTransport,
  date: string,
  input: UpdateDayLogWeightRequestBody,
): Promise<UpdateDayLogWeightResponse> {
  const validDate = UpdateDayLogWeightRequestRouteParamsSchema.parse({ date }).date;
  const body = { weight: weightForStorage(input.weight) };

  return transport.request({
    path: `/daylogs/${validDate}/weight`,
    method: "PUT",
    body,
    responseBodySchema: UpdateDayLogWeightResponseSchema,
  });
}

export function mapUpdateDayLogWeightResponse(
  response: UpdateDayLogWeightResponse,
  command: UpdateDayLogWeightCommand,
): UpdateDayLogWeightAcknowledgement {
  return {
    updatedWeight: weightForStorage(command.weight),
    versionNumber: response.versionNumber,
    ...(response.createdDayLogId ? { dayLogId: response.createdDayLogId } : {}),
  };
}
