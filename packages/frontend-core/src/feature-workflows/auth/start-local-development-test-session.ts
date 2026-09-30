import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";

import {
  startLocalDevelopmentTestSession as request,
  mapStartLocalDevelopmentTestSessionResponse,
} from "../../api/auth/start-local-development-test-session.js";

export async function startLocalDevelopmentTestSession(
  transport: ApiTransport,
): Promise<AuthenticatedUserContext> {
  return mapStartLocalDevelopmentTestSessionResponse(await request(transport));
}
