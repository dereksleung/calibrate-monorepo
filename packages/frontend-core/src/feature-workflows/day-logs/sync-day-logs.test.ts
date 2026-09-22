import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  applyDayLogSyncResult,
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
  getDayLogSyncManifest,
} from "./sync-day-logs.js";

const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const range = { startDate: "2026-09-03", endDate: "2026-09-03" };
const now = Date.parse("2026-09-03T18:00:00.000Z");

describe("Day Log sync workflow", () => {
  it("writes an accepted known-empty slot and keeps its account-scoped manifest", () => {
    const queryClient = new QueryClient();

    applyDayLogSyncResult(
      queryClient,
      accountId,
      range,
      { slots: [{ date: range.startDate, versionNumber: null, dayLog: null }] },
      now,
    );

    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, range.startDate))).toBeNull();
    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, range.startDate))).toBeUndefined();
    expect(getDayLogSyncManifest(queryClient, accountId, range)).toEqual({ [range.startDate]: null });
  });
});
