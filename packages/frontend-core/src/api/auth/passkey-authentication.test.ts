import { AuthenticatedSessionResponseSchema } from "@calibrate/api-contracts";
import { describe, expect, it, vi } from "vitest";

import { buildAuthenticatedUserContext } from "../../verticals/auth/models/__mocks__/authenticated-user-context.js";
import {
  buildPasskeyAuthenticationChallenge,
  buildVerifyPasskeyAuthenticationCommand,
} from "../../verticals/auth/models/__mocks__/passkey-authentication.js";
import {
  requestPasskeyAuthenticationOptions,
  mapPasskeyAuthenticationOptionsResponse,
} from "./request-passkey-authentication-options.js";
import {
  verifyPasskeyAuthentication,
  mapVerifyPasskeyAuthenticationResponse,
} from "./verify-passkey-authentication.js";

const challenge = buildPasskeyAuthenticationChallenge();
const challengeResponse = { ...challenge, expiresAt: challenge.expiresAt.toISOString() };
const context = buildAuthenticatedUserContext();
const sessionResponse = AuthenticatedSessionResponseSchema.parse({
  ...context,
  user: {
    ...context.user,
    createdAt: context.user.createdAt.toISOString(),
    updatedAt: context.user.updatedAt.toISOString(),
  },
});
describe("passkey authentication endpoints and mappers", () => {
  it("requests and validates a usernameless challenge without a body", async () => {
    const request = vi.fn().mockResolvedValue(challengeResponse);
    expect(await requestPasskeyAuthenticationOptions({ request })).toEqual(challengeResponse);
    expect(request).toHaveBeenCalledWith({
      path: "/auth/passkeys/authentication/options",
      method: "POST",
      responseBodySchema: expect.any(Object),
    });
    const mapped = mapPasskeyAuthenticationOptionsResponse(challengeResponse);
    expect(mapped).toEqual(challenge);
    expect(mapped.options).not.toBe(challengeResponse.options);
  });
  it("validates and posts the assertion including the remember-device choice", async () => {
    const command = buildVerifyPasskeyAuthenticationCommand({ rememberDevice: false });
    const request = vi.fn().mockResolvedValue(sessionResponse);
    expect(await verifyPasskeyAuthentication({ request }, command)).toEqual(sessionResponse);
    expect(request).toHaveBeenCalledWith({
      path: "/auth/passkeys/authentication/verify",
      method: "POST",
      body: command,
      responseBodySchema: expect.any(Object),
    });
  });
  it.each(["cookie", "bearer"] as const)("maps the %s session into account context", (sessionTransport) => {
    expect(mapVerifyPasskeyAuthenticationResponse({ ...sessionResponse, sessionTransport })).toEqual({
      ...context,
      sessionTransport,
    });
  });
  it("rejects malformed responses from an injected transport", async () => {
    const transport = { request: vi.fn().mockResolvedValue({}) };
    await expect(requestPasskeyAuthenticationOptions(transport)).rejects.toThrow();
    await expect(
      verifyPasskeyAuthentication(transport, buildVerifyPasskeyAuthenticationCommand()),
    ).rejects.toThrow();
  });
  it("rejects malformed assertions before sending a request", async () => {
    const request = vi.fn();
    const command = buildVerifyPasskeyAuthenticationCommand();
    command.credential.id = "invalid base64!";
    await expect(verifyPasskeyAuthentication({ request }, command)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
