import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DAY_LOG_CACHE_BUSTER } from "./day-log-cache.ts";
import {
  commitFence,
  completeDayLogCacheLogout,
  type LogoutRecord,
  removeStoredDayLogsSnapshot,
} from "./indexed-db-day-log-cache-logout.ts";
import {
  MemoryObjectStore,
  installMemoryIndexedDB,
  readLifecycle,
  readSnapshot,
  writeLifecycle,
  writeSnapshot,
} from "./indexed-db-day-log-cache-memory.ts";

const LAST_CONFIRMED_ACCOUNT_KEY = "__last-confirmed-account__";
const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
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

describe("commitFence", () => {
  it("does not write fence-committed when the stored generation is still below the target", async () => {
    const record = logoutRecord();
    await writeLifecycle([
      [accountId, 1],
      [LAST_CONFIRMED_ACCOUNT_KEY, accountId],
      [`__logout__:${accountId}`, record],
    ]);

    await expect(commitFence(accountId, operationId, 2)).resolves.toBe(false);

    expect(await readLifecycle(`__logout__:${accountId}`)).toEqual(record);
    expect(await readLifecycle(LAST_CONFIRMED_ACCOUNT_KEY)).toBe(accountId);
  });

  it("writes fence-committed after the stored generation has reached the target", async () => {
    await writeLifecycle([
      [accountId, 2],
      [LAST_CONFIRMED_ACCOUNT_KEY, accountId],
      [`__logout__:${accountId}`, logoutRecord()],
    ]);

    await expect(commitFence(accountId, operationId, 2)).resolves.toBe(true);

    expect(await readLifecycle(`__logout__:${accountId}`)).toMatchObject({ phase: "fence-committed" });
    expect(await readLifecycle(LAST_CONFIRMED_ACCOUNT_KEY)).toBeUndefined();
  });

  it("treats a stored generation above the target as already fenced", async () => {
    await writeLifecycle([
      [accountId, 4],
      [LAST_CONFIRMED_ACCOUNT_KEY, accountId],
      [`__logout__:${accountId}`, logoutRecord()],
    ]);

    await expect(commitFence(accountId, operationId, 2)).resolves.toBe(true);
    expect(await readLifecycle(`__logout__:${accountId}`)).toMatchObject({ phase: "fence-committed" });
  });

  it("does not rewrite cleanup-pending back to fence-committed", async () => {
    const record = logoutRecord({ phase: "cleanup-pending" });
    await writeLifecycle([
      [accountId, 2],
      [LAST_CONFIRMED_ACCOUNT_KEY, accountId],
      [`__logout__:${accountId}`, record],
    ]);

    await expect(commitFence(accountId, operationId, 2)).resolves.toBe(true);

    expect(await readLifecycle(`__logout__:${accountId}`)).toEqual(record);
    expect(await readLifecycle(LAST_CONFIRMED_ACCOUNT_KEY)).toBeUndefined();
  });

  it("treats an already fence-committed record as success without changing phase", async () => {
    const record = logoutRecord({ phase: "fence-committed" });
    await writeLifecycle([
      [accountId, 2],
      [`__logout__:${accountId}`, record],
    ]);

    await expect(commitFence(accountId, operationId, 2)).resolves.toBe(true);
    expect(await readLifecycle(`__logout__:${accountId}`)).toEqual(record);
  });

  it("does not advance logout-pending to fence-committed", async () => {
    const record = logoutRecord({ phase: "logout-pending" });
    await writeLifecycle([
      [accountId, 2],
      [LAST_CONFIRMED_ACCOUNT_KEY, accountId],
      [`__logout__:${accountId}`, record],
    ]);

    await expect(commitFence(accountId, operationId, 2)).resolves.toBe(false);

    expect(await readLifecycle(`__logout__:${accountId}`)).toEqual(record);
    expect(await readLifecycle(LAST_CONFIRMED_ACCOUNT_KEY)).toBe(accountId);
  });
});

