import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { ApiError } from "../../errors.js";
import {
  getVerifyPasskeyAuthenticationMutationOptions,
  parsePasskeyAuthenticationError,
  requestPasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "./passkey-authentication.js";

const authenticationOptions = {
  options: {
    challenge: "challenge-value",
    rpId: "localhost",
    timeout: 300_000 as const,
    userVerification: "required" as const,
  },
  expiresAt: "2030-01-01T00:05:00.000Z",
};

const authenticationCredential = {
  id: "Y3JlZGVudGlhbC1pZA",
  rawId: "Y3JlZGVudGlhbC1pZA",
  type: "public-key" as const,
  response: {
    authenticatorData: "authenticator-data",
    clientDataJSON: "client-data",
    signature: "c2lnbmF0dXJl",
    userHandle: "user-handle",
  },
  clientExtensionResults: {},
};

const authenticatedSession = {
  user: {
    id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
    email: "person@example.com",
    tier: "FREE",
    createdAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2030-01-01T00:00:00.000Z",
  },
  sessionTransport: "cookie" as const,
};

describe("passkey authentication workflow", () => {
  it("posts without a body to request usernameless authentication options", async () => {
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(authenticationOptions));
    const transport = { request } as unknown as ApiTransport;

    await expect(requestPasskeyAuthenticationOptions(transport)).resolves.toEqual({
      ...authenticationOptions,
      expiresAt: new Date(authenticationOptions.expiresAt),
    });
    expect(request).toHaveBeenCalledWith({
      path: "/auth/passkeys/authentication/options",
      method: "POST",
      responseBodySchema: expect.any(Object),
    });
  });

  it("posts a strict assertion payload and returns only authenticated session data", async () => {
    const request = vi.fn(async ({ responseBodySchema, body }) => {
      expect(body).toEqual({ credential: authenticationCredential, rememberDevice: true });
      return responseBodySchema.parse(authenticatedSession);
    });
    const transport = { request } as unknown as ApiTransport;

    await expect(
      verifyPasskeyAuthentication(transport, { credential: authenticationCredential, rememberDevice: true }),
    ).resolves.toMatchObject({
      user: {
        email: "person@example.com",
        tier: "FREE",
        createdAt: new Date(authenticatedSession.user.createdAt),
        updatedAt: new Date(authenticatedSession.user.updatedAt),
      },
      sessionTransport: "cookie",
    });
  });

  it("preserves transport failures", async () => {
    const error = new ApiError({
      status: 409,
      statusText: "Conflict",
      body: { error: "PASSKEY_AUTHENTICATION_STATE_CONFLICT" },
    });
    await expect(
      verifyPasskeyAuthentication(
        { request: vi.fn().mockRejectedValue(error) },
        { credential: authenticationCredential, rememberDevice: false },
      ),
    ).rejects.toBe(error);
  });

  it("does not retry assertion verification", () => {
    const options = getVerifyPasskeyAuthenticationMutationOptions({ request: vi.fn() });

    expect(options.mutationKey).toEqual(["verifyPasskeyAuthentication"]);
    expect(options.retry).toBe(false);
  });

  it.each([
    "PASSKEY_AUTHENTICATION_FAILED",
    "ORIGIN_NOT_ALLOWED",
    "PASSKEY_AUTHENTICATION_STATE_CONFLICT",
    "PASSKEY_AUTHENTICATION_RATE_LIMITED",
    "PASSKEY_AUTHENTICATION_UNAVAILABLE",
  ])("preserves stable error code %s", (error) => {
    expect(
      parsePasskeyAuthenticationError(
        new ApiError({ status: 400, statusText: "Bad Request", body: { error } }),
      ),
    ).toBe(error);
  });
  it("ignores unknown or malformed API errors", () => {
    for (const body of [
      { error: "UNKNOWN" },
      { error: "PASSKEY_AUTHENTICATION_FAILED", detail: "private" },
      null,
    ]) {
      expect(
        parsePasskeyAuthenticationError(new ApiError({ status: 400, statusText: "Bad Request", body })),
      ).toBeNull();
    }
  });

  it("recognizes only stable passkey-authentication errors", () => {
    expect(
      parsePasskeyAuthenticationError(
        new ApiError({
          status: 429,
          statusText: "Too Many Requests",
          body: { error: "PASSKEY_AUTHENTICATION_RATE_LIMITED" },
          retryAfterSeconds: 60,
        }),
      ),
    ).toBe("PASSKEY_AUTHENTICATION_RATE_LIMITED");
    expect(parsePasskeyAuthenticationError(new Error("network"))).toBeNull();
  });
});
