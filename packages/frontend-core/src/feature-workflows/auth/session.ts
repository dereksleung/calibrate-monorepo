import {
  deleteCurrentSession as deleteCurrentSessionApi,
  getCurrentSession as getCurrentSessionApi,
  refreshSession as refreshSessionApi,
  startLocalDevelopmentTestSession as startLocalDevelopmentTestSessionApi,
} from "../../api/auth/session.js";
import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";
import { toAuthenticatedUserContext } from "./authenticated-user-context.js";

export async function getCurrentSession(transport: ApiTransport): Promise<AuthenticatedUserContext> {
  return toAuthenticatedUserContext(await getCurrentSessionApi(transport));
}

export async function refreshSession(transport: ApiTransport): Promise<AuthenticatedUserContext> {
  return toAuthenticatedUserContext(await refreshSessionApi(transport));
}

export async function startLocalDevelopmentTestSession(transport: ApiTransport): Promise<AuthenticatedUserContext> {
  return toAuthenticatedUserContext(await startLocalDevelopmentTestSessionApi(transport));
}

export function deleteCurrentSession(transport: ApiTransport): Promise<null> {
  return deleteCurrentSessionApi(transport);
}
