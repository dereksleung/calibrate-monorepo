import type {
  PasskeyRegistrationChallenge,
  VerifyPasskeyRegistrationCommand,
} from "../passkey-registration.js";

import { buildAuthenticatedUserContext } from "./authenticated-user-context.js";
export { buildAuthenticatedUserContext as buildPasskeyRegistrationResult };

export function buildPasskeyRegistrationChallenge(
  overrides: Partial<PasskeyRegistrationChallenge> = {},
): PasskeyRegistrationChallenge {
  return {
    options: {
      challenge: "challenge-value",
      rp: { name: "Calibrate", id: "localhost" },
      user: { id: "user-handle", name: "person@example.com", displayName: "person@example.com" },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    },
    ...overrides,
  };
}
export function buildVerifyPasskeyRegistrationCommand(
  overrides: Partial<VerifyPasskeyRegistrationCommand> = {},
): VerifyPasskeyRegistrationCommand {
  return {
    credential: {
      id: "Y3JlZGVudGlhbC1pZA",
      rawId: "Y3JlZGVudGlhbC1pZA",
      type: "public-key",
      response: {
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
        attestationObject: "o2NmbXRkbm9uZWdhdHRTdG10",
      },
      clientExtensionResults: {},
    },
    rememberDevice: true,
    ...overrides,
  };
}
