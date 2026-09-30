import { QueryClient, MutationObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../errors.js";
import { createApiTransport } from "../../transport.js";
import {
  buildAccountEmailVerificationChallenge,
  buildAccountEmailVerificationResult,
  buildVerifyAccountEmailVerificationCommand,
} from "../../verticals/auth/models/__mocks__/account-email-verification.js";
import {
  getRequestAccountEmailVerificationMutationOptions,
  getVerifyAccountEmailVerificationMutationOptions,
  requestAccountEmailVerification,
  verifyAccountEmailVerification,
} from "./account-email-verification.js";

function setup(body: unknown, status = 200) {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  return { fetch, transport: createApiTransport({ baseUrl: "https://api.example.com", fetch }) };
}

describe("Account Email Verification workflow", () => {
  it("requests a normalized email through mutation options and notifies the host", async () => {
    const challenge = buildAccountEmailVerificationChallenge();
    const { transport, fetch } = setup(challenge, 202);
    const onSuccess = vi.fn();
    const observer = new MutationObserver(
      new QueryClient(),
      getRequestAccountEmailVerificationMutationOptions(transport, { onSuccess }),
    );
    const result = await observer.mutate(" Person@Example.COM ");
    expect(result).toEqual(challenge);
    expect(onSuccess).toHaveBeenCalledWith(result, " Person@Example.COM ", undefined, expect.any(Object));
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/email-verification",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "person@example.com" }),
        credentials: "include",
      }),
    );
  });
  it.each(["passkey-registration", "login-or-recovery"] as const)(
    "maps %s continuation and calls the host callback",
    async (next) => {
      const response = buildAccountEmailVerificationResult(next);
      const transport = { request: vi.fn().mockResolvedValue(response) };
      const onSuccess = vi.fn();
      const options = getVerifyAccountEmailVerificationMutationOptions(transport, { onSuccess });
      expect(options.retry).toBe(false);
      const observer = new MutationObserver(new QueryClient(), options);
      const command = buildVerifyAccountEmailVerificationCommand();
      const result = await observer.mutate(command);
      expect(result).toEqual(response);
      expect(result).not.toBe(response);
      expect(onSuccess).toHaveBeenCalledWith(result, command, undefined, expect.any(Object));
    },
  );
  it("rejects an invalid email without sending it", async () => {
    const { transport, fetch } = setup({});
    await expect(requestAccountEmailVerification(transport, { email: "invalid" })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["12345", "abcdef", "1234567"])("rejects invalid code %s before sending", async (code) => {
    const { transport, fetch } = setup({});
    await expect(
      verifyAccountEmailVerification(transport, buildVerifyAccountEmailVerificationCommand({ code })),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["INVALID_CODE", "EXPIRED_CODE"])(
    "preserves %s without retrying or reporting success",
    async (error) => {
      const { transport, fetch } = setup({ error }, 400);
      const onSuccess = vi.fn();
      const observer = new MutationObserver(
        new QueryClient({ defaultOptions: { mutations: { retry: 3 } } }),
        getVerifyAccountEmailVerificationMutationOptions(transport, { onSuccess }),
      );
      await expect(observer.mutate(buildVerifyAccountEmailVerificationCommand())).rejects.toMatchObject({
        status: 400,
        body: { error },
      });
      expect(fetch).toHaveBeenCalledOnce();
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );
  it("preserves resend rate limiting", async () => {
    const { transport } = setup({ error: "rate limited" }, 429);
    await expect(
      requestAccountEmailVerification(transport, { email: "person@example.com" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
