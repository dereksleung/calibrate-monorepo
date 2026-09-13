import {
  DAY_LOG_CACHE_BROADCAST_CHANNEL,
  DAY_LOG_CACHE_LIFECYCLE_STORE,
  DAY_LOG_CACHE_SNAPSHOT_STORE,
  LAST_CONFIRMED_ACCOUNT_KEY,
  isGeneration,
  isLogoutRecord,
  logoutRecordKey,
  readCurrentConfirmedAccount,
  requestResult,
  transactionComplete,
  withDatabase,
  type DayLogCacheRevocation,
  type LogoutRecord,
} from "./indexed-db-day-log-cache-internal.ts";

export type {
  DayLogCacheRevocation,
  LogoutPhase,
  LogoutRecord,
} from "./indexed-db-day-log-cache-internal.ts";

const MAX_FENCE_ATTEMPTS = 3;

export type DayLogCacheLogoutCompletion = {
  serverLogoutConfirmed: boolean;
  fenceCommitted: boolean;
  cleanupPending: boolean;
  revocation?: DayLogCacheRevocation;
};

function createLogoutOperationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export async function beginDayLogCacheLogout(
  accountId: string,
  operationId = createLogoutOperationId(),
): Promise<LogoutRecord | undefined> {
  try {
    return await withDatabase(async (database) => {
      const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readwrite");
      const completed = transactionComplete(transaction);
      const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
      const existing = await requestResult(lifecycle.get(logoutRecordKey(accountId)));
      if (existing !== undefined) {
        if (!isLogoutRecord(existing) || existing.accountId !== accountId) {
          throw new Error("IndexedDB cache logout record is corrupt");
        }
        await completed;
        return existing;
      }
      const record: LogoutRecord = { accountId, operationId, phase: "logout-pending" };
      lifecycle.put(record, logoutRecordKey(accountId));
      await completed;
      return record;
    });
  } catch {
    return undefined;
  }
}

export async function clearPendingDayLogCacheLogout(
  accountId: string,
  operationId: string,
): Promise<boolean> {
  try {
    return await withDatabase(async (database) => {
      const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readwrite");
      const completed = transactionComplete(transaction);
      const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
      const existing = await requestResult(lifecycle.get(logoutRecordKey(accountId)));
      const matches =
        isLogoutRecord(existing) &&
        existing.accountId === accountId &&
        existing.operationId === operationId &&
        existing.phase === "logout-pending";
      if (matches) lifecycle.delete(logoutRecordKey(accountId));
      await completed;
      return matches;
    });
  } catch {
    return false;
  }
}

async function recordServerLogoutConfirmed(
  accountId: string,
  operationId: string,
): Promise<LogoutRecord | "already-resolved" | undefined> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readwrite");
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const [existing, storedGeneration] = await Promise.all([
      requestResult(lifecycle.get(logoutRecordKey(accountId))),
      requestResult(lifecycle.get(accountId)),
    ]);
    if (existing === undefined) {
      await completed;
      return "already-resolved";
    }
    if (
      !isLogoutRecord(existing) ||
      existing.accountId !== accountId ||
      existing.operationId !== operationId
    ) {
      await completed;
      return undefined;
    }
    if (existing.phase !== "logout-pending") {
      await completed;
      return existing;
    }
    const targetGeneration = (isGeneration(storedGeneration) ? storedGeneration : 0) + 1;
    const record: LogoutRecord = { ...existing, phase: "server-logout-confirmed", targetGeneration };
    lifecycle.put(record, logoutRecordKey(accountId));
    await completed;
    return record;
  });
}

async function advanceGenerationToTarget(
  accountId: string,
  targetGeneration: number,
): Promise<number | undefined> {
  for (let attempt = 0; attempt < MAX_FENCE_ATTEMPTS; attempt += 1) {
    try {
      await withDatabase(async (database) => {
        const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readwrite");
        const completed = transactionComplete(transaction);
        const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
        const storedGeneration = await requestResult(lifecycle.get(accountId));
        const generation = isGeneration(storedGeneration) ? storedGeneration : 0;
        lifecycle.put(Math.max(generation, targetGeneration), accountId);
        await completed;
      });
      const storedGeneration = await withDatabase(async (database) => {
        const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readonly");
        const completed = transactionComplete(transaction);
        const generation = await requestResult(
          transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE).get(accountId),
        );
        await completed;
        return generation;
      });
      if (isGeneration(storedGeneration) && storedGeneration >= targetGeneration) return storedGeneration;
    } catch {
      // Each attempt opens a fresh transaction. An aborted transaction is never reused.
    }
  }
  return undefined;
}

export async function commitFence(
  accountId: string,
  operationId: string,
  targetGeneration: number,
): Promise<boolean> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readwrite");
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const [existing, currentAccount, storedGeneration] = await Promise.all([
      requestResult(lifecycle.get(logoutRecordKey(accountId))),
      requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY)),
      requestResult(lifecycle.get(accountId)),
    ]);
    let committed = false;
    if (
      isLogoutRecord(existing) &&
      existing.accountId === accountId &&
      existing.operationId === operationId &&
      existing.targetGeneration === targetGeneration &&
      isGeneration(storedGeneration) &&
      storedGeneration >= targetGeneration
    ) {
      if (existing.phase === "server-logout-confirmed") {
        lifecycle.put(
          { ...existing, phase: "fence-committed" } satisfies LogoutRecord,
          logoutRecordKey(accountId),
        );
        committed = true;
      } else if (existing.phase === "fence-committed" || existing.phase === "cleanup-pending") {
        committed = true;
      }
      if (committed && readCurrentConfirmedAccount(currentAccount) === accountId) {
        lifecycle.delete(LAST_CONFIRMED_ACCOUNT_KEY);
      }
    }
    await completed;
    return committed;
  });
}

