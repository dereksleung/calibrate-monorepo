// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAccountEmailVerificationChallenge,
  buildAccountEmailVerificationResult,
  buildVerifyAccountEmailVerificationCommand,
} from "../../verticals/auth/models/__mocks__/account-email-verification.js";
import {
  useRequestAccountEmailVerification,
  useVerifyAccountEmailVerification,
} from "./account-email-verification.js";

afterEach(cleanup);
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe("email verification hooks", () => {
  it("requests a challenge and maps it for the host", async () => {
    const response = buildAccountEmailVerificationChallenge();
    const transport = { request: vi.fn().mockResolvedValue(response) };
    const { result } = renderHook(() => useRequestAccountEmailVerification(transport), { wrapper });
    await act(async () => {
      const challenge = await result.current.mutateAsync("person@example.com");
      expect(challenge).toEqual(response);
      expect(challenge).not.toBe(response);
    });
  });
  it.each(["passkey-registration", "login-or-recovery"] as const)("confirms a code for %s", async (next) => {
    const response = buildAccountEmailVerificationResult(next);
    const transport = { request: vi.fn().mockResolvedValue(response) };
    const { result } = renderHook(() => useVerifyAccountEmailVerification(transport), { wrapper });
    await act(async () => {
      const continuation = await result.current.mutateAsync(buildVerifyAccountEmailVerificationCommand());
      expect(continuation).toEqual(response);
      expect(continuation).not.toBe(response);
    });
  });
});