describe("completeDayLogCacheLogout", () => {
  it("does not report fenceCommitted when the fence-committed transaction aborts", async () => {
    const originalPut = MemoryObjectStore.prototype.put;
    MemoryObjectStore.prototype.put = function putAndAbortFenceCommit(this: MemoryObjectStore, value, key) {
      const request = originalPut.call(this, value, key);
      if (value && typeof value === "object" && "phase" in value && value.phase === "fence-committed") {
        queueMicrotask(() => this.transaction.abort());
      }
      return request;
    };

    try {
      await writeLifecycle([
        [accountId, 1],
        [LAST_CONFIRMED_ACCOUNT_KEY, accountId],
        [`__logout__:${accountId}`, logoutRecord()],
      ]);

      await expect(completeDayLogCacheLogout(accountId, operationId)).resolves.toMatchObject({
        serverLogoutConfirmed: true,
        fenceCommitted: false,
        cleanupPending: true,
      });
      expect(await readLifecycle(`__logout__:${accountId}`)).toMatchObject({
        phase: "server-logout-confirmed",
      });
      expect(await readLifecycle(accountId)).toBe(2);
    } finally {
      MemoryObjectStore.prototype.put = originalPut;
    }
  });

  it("resumes cleanup without rewinding a cleanup-pending record", async () => {
    await writeLifecycle([
      [accountId, 2],
      [`__logout__:${accountId}`, logoutRecord({ phase: "cleanup-pending" })],
    ]);

    await expect(completeDayLogCacheLogout(accountId, operationId)).resolves.toMatchObject({
      serverLogoutConfirmed: true,
      fenceCommitted: true,
      cleanupPending: false,
    });
    expect(await readLifecycle(`__logout__:${accountId}`)).toBeUndefined();
  });

  it("reports already-resolved cleanup as success when the logout record is gone", async () => {
    await writeLifecycle([[accountId, 2]]);

    await expect(completeDayLogCacheLogout(accountId, operationId)).resolves.toEqual({
      serverLogoutConfirmed: true,
      fenceCommitted: true,
      cleanupPending: false,
    });
  });

  it("does not treat a different operation's logout record as already resolved", async () => {
    await writeLifecycle([
      [accountId, 2],
      [`__logout__:${accountId}`, logoutRecord({ operationId: "other-operation" })],
    ]);

    await expect(completeDayLogCacheLogout(accountId, operationId)).resolves.toMatchObject({
      serverLogoutConfirmed: false,
      fenceCommitted: false,
      cleanupPending: true,
    });
    expect(await readLifecycle(`__logout__:${accountId}`)).toMatchObject({
      operationId: "other-operation",
    });
  });
});

describe("removeStoredDayLogsSnapshot", () => {
  it("treats an already-missing snapshot as successful cleanup", async () => {
    await writeLifecycle([
      [accountId, 2],
      [`__logout__:${accountId}`, logoutRecord({ phase: "cleanup-pending" })],
    ]);

    await expect(removeStoredDayLogsSnapshot(accountId, operationId)).resolves.toBe(true);

    expect(await readLifecycle(`__logout__:${accountId}`)).toBeUndefined();
    expect(await readSnapshot(accountId)).toBeUndefined();
  });

  it("treats an already-missing logout record as successful cleanup without deleting a later snapshot", async () => {
    await writeLifecycle([[accountId, 2]]);
    await writeSnapshot(accountId, 2, persistedClient);

    await expect(removeStoredDayLogsSnapshot(accountId, operationId)).resolves.toBe(true);

    expect(await readSnapshot(accountId)).toMatchObject({ accountId, generation: 2 });
  });

  it("does not resolve a different operation's cleanup-pending record", async () => {
    const record = logoutRecord({ phase: "cleanup-pending", operationId: "other-operation" });
    await writeLifecycle([
      [accountId, 2],
      [`__logout__:${accountId}`, record],
    ]);
    await writeSnapshot(accountId, 2, persistedClient);

    await expect(removeStoredDayLogsSnapshot(accountId, operationId)).resolves.toBe(false);

    expect(await readLifecycle(`__logout__:${accountId}`)).toEqual(record);
    expect(await readSnapshot(accountId)).toMatchObject({ accountId, generation: 2 });
  });
});
