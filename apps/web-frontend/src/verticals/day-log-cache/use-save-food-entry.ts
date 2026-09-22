import { apiTransport } from "#/shared/api/api-client.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { useSaveFoodEntry as useSaveFoodEntryWorkflow } from "@calibrate/frontend-core/feature-workflows/day-logs/save-food-entry";

export function useSaveFoodEntry(
  date: string,
  options?: {
    onSuccess?: () => void;
    onError?: () => void;
  },
) {
  const session = useAuthenticatedSession();
  const accountId = session!.user.id;

  return useSaveFoodEntryWorkflow({ accountId, transport: apiTransport }, date, {
    onError: options?.onError,
    onSuccess: options?.onSuccess,
  });
}
