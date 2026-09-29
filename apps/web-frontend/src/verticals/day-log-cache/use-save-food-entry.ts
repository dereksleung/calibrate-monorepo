import { apiTransport } from "#/shared/api/api-client.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { useSaveFoodEntry as useSaveFoodEntryRequest } from "@calibrate/frontend-core/day-logs/save-food-entry";
import { synchronizeDayLogsForRange } from "@calibrate/frontend-core/feature-workflows/day-logs/sync-day-logs";
import { useQueryClient } from "@tanstack/react-query";

import { applyFoodEntryCreateToDayLogCache } from "./day-log-cache.ts";

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
          await synchronizeDayLogsForRange(apiTransport, queryClient, accountId, range);
        } catch {
          // Keep the locally acknowledged entry. The unverified slot remains
          // eligible for the next ordinary single-date or view sync.
        }
      }

      options?.onSuccess?.();
    },
  });
}
