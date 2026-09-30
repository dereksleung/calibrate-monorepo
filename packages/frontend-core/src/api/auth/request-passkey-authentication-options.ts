import {
  PasskeyAuthenticationOptionsResponseSchema,
  type PasskeyAuthenticationOptionsResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { PasskeyAuthenticationChallenge } from "../../verticals/auth/models/passkey-authentication.js";

export async function requestPasskeyAuthenticationOptions(
  transport: ApiTransport,
): Promise<PasskeyAuthenticationOptionsResponse> {
  return PasskeyAuthenticationOptionsResponseSchema.parse(
    await transport.request({
      path: "/auth/passkeys/authentication/options",
      method: "POST",
      responseBodySchema: PasskeyAuthenticationOptionsResponseSchema,
    }),
  );
}
export function mapPasskeyAuthenticationOptionsResponse(
  response: PasskeyAuthenticationOptionsResponse,
): PasskeyAuthenticationChallenge {
  return {
    options: {
      challenge: response.options.challenge,
      rpId: response.options.rpId,
      timeout: response.options.timeout,
      userVerification: response.options.userVerification,
    },
    expiresAt: new Date(response.expiresAt),
  };
}
