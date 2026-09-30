import {
  AuthenticatedSessionResponseSchema,
  type AuthenticatedSessionResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";

export async function startLocalDevelopmentTestSession(
  transport: ApiTransport,
): Promise<AuthenticatedSessionResponse> {
  return AuthenticatedSessionResponseSchema.parse(
    await transport.request({
      path: "/auth/local-development/test-session",
      method: "POST",
      responseBodySchema: AuthenticatedSessionResponseSchema,
    }),
  );
}

export function mapStartLocalDevelopmentTestSessionResponse(
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
