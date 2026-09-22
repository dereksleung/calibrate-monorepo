import { apiTransport } from "#/shared/api/api-client.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { saveFoodEntryAndReconcile } from "@calibrate/frontend-core/feature-workflows/day-logs/save-food-entry";
import type { SaveFoodEntryCommand } from "@calibrate/frontend-core/verticals/day-logs/models/food-search";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

  return useMutation({
    mutationFn: (command: SaveFoodEntryCommand) =>
      saveFoodEntryAndReconcile(apiTransport, queryClient, accountId, date, command),
    onError: options?.onError,
    onSuccess: async () => {
      options?.onSuccess?.();
    },
  });
}
