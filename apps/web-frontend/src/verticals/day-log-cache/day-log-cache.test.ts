import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  DAY_LOG_CACHE_RETENTION_MS,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  composeDayLogRangeFromSlots,
  applyDayLogSyncResult,
  dateRange,
  getDayLogSyncManifest,
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
  doesDayLogSlotNeedValidation,
  doesDayLogRangeNeedValidation,
  prunePersistedDayLogClient,
  type CachedDayLog,
  type DayLogSlotSnapshot,
} from "./day-log-cache.ts";

const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const otherAccountId = "95434f9a-da1f-47dd-8175-a26ff42ee11e";
const now = Date.parse("2026-09-03T18:00:00.000Z");
const range = { startDate: "2026-08-28", endDate: "2026-09-03" };

function presentSlot(date: string): Exclude<CachedDayLog, null> {
  return {
    id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    weight: null,
  };
}

function slot(
  date: string,
  data: CachedDayLog | undefined,
  overrides: Partial<Omit<DayLogSlotSnapshot, "date" | "data">> = {},
): DayLogSlotSnapshot {
  return {
    date,
    data,
    dataUpdatedAt: now,
    isInvalidated: false,
    ...overrides,
  };
}

describe("Day Log cache model", () => {
  it("uses account-scoped date-slot keys", () => {
    expect(dayLogSlotQueryKey(accountId, "2026-09-03")).toEqual(["dayLogs", accountId, "slot", "2026-09-03"]);
    expect(dayLogSlotQueryKey(accountId, "2026-09-03")).not.toEqual(
      dayLogSlotQueryKey(otherAccountId, "2026-09-03"),
    );
  });

  it("keeps known-empty distinct from an unloaded date when composing observed Dashboard slots", () => {
    const result = composeDayLogRangeFromSlots(range, [
      slot("2026-08-28", null),
      slot("2026-08-29", undefined),
      slot("2026-08-30", presentSlot("2026-08-30")),
    ]);

    expect(result.response.days).toEqual([
      { date: "2026-08-28", dayLog: null },
      { date: "2026-08-30", dayLog: expect.objectContaining({ date: "2026-08-30" }) },
    ]);
    expect(result.loadedDateCount).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  it("requires validation for any range with unloaded, invalidated, or one-hour-old slots", () => {
    const freshSlots = [
      slot("2026-08-28", null),
      slot("2026-08-29", null),
      slot("2026-08-30", presentSlot("2026-08-30")),
      slot("2026-08-31", null),
      slot("2026-09-01", null),
      slot("2026-09-02", null),
      slot("2026-09-03", presentSlot("2026-09-03")),
    ];

    expect(doesDayLogRangeNeedValidation(range, freshSlots, now)).toBe(false);
    expect(doesDayLogRangeNeedValidation(range, freshSlots.slice(1), now)).toBe(true);
    expect(
      doesDayLogRangeNeedValidation(
        range,
        freshSlots.map((slot, index) => (index === 0 ? { ...slot, isInvalidated: true } : slot)),
        now,
      ),
    ).toBe(true);
    expect(
      doesDayLogRangeNeedValidation(
        range,
        freshSlots.map((slot, index) =>
          index === 0 ? { ...slot, dataUpdatedAt: now - DAY_LOG_VALIDATION_FRESHNESS_MS } : slot,
        ),
        now,
      ),
    ).toBe(true);
  });

  it("accepts a complete fresh range of any supported length", () => {
    const syncRange = { startDate: "2026-08-04", endDate: "2026-09-03" };
    const freshSlots = dateRange(syncRange.startDate, syncRange.endDate).map((date) => slot(date, null));

    expect(doesDayLogRangeNeedValidation(syncRange, freshSlots, now)).toBe(false);
  });

  it("uses TanStack timestamps and invalidation for a selected slot's validation eligibility", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"), null, { updatedAt: now });

    expect(
      doesDayLogSlotNeedValidation(
        slot("2026-09-03", null, { dataUpdatedAt: now, isInvalidated: false }),
        now,
      ),
    ).toBe(false);

    await queryClient.invalidateQueries({ queryKey: dayLogSlotQueryKey(accountId, "2026-09-03") });
    const invalidatedState = queryClient.getQueryState(dayLogSlotQueryKey(accountId, "2026-09-03"));
    expect(
      doesDayLogSlotNeedValidation(
        slot("2026-09-03", null, {
          dataUpdatedAt: invalidatedState!.dataUpdatedAt,
          isInvalidated: invalidatedState!.isInvalidated,
        }),
        now,
      ),
    ).toBe(true);
  });

  it("normalizes successful changed and unchanged syncs into raw slot data with one accepted timestamp", () => {
    const queryClient = new QueryClient();
    const syncRange = { startDate: "2026-09-02", endDate: "2026-09-03" };
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-02"), null, { updatedAt: now - 100 });

    applyDayLogSyncResult(
      queryClient,
      accountId,
      syncRange,
      {
        slots: [{ date: "2026-09-03", versionNumber: 7, dayLog: presentSlot("2026-09-03") }],
      },
      now,
    );

    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, "2026-09-02"))).toBeNull();
    expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, "2026-09-02"))?.dataUpdatedAt).toBe(now);
    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"))).toEqual(
      expect.objectContaining({ date: "2026-09-03" }),
    );
    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, "2026-09-03"))).toBe(7);
  });

  it("stores a returned known-empty slot for later validation", () => {
    const queryClient = new QueryClient();
    const syncRange = { startDate: "2026-09-03", endDate: "2026-09-03" };

    applyDayLogSyncResult(
      queryClient,
      accountId,
      syncRange,
      {
        slots: [{ date: "2026-09-03", versionNumber: null, dayLog: null }],
      },
      now,
    );

    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"))).toBeNull();
    expect(getDayLogSyncManifest(queryClient, accountId, syncRange)).toEqual({ "2026-09-03": null });
  });

  it("retains a present slot version through persisted cache restoration", () => {
    const sourceClient = new QueryClient();
    const syncRange = { startDate: "2026-09-03", endDate: "2026-09-03" };
    applyDayLogSyncResult(
      sourceClient,
      accountId,
      syncRange,
      {
        slots: [{ date: "2026-09-03", versionNumber: 7, dayLog: presentSlot("2026-09-03") }],
      },
      now,
    );
    const persistedClient = {
      buster: "day-log-cache-v1",
      timestamp: now,
      clientState: dehydrate(sourceClient, { shouldDehydrateQuery: () => true }),
    };
    const restoredClient = new QueryClient();

    hydrate(restoredClient, prunePersistedDayLogClient(persistedClient, accountId, now)!.clientState);

    expect(getDayLogSyncManifest(restoredClient, accountId, syncRange)).toEqual({ "2026-09-03": 7 });
  });

  it("prunes expired, unrelated, other-account, and mutation state before persistence", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"), presentSlot("2026-09-03"), {
      updatedAt: now,
    });
    queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, "2026-09-03"), 7, { updatedAt: now });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-08-04"), null, {
      updatedAt: now - DAY_LOG_CACHE_RETENTION_MS,
    });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-04"), null, { updatedAt: now + 1 });
    queryClient.setQueryData(dayLogSlotQueryKey(otherAccountId, "2026-09-03"), presentSlot("2026-09-03"), {
      updatedAt: now,
    });
    queryClient.setQueryData(["authenticatedSession"], { token: "must-not-persist" });
    const persistedClient = {
      buster: "day-log-cache-v1",
      timestamp: now,
      clientState: dehydrate(queryClient, { shouldDehydrateQuery: () => true }),
    };

    const pruned = prunePersistedDayLogClient(persistedClient, accountId, now);

    expect(pruned?.clientState.mutations).toEqual([]);
    expect(pruned?.clientState.queries.map(({ queryKey }) => queryKey)).toEqual([
      dayLogSlotQueryKey(accountId, "2026-09-03"),
      dayLogSlotVersionQueryKey(accountId, "2026-09-03"),
    ]);
  });
});
