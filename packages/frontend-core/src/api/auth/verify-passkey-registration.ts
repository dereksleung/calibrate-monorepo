import {
  AuthenticatedSessionResponseSchema,
  VerifyPasskeyRegistrationRequestBodySchema,
  PasskeyRegistrationErrorResponseSchema,
  type AuthenticatedSessionResponse,
  type VerifyPasskeyRegistrationRequestBody,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";
import type { PasskeyRegistrationErrorCode } from "../../verticals/auth/models/passkey-registration.js";

import { ApiError } from "../../errors.js";

export async function verifyPasskeyRegistration(
  transport: ApiTransport,
  input: VerifyPasskeyRegistrationRequestBody,
): Promise<AuthenticatedSessionResponse> {
  const body = VerifyPasskeyRegistrationRequestBodySchema.parse(input);
  return AuthenticatedSessionResponseSchema.parse(
    await transport.request({
      path: "/auth/passkeys/registration/verify",
      method: "POST",
      body,
      responseBodySchema: AuthenticatedSessionResponseSchema,
    }),
  );
}
export function parsePasskeyRegistrationError(error: unknown): PasskeyRegistrationErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  const parsed = PasskeyRegistrationErrorResponseSchema.safeParse(error.body);
  return parsed.success ? parsed.data.error : null;
}
export function mapVerifyPasskeyRegistrationResponse(
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
