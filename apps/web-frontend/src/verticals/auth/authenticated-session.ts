import type { AuthenticatedSessionResponse } from "@calibrate/api-contracts";

import { skipToken, useQuery, type QueryClient } from "@tanstack/react-query";

import {
  broadcastDayLogCacheRevocation,
  confirmDayLogCacheAccount,
} from "../day-log-cache/indexed-db-day-log-cache.ts";

export const authenticatedSessionQueryKey = ["authenticatedSession"] as const;

export type AuthenticatedSessionTransition = {
  previousAccountId?: string;
};

export function setAuthenticatedSession(
  queryClient: QueryClient,
  session: AuthenticatedSessionResponse,
): void {
  queryClient.setQueryData(authenticatedSessionQueryKey, session);
}

export async function establishAuthenticatedSession(
  queryClient: QueryClient,
  session: AuthenticatedSessionResponse,
  options?: { allowCurrentAccountTransition?: boolean },
): Promise<AuthenticatedSessionTransition | undefined> {
  const previousAccountId = getAuthenticatedSession(queryClient)?.user.id;
  const confirmation = await confirmDayLogCacheAccount(
    session.user.id,
    previousAccountId,
    options?.allowCurrentAccountTransition,
  );
  if (!confirmation.accepted) return undefined;

  for (const revocation of confirmation.revocations) {
    broadcastDayLogCacheRevocation(revocation);
  }
  setAuthenticatedSession(queryClient, session);
  return previousAccountId && previousAccountId !== session.user.id ? { previousAccountId } : {};
}

export function getAuthenticatedSession(queryClient: QueryClient): AuthenticatedSessionResponse | undefined {
  return queryClient.getQueryData(authenticatedSessionQueryKey);
}

export function clearAuthenticatedSession(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: authenticatedSessionQueryKey });
}

/** Subscribes a component to changes in the data set by the manual methods above */
export function useAuthenticatedSession(): AuthenticatedSessionResponse | undefined {
  const { data } = useQuery({
    queryKey: authenticatedSessionQueryKey,
    queryFn: skipToken,
    staleTime: Infinity,
  });
  return data as AuthenticatedSessionResponse | undefined;
}
