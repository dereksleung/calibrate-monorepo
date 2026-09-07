// @vitest-environment jsdom

import { ApiError } from "@calibrate/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedSessionQueryKey, setAuthenticatedSession } from "./authenticated-session.ts";
import { SessionRestorationGate } from "./session-restoration-gate.tsx";

const {
  acquireDayLogCacheLease,
  broadcastDayLogCacheRevocation,
  confirmDayLogCacheAccount,
  getCurrentSession,
  refreshSession,
  revokeDayLogCache,
  revokeLastConfirmedDayLogCache,
} = vi.hoisted(() => ({
  acquireDayLogCacheLease: vi.fn(),
  broadcastDayLogCacheRevocation: vi.fn(),
  confirmDayLogCacheAccount: vi.fn(),
  getCurrentSession: vi.fn(),
  refreshSession: vi.fn(),
  revokeDayLogCache: vi.fn(),
  revokeLastConfirmedDayLogCache: vi.fn(),
}));

vi.mock("@calibrate/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@calibrate/api-client")>()),
  getCurrentSession,
  refreshSession,
}));

vi.mock("#/verticals/day-log-cache/indexed-db-day-log-cache.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#/verticals/day-log-cache/indexed-db-day-log-cache.ts")>()),
  acquireDayLogCacheLease,
  broadcastDayLogCacheRevocation,
  confirmDayLogCacheAccount,
  revokeDayLogCache,
  revokeLastConfirmedDayLogCache,
}));

const session = {
  user: {
    id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
    email: "person@example.com",
    tier: "FREE" as const,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  },
  sessionTransport: "cookie" as const,
};

function unauthorized() {
  return new ApiError({ status: 401, statusText: "Unauthorized", body: null });
}

function renderGate(options?: { authenticated?: boolean }) {
  const rootRoute = createRootRoute({ component: () => null });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/signup-login",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (options?.authenticated) setAuthenticatedSession(queryClient, session);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>
        <SessionRestorationGate>
          <p>private dashboard</p>
        </SessionRestorationGate>
      </RouterContextProvider>
    </QueryClientProvider>,
  );
  return { queryClient, router };
}

