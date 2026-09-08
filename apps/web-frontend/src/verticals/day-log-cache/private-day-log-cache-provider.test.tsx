// @vitest-environment jsdom

import { authenticatedSessionQueryKey } from "#/verticals/auth/authenticated-session.ts";
import { QueryClient, QueryClientProvider, dehydrate, useQuery } from "@tanstack/react-query";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DayLogCacheLease } from "./indexed-db-day-log-cache.ts";

import { DAY_LOG_CACHE_BUSTER, dayLogSlotQueryKey, type CachedDayLog } from "./day-log-cache.ts";
import { PrivateDayLogCacheProvider } from "./private-day-log-cache-provider.tsx";

const { acquireDayLogCacheLease } = vi.hoisted(() => ({ acquireDayLogCacheLease: vi.fn() }));

vi.mock("./indexed-db-day-log-cache.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./indexed-db-day-log-cache.ts")>()),
  acquireDayLogCacheLease,
}));

const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const slotDate = "2026-09-03";
const slot: CachedDayLog = null;

function createLease(overrides: Partial<DayLogCacheLease> = {}): DayLogCacheLease {
  return {
    accountId,
    generation: 4,
    isCurrent: vi.fn().mockResolvedValue(true),
    persistClient: vi.fn().mockResolvedValue(undefined),
    removeClient: vi.fn().mockResolvedValue(undefined),
    restoreClient: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function CachedSlot() {
  const { data, isPending } = useQuery({
    queryKey: dayLogSlotQueryKey(accountId, slotDate),
    queryFn: async () => {
      throw new Error("restoration must finish before the query runs");
    },
    staleTime: Infinity,
  });
  return <p>{data === null ? "known-empty" : isPending ? "waiting" : "unavailable"}</p>;
}

function renderProvider(queryClient: QueryClient) {
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

  render(
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>
        <PrivateDayLogCacheProvider accountId={accountId}>
          <CachedSlot />
        </PrivateDayLogCacheProvider>
      </RouterContextProvider>
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  vi.stubGlobal("BroadcastChannel", undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PrivateDayLogCacheProvider", () => {
  it("does not mount private descendants before a fenced lease exists", async () => {
    let resolveLease!: (lease: DayLogCacheLease) => void;
    acquireDayLogCacheLease.mockReturnValue(
      new Promise<DayLogCacheLease>((resolve) => {
        resolveLease = resolve;
      }),
    );

    renderProvider(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

    expect(screen.queryByText("waiting")).toBeNull();
    resolveLease(createLease());
    expect(await screen.findByText("unavailable")).toBeTruthy();
  });

  it("keeps private descendants gated until the lease is current", async () => {
    let resolveCurrent!: (value: boolean) => void;
    const isCurrent = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveCurrent = resolve;
        }),
    );
    acquireDayLogCacheLease.mockResolvedValue(createLease({ isCurrent }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(authenticatedSessionQueryKey, { user: { id: accountId } });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, slotDate), slot);
    const router = renderProvider(queryClient);

    await waitFor(() => expect(isCurrent).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("waiting")).toBeNull();

    resolveCurrent(false);

    await waitFor(() => {
      expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toBeUndefined();
      expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, slotDate))).toBeUndefined();
      expect(router.state.location.pathname).toBe("/signup-login");
    });
  });

  it("keeps private descendants gated through the final post-hydration fence check", async () => {
    let resolveFinalCheck!: (value: boolean) => void;
    const isCurrent = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          resolveFinalCheck = resolve;
        }),
      );
    acquireDayLogCacheLease.mockResolvedValue(createLease({ isCurrent }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(authenticatedSessionQueryKey, { user: { id: accountId } });
    const router = renderProvider(queryClient);

    await waitFor(() => expect(isCurrent).toHaveBeenCalledTimes(3));
    expect(screen.queryByText("waiting")).toBeNull();

    resolveFinalCheck(false);

    await waitFor(() => {
      expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toBeUndefined();
      expect(router.state.location.pathname).toBe("/signup-login");
    });
  });

  it("restores the fenced cache before descendant queries may fetch", async () => {
    const storedClient = new QueryClient();
    storedClient.setQueryData(dayLogSlotQueryKey(accountId, slotDate), slot);
    acquireDayLogCacheLease.mockResolvedValue(
      createLease({
        restoreClient: vi.fn().mockResolvedValue({
          buster: DAY_LOG_CACHE_BUSTER,
          timestamp: Date.now(),
          clientState: dehydrate(storedClient),
        }),
      }),
    );

    renderProvider(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

    expect(await screen.findByText("known-empty")).toBeTruthy();
  });

  it("falls back to online queries when IndexedDB is unavailable", async () => {
    acquireDayLogCacheLease.mockResolvedValue(
      createLease({ restoreClient: vi.fn().mockResolvedValue(undefined) }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderProvider(queryClient);

    await waitFor(() => {
      expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, slotDate))?.status).toBe("error");
    });
  });

  it("purges private memory and navigates before reuse when a durable fence changes", async () => {
    const isCurrent = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
    acquireDayLogCacheLease.mockResolvedValue(createLease({ isCurrent }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(authenticatedSessionQueryKey, { user: { id: accountId } });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, slotDate), slot);
    queryClient.setQueryData(["dayLogs", accountId, "date", slotDate], { private: "selected-day" });
    queryClient.setQueryData(["dayLogs", accountId, "range", "2026-09-01", "2026-09-03"], {
      private: "range",
    });
    const otherAccountId = "95434f9a-da1f-47dd-8175-a26ff42ee11e";
    queryClient.setQueryData(["dayLogs", otherAccountId, "date", slotDate], { private: "other-account" });
    const router = renderProvider(queryClient);

    await waitFor(() => expect(isCurrent).toHaveBeenCalled());
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => {
      expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toBeUndefined();
      expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, slotDate))).toBeUndefined();
      expect(queryClient.getQueryData(["dayLogs", accountId, "date", slotDate])).toBeUndefined();
      expect(
        queryClient.getQueryData(["dayLogs", accountId, "range", "2026-09-01", "2026-09-03"]),
      ).toBeUndefined();
      expect(queryClient.getQueryData(["dayLogs", otherAccountId, "date", slotDate])).toEqual({
        private: "other-account",
      });
      expect(router.state.location.pathname).toBe("/signup-login");
    });
  });

  it("does not clear replacement-account state after revocation loses ownership", async () => {
    let markCancellationStarted!: () => void;
    const cancellationStarted = new Promise<void>((resolve) => {
      markCancellationStarted = resolve;
    });
    let resolveCancellation!: () => void;
    const cancellation = new Promise<void>((resolve) => {
      resolveCancellation = resolve;
    });
    const isCurrent = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    acquireDayLogCacheLease.mockResolvedValue(createLease({ isCurrent }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(authenticatedSessionQueryKey, { user: { id: accountId } });
    renderProvider(queryClient);

    expect(await screen.findByText("unavailable")).toBeTruthy();
    vi.spyOn(queryClient, "cancelQueries").mockImplementation(() => {
      markCancellationStarted();
      return cancellation;
    });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, slotDate), slot);

    window.dispatchEvent(new Event("focus"));
    await cancellationStarted;
    cleanup();

    const replacementAccountId = "95434f9a-da1f-47dd-8175-a26ff42ee11e";
    queryClient.setQueryData(authenticatedSessionQueryKey, { user: { id: replacementAccountId } });
    queryClient.setQueryData(dayLogSlotQueryKey(replacementAccountId, slotDate), slot);
    resolveCancellation();

    await waitFor(() => {
      expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toEqual({
        user: { id: replacementAccountId },
      });
      expect(queryClient.getQueryData(dayLogSlotQueryKey(replacementAccountId, slotDate))).toEqual(slot);
    });
  });
});
