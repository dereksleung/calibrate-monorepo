import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authenticatedSessionQueryKey,
  establishAuthenticatedSession,
  setAuthenticatedSession,
} from "./authenticated-session.ts";

const { broadcastDayLogCacheRevocation, confirmDayLogCacheAccount } = vi.hoisted(() => ({
  broadcastDayLogCacheRevocation: vi.fn(),
  confirmDayLogCacheAccount: vi.fn(),
}));

vi.mock("../day-log-cache/indexed-db-day-log-cache.ts", () => ({
  broadcastDayLogCacheRevocation,
  confirmDayLogCacheAccount,
}));

const accountA = {
  user: {
    id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
    email: "account-a@example.com",
    tier: "FREE" as const,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  },
  sessionTransport: "cookie" as const,
};

const accountB = {
  ...accountA,
  user: { ...accountA.user, id: "95434f9a-da1f-47dd-8175-a26ff42ee11e", email: "account-b@example.com" },
};

describe("establishAuthenticatedSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the previous session published until its durable fence commits", async () => {
    const queryClient = new QueryClient();
    setAuthenticatedSession(queryClient, accountA);
    let resolveConfirmation!: (value: { accepted: boolean; revocations: [] }) => void;
    confirmDayLogCacheAccount.mockReturnValue(
      new Promise((resolve) => {
        resolveConfirmation = resolve;
      }),
    );

    const transition = establishAuthenticatedSession(queryClient, accountB);

    expect(confirmDayLogCacheAccount).toHaveBeenCalledWith(accountB.user.id, accountA.user.id, undefined);
    expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toEqual(accountA);

    resolveConfirmation({ accepted: true, revocations: [] });

    await expect(transition).resolves.toEqual({ previousAccountId: accountA.user.id });
    expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toEqual(accountB);
  });

  it("does not publish a replacement session when the durable transition is rejected", async () => {
    const queryClient = new QueryClient();
    setAuthenticatedSession(queryClient, accountA);
    confirmDayLogCacheAccount.mockResolvedValue({ accepted: false, revocations: [] });

    await expect(establishAuthenticatedSession(queryClient, accountB)).resolves.toBeUndefined();

    expect(queryClient.getQueryData(authenticatedSessionQueryKey)).toEqual(accountA);
    expect(broadcastDayLogCacheRevocation).not.toHaveBeenCalled();
  });
});
