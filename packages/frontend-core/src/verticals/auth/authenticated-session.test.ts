// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  authenticatedSessionQueryKey,
  clearAuthenticatedSession,
  getAuthenticatedSession,
  setAuthenticatedSession,
  useAuthenticatedSession,
} from "./authenticated-session.js";
import { buildAuthenticatedUserContext } from "./models/__mocks__/authenticated-user-context.js";

afterEach(cleanup);

describe("portable authenticated session cache", () => {
  it("reads an absent session and replaces confirmed account context", () => {
    const client = new QueryClient();
    expect(getAuthenticatedSession(client)).toBeUndefined();
    const first = buildAuthenticatedUserContext();
    const next = buildAuthenticatedUserContext({ user: { id: "account-2" }, sessionTransport: "bearer" });
    setAuthenticatedSession(client, first);
    expect(getAuthenticatedSession(client)).toEqual(first);
    setAuthenticatedSession(client, next);
    expect(client.getQueryData(authenticatedSessionQueryKey)).toEqual(next);
    client.clear();
  });

  it("clears only the session cache and allows a fresh session", () => {
    const client = new QueryClient();
    const context = buildAuthenticatedUserContext();
    client.setQueryData(["dayLogs", context.user.id, "slot", "2026-09-30"], null);
    setAuthenticatedSession(client, context);
    clearAuthenticatedSession(client);
    clearAuthenticatedSession(client);
    expect(getAuthenticatedSession(client)).toBeUndefined();
    expect(client.getQueryState(authenticatedSessionQueryKey)).toBeUndefined();
    expect(client.getQueryData(["dayLogs", context.user.id, "slot", "2026-09-30"])).toBeNull();
    setAuthenticatedSession(client, context);
    expect(getAuthenticatedSession(client)).toEqual(context);
    client.clear();
  });

  it("subscribes to the host QueryClient without requesting a session", async () => {
    const queryFn = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { queryFn } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result, unmount } = renderHook(() => useAuthenticatedSession(), { wrapper });
    expect(result.current).toBeUndefined();
    const context = buildAuthenticatedUserContext();
    act(() => setAuthenticatedSession(client, context));
    await waitFor(() => expect(result.current).toEqual(context));
    const replacement = buildAuthenticatedUserContext({ user: { email: "other@example.com" } });
    act(() => setAuthenticatedSession(client, replacement));
    await waitFor(() => expect(result.current).toEqual(replacement));
    expect(queryFn).not.toHaveBeenCalled();
    unmount();
    clearAuthenticatedSession(client);
    client.clear();
  });
});
