import {
  deleteCurrentSession as requestDeleteCurrentSession,
  getCurrentSession as requestCurrentSession,
  refreshSession as requestRefreshSession,
  startLocalDevelopmentTestSession as requestLocalSession,
} from "../../api/auth/session.js";
import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";

function toAuthenticatedUserContext(session: Awaited<ReturnType<typeof requestCurrentSession>>): AuthenticatedUserContext { return { user: { ...session.user }, sessionTransport: session.sessionTransport }; }
export async function getCurrentSession(transport: ApiTransport): Promise<AuthenticatedUserContext> { return toAuthenticatedUserContext(await requestCurrentSession(transport)); }
export async function refreshSession(transport: ApiTransport): Promise<AuthenticatedUserContext> { return toAuthenticatedUserContext(await requestRefreshSession(transport)); }
export async function startLocalDevelopmentTestSession(transport: ApiTransport): Promise<AuthenticatedUserContext> { return toAuthenticatedUserContext(await requestLocalSession(transport)); }
export function deleteCurrentSession(transport: ApiTransport): Promise<null> { return requestDeleteCurrentSession(transport); }
