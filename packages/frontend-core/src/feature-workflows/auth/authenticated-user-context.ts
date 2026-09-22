import type { AuthenticatedSessionResponse } from "@calibrate/api-contracts";

import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";

export function toAuthenticatedUserContext(response: AuthenticatedSessionResponse): AuthenticatedUserContext {
  return {
    user: {
      id: response.user.id,
      email: response.user.email,
      tier: response.user.tier,
      createdAt: new Date(response.user.createdAt),
      updatedAt: new Date(response.user.updatedAt),
    },
    sessionTransport: response.sessionTransport,
  };
}
