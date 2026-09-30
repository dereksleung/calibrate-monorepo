import { skipToken, useQuery, type QueryClient } from "@tanstack/react-query";

import type { AuthenticatedUserContext } from "./models/authenticated-user-context.js";

export const authenticatedSessionQueryKey = ["authenticatedSession"] as const;

export function setAuthenticatedSession(
  queryClient: Pick<QueryClient, "setQueryData">,
  session: AuthenticatedUserContext,
): void {
  queryClient.setQueryData(authenticatedSessionQueryKey, session);
}

export function getAuthenticatedSession(
  queryClient: Pick<QueryClient, "getQueryData">,
): AuthenticatedUserContext | undefined {
  return queryClient.getQueryData(authenticatedSessionQueryKey);
}

export function clearAuthenticatedSession(queryClient: {
  removeQueries: (filters: { queryKey: readonly unknown[] }) => void;
}): void {
  queryClient.removeQueries({ queryKey: authenticatedSessionQueryKey });
}

/** Subscribes a component to changes in the data set by the manual methods above */
export function useAuthenticatedSession(): AuthenticatedUserContext | undefined {
  const { data } = useQuery<AuthenticatedUserContext>({
    queryKey: authenticatedSessionQueryKey,
    queryFn: skipToken,
    gcTime: Infinity,
    staleTime: Infinity,
  });
  return data;
}
