// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dayLogSlotQueryKey } from "./day-log-cache.ts";
import { useSyncDayLogsForDateRange } from "./use-sync-day-logs-for-date-range.ts";

const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const range = { startDate: "2026-09-03", endDate: "2026-09-03" };

function SyncHarness() {
  useSyncDayLogsForDateRange({ accountId, dateRange: range, enabled: true });
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
});
