import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DayLog, DayLogSlotResult } from "../../shared/models/day-logs/day-log.js";
import type { ApiTransport } from "../../transport.js";
import type {
  SaveFoodEntryAcknowledgement,
  SaveFoodEntryCommand,
} from "../../verticals/day-logs/models/save-food-entry.js";

import { mapSaveFoodEntryResponse, saveFoodEntry } from "../../api/day-logs/save-food-entry.js";
import {
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
} from "../../verticals/day-log-cache/day-log-slots.js";
import { synchronizeDayLogsForRange } from "./sync-day-logs.js";

const MEAL_SLOT_BY_NAME = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
} as const;

function emptyDayLog(date: string, dayLogId?: string): DayLog {
  return {
    id: dayLogId ?? crypto.randomUUID(),
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    weight: null,
  };
}

async function applyFoodEntryCreateToDayLogCache(
  queryClient: QueryClient,
  accountId: string,
  date: string,
  acknowledgement: SaveFoodEntryAcknowledgement,
  now: number,
): Promise<boolean> {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = queryClient.getQueryData<DayLogSlotResult>(slotKey);
  const cachedVersion = queryClient.getQueryData<number>(versionKey);
  const base = cached ?? emptyDayLog(date, acknowledgement.dayLogId);
  const mealSlot = MEAL_SLOT_BY_NAME[acknowledgement.foodEntry.meal];
  const next = {
    ...base,
    [mealSlot]: [...(base[mealSlot] ?? []), acknowledgement.foodEntry],
  };
  queryClient.setQueryData(slotKey, next, { updatedAt: now });

  const predecessorTrusted =
    cached === null
      ? acknowledgement.versionNumber === 1
      : cached !== undefined &&
        cachedVersion !== undefined &&
        cachedVersion + 1 === acknowledgement.versionNumber;
  if (predecessorTrusted) {
    queryClient.setQueryData(versionKey, acknowledgement.versionNumber, { updatedAt: now });
    return false;
  }

  await queryClient.invalidateQueries({ queryKey: slotKey });
  return true;
}

export function useSaveFoodEntry(
  transport: ApiTransport,
  accountId: string,
  date: string,
  options?: Omit<UseMutationOptions<SaveFoodEntryAcknowledgement, Error, SaveFoodEntryCommand>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (command: SaveFoodEntryCommand): Promise<SaveFoodEntryAcknowledgement> => {
      const formattedRequestBody = {
        ...command,
        brand: command.brand ?? null,
      };
      const response = await saveFoodEntry(transport, date, formattedRequestBody);
      const acknowledgement = mapSaveFoodEntryResponse(response, formattedRequestBody);
      const needsSingleDateSync = await applyFoodEntryCreateToDayLogCache(
        queryClient,
        accountId,
        date,
        acknowledgement,
        Date.now(),
      );
      if (needsSingleDateSync) {
        try {
          await synchronizeDayLogsForRange(transport, queryClient, accountId, {
            startDate: date,
            endDate: date,
          });
        } catch {
          // Keep the acknowledged entry and its invalidated slot for ordinary validation.
        }
      }
      return acknowledgement;
    },
    ...options,
  });
}
