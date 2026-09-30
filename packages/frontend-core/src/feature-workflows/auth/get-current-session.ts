import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";

import {
  getCurrentSession as request,
  mapGetCurrentSessionResponse,
} from "../../api/auth/get-current-session.js";

export async function getCurrentSession(transport: ApiTransport): Promise<AuthenticatedUserContext> {
  return mapGetCurrentSessionResponse(await request(transport));
}
