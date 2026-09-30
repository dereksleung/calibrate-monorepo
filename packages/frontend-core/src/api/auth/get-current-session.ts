import {
  AuthenticatedSessionResponseSchema,
  type AuthenticatedSessionResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";

export async function getCurrentSession(transport: ApiTransport): Promise<AuthenticatedSessionResponse> {
  return AuthenticatedSessionResponseSchema.parse(
    await transport.request({
      path: "/auth/session",
      method: "GET",
      responseBodySchema: AuthenticatedSessionResponseSchema,
    }),
  );
}

export function mapGetCurrentSessionResponse(
  response: AuthenticatedSessionResponse,
): AuthenticatedUserContext {
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
