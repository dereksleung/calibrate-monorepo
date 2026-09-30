import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { requestAccountEmailVerification } from "./request-account-email-verification.js";
import { mapRequestAccountEmailVerificationResponse } from "./request-account-email-verification.js";
import {
  verifyAccountEmailVerification,
  mapVerifyAccountEmailVerificationResponse,
} from "./verify-account-email-verification.js";

describe("requestAccountEmailVerification", () => {
  it("posts the validated email and parses the challenge metadata", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({
        challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        expiresInSeconds: 600,
        resendAfterSeconds: 60,
      }),
    );
    const transport = { request } as unknown as ApiTransport;

    const result = await requestAccountEmailVerification(transport, {
      email: "  Person@Example.COM ",
    });

    expect(request).toHaveBeenCalledWith({
      path: "/auth/email-verification",
      method: "POST",
      body: { email: "person@example.com" },
      responseBodySchema: expect.any(Object),
    });
    expect(result).toEqual({
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
  });

  it("rejects invalid input before making a request", async () => {
    const request = vi.fn();
    const transport = { request } as unknown as ApiTransport;

    await expect(requestAccountEmailVerification(transport, { email: "not-an-email" })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});

describe("verifyAccountEmailVerification", () => {
  it.each([
    { next: "passkey-registration", expiresAt: "2030-01-01T00:05:00.000Z" },
    { next: "login-or-recovery" },
  ])("posts a code and parses continuation %#", async (expected) => {
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(expected));
    const transport = { request } as unknown as ApiTransport;

    await expect(
      verifyAccountEmailVerification(transport, {
        challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        code: "012345",
      }),
    ).resolves.toEqual(expected);
    expect(request).toHaveBeenCalledWith({
      path: "/auth/email-verification/verify",
      method: "POST",
      body: {
        challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        code: "012345",
      },
      responseBodySchema: expect.any(Object),
    });
  });
});

describe("response mappers", () => {
  it("copies challenge metadata without retaining extra response fields", () => {
    const response = {
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
      token: "ignored",
    };
    const mapped = mapRequestAccountEmailVerificationResponse(response);
    expect(mapped).toEqual({
      challengeId: response.challengeId,
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
    expect(mapped).not.toBe(response);
  });
  it.each([
    { next: "passkey-registration", expiresAt: "2030-01-01T00:05:00.000Z" },
    { next: "login-or-recovery" },
  ] as const)("copies continuation %#", (response) => {
    const mapped = mapVerifyAccountEmailVerificationResponse(response);
    expect(mapped).toEqual(response);
    expect(mapped).not.toBe(response);
  });
});

describe("endpoint validation", () => {
  it.each([
    { challengeId: "invalid", code: "012345" },
    { challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff", code: "abcdef" },
  ])("rejects invalid verification input %#", async (input) => {
    const transport = { request: vi.fn() };
    await expect(verifyAccountEmailVerification(transport, input)).rejects.toThrow();
    expect(transport.request).not.toHaveBeenCalled();
  });
  it("rejects malformed challenge responses even from an injected transport", async () => {
    const transport = {
      request: vi
        .fn()
        .mockResolvedValue({ challengeId: "invalid", expiresInSeconds: -1, resendAfterSeconds: 0 }),
    };
    await expect(
      requestAccountEmailVerification(transport, { email: "person@example.com" }),
    ).rejects.toThrow();
  });
  it.each([
    { next: "unknown" },
    { next: "passkey-registration", expiresAt: "invalid" },
    { next: "login-or-recovery", token: "unexpected" },
  ])("rejects malformed continuation %#", async (response) => {
    const transport = { request: vi.fn().mockResolvedValue(response) };
    await expect(
      verifyAccountEmailVerification(transport, {
        challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        code: "012345",
      }),
    ).rejects.toThrow();
  });
});
