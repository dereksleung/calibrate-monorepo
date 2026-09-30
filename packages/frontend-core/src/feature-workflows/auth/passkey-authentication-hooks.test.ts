// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAuthenticatedUserContext } from "../../verticals/auth/models/__mocks__/authenticated-user-context.js";
import {
  buildPasskeyAuthenticationChallenge,
  buildVerifyPasskeyAuthenticationCommand,
} from "../../verticals/auth/models/__mocks__/passkey-authentication.js";
import {
  useRequestPasskeyAuthenticationOptions,
  useVerifyPasskeyAuthentication,
} from "./passkey-authentication.js";

afterEach(cleanup);
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);
describe("passkey authentication hooks", () => {
  it("hands a portable challenge to the host", async () => {
    const challenge = buildPasskeyAuthenticationChallenge();
    const transport = {
      request: vi.fn().mockResolvedValue({ ...challenge, expiresAt: challenge.expiresAt.toISOString() }),
    };
    const { result } = renderHook(() => useRequestPasskeyAuthenticationOptions(transport), { wrapper });
    await act(async () => {
      expect(await result.current.mutateAsync()).toEqual(challenge);
    });
  });
  it("maps a verified assertion before invoking the host success callback", async () => {
    const context = buildAuthenticatedUserContext();
    const onSuccess = vi.fn();
    const transport = {
      request: vi.fn().mockResolvedValue({
        ...context,
        user: {
          ...context.user,
          createdAt: context.user.createdAt.toISOString(),
          updatedAt: context.user.updatedAt.toISOString(),
        },
      }),
    };
    const { result } = renderHook(() => useVerifyPasskeyAuthentication(transport, { onSuccess }), {
      wrapper,
    });
    await act(async () => {
      expect(await result.current.mutateAsync(buildVerifyPasskeyAuthenticationCommand())).toEqual(context);
    });
    expect(onSuccess.mock.calls[0][0]).toEqual(context);
  });
  it("preserves verification failure and does not retry", async () => {
    const error = new Error("cancelled transport");
    const transport = { request: vi.fn().mockRejectedValue(error) };
    const { result } = renderHook(() => useVerifyPasskeyAuthentication(transport), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(buildVerifyPasskeyAuthenticationCommand())).rejects.toBe(error);
    });
    expect(transport.request).toHaveBeenCalledOnce();
  });
});
