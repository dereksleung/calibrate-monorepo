import {
  isPersistedDayLogClient,
  prunePersistedDayLogClient,
  type PersistedDayLogClient,
} from "./day-log-cache.ts";
import {
  DAY_LOG_CACHE_LIFECYCLE_STORE,
  DAY_LOG_CACHE_SNAPSHOT_STORE,
  LAST_CONFIRMED_ACCOUNT_KEY,
  LOGOUT_RECORD_KEY_PREFIX,
  isAccountId,
  isGeneration,
  isLogoutRecord,
  logoutRecordKey,
  readCurrentConfirmedAccount,
  requestResult,
  transactionComplete,
  withDatabase,
  type DayLogCacheRevocation,
} from "./indexed-db-day-log-cache-internal.ts";

export {
  DAY_LOG_CACHE_BROADCAST_CHANNEL,
  DAY_LOG_CACHE_DATABASE_NAME,
  DAY_LOG_CACHE_LIFECYCLE_STORE,
  DAY_LOG_CACHE_SNAPSHOT_STORE,
  type DayLogCacheRevocation,
} from "./indexed-db-day-log-cache-internal.ts";

type SnapshotRecord = {
  accountId: string;
  generation: number;
  persistedClient: PersistedDayLogClient;
};

export type DayLogCacheAccess = {
  accountId: string;
  generation: number;
  isCurrent: () => Promise<boolean>;
  persistClient: (client: PersistedDayLogClient) => Promise<void>;
  removeClient: () => Promise<void>;
  restoreClient: () => Promise<PersistedDayLogClient | undefined>;
};

export type DayLogCacheAccountConfirmation = {
  accepted: boolean;
  revocations: DayLogCacheRevocation[];
};

function isCacheBlockedByLogoutRecord(value: unknown, accountId: string): boolean {
  if (value === undefined) return false;
  if (!isLogoutRecord(value) || value.accountId !== accountId) {
    throw new Error("IndexedDB cache logout record is corrupt");
  }
  return value.phase !== "resolved";
}

function isCacheAccessRevokedByLogoutRecord(value: unknown, accountId: string): boolean {
  if (value === undefined) return false;
  if (!isLogoutRecord(value) || value.accountId !== accountId) {
    throw new Error("IndexedDB cache logout record is corrupt");
  }
  return value.phase !== "logout-pending" && value.phase !== "resolved";
}

function isSnapshotRecord(value: unknown): value is SnapshotRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SnapshotRecord>;
  return (
    typeof candidate.accountId === "string" &&
    isGeneration(candidate.generation) &&
    isPersistedDayLogClient(candidate.persistedClient)
  );
}

async function acquireDurableCacheAccess(accountId: string): Promise<{
  generation: number;
}> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
      "readwrite",
    );
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const [storedGeneration, storedConfirmedAccount, snapshot] = await Promise.all([
      requestResult(lifecycle.get(accountId)),
      requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY)),
      requestResult(transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).get(accountId)),
    ]);
    const generation = isGeneration(storedGeneration) ? storedGeneration : 0;
    if (!isGeneration(storedGeneration)) {
      if (storedGeneration !== undefined || snapshot !== undefined) {
        throw new Error("IndexedDB cache lifecycle is corrupt");
      }
      lifecycle.put(generation, accountId);
    }

    const currentAccountId = readCurrentConfirmedAccount(storedConfirmedAccount);
    if (currentAccountId === undefined) {
      lifecycle.put(accountId, LAST_CONFIRMED_ACCOUNT_KEY);
    } else if (Array.isArray(storedConfirmedAccount)) {
      lifecycle.put(currentAccountId, LAST_CONFIRMED_ACCOUNT_KEY);
    }

    await completed;
    return { generation };
  });
}

async function confirmDurableAccount(
  accountId: string,
  previousAccountId: string | undefined,
  allowCurrentAccountTransition: boolean,
): Promise<DayLogCacheAccountConfirmation> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
      "readwrite",
    );
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const [storedCurrentAccount, storedLogoutRecord] = await Promise.all([
      requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY)),
      requestResult(lifecycle.get(logoutRecordKey(accountId))),
    ]);
    const currentAccountId = readCurrentConfirmedAccount(storedCurrentAccount);
    if (
      currentAccountId !== undefined &&
      currentAccountId !== accountId &&
      currentAccountId !== previousAccountId &&
      !allowCurrentAccountTransition
    ) {
      await completed;
      return { accepted: false, revocations: [] };
    }

    const lifecycleKeys = await requestResult(lifecycle.getAllKeys());
    const accountIds = lifecycleKeys.filter(
      (key): key is string =>
        isAccountId(key) && key !== LAST_CONFIRMED_ACCOUNT_KEY && !key.startsWith(LOGOUT_RECORD_KEY_PREFIX),
    );
    const storedGenerations = await Promise.all(
      accountIds.map(async (storedAccountId) => ({
        accountId: storedAccountId,
        generation: await requestResult(lifecycle.get(storedAccountId)),
      })),
    );
    const snapshots = transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE);
    const revocations: DayLogCacheRevocation[] = [];
    for (const { accountId: storedAccountId, generation: storedGeneration } of storedGenerations) {
      if (storedAccountId === accountId) continue;
      if (!isGeneration(storedGeneration)) {
        throw new Error("IndexedDB cache lifecycle is corrupt");
      }
      const generation = storedGeneration + 1;
      lifecycle.put(generation, storedAccountId);
      snapshots.delete(storedAccountId);
      revocations.push({ accountId: storedAccountId, generation });
    }
    if (isCacheAccessRevokedByLogoutRecord(storedLogoutRecord, accountId)) {
      snapshots.clear();
      lifecycle.delete(logoutRecordKey(accountId));
    }
    lifecycle.put(accountId, LAST_CONFIRMED_ACCOUNT_KEY);
    await completed;
    return { accepted: true, revocations };
  });
}

