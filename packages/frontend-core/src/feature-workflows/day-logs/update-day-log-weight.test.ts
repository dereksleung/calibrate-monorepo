import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { dayLogSlotQueryKey, dayLogSlotVersionQueryKey } from "./sync-day-logs.js";
import { getUpdateDayLogWeightMutationOptions } from "./update-day-log-weight.js";

const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const date = "2026-09-03";
const now = Date.parse("2026-09-03T18:00:00.000Z");

describe("Update Day Log Weight workflow", () => {
  it("creates a Day Log from a Known-empty slot and trusts version one", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), null, { updatedAt: now });
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ versionNumber: 1, createdDayLogId: "created-day-log" }),
    );

    await getUpdateDayLogWeightMutationOptions(
      { accountId, queryClient, transport: { request } as unknown as ApiTransport },
      date,
    ).mutationFn({ weight: 182.45 });

    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      id: "created-day-log",
      date,
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      weight: 182.5,
    });
    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(1);
  });

  it("retains a version-mismatched local weight acknowledgement when reconciliation fails", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      dayLogSlotQueryKey(accountId, date),
      { id: "day-log-1", date, breakfast: [], lunch: [], dinner: [], snacks: [], weight: 180.1 },
      { updatedAt: now },
    );
    queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, date), 4, { updatedAt: now });
    const request = vi.fn(async ({ responseBodySchema, path }) => {
      if (path.endsWith("/weight")) return responseBodySchema.parse({ versionNumber: 7 });
      throw new Error("sync unavailable");
    });

    await getUpdateDayLogWeightMutationOptions(
      { accountId, queryClient, transport: { request } as unknown as ApiTransport },
      date,
    ).mutationFn({ weight: 182.45 });

    expect(queryClient.getQueryData(dayLogSlotQueryKey(accountId, date))).toMatchObject({ weight: 182.5 });
    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(4);
    expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated).toBe(true);
  });
});