async function markCleanupPending(accountId: string, operationId: string): Promise<LogoutRecord | undefined> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readwrite");
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const existing = await requestResult(lifecycle.get(logoutRecordKey(accountId)));
    if (
      !isLogoutRecord(existing) ||
      existing.accountId !== accountId ||
      existing.operationId !== operationId
    ) {
      await completed;
      return undefined;
    }
    if (existing.phase === "cleanup-pending") {
      await completed;
      return existing;
    }
    if (existing.phase !== "fence-committed") {
      await completed;
      return undefined;
    }
    const record: LogoutRecord = { ...existing, phase: "cleanup-pending" };
    lifecycle.put(record, logoutRecordKey(accountId));
    await completed;
    return record;
  });
}

export async function removeStoredDayLogsSnapshot(accountId: string, operationId: string): Promise<boolean> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
      "readwrite",
    );
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const existing = await requestResult(lifecycle.get(logoutRecordKey(accountId)));
    if (existing === undefined) {
      await completed;
      return true;
    }
    const matches =
      isLogoutRecord(existing) &&
      existing.accountId === accountId &&
      existing.operationId === operationId &&
      existing.phase === "cleanup-pending";
    if (matches) {
      transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).delete(accountId);
      lifecycle.delete(logoutRecordKey(accountId));
    }
    await completed;
    return matches;
  });
}

export async function completeDayLogCacheLogout(
  accountId: string,
  operationId: string,
): Promise<DayLogCacheLogoutCompletion> {
  let record: LogoutRecord | "already-resolved" | undefined;
  try {
    record = await recordServerLogoutConfirmed(accountId, operationId);
  } catch {
    return { serverLogoutConfirmed: false, fenceCommitted: false, cleanupPending: true };
  }
  if (record === "already-resolved") {
    return { serverLogoutConfirmed: true, fenceCommitted: true, cleanupPending: false };
  }
  if (!record || record.targetGeneration === undefined) {
    return { serverLogoutConfirmed: false, fenceCommitted: false, cleanupPending: true };
  }
  const generation = await advanceGenerationToTarget(accountId, record.targetGeneration);
  if (generation === undefined) {
    return { serverLogoutConfirmed: true, fenceCommitted: false, cleanupPending: true };
  }
  let fenceCommitted = false;
  try {
    fenceCommitted = await commitFence(accountId, operationId, record.targetGeneration);
    if (!fenceCommitted) {
      return { serverLogoutConfirmed: true, fenceCommitted: false, cleanupPending: true };
    }
    await markCleanupPending(accountId, operationId);
    const cleaned = await removeStoredDayLogsSnapshot(accountId, operationId);
    return {
      serverLogoutConfirmed: true,
      fenceCommitted: true,
      cleanupPending: !cleaned,
      revocation: { accountId, generation },
    };
  } catch {
    return {
      serverLogoutConfirmed: true,
      fenceCommitted,
      cleanupPending: true,
      revocation: fenceCommitted ? { accountId, generation } : undefined,
    };
  }
}

export async function retryDayLogCacheLogoutRecovery(
  accountId: string,
  operationId: string,
): Promise<boolean> {
  const completion = await completeDayLogCacheLogout(accountId, operationId);
  return completion.fenceCommitted && !completion.cleanupPending;
}

export async function getDayLogCacheLogoutRecoveryPending(): Promise<LogoutRecord[]> {
  try {
    return await withDatabase(async (database) => {
      const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readonly");
      const completed = transactionComplete(transaction);
      const values = await requestResult(transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE).getAll());
      await completed;
      return values.filter(
        (value): value is LogoutRecord =>
          isLogoutRecord(value) &&
          value.targetGeneration !== undefined &&
          (value.phase === "server-logout-confirmed" ||
            value.phase === "fence-committed" ||
            value.phase === "cleanup-pending"),
      );
    });
  } catch {
    return [];
  }
}

export async function revokeDayLogCache(accountId: string): Promise<DayLogCacheRevocation | undefined> {
  const record = await beginDayLogCacheLogout(accountId);
  if (!record) return undefined;
  return (await completeDayLogCacheLogout(accountId, record.operationId)).revocation;
}

export async function revokeLastConfirmedDayLogCache(): Promise<DayLogCacheRevocation | undefined> {
  try {
    const accountId = await withDatabase(async (database) => {
      const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readonly");
      const completed = transactionComplete(transaction);
      const current = await requestResult(
        transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE).get(LAST_CONFIRMED_ACCOUNT_KEY),
      );
      await completed;
      return readCurrentConfirmedAccount(current);
    });
    return accountId ? await revokeDayLogCache(accountId) : undefined;
  } catch {
    return undefined;
  }
}

export function broadcastDayLogCacheRevocation(revocation: DayLogCacheRevocation | undefined): void {
  if (!revocation || typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(DAY_LOG_CACHE_BROADCAST_CHANNEL);
    channel.postMessage({ type: "revoked", ...revocation });
    channel.close();
  } catch {
    // The durable fence remains the correctness boundary when broadcast is unavailable.
  }
}
