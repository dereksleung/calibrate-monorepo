import {
  isPersistedDayLogClient,
  prunePersistedDayLogClient,
  type PersistedDayLogClient,
} from "./day-log-cache.ts";

export const DAY_LOG_CACHE_DATABASE_NAME = "calibrate-private-day-log-cache";
export const DAY_LOG_CACHE_SNAPSHOT_STORE = "persistedClients";
export const DAY_LOG_CACHE_LIFECYCLE_STORE = "cacheLifecycle";
export const DAY_LOG_CACHE_BROADCAST_CHANNEL = "calibrate-private-day-log-cache-lifecycle";

const DATABASE_VERSION = 1;
const LAST_CONFIRMED_ACCOUNTS_KEY = "__last-confirmed-account__";

type SnapshotRecord = {
  accountId: string;
  generation: number;
  persistedClient: PersistedDayLogClient;
};

export type DayLogCacheLease = {
  accountId: string;
  generation: number;
  isCurrent: () => Promise<boolean>;
  persistClient: (client: PersistedDayLogClient) => Promise<void>;
  removeClient: () => Promise<void>;
  restoreClient: () => Promise<PersistedDayLogClient | undefined>;
};

export type DayLogCacheRevocation = {
  accountId: string;
  generation: number;
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")), {
      once: true,
    });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      { once: true },
    );
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DAY_LOG_CACHE_DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener(
      "upgradeneeded",
      () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DAY_LOG_CACHE_SNAPSHOT_STORE)) {
          database.createObjectStore(DAY_LOG_CACHE_SNAPSHOT_STORE);
        }
        if (!database.objectStoreNames.contains(DAY_LOG_CACHE_LIFECYCLE_STORE)) {
          database.createObjectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
        }
      },
      { once: true },
    );
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB open failed")), {
      once: true,
    });
    request.addEventListener("blocked", () => reject(new Error("IndexedDB open was blocked")), {
      once: true,
    });
  });
}

async function withDatabase<T>(operation: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    database.close();
  }
}

function isGeneration(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isAccountId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function readConfirmedAccounts(value: unknown): string[] {
  if (value === undefined) return [];
  if (isAccountId(value)) return [value];
  if (!Array.isArray(value) || value.some((accountId) => !isAccountId(accountId))) {
    throw new Error("IndexedDB cache account state is corrupt");
  }
  return [...new Set(value)];
}

function hasConfirmedAccount(value: unknown, accountId: string): boolean {
  if (isAccountId(value)) return value === accountId;
  return Array.isArray(value) && value.every(isAccountId) && value.includes(accountId);
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

async function acquireDurableLease(accountId: string): Promise<{
  generation: number;
}> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
      "readwrite",
    );
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const [storedGeneration, storedConfirmedAccounts, snapshot] = await Promise.all([
      requestResult(lifecycle.get(accountId)),
      requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNTS_KEY)),
      requestResult(transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).get(accountId)),
    ]);
    const generation = isGeneration(storedGeneration) ? storedGeneration : 0;
    if (!isGeneration(storedGeneration)) {
      if (storedGeneration !== undefined || snapshot !== undefined) {
        throw new Error("IndexedDB cache lifecycle is corrupt");
      }
      lifecycle.put(generation, accountId);
    }

    const confirmedAccounts = readConfirmedAccounts(storedConfirmedAccounts);
    if (!confirmedAccounts.includes(accountId)) {
      lifecycle.put([...confirmedAccounts, accountId], LAST_CONFIRMED_ACCOUNTS_KEY);
    } else if (typeof storedConfirmedAccounts === "string") {
      lifecycle.put(confirmedAccounts, LAST_CONFIRMED_ACCOUNTS_KEY);
    }

    await completed;
    return { generation };
  });
}

function createNoOpLease(accountId: string): DayLogCacheLease {
  return {
    accountId,
    generation: 0,
    isCurrent: async () => true,
    persistClient: async () => undefined,
    removeClient: async () => undefined,
    restoreClient: async () => undefined,
  };
}

export async function acquireDayLogCacheLease(accountId: string): Promise<DayLogCacheLease> {
  let acquisition: Awaited<ReturnType<typeof acquireDurableLease>>;
  try {
    acquisition = await acquireDurableLease(accountId);
  } catch {
    return createNoOpLease(accountId);
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
          const [storedGeneration, storedConfirmedAccounts] = await Promise.all([
            requestResult(lifecycle.get(accountId)),
            requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNTS_KEY)),
          ]);
          await completed;
          return storedGeneration === generation && hasConfirmedAccount(storedConfirmedAccounts, accountId);
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
          const storedGeneration = await requestResult(lifecycle.get(accountId));
          if (storedGeneration === generation) {
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
          const storedGeneration = await requestResult(
            transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE).get(accountId),
          );
          if (storedGeneration === generation) {
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
          const lifecycleRequest = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE).get(accountId);
          const snapshotRequest = transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).get(accountId);
          const [storedGeneration, snapshot] = await Promise.all([
            requestResult(lifecycleRequest),
            requestResult(snapshotRequest),
          ]);
          await completed;
          if (
            storedGeneration !== generation ||
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

async function revokeAccount(accountId: string): Promise<DayLogCacheRevocation> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
      "readwrite",
    );
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const storedGeneration = await requestResult(lifecycle.get(accountId));
    const generation = (isGeneration(storedGeneration) ? storedGeneration : 0) + 1;
    lifecycle.put(generation, accountId);
    const confirmedAccounts = readConfirmedAccounts(
      await requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNTS_KEY)),
    );
    const remainingAccounts = confirmedAccounts.filter((confirmedAccountId) => confirmedAccountId !== accountId);
    if (remainingAccounts.length === 0) {
      lifecycle.delete(LAST_CONFIRMED_ACCOUNTS_KEY);
    } else {
      lifecycle.put(remainingAccounts, LAST_CONFIRMED_ACCOUNTS_KEY);
    }
    transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).delete(accountId);
    await completed;
    return { accountId, generation };
  });
}

async function revokeOnlyConfirmedAccount(): Promise<DayLogCacheRevocation | undefined> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
      "readwrite",
    );
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const confirmedAccounts = readConfirmedAccounts(
      await requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNTS_KEY)),
    );
    if (confirmedAccounts.length !== 1) {
      await completed;
      return undefined;
    }
    const accountId = confirmedAccounts[0];

    const storedGeneration = await requestResult(lifecycle.get(accountId));
    const generation = (isGeneration(storedGeneration) ? storedGeneration : 0) + 1;
    lifecycle.put(generation, accountId);
    lifecycle.delete(LAST_CONFIRMED_ACCOUNTS_KEY);
    transaction.objectStore(DAY_LOG_CACHE_SNAPSHOT_STORE).delete(accountId);
    await completed;
    return { accountId, generation };
  });
}

export async function revokeDayLogCache(accountId: string): Promise<DayLogCacheRevocation | undefined> {
  try {
    return await revokeAccount(accountId);
  } catch {
    return undefined;
  }
}

export async function revokeLastConfirmedDayLogCache(): Promise<DayLogCacheRevocation | undefined> {
  try {
    return await revokeOnlyConfirmedAccount();
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
