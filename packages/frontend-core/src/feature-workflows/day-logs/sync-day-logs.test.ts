import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { buildDayLog } from "../../shared/models/day-logs/__mocks__/day-log.js";
import {
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
  getDayLogSyncManifest,
} from "../../verticals/day-log-cache/day-log-slots.js";
import { synchronizeDayLogsForRange } from "./sync-day-logs.js";

const accountId = "account-1";
const otherAccountId = "account-2";
const range = { startDate: "2026-09-02", endDate: "2026-09-03" };

describe("Day Log sync workflow", () => {
  it("builds the account manifest, maps changed data, and validates unchanged and empty slots", async () => {
    const client = new QueryClient();
    client.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-02"), null);
    client.setQueryData(dayLogSlotQueryKey(otherAccountId, "2026-09-03"), null);
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({
        slots: [{ date: "2026-09-03", versionNumber: 1, dayLog: buildDayLog() }],
      }),
    );
    const now = Date.now();

    const result = await synchronizeDayLogsForRange(
      { request } as unknown as ApiTransport,
      client,
      accountId,
      range,
      now,
    );

    expect(request.mock.calls[0]?.[0].body.known).toEqual({ "2026-09-02": null });
    expect(result?.slots[0]?.dayLog).toEqual(buildDayLog());
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, "2026-09-02"))).toBeNull();
    expect(client.getQueryState(dayLogSlotQueryKey(accountId, "2026-09-02"))?.dataUpdatedAt).toBe(now);
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, "2026-09-03"))).toBe(1);
    expect(client.getQueryData(dayLogSlotQueryKey(otherAccountId, "2026-09-03"))).toBeNull();
    expect(getDayLogSyncManifest(client, accountId, range)).toEqual({ "2026-09-02": null, "2026-09-03": 1 });
  });

  it("keeps bodyless success and does not invent unloaded slots", async () => {
    const client = new QueryClient();
    client.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-02"), null);
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(null));
    const result = await synchronizeDayLogsForRange(
      { request } as unknown as ApiTransport,
      client,
      accountId,
      range,
    );
    expect(result).toBeNull();
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"))).toBeUndefined();
  });
});
