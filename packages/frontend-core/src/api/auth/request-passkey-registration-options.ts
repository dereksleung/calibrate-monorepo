import {
  PasskeyRegistrationOptionsResponseSchema,
  type PasskeyRegistrationOptionsResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { PasskeyRegistrationChallenge } from "../../verticals/auth/models/passkey-registration.js";

export async function requestPasskeyRegistrationOptions(
  transport: ApiTransport,
): Promise<PasskeyRegistrationOptionsResponse> {
  return PasskeyRegistrationOptionsResponseSchema.parse(
    await transport.request({
      path: "/auth/passkeys/registration/options",
      method: "POST",
      responseBodySchema: PasskeyRegistrationOptionsResponseSchema,
    }),
  );
}
export function mapPasskeyRegistrationOptionsResponse(
  response: PasskeyRegistrationOptionsResponse,
): PasskeyRegistrationChallenge {
  return {
    options: {
      challenge: response.challenge,
      rp: { ...response.rp },
      user: { ...response.user },
      pubKeyCredParams: response.pubKeyCredParams.map((parameter) => ({ ...parameter })),
      ...(response.timeout === undefined ? {} : { timeout: response.timeout }),
      ...(response.excludeCredentials === undefined
        ? {}
        : {
            excludeCredentials: response.excludeCredentials.map((credential) => ({
              ...credential,
              ...(credential.transports === undefined ? {} : { transports: [...credential.transports] }),
            })),
          }),
      ...(response.authenticatorSelection === undefined
        ? {}
        : { authenticatorSelection: { ...response.authenticatorSelection } }),
      ...(response.hints === undefined ? {} : { hints: [...response.hints] }),
      ...(response.attestation === undefined ? {} : { attestation: response.attestation }),
      ...(response.extensions === undefined ? {} : { extensions: { ...response.extensions } }),
    },
  };
}
