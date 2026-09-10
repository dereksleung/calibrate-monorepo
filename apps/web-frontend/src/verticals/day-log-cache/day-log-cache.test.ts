import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  DAY_LOG_CACHE_RETENTION_MS,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  applyDayLogSyncResult,
  dateRange,
  getDayLogSyncManifest,
  getDayLogsWithStalenessState,
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
    isError: false,
    isInvalidated: false,
    ...overrides,
  };
}

function markSlotQueryError(queryClient: QueryClient, date: string) {
  queryClient
    .getQueryCache()
    .find({ queryKey: dayLogSlotQueryKey(accountId, date) })
    ?.setState({
      error: new Error("slot observer failed"),
      status: "error",
    });
}

describe("Day Log cache model", () => {
  it("uses account-scoped date-slot keys", () => {
    expect(dayLogSlotQueryKey(accountId, "2026-09-03")).toEqual(["dayLogs", accountId, "slot", "2026-09-03"]);
    expect(dayLogSlotQueryKey(accountId, "2026-09-03")).not.toEqual(
      dayLogSlotQueryKey(otherAccountId, "2026-09-03"),
    );
  });

  it("reads slot data and staleness from query state", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-08-28"), null, { updatedAt: now });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-08-30"), presentSlot("2026-08-30"), {
      updatedAt: now,
    });
    await queryClient.invalidateQueries({ queryKey: dayLogSlotQueryKey(accountId, "2026-08-30") });
    const invalidatedState = queryClient.getQueryState(dayLogSlotQueryKey(accountId, "2026-08-30"));

    expect(
      getDayLogsWithStalenessState(queryClient, accountId, {
        startDate: "2026-08-28",
        endDate: "2026-08-30",
      }),
    ).toEqual([
      { date: "2026-08-28", data: null, dataUpdatedAt: now, isError: false, isInvalidated: false },
      { date: "2026-08-29", data: undefined, dataUpdatedAt: 0, isError: false, isInvalidated: false },
      {
        date: "2026-08-30",
        data: presentSlot("2026-08-30"),
        dataUpdatedAt: invalidatedState!.dataUpdatedAt,
        isError: false,
        isInvalidated: true,
      },
    ]);
  });

  it("requires validation for any range with unloaded, invalidated, errored, or one-hour-old slots", () => {
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
    expect(
      doesDayLogRangeNeedValidation(
        range,
        freshSlots.map((slot, index) => (index === 0 ? { ...slot, isError: true } : slot)),
        now,
      ),
    ).toBe(true);
  });

  it("treats an errored slot as unverified even when its cached payload is still fresh", () => {
    const freshPresent = slot("2026-09-03", presentSlot("2026-09-03"));
    const freshEmpty = slot("2026-09-03", null);

    expect(doesDayLogSlotNeedValidation(freshPresent, now)).toBe(false);
    expect(doesDayLogSlotNeedValidation(freshEmpty, now)).toBe(false);
    expect(doesDayLogSlotNeedValidation({ ...freshPresent, isError: true }, now)).toBe(true);
    expect(doesDayLogSlotNeedValidation({ ...freshEmpty, isError: true }, now)).toBe(true);
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

  it("keeps an errored slot's payload but omits it from the sync manifest", () => {
    const queryClient = new QueryClient();
    const syncRange = { startDate: "2026-09-02", endDate: "2026-09-03" };
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-02"), null, { updatedAt: now });
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"), presentSlot("2026-09-03"), {
      updatedAt: now,
    });
    queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, "2026-09-03"), 7, { updatedAt: now });
    markSlotQueryError(queryClient, "2026-09-03");

    expect(
      getDayLogsWithStalenessState(queryClient, accountId, {
        startDate: "2026-09-03",
        endDate: "2026-09-03",
      }),
    ).toEqual([
      {
        date: "2026-09-03",
        data: presentSlot("2026-09-03"),
        dataUpdatedAt: now,
        isError: true,
        isInvalidated: false,
      },
    ]);
    expect(getDayLogSyncManifest(queryClient, accountId, syncRange)).toEqual({ "2026-09-02": null });
  });

  it("clears slot error status when an accepted sync writes the date", () => {
    const queryClient = new QueryClient();
    const syncRange = { startDate: "2026-09-03", endDate: "2026-09-03" };
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"), presentSlot("2026-09-03"), {
      updatedAt: now - 100,
    });
    markSlotQueryError(queryClient, "2026-09-03");

    applyDayLogSyncResult(
      queryClient,
      accountId,
      syncRange,
      {
        slots: [{ date: "2026-09-03", versionNumber: 8, dayLog: presentSlot("2026-09-03") }],
      },
      now,
    );

    expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, "2026-09-03"))).toEqual(
      expect.objectContaining({
        data: presentSlot("2026-09-03"),
        dataUpdatedAt: now,
        status: "success",
      }),
    );
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
