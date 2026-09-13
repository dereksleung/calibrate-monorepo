/** IndexedDB store helpers shared by the lease and logout modules. Do not import from app callers. */

export const DAY_LOG_CACHE_DATABASE_NAME = "calibrate-private-day-log-cache";
export const DAY_LOG_CACHE_SNAPSHOT_STORE = "persistedClients";
export const DAY_LOG_CACHE_LIFECYCLE_STORE = "cacheLifecycle";
export const DAY_LOG_CACHE_BROADCAST_CHANNEL = "calibrate-private-day-log-cache-lifecycle";

export const LAST_CONFIRMED_ACCOUNT_KEY = "__last-confirmed-account__";
export const LOGOUT_RECORD_KEY_PREFIX = "__logout__:";

const DATABASE_VERSION = 1;

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

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")), {
      once: true,
    });
  });
}

export function transactionComplete(transaction: IDBTransaction): Promise<void> {
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

export async function withDatabase<T>(operation: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    database.close();
  }
}

export function isGeneration(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function isAccountId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function logoutRecordKey(accountId: string): string {
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

export function isLogoutRecord(value: unknown): value is LogoutRecord {
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

export function readCurrentConfirmedAccount(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (isAccountId(value)) return value;
  if (!Array.isArray(value) || value.some((accountId) => !isAccountId(accountId))) {
    throw new Error("IndexedDB cache account state is corrupt");
  }
  return value.at(-1);
}
