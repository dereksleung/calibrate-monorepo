import { AuthenticatedSessionResponseSchema } from "@calibrate/api-contracts";
import { describe, expect, it, vi } from "vitest";

import { buildAuthenticatedUserContext } from "../../verticals/auth/models/__mocks__/authenticated-user-context.js";
import {
  buildPasskeyRegistrationChallenge,
  buildVerifyPasskeyRegistrationCommand,
} from "../../verticals/auth/models/__mocks__/passkey-registration.js";
import {
  requestPasskeyRegistrationOptions,
  mapPasskeyRegistrationOptionsResponse,
} from "./request-passkey-registration-options.js";
import {
  verifyPasskeyRegistration,
  mapVerifyPasskeyRegistrationResponse,
} from "./verify-passkey-registration.js";

const challenge = buildPasskeyRegistrationChallenge();
const challengeResponse = challenge.options;
const context = buildAuthenticatedUserContext();
const sessionResponse = AuthenticatedSessionResponseSchema.parse({
  ...context,
  user: {
    ...context.user,
    createdAt: context.user.createdAt.toISOString(),
    updatedAt: context.user.updatedAt.toISOString(),
  },
});
describe("passkey registration endpoints and mappers", () => {
  it("requests and validates a registration challenge without a body", async () => {
    const request = vi.fn().mockResolvedValue(challengeResponse);
    expect(await requestPasskeyRegistrationOptions({ request })).toEqual(challengeResponse);
    expect(request).toHaveBeenCalledWith({
      path: "/auth/passkeys/registration/options",
      method: "POST",
      responseBodySchema: expect.any(Object),
    });
    const mapped = mapPasskeyRegistrationOptionsResponse(challengeResponse);
    expect(mapped).toEqual(challenge);
    expect(mapped.options).not.toBe(challengeResponse);
  });
  it("validates and posts the credential including the remember-device choice", async () => {
    const command = buildVerifyPasskeyRegistrationCommand({ rememberDevice: false });
    const request = vi.fn().mockResolvedValue(sessionResponse);
    expect(await verifyPasskeyRegistration({ request }, command)).toEqual(sessionResponse);
    expect(request).toHaveBeenCalledWith({
      path: "/auth/passkeys/registration/verify",
      method: "POST",
      body: command,
      responseBodySchema: expect.any(Object),
    });
  });
  it.each(["cookie", "bearer"] as const)("maps the %s session into account context", (sessionTransport) => {
    expect(mapVerifyPasskeyRegistrationResponse({ ...sessionResponse, sessionTransport })).toEqual({
      ...context,
      sessionTransport,
    });
  });
  it("rejects malformed responses from an injected transport", async () => {
    const transport = { request: vi.fn().mockResolvedValue({}) };
    await expect(requestPasskeyRegistrationOptions(transport)).rejects.toThrow();
    await expect(
      verifyPasskeyRegistration(transport, buildVerifyPasskeyRegistrationCommand()),
    ).rejects.toThrow();
  });
  it("rejects malformed credentials before sending a request", async () => {
    const request = vi.fn();
    const command = buildVerifyPasskeyRegistrationCommand();
    command.credential.id = "invalid base64!";
    await expect(verifyPasskeyRegistration({ request }, command)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});

describe("registration option mapping", () => {
  it("preserves optional device preferences and creates independent JSON data", () => {
    const response = {
      ...challengeResponse,
      timeout: 60000,
      excludeCredentials: [
        { id: "prior-id", type: "public-key" as const, transports: ["internal" as const] },
      ],
      authenticatorSelection: {
        residentKey: "required" as const,
        requireResidentKey: true,
        userVerification: "required" as const,
      },
      hints: ["client-device" as const],
      attestation: "none" as const,
      extensions: { credProps: true, minPinLength: true },
    };
    const mapped = mapPasskeyRegistrationOptionsResponse(response);
    expect(mapped).toEqual({ options: response });
    mapped.options.excludeCredentials![0].transports!.push("hybrid");
    mapped.options.user.name = "changed";
    expect(response.excludeCredentials[0].transports).toEqual(["internal"]);
    expect(response.user.name).toBe("person@example.com");
  });
});