beforeEach(() => {
  acquireDayLogCacheLease.mockResolvedValue({
    accountId: session.user.id,
    generation: 0,
    isCurrent: vi.fn().mockResolvedValue(true),
    persistClient: vi.fn().mockResolvedValue(undefined),
    removeClient: vi.fn().mockResolvedValue(undefined),
    restoreClient: vi.fn().mockResolvedValue(undefined),
  });
  revokeDayLogCache.mockResolvedValue({ accountId: session.user.id, generation: 2 });
  revokeLastConfirmedDayLogCache.mockResolvedValue({ accountId: session.user.id, generation: 2 });
  confirmDayLogCacheAccount.mockResolvedValue({ accepted: true, revocations: [] });
  vi.stubGlobal("BroadcastChannel", undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SessionRestorationGate", () => {
  it("does not open or restore private storage until the server confirms the account", async () => {
    let confirmSession!: (value: typeof session) => void;
    getCurrentSession.mockReturnValue(
      new Promise<typeof session>((resolve) => {
        confirmSession = resolve;
      }),
    );

    renderGate();

    expect(screen.queryByText("private dashboard")).toBeNull();
    expect(acquireDayLogCacheLease).not.toHaveBeenCalled();
    confirmSession(session);

    expect(await screen.findByText("private dashboard")).toBeTruthy();
    await waitFor(() => expect(acquireDayLogCacheLease).toHaveBeenCalledWith(session.user.id));
  });

  it("fences the previous account before exposing a newly confirmed account", async () => {
    const nextSession = {
      ...session,
      user: { ...session.user, id: "95434f9a-da1f-47dd-8175-a26ff42ee11e" },
    };
    let completeConfirmation!: (value: { accepted: boolean; revocations: Array<{ accountId: string; generation: number }> }) => void;
    getCurrentSession.mockResolvedValue(nextSession);
    confirmDayLogCacheAccount.mockReturnValue(
      new Promise((resolve) => {
        completeConfirmation = resolve;
      }),
    );
    const { queryClient } = renderGate({ authenticated: true });
    queryClient.setQueryData(["dayLogs", session.user.id, "slot", "2026-09-03"], { private: true });

    await waitFor(() =>
      expect(confirmDayLogCacheAccount).toHaveBeenCalledWith(nextSession.user.id, session.user.id, undefined),
    );
    expect(screen.queryByText("private dashboard")).toBeNull();
    expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toEqual(session);

    completeConfirmation({
      accepted: true,
      revocations: [{ accountId: session.user.id, generation: 2 }],
    });

    expect(await screen.findByText("private dashboard")).toBeTruthy();
    expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toEqual(nextSession);
    expect(queryClient.getQueriesData({ queryKey: ["dayLogs"] })).toEqual([]);
    expect(broadcastDayLogCacheRevocation).toHaveBeenCalledWith({ accountId: session.user.id, generation: 2 });
    expect(acquireDayLogCacheLease).toHaveBeenCalledWith(nextSession.user.id);
  });

  it("revokes the last confirmed cache only after session loss is conclusively confirmed", async () => {
    getCurrentSession.mockRejectedValue(unauthorized());
    refreshSession.mockRejectedValue(unauthorized());
    const { queryClient, router } = renderGate({ authenticated: true });
    queryClient.setQueryData(["dayLogs", session.user.id, "slot", "2026-09-03"], { private: true });

    await waitFor(() => expect(router.state.location.pathname).toBe("/signup-login"));
    expect(revokeDayLogCache).toHaveBeenCalledWith(session.user.id);
    expect(broadcastDayLogCacheRevocation).toHaveBeenCalledWith({
      accountId: session.user.id,
      generation: 2,
    });
    expect(queryClient.getQueriesData({ queryKey: ["dayLogs"] })).toEqual([]);
  });

  it("revokes the durable account after a cold-start session loss", async () => {
    getCurrentSession.mockRejectedValue(unauthorized());
    refreshSession.mockRejectedValue(unauthorized());
    const { queryClient, router } = renderGate();
    queryClient.setQueryData(["dayLogs", session.user.id, "slot", "2026-09-03"], { private: true });

    await waitFor(() => expect(router.state.location.pathname).toBe("/signup-login"));
    expect(revokeLastConfirmedDayLogCache).toHaveBeenCalledTimes(1);
    expect(revokeDayLogCache).not.toHaveBeenCalled();
    expect(broadcastDayLogCacheRevocation).toHaveBeenCalledWith({
      accountId: session.user.id,
      generation: 2,
    });
    expect(queryClient.getQueriesData({ queryKey: ["dayLogs"] })).toEqual([]);
  });

  it("revokes the session account captured before another account replaces shared state", async () => {
    let rejectRefresh!: (reason: unknown) => void;
    getCurrentSession.mockRejectedValue(unauthorized());
    refreshSession.mockReturnValue(
      new Promise<never>((_, reject) => {
        rejectRefresh = reject;
      }),
    );
    const { queryClient, router } = renderGate({ authenticated: true });
    await waitFor(() => expect(refreshSession).toHaveBeenCalled());

    setAuthenticatedSession(queryClient, {
      ...session,
      user: { ...session.user, id: "95434f9a-da1f-47dd-8175-a26ff42ee11e" },
    });
    rejectRefresh(unauthorized());

    await waitFor(() => expect(router.state.location.pathname).toBe("/signup-login"));
    expect(revokeDayLogCache).toHaveBeenCalledWith(session.user.id);
    expect(revokeDayLogCache).not.toHaveBeenCalledWith("95434f9a-da1f-47dd-8175-a26ff42ee11e");
  });

  it("preserves the cache during a transient session check failure", async () => {
    getCurrentSession.mockRejectedValue(new Error("offline"));
    const { queryClient } = renderGate();
    queryClient.setQueryData(["dayLogs", session.user.id, "slot", "2026-09-03"], { private: true });

    expect(await screen.findByText("Calibrate is temporarily unavailable.")).toBeTruthy();
    expect(revokeDayLogCache).not.toHaveBeenCalled();
    expect(queryClient.getQueriesData({ queryKey: ["dayLogs"] })).toHaveLength(1);
  });
});
