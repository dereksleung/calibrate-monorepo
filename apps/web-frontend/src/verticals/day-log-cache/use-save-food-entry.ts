import { apiTransport } from "#/shared/api/api-client.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { syncDayLogs, useSaveFoodEntry as useSaveFoodEntryRequest } from "@calibrate/api-client";
import { useQueryClient } from "@tanstack/react-query";

import {
  applyDayLogSyncResult,
  applyFoodEntryCreateToDayLogCache,
  getDayLogSyncManifest,
} from "./day-log-cache.ts";

export function useSaveFoodEntry(
  date: string,
  options?: {
    onSuccess?: () => void;
    onError?: () => void;
  },
) {
  const queryClient = useQueryClient();
  const session = useAuthenticatedSession();
  const accountId = session!.user.id;

  return useSaveFoodEntryRequest(apiTransport, date, {
    onError: options?.onError,
    onSuccess: async (result, variables) => {
      const { needsSingleDateSync } = await applyFoodEntryCreateToDayLogCache(
        queryClient,
        accountId,
        date,
        variables,
        result,
      );

      if (needsSingleDateSync) {
        const range = { startDate: date, endDate: date };
        try {
          const response = await syncDayLogs(apiTransport, {
            ...range,
            known: getDayLogSyncManifest(queryClient, accountId, range),
          });
          applyDayLogSyncResult(queryClient, accountId, range, response, Date.now());
        } catch {
          // Keep the locally acknowledged entry. The unverified slot remains
          // eligible for the next ordinary single-date or view sync.
        }
      }

      options?.onSuccess?.();
    },
  });
}
