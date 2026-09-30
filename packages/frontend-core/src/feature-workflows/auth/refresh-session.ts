import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";

import { refreshSession as request, mapRefreshSessionResponse } from "../../api/auth/refresh-session.js";

export async function refreshSession(transport: ApiTransport): Promise<AuthenticatedUserContext> {
  return mapRefreshSessionResponse(await request(transport));
}
