import type { AuthenticatedUserContext } from "@calibrate/frontend-core/verticals/auth/models/authenticated-user-context";
import type { QueryClient } from "@tanstack/react-query";

import {
  getAuthenticatedSession,
  setAuthenticatedSession,
} from "@calibrate/frontend-core/verticals/auth/authenticated-session";

import { broadcastDayLogCacheRevocation } from "../day-log-cache/indexed-db-day-log-cache-logout.ts";
import { confirmDayLogCacheAccount } from "../day-log-cache/indexed-db-day-log-cache.ts";

export type AuthenticatedSessionTransition = {
  previousAccountId?: string;
};

export async function establishAuthenticatedSession(
  queryClient: QueryClient,
  session: AuthenticatedUserContext,
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
