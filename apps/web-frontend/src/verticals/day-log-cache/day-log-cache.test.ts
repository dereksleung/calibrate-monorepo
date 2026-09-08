import { QueryClient, dehydrate } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  DAY_LOG_CACHE_RETENTION_MS,
  DAY_LOG_VALIDATION_FRESHNESS_MS,
  composeDayLogRangeFromSlots,
  dayLogSlotQueryKey,
  doesDashboardRangeNeedValidation,
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

  it("requires Dashboard validation for unloaded, invalidated, or one-hour-old slots", () => {
    const freshSlots = [
      slot("2026-08-28", null),
      slot("2026-08-29", null),
      slot("2026-08-30", presentSlot("2026-08-30")),
      slot("2026-08-31", null),
      slot("2026-09-01", null),
      slot("2026-09-02", null),
      slot("2026-09-03", presentSlot("2026-09-03")),
    ];

    expect(doesDashboardRangeNeedValidation(freshSlots, now)).toBe(false);
    expect(doesDashboardRangeNeedValidation(freshSlots.slice(1), now)).toBe(true);
    expect(
      doesDashboardRangeNeedValidation(
        freshSlots.map((slot, index) => (index === 0 ? { ...slot, isInvalidated: true } : slot)),
        now,
      ),
    ).toBe(true);
    expect(
      doesDashboardRangeNeedValidation(
        freshSlots.map((slot, index) =>
          index === 0 ? { ...slot, dataUpdatedAt: now - DAY_LOG_VALIDATION_FRESHNESS_MS } : slot,
        ),
        now,
      ),
    ).toBe(true);
  });

  it("prunes expired, unrelated, other-account, and mutation state before persistence", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-09-03"), presentSlot("2026-09-03"), {
      updatedAt: now,
    });
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
    ]);
  });
});