export async function confirmDayLogCacheAccount(
  accountId: string,
  previousAccountId: string | undefined,
  allowCurrentAccountTransition = false,
): Promise<DayLogCacheAccountConfirmation> {
  try {
    return await confirmDurableAccount(accountId, previousAccountId, allowCurrentAccountTransition);
  } catch {
    return {
      accepted: previousAccountId === undefined || previousAccountId === accountId,
      revocations: [],
    };
  }
}

function createNoOpCacheAccess(accountId: string): DayLogCacheAccess {
  return {
    accountId,
    generation: 0,
    isCurrent: async () => true,
    persistClient: async () => undefined,
    removeClient: async () => undefined,
    restoreClient: async () => undefined,
  };
}

export async function acquireDayLogCacheAccess(accountId: string): Promise<DayLogCacheAccess> {
  let acquisition: Awaited<ReturnType<typeof acquireDurableCacheAccess>>;
  try {
    acquisition = await acquireDurableCacheAccess(accountId);
  } catch {
    return createNoOpCacheAccess(accountId);
  }
  const { generation } = acquisition;

  return {
    accountId,
    generation,
    isCurrent: async () => {
      try {
        return await withDatabase(async (database) => {
          const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE, "readonly");
          const completed = transactionComplete(transaction);
          const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
          const [storedGeneration, storedConfirmedAccount, storedLogoutRecord] = await Promise.all([
            requestResult(lifecycle.get(accountId)),
            requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY)),
            requestResult(lifecycle.get(logoutRecordKey(accountId))),
          ]);
          await completed;
          return (
            storedGeneration === generation &&
            readCurrentConfirmedAccount(storedConfirmedAccount) === accountId &&
            !isCacheAccessRevokedByLogoutRecord(storedLogoutRecord, accountId)
          );
        });
      } catch {
        // Losing optional storage does not prove revocation. Persist remains
        // transactionally fenced and will no-op while the database is unavailable.
        return true;
      }
    },
    persistClient: async (persistedClient) => {
      const prunedClient = prunePersistedDayLogClient(persistedClient, accountId);
      if (!prunedClient) return;
      try {
        await withDatabase(async (database) => {
          const transaction = database.transaction(
            [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
            "readwrite",
          );
          const completed = transactionComplete(transaction);
          const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
          const [storedGeneration, storedCurrentAccount, storedLogoutRecord] = await Promise.all([
            requestResult(lifecycle.get(accountId)),
            requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY)),
            requestResult(lifecycle.get(logoutRecordKey(accountId))),
          ]);
          if (
            storedGeneration === generation &&
            readCurrentConfirmedAccount(storedCurrentAccount) === accountId &&
            !isCacheBlockedByLogoutRecord(storedLogoutRecord, accountId)
          ) {
            const record: SnapshotRecord = { accountId, generation, persistedClient: prunedClient };
            transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).put(record, accountId);
          }
          await completed;
        });
      } catch {
        // Persistence is optional. Queries and rendering continue using memory.
      }
    },
    removeClient: async () => {
      try {
        await withDatabase(async (database) => {
          const transaction = database.transaction(
            [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
            "readwrite",
          );
          const completed = transactionComplete(transaction);
          const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
          const [storedGeneration, storedCurrentAccount, storedLogoutRecord] = await Promise.all([
            requestResult(lifecycle.get(accountId)),
            requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY)),
            requestResult(lifecycle.get(logoutRecordKey(accountId))),
          ]);
          if (
            storedGeneration === generation &&
            readCurrentConfirmedAccount(storedCurrentAccount) === accountId &&
            !isCacheBlockedByLogoutRecord(storedLogoutRecord, accountId)
          ) {
            transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).delete(accountId);
          }
          await completed;
        });
      } catch {
        // Removing an unavailable optional cache must not break the application.
      }
    },
    restoreClient: async () => {
      try {
        return await withDatabase(async (database) => {
          const transaction = database.transaction(
            [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
            "readonly",
          );
          const completed = transactionComplete(transaction);
          const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
          const lifecycleRequest = lifecycle.get(accountId);
          const currentAccountRequest = lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY);
          const snapshotRequest = transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).get(accountId);
          const [storedGeneration, storedCurrentAccount, storedLogoutRecord, snapshot] = await Promise.all([
            requestResult(lifecycleRequest),
            requestResult(currentAccountRequest),
            requestResult(lifecycle.get(logoutRecordKey(accountId))),
            requestResult(snapshotRequest),
          ]);
          await completed;
          if (
            storedGeneration !== generation ||
            readCurrentConfirmedAccount(storedCurrentAccount) !== accountId ||
            isCacheBlockedByLogoutRecord(storedLogoutRecord, accountId) ||
            !isSnapshotRecord(snapshot) ||
            snapshot.accountId !== accountId ||
            snapshot.generation !== generation
          ) {
            return undefined;
          }
          return prunePersistedDayLogClient(snapshot.persistedClient, accountId);
        });
      } catch {
        return undefined;
      }
    },
  };
}
