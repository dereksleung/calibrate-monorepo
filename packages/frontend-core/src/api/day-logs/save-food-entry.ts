import {
  CreateFoodEntryRequestRouteParamsSchema,
  CreateFoodEntryRequestSchema,
  CreateFoodEntryResponseSchema,
  normalizeFoodEntryForStorage,
  type CreateFoodEntryRequest,
  type CreateFoodEntryResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type {
  SaveFoodEntryAcknowledgement,
  SaveFoodEntryCommand,
} from "../../verticals/day-logs/models/save-food-entry.js";

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

export function mapSaveFoodEntryResponse(
  response: CreateFoodEntryResponse,
  command: SaveFoodEntryCommand,
): SaveFoodEntryAcknowledgement {
  const normalized = normalizeFoodEntryForStorage(CreateFoodEntryRequestSchema.parse(command));
  return {
    foodEntry: { ...normalized, id: response.foodEntryId },
    versionNumber: response.versionNumber,
    ...(response.createdDayLogId ? { dayLogId: response.createdDayLogId } : {}),
  };
}
