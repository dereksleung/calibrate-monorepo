// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dayLogSlotQueryKey } from "./day-log-cache.ts";
import { useSyncDayLogsForDateRange } from "./use-sync-day-logs-for-date-range.ts";

const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const range = { startDate: "2026-09-03", endDate: "2026-09-03" };

function SyncHarness({
  dateRange = range,
  enabled = true,
}: {
  dateRange?: { startDate: string; endDate: string };
  enabled?: boolean;
}) {
  useSyncDayLogsForDateRange({ accountId, dateRange, enabled });
  return null;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useSyncDayLogsForDateRange", () => {
  it("syncs an unverified range and applies its result to the subscribed cache slot", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          slots: [{ date: range.startDate, versionNumber: null, dayLog: null }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <SyncHarness />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, range.startDate))).toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      ...range,
      known: {},
    });
  });

  it("does not request a range when every cached slot is fresh", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, range.startDate), null);
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(
      <QueryClientProvider client={queryClient}>
        <SyncHarness />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, range.startDate))?.status).toBe(
        "success",
      );
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends every known slot and applies a conditional multi-date sync response", async () => {
    const multiDateRange = { startDate: "2026-09-02", endDate: "2026-09-03" };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, multiDateRange.startDate), null, {
      updatedAt: Date.now(),
    });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, multiDateRange.endDate), null, {
      updatedAt: 0,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          slots: [{ date: multiDateRange.endDate, versionNumber: null, dayLog: null }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <SyncHarness dateRange={multiDateRange} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      ...multiDateRange,
      known: {
        [multiDateRange.startDate]: null,
        [multiDateRange.endDate]: null,
      },
    });
    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, multiDateRange.startDate))).toBeNull();
    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, multiDateRange.endDate))).toBeNull();
  });

  it("does not synchronize while disabled", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(
      <QueryClientProvider client={queryClient}>
        <SyncHarness enabled={false} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, range.startDate))).toBeDefined();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
