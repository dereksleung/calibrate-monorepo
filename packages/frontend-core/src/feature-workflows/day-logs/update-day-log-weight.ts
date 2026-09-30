import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DayLog, DayLogSlotResult } from "../../shared/models/day-logs/day-log.js";
import type { ApiTransport } from "../../transport.js";
import type {
  UpdateDayLogWeightAcknowledgement,
  UpdateDayLogWeightCommand,
} from "../../verticals/day-logs/models/update-day-log-weight.js";

import {
  mapUpdateDayLogWeightResponse,
  updateDayLogWeight,
} from "../../api/day-logs/update-day-log-weight.js";
import {
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
} from "../../verticals/day-log-cache/day-log-slots.js";
import { synchronizeDayLogsForRange } from "./sync-day-logs.js";

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

/**
 * Applies a successful weight write without downloading the Day Log. A direct
 * predecessor can be trusted immediately; an unloaded or mismatched slot is
 * shown as a local acknowledgement and remains eligible for ordinary sync.
 */
async function applyUpdatedWeightToDayLogCache(
  queryClient: QueryClient,
  accountId: string,
  date: string,
  acknowledgement: UpdateDayLogWeightAcknowledgement,
  now: number,
): Promise<boolean> {
  const slotKey = dayLogSlotQueryKey(accountId, date);
  const versionKey = dayLogSlotVersionQueryKey(accountId, date);
  const cached = queryClient.getQueryData<DayLogSlotResult>(slotKey);
  const cachedVersion = queryClient.getQueryData<number>(versionKey);
  const next = {
    ...(cached ?? emptyDayLog(date, acknowledgement.dayLogId)),
    weight: acknowledgement.updatedWeight,
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

export function getUpdateDayLogWeightMutationOptions(
  transport: ApiTransport,
  queryClient: QueryClient,
  accountId: string,
  date: string,
) {
  return {
    mutationFn: async (command: UpdateDayLogWeightCommand): Promise<UpdateDayLogWeightAcknowledgement> => {
      const response = await updateDayLogWeight(transport, date, { weight: command.weight });
      const acknowledgement = mapUpdateDayLogWeightResponse(response, command);
      const needsSingleDateSync = await applyUpdatedWeightToDayLogCache(
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
          // Keep the updated weight and its invalidated slot for ordinary validation.
        }
      }
      return acknowledgement;
    },
  };
}

export function useUpdateDayLogWeight(
  transport: ApiTransport,
  accountId: string,
  date: string,
  options?: Omit<
    UseMutationOptions<UpdateDayLogWeightAcknowledgement, Error, UpdateDayLogWeightCommand>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    ...getUpdateDayLogWeightMutationOptions(transport, queryClient, accountId, date),
  });
}
