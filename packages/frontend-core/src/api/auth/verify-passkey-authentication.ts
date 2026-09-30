import {
  AuthenticatedSessionResponseSchema,
  VerifyPasskeyAuthenticationRequestBodySchema,
  PasskeyAuthenticationErrorResponseSchema,
  type AuthenticatedSessionResponse,
  type VerifyPasskeyAuthenticationRequestBody,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";
import type { PasskeyAuthenticationErrorCode } from "../../verticals/auth/models/passkey-authentication.js";

import { ApiError } from "../../errors.js";

export async function verifyPasskeyAuthentication(
  transport: ApiTransport,
  input: VerifyPasskeyAuthenticationRequestBody,
): Promise<AuthenticatedSessionResponse> {
  const body = VerifyPasskeyAuthenticationRequestBodySchema.parse(input);
  return AuthenticatedSessionResponseSchema.parse(
    await transport.request({
      path: "/auth/passkeys/authentication/verify",
      method: "POST",
      body,
      responseBodySchema: AuthenticatedSessionResponseSchema,
    }),
  );
}
export function parsePasskeyAuthenticationError(error: unknown): PasskeyAuthenticationErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  const parsed = PasskeyAuthenticationErrorResponseSchema.safeParse(error.body);
  return parsed.success ? parsed.data.error : null;
}
export function mapVerifyPasskeyAuthenticationResponse(
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
