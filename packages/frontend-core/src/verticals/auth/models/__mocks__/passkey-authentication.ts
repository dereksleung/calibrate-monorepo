import type {
  PasskeyAuthenticationChallenge,
  VerifyPasskeyAuthenticationCommand,
} from "../passkey-authentication.js";

export function buildPasskeyAuthenticationChallenge(
  overrides: Partial<PasskeyAuthenticationChallenge> = {},
): PasskeyAuthenticationChallenge {
  return {
    options: {
      challenge: "challenge-value",
      rpId: "localhost",
      timeout: 300_000,
      userVerification: "required",
    },
    expiresAt: new Date("2030-01-01T00:05:00.000Z"),
    ...overrides,
  };
}
export function buildVerifyPasskeyAuthenticationCommand(
  overrides: Partial<VerifyPasskeyAuthenticationCommand> = {},
): VerifyPasskeyAuthenticationCommand {
  return {
    credential: {
      id: "Y3JlZGVudGlhbC1pZA",
      rawId: "Y3JlZGVudGlhbC1pZA",
      type: "public-key",
      response: {
        authenticatorData: "authenticator-data",
        clientDataJSON: "client-data",
        signature: "c2lnbmF0dXJl",
        userHandle: "user-handle",
      },
      clientExtensionResults: {},
    },
    rememberDevice: true,
    ...overrides,
  };
}
