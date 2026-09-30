// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { buildDayLog, buildFoodEntry } from "../../shared/models/day-logs/__mocks__/day-log.js";
import {
  dayLogSlotQueryKey,
  dayLogSlotVersionQueryKey,
} from "../../verticals/day-log-cache/day-log-slots.js";
import { getSaveFoodEntryMutationOptions, useSaveFoodEntry } from "./save-food-entry.js";

const date = "2026-09-03";
const accountId = "account-1";
const command = (({ id: _id, ...entry }) => entry)(buildFoodEntry());

function transportReturning(response: Record<string, unknown>) {
  const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(response));
  return { transport: { request } as unknown as ApiTransport, request };
}

describe("Save Food Entry workflow", () => {
  it("patches a trusted predecessor through the options factory without syncing", async () => {
    const client = new QueryClient();
    const original = buildDayLog({ date, lunch: [] });
    client.setQueryData(dayLogSlotQueryKey(accountId, date), original);
    client.setQueryData(dayLogSlotVersionQueryKey(accountId, date), 7);
    const { transport, request } = transportReturning({ foodEntryId: "entry-2", versionNumber: 8 });

    const result = await getSaveFoodEntryMutationOptions(transport, client, accountId, date).mutationFn(
      command,
    );

    expect(result.foodEntry).toEqual({ ...command, id: "entry-2" });
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      ...original,
      lunch: [{ ...command, id: "entry-2" }],
    });
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(8);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("creates a Known-empty aggregate at version one through the hook", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(dayLogSlotQueryKey(accountId, date), null);
    const { transport, request } = transportReturning({
      foodEntryId: "entry-2",
      versionNumber: 1,
      createdDayLogId: "day-log-2",
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useSaveFoodEntry(transport, accountId, date), { wrapper });

    result.current.mutate(command);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.foodEntry.id).toBe("entry-2");
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toMatchObject({
      id: "day-log-2",
      date,
      lunch: [{ ...command, id: "entry-2" }],
    });
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps an acknowledgement unverified when a version mismatch cannot reconcile", async () => {
    const client = new QueryClient();
    client.setQueryData(dayLogSlotQueryKey(accountId, date), buildDayLog({ date, lunch: [] }));
    client.setQueryData(dayLogSlotVersionQueryKey(accountId, date), 4);
    const { transport, request } = transportReturning({ foodEntryId: "entry-2", versionNumber: 7 });
    request.mockImplementationOnce(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ foodEntryId: "entry-2", versionNumber: 7 }),
    );
    request.mockRejectedValueOnce(new Error("sync unavailable"));

    await expect(
      getSaveFoodEntryMutationOptions(transport, client, accountId, date).mutationFn(command),
    ).resolves.toMatchObject({ foodEntry: { id: "entry-2" } });

    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toMatchObject({
      lunch: [{ ...command, id: "entry-2" }],
    });
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(4);
    expect(client.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("normalizes the acknowledged entry to stored precision", async () => {
    const client = new QueryClient();
    client.setQueryData(dayLogSlotQueryKey(accountId, date), null);
    const { transport } = transportReturning({ foodEntryId: "entry-2", versionNumber: 1 });
    const preciseCommand = {
      ...command,
      chosenQuantity: 0.333,
      calories: 73.926,
      quantityServing: 1.234,
    };

    const result = await getSaveFoodEntryMutationOptions(transport, client, accountId, date).mutationFn(
      preciseCommand,
    );

    expect(result.foodEntry).toMatchObject({
      chosenQuantity: 0.33,
      calories: 73.9,
      quantityServing: 1.23,
    });
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toMatchObject({
      lunch: [result.foodEntry],
    });
  });

  it("reconciles an unloaded date without touching another account", async () => {
    const client = new QueryClient();
    client.setQueryData(dayLogSlotQueryKey("account-2", date), null);
    const { transport, request } = transportReturning({ foodEntryId: "entry-2", versionNumber: 3 });
    request.mockImplementationOnce(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ foodEntryId: "entry-2", versionNumber: 3 }),
    );
    request.mockImplementationOnce(async ({ responseBodySchema }) =>
      responseBodySchema.parse({
        slots: [
          {
            date,
            versionNumber: 3,
            dayLog: buildDayLog({ date, lunch: [buildFoodEntry({ id: "entry-2" })] }),
          },
        ],
      }),
    );

    await getSaveFoodEntryMutationOptions(transport, client, accountId, date).mutationFn(command);

    expect(request.mock.calls[1]?.[0].body.known).toEqual({});
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(3);
    expect(client.getQueryData(dayLogSlotQueryKey("account-2", date))).toBeNull();
  });
});
