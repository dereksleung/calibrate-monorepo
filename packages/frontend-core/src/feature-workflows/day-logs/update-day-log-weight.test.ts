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
import { buildUpdateDayLogWeightCommand } from "../../verticals/day-logs/models/__mocks__/update-day-log-weight.js";
import { getUpdateDayLogWeightMutationOptions, useUpdateDayLogWeight } from "./update-day-log-weight.js";

const date = "2026-09-03";
const accountId = "account-1";
const command = buildUpdateDayLogWeightCommand({ weight: 182.45 });

function transportReturning(response: Record<string, unknown>) {
  const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(response));
  return { transport: { request } as unknown as ApiTransport, request };
}

describe("Update Weight workflow", () => {
  it("patches a trusted predecessor through the options factory without syncing", async () => {
    const client = new QueryClient();
    const original = buildDayLog({
      date,
      lunch: [buildFoodEntry({ id: "entry-1" })],
      weight: 180.1,
    });
    client.setQueryData(dayLogSlotQueryKey(accountId, date), original);
    client.setQueryData(dayLogSlotVersionQueryKey(accountId, date), 7);
    const { transport, request } = transportReturning({ versionNumber: 8 });

    const result = await getUpdateDayLogWeightMutationOptions(transport, client, accountId, date).mutationFn(
      command,
    );

    expect(result).toEqual({ updatedWeight: 182.5, versionNumber: 8 });
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      ...original,
      weight: 182.5,
    });
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(8);
    expect(client.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toMatchObject({
      method: "PUT",
      path: "/daylogs/2026-09-03/weight",
      body: { weight: 182.5 },
    });
  });

  it("creates a Known-empty aggregate at version one through the hook", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(dayLogSlotQueryKey(accountId, date), null);
    const { transport, request } = transportReturning({
      versionNumber: 1,
      createdDayLogId: "day-log-weight-1",
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useUpdateDayLogWeight(transport, accountId, date), { wrapper });

    result.current.mutate(command);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      updatedWeight: 182.5,
      versionNumber: 1,
      dayLogId: "day-log-weight-1",
    });
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      id: "day-log-weight-1",
      date,
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      weight: 182.5,
    });
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(1);
    expect(client.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("preserves caller success and error callbacks in hook mutation options", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(dayLogSlotQueryKey(accountId, date), null);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const request = vi
      .fn()
      .mockImplementationOnce(async ({ responseBodySchema }) =>
        responseBodySchema.parse({ versionNumber: 1, createdDayLogId: "day-log-weight-1" }),
      )
      .mockRejectedValueOnce(new Error("weight unavailable"));
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(
      () =>
        useUpdateDayLogWeight({ request } as unknown as ApiTransport, accountId, date, {
          onSuccess,
          onError,
        }),
      { wrapper },
    );

    await result.current.mutateAsync(command);
    await expect(result.current.mutateAsync(command)).rejects.toThrow("weight unavailable");

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onSuccess.mock.calls[0]?.[0]).toMatchObject({ updatedWeight: 182.5 });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ message: "weight unavailable" });
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toMatchObject({ weight: 182.5 });
  });

  it("keeps an acknowledgement unverified when a version mismatch cannot reconcile", async () => {
    const client = new QueryClient();
    const original = buildDayLog({ date, lunch: [buildFoodEntry({ id: "entry-1" })] });
    client.setQueryData(dayLogSlotQueryKey(accountId, date), original);
    client.setQueryData(dayLogSlotVersionQueryKey(accountId, date), 4);
    const { transport, request } = transportReturning({ versionNumber: 7 });
    request.mockImplementationOnce(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ versionNumber: 7 }),
    );
    request.mockRejectedValueOnce(new Error("sync unavailable"));

    await expect(
      getUpdateDayLogWeightMutationOptions(transport, client, accountId, date).mutationFn(command),
    ).resolves.toEqual({ updatedWeight: 182.5, versionNumber: 7 });

    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual({
      ...original,
      weight: 182.5,
    });
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(4);
    expect(client.getQueryState(dayLogSlotQueryKey(accountId, date))?.isInvalidated).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not patch the cache when the write fails", async () => {
    const client = new QueryClient();
    client.setQueryData(dayLogSlotQueryKey(accountId, date), null);
    const request = vi.fn().mockRejectedValue(new Error("write failed"));

    await expect(
      getUpdateDayLogWeightMutationOptions(
        { request } as unknown as ApiTransport,
        client,
        accountId,
        date,
      ).mutationFn(command),
    ).rejects.toThrow("write failed");

    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("reconciles an unloaded date without touching another account", async () => {
    const client = new QueryClient();
    client.setQueryData(dayLogSlotQueryKey("account-2", date), null);
    const reconciled = buildDayLog({ date, weight: 182.5 });
    const { transport, request } = transportReturning({ versionNumber: 3 });
    request.mockImplementationOnce(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ versionNumber: 3 }),
    );
    request.mockImplementationOnce(async ({ responseBodySchema }) =>
      responseBodySchema.parse({
        slots: [{ date, versionNumber: 3, dayLog: reconciled }],
      }),
    );

    await getUpdateDayLogWeightMutationOptions(transport, client, accountId, date).mutationFn(command);

    expect(request.mock.calls[1]?.[0].body.known).toEqual({});
    expect(client.getQueryData(dayLogSlotQueryKey(accountId, date))).toEqual(reconciled);
    expect(client.getQueryData(dayLogSlotVersionQueryKey(accountId, date))).toBe(3);
    expect(client.getQueryData(dayLogSlotQueryKey("account-2", date))).toBeNull();
  });
});
