import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DAY_LOG_CACHE_DATABASE_NAME,
  DAY_LOG_CACHE_LIFECYCLE_STORE,
  DAY_LOG_CACHE_SNAPSHOT_STORE,
  commitFence,
  completeDayLogCacheLogout,
  type LogoutRecord,
} from "./indexed-db-day-log-cache.ts";

const LAST_CONFIRMED_ACCOUNT_KEY = "__last-confirmed-account__";
const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
const operationId = "logout-operation";

type StoreMap = Map<IDBValidKey, unknown>;

class MemoryIDBRequest<T> {
  result = undefined as T;
  error: DOMException | null = null;
  #listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, listener: () => void, options?: { once?: boolean }) {
    const wrapped = options?.once
      ? () => {
          this.#remove(type, wrapped);
          listener();
        }
      : listener;
    const listeners = this.#listeners.get(type) ?? [];
    listeners.push(wrapped);
    this.#listeners.set(type, listeners);
  }

  dispatch(type: string) {
    for (const listener of [...(this.#listeners.get(type) ?? [])]) listener();
  }

  #remove(type: string, listener: () => void) {
    this.#listeners.set(
      type,
      (this.#listeners.get(type) ?? []).filter((candidate) => candidate !== listener),
    );
  }
}

class MemoryObjectStore {
  constructor(
    readonly transaction: MemoryTransaction,
    readonly name: string,
    readonly data: StoreMap,
  ) {}

  get(key: IDBValidKey) {
    return this.transaction.enqueue(() => this.data.get(key));
  }

  put(value: unknown, key?: IDBValidKey) {
    const recordKey = key ?? (value as { key?: IDBValidKey }).key;
    if (recordKey === undefined) throw new Error("Memory IndexedDB put requires a key");
    return this.transaction.enqueue(() => {
      this.data.set(recordKey, value);
      return recordKey;
    });
  }

  delete(key: IDBValidKey) {
    return this.transaction.enqueue(() => {
      this.data.delete(key);
    });
  }
}

class MemoryTransaction {
  error: DOMException | null = null;
  #pending = 0;
  #finished = false;
  #listeners = new Map<string, Array<() => void>>();
  #stores: Map<string, MemoryObjectStore>;

  constructor(
    storeNames: string[],
    private readonly commit: (stores: Map<string, StoreMap>) => void,
    snapshots: Map<string, StoreMap>,
  ) {
    this.#stores = new Map(
      storeNames.map((name) => [name, new MemoryObjectStore(this, name, snapshots.get(name) ?? new Map())]),
    );
  }

  objectStore(name: string) {
    const store = this.#stores.get(name);
    if (!store) throw new Error(`Unknown object store ${name}`);
    return store;
  }

  addEventListener(type: string, listener: () => void, options?: { once?: boolean }) {
    const wrapped = options?.once
      ? () => {
          this.#remove(type, wrapped);
          listener();
        }
      : listener;
    const listeners = this.#listeners.get(type) ?? [];
    listeners.push(wrapped);
    this.#listeners.set(type, listeners);
  }

  abort() {
    if (this.#finished) return;
    this.#finished = true;
    this.error = this.error ?? new DOMException("The transaction was aborted.", "AbortError");
    queueMicrotask(() => this.#dispatch("abort"));
  }

  enqueue<T>(operation: () => T) {
    if (this.#finished) throw new DOMException("The transaction has finished.", "InvalidStateError");
    this.#pending += 1;
    const request = new MemoryIDBRequest<T>();
    queueMicrotask(() => {
      if (this.#finished) {
        request.error = this.error;
        request.dispatch("error");
        return;
      }
      try {
        request.result = operation();
        request.dispatch("success");
      } catch (error) {
        request.error = error instanceof DOMException ? error : new DOMException(String(error));
        this.error = request.error;
        request.dispatch("error");
        this.abort();
        return;
      }
      this.#pending -= 1;
      this.#scheduleComplete();
    });
    return request;
  }

  #scheduleComplete() {
    if (this.#finished) return;
    // Keep the transaction alive across Promise `await` continuations, matching
    // browser IndexedDB's microtask checkpoint, then complete on the next turn.
    setImmediate(() => {
      if (this.#pending !== 0 || this.#finished) return;
      this.#finished = true;
      this.commit(new Map([...this.#stores].map(([name, store]) => [name, store.data])));
      this.#dispatch("complete");
    });
  }

  #dispatch(type: string) {
    for (const listener of [...(this.#listeners.get(type) ?? [])]) listener();
  }

  #remove(type: string, listener: () => void) {
    this.#listeners.set(
      type,
      (this.#listeners.get(type) ?? []).filter((candidate) => candidate !== listener),
    );
  }
}

class MemoryDatabase {
  constructor(private readonly state: { version: number; stores: Map<string, StoreMap> }) {}

  get objectStoreNames() {
    return {
      contains: (name: string) => this.state.stores.has(name),
    };
  }

  createObjectStore(name: string) {
    if (!this.state.stores.has(name)) this.state.stores.set(name, new Map());
    return new MemoryObjectStore(
      new MemoryTransaction([name], () => undefined, new Map([[name, this.state.stores.get(name)!]])),
      name,
      this.state.stores.get(name)!,
    );
  }

  transaction(storeNames: string | string[]) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const snapshots = new Map(names.map((name) => [name, new Map(this.state.stores.get(name) ?? new Map())]));
    return new MemoryTransaction(
      names,
      (committed) => {
        for (const [name, data] of committed) this.state.stores.set(name, data);
      },
      snapshots,
    );
  }

  close() {}
}

function installMemoryIndexedDB() {
  const databases = new Map<string, { version: number; stores: Map<string, StoreMap> }>();
  const indexedDB = {
    open(name: string, version = 1) {
      const request = new MemoryIDBRequest<MemoryDatabase>();
      queueMicrotask(() => {
        let state = databases.get(name);
        if (!state) {
          state = { version: 0, stores: new Map() };
          databases.set(name, state);
        }
        const database = new MemoryDatabase(state);
        if (state.version < version) {
          state.version = version;
          request.result = database;
          request.dispatch("upgradeneeded");
        }
        request.result = database;
        request.dispatch("success");
      });
      return request;
    },
    deleteDatabase(name: string) {
      const request = new MemoryIDBRequest<undefined>();
      queueMicrotask(() => {
        databases.delete(name);
        request.dispatch("success");
      });
      return request;
    },
  };
  vi.stubGlobal("indexedDB", indexedDB);
}

async function openDatabase() {
  return new Promise<MemoryDatabase>((resolve, reject) => {
    const request = indexedDB.open(DAY_LOG_CACHE_DATABASE_NAME, 1);
    request.addEventListener(
      "upgradeneeded",
      () => {
        const database = request.result as unknown as MemoryDatabase;
        if (!database.objectStoreNames.contains(DAY_LOG_CACHE_LIFECYCLE_STORE)) {
          database.createObjectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
        }
        if (!database.objectStoreNames.contains(DAY_LOG_CACHE_SNAPSHOT_STORE)) {
          database.createObjectStore(DAY_LOG_CACHE_SNAPSHOT_STORE);
        }
      },
      { once: true },
    );
    request.addEventListener("success", () => resolve(request.result as unknown as MemoryDatabase), {
      once: true,
    });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB open failed")), {
      once: true,
    });
  });
}

function transactionComplete(transaction: MemoryTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      { once: true },
    );
  });
}

async function writeLifecycle(entries: Array<[string, unknown]>) {
  const database = await openDatabase();
  const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE);
  const store = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE);
  for (const [key, value] of entries) store.put(value, key);
  await transactionComplete(transaction);
  database.close();
}

async function readLifecycle(key: string) {
  const database = await openDatabase();
  const transaction = database.transaction(DAY_LOG_CACHE_LIFECYCLE_STORE);
  const request = transaction.objectStore(DAY_LOG_CACHE_LIFECYCLE_STORE).get(key);
  const value = await new Promise<unknown>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")), {
      once: true,
    });
  });
  await transactionComplete(transaction);
  database.close();
  return value;
}

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
});
