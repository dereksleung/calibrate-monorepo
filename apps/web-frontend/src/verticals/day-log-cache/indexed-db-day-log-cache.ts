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
const LAST_CONFIRMED_ACCOUNT_KEY = "__last-confirmed-account__";
const LOGOUT_RECORD_KEY_PREFIX = "__logout__:";
const MAX_FENCE_ATTEMPTS = 3;

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

export type LogoutPhase =
  | "logout-pending"
  | "server-logout-confirmed"
  | "fence-committed"
  | "cleanup-pending"
  | "resolved";

export type LogoutRecord = {
  accountId: string;
  operationId: string;
  phase: LogoutPhase;
  targetGeneration?: number;
};

export type DayLogCacheLogoutCompletion = {
  serverLogoutConfirmed: boolean;
  fenceCommitted: boolean;
  cleanupPending: boolean;
  revocation?: DayLogCacheRevocation;
};

export type DayLogCacheAccountConfirmation = {
  accepted: boolean;
  revocations: DayLogCacheRevocation[];
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

function logoutRecordKey(accountId: string): string {
  return `${LOGOUT_RECORD_KEY_PREFIX}${accountId}`;
}

function isLogoutPhase(value: unknown): value is LogoutPhase {
  return (
    value === "logout-pending" ||
    value === "server-logout-confirmed" ||
    value === "fence-committed" ||
    value === "cleanup-pending" ||
    value === "resolved"
  );
}

function isLogoutRecord(value: unknown): value is LogoutRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LogoutRecord>;
  return (
    isAccountId(candidate.accountId) &&
    typeof candidate.operationId === "string" &&
    candidate.operationId.length > 0 &&
    isLogoutPhase(candidate.phase) &&
    (candidate.targetGeneration === undefined || isGeneration(candidate.targetGeneration))
  );
}

function isCacheBlockedByLogoutRecord(value: unknown, accountId: string): boolean {
  if (value === undefined) return false;
  if (!isLogoutRecord(value) || value.accountId !== accountId) {
    throw new Error("IndexedDB cache logout record is corrupt");
  }
  return value.phase !== "resolved";
}

function isLeaseRevokedByLogoutRecord(value: unknown, accountId: string): boolean {
  if (value === undefined) return false;
  if (!isLogoutRecord(value) || value.accountId !== accountId) {
    throw new Error("IndexedDB cache logout record is corrupt");
  }
  return value.phase !== "logout-pending" && value.phase !== "resolved";
}

function readCurrentConfirmedAccount(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (isAccountId(value)) return value;
  if (!Array.isArray(value) || value.some((accountId) => !isAccountId(accountId))) {
    throw new Error("IndexedDB cache account state is corrupt");
  }
  return value.at(-1);
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
    const storedCurrentAccount = await requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY));
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
          const [storedGeneration, storedConfirmedAccount, storedLogoutRecord] = await Promise.all([
            requestResult(lifecycle.get(accountId)),
            requestResult(lifecycle.get(LAST_CONFIRMED_ACCOUNT_KEY)),
            requestResult(lifecycle.get(logoutRecordKey(accountId))),
          ]);
          await completed;
          return (
            storedGeneration === generation &&
            readCurrentConfirmedAccount(storedConfirmedAccount) === accountId &&
            !isLeaseRevokedByLogoutRecord(storedLogoutRecord, accountId)
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

async function removeStoredDayLogsSnapshot(accountId: string, operationId: string): Promise<boolean> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
      "readwrite",
    );
    const completed = transactionComplete(transaction);
    const lifecycle = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
    const existing = await requestResult(lifecycle.get(logoutRecordKey(accountId)));
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
    const cleanupRecord = await markCleanupPending(accountId, operationId);
    const cleaned = cleanupRecord ? await removeStoredDayLogsSnapshot(accountId, operationId) : false;
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
