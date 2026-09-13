import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LogoutRecord } from "./indexed-db-day-log-cache-logout.ts";

import { DAY_LOG_CACHE_BUSTER } from "./day-log-cache.ts";
import {
  installMemoryIndexedDB,
  readLifecycle,
  readSnapshot,
  writeLifecycle,
  writeSnapshot,
} from "./indexed-db-day-log-cache-memory.ts";
import { acquireDayLogCacheLease, confirmDayLogCacheAccount } from "./indexed-db-day-log-cache.ts";

const LAST_CONFIRMED_ACCOUNT_KEY = "__last-confirmed-account__";
const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const otherAccountId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const operationId = "logout-operation";
const persistedClient = {
  buster: DAY_LOG_CACHE_BUSTER,
  timestamp: 1,
  clientState: { mutations: [], queries: [] },
};

function logoutRecord(overrides: Partial<LogoutRecord> = {}): LogoutRecord {
  return {
    accountId,
    operationId,
    phase: "server-logout-confirmed",
    targetGeneration: 2,
    ...overrides,
  };
}

beforeEach(() => {
  installMemoryIndexedDB();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("confirmDayLogCacheAccount", () => {
  it("clears leftover snapshots and claims current when logging back into a cleanup-pending account", async () => {
    await writeLifecycle([
      [accountId, 2],
      [`__logout__:${accountId}`, logoutRecord({ phase: "cleanup-pending" })],
    ]);
    await writeSnapshot(accountId, 2, persistedClient);

    await expect(confirmDayLogCacheAccount(accountId, undefined)).resolves.toEqual({
      accepted: true,
      revocations: [],
    });

    expect(await readLifecycle(LAST_CONFIRMED_ACCOUNT_KEY)).toBe(accountId);
    expect(await readLifecycle(`__logout__:${accountId}`)).toBeUndefined();
    expect(await readSnapshot(accountId)).toBeUndefined();
  });

  it("still marks a different account current without clearing another account's cleanup-pending record", async () => {
    const record = logoutRecord({ phase: "cleanup-pending" });
    await writeLifecycle([
      [accountId, 2],
      [otherAccountId, 1],
      [`__logout__:${accountId}`, record],
    ]);
    await writeSnapshot(accountId, 2, persistedClient);

    await expect(confirmDayLogCacheAccount(otherAccountId, undefined, true)).resolves.toEqual({
      accepted: true,
      revocations: [{ accountId, generation: 3 }],
    });

    expect(await readLifecycle(LAST_CONFIRMED_ACCOUNT_KEY)).toBe(otherAccountId);
    expect(await readLifecycle(`__logout__:${accountId}`)).toEqual(record);
    expect(await readLifecycle(accountId)).toBe(3);
    expect(await readSnapshot(accountId)).toBeUndefined();
  });
});

describe("acquireDayLogCacheLease", () => {
  it("acquires a current lease after login resolves leftover cleanup-pending", async () => {
    await writeLifecycle([
      [accountId, 2],
      [`__logout__:${accountId}`, logoutRecord({ phase: "cleanup-pending" })],
    ]);
    await writeSnapshot(accountId, 2, persistedClient);

    await confirmDayLogCacheAccount(accountId, undefined);
    const lease = await acquireDayLogCacheLease(accountId);

    expect(await readLifecycle(LAST_CONFIRMED_ACCOUNT_KEY)).toBe(accountId);
    await expect(lease.isCurrent()).resolves.toBe(true);
    await expect(lease.restoreClient()).resolves.toBeUndefined();
  });
});
