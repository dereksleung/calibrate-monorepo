import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { hashKey } from "@tanstack/query-core";

import {
  DAY_LOG_CACHE_DATABASE_NAME,
  DAY_LOG_CACHE_LIFECYCLE_STORE,
  DAY_LOG_CACHE_SNAPSHOT_STORE,
} from "../../web-frontend/src/verticals/day-log-cache/indexed-db-day-log-cache.ts";

type StoredSnapshot = {
  accountId: string;
  generation: number;
  persistedClient: {
    buster: string;
    timestamp: number;
    clientState: {
      mutations: unknown[];
      queries: Array<{
        queryHash: string;
        queryKey: unknown[];
        state: { data: unknown; dataUpdatedAt: number; [key: string]: unknown };
        [key: string]: unknown;
      }>;
    };
  };
};

async function startLocalTestSession(page: Page): Promise<void> {
  await page.goto("signup-login");
  await page.getByRole("button", { name: "Start local test session" }).click();
  await expect(page.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();
}

async function getConfirmedAccountId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const queryClient = window.__TANSTACK_QUERY_CLIENT__;
    const session = queryClient.getQueryData(["authenticatedSession"]) as { user: { id: string } };
    return session.user.id;
  });
}

async function readStoreValue<T>(page: Page, storeName: string, key: string): Promise<T | undefined> {
  return page.evaluate(
    ({ databaseName, key, storeName }) =>
      new Promise<T | undefined>((resolve, reject) => {
        const open = indexedDB.open(databaseName);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const request = database.transaction(storeName, "readonly").objectStore(storeName).get(key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            database.close();
            resolve(request.result as T | undefined);
          };
        };
      }),
    { databaseName: DAY_LOG_CACHE_DATABASE_NAME, key, storeName },
  );
}

async function writeSnapshot(page: Page, accountId: string, update: (value: StoredSnapshot) => void) {
  const snapshot = await readStoreValue<StoredSnapshot>(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId);
  expect(snapshot).toBeTruthy();
  update(snapshot!);
  await page.evaluate(
    ({ accountId, databaseName, snapshot, storeName }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(databaseName);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction(storeName, "readwrite");
          transaction.objectStore(storeName).put(snapshot, accountId);
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
    {
      accountId,
      databaseName: DAY_LOG_CACHE_DATABASE_NAME,
      snapshot,
      storeName: DAY_LOG_CACHE_SNAPSHOT_STORE,
    },
  );
}

async function waitForSnapshot(page: Page, accountId: string): Promise<StoredSnapshot> {
  await expect
    .poll(() => readStoreValue<StoredSnapshot>(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId))
    .toBeTruthy();
  return (await readStoreValue<StoredSnapshot>(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId))!;
}

async function createCorruptDayLogCacheDatabase(page: Page): Promise<void> {
  await page.evaluate(
    ({ databaseName, snapshotStore }) =>
      new Promise<void>((resolve, reject) => {
        const deletion = indexedDB.deleteDatabase(databaseName);
        deletion.onerror = () => reject(deletion.error ?? new Error("IndexedDB delete failed"));
        deletion.onblocked = () => reject(new Error("IndexedDB delete was blocked"));
        deletion.onsuccess = () => {
          const open = indexedDB.open(databaseName, 1);
          open.onerror = () => reject(open.error ?? new Error("IndexedDB open failed"));
          open.onupgradeneeded = () => {
            open.result.createObjectStore(snapshotStore);
          };
          open.onsuccess = () => {
            open.result.close();
            resolve();
          };
        };
      }),
    { databaseName: DAY_LOG_CACHE_DATABASE_NAME, snapshotStore: DAY_LOG_CACHE_SNAPSHOT_STORE },
  );
}

async function writeLifecycleGeneration(page: Page, accountId: string, generation: number): Promise<void> {
  await page.evaluate(
    ({ accountId, databaseName, generation, lifecycleStore }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(databaseName);
        open.onerror = () => reject(open.error ?? new Error("IndexedDB open failed"));
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction(lifecycleStore, "readwrite");
          transaction.objectStore(lifecycleStore).put(generation, accountId);
          transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
    {
      accountId,
      databaseName: DAY_LOG_CACHE_DATABASE_NAME,
      generation,
      lifecycleStore: DAY_LOG_CACHE_LIFECYCLE_STORE,
    },
  );
}

async function deleteLifecycleGeneration(page: Page, accountId: string): Promise<void> {
  await page.evaluate(
    ({ accountId, databaseName, lifecycleStore }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(databaseName);
        open.onerror = () => reject(open.error ?? new Error("IndexedDB open failed"));
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction(lifecycleStore, "readwrite");
          transaction.objectStore(lifecycleStore).delete(accountId);
          transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
    { accountId, databaseName: DAY_LOG_CACHE_DATABASE_NAME, lifecycleStore: DAY_LOG_CACHE_LIFECYCLE_STORE },
  );
}

async function prepareRevokedStalePage(
  context: BrowserContext,
  page: Page,
): Promise<{ accountId: string; stalePage: Page }> {
  await context.addInitScript(() => {
    class NoDeliveryBroadcastChannel {
      addEventListener() {}
      close() {}
      postMessage() {}
      removeEventListener() {}
    }
    Object.defineProperty(window, "BroadcastChannel", { value: NoDeliveryBroadcastChannel });
  });
  await startLocalTestSession(page);
  const accountId = await getConfirmedAccountId(page);
  await waitForSnapshot(page, accountId);
  const stalePage = await context.newPage();
  await stalePage.goto("");
  await expect(stalePage.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/signup-login/);

  return { accountId, stalePage };
}

async function setValidStaleSlot(page: Page, accountId: string, marker: string): Promise<void> {
  await page.evaluate(
    ({ accountId, marker }) => {
      const queryClient = window.__TANSTACK_QUERY_CLIENT__;
      const slotQuery = queryClient
        .getQueryCache()
        .getAll()
        .find(
          ({ queryKey }) => {
            if (queryKey[0] !== "dayLogs" || queryKey[1] !== accountId || queryKey[2] !== "slot") {
              return false;
            }
            const data = queryClient.getQueryData(queryKey) as { breakfast?: unknown[] } | null | undefined;
            return data !== null && data?.breakfast !== undefined;
          },
        );
      if (!slotQuery) throw new Error("Expected a restored Day Log slot");

      const current = queryClient.getQueryData(slotQuery.queryKey) as
        | {
            breakfast?: Array<Record<string, unknown>>;
            [key: string]: unknown;
          }
        | null
        | undefined;
      const breakfastEntry = current?.breakfast?.[0];
      if (!current || !breakfastEntry) {
        throw new Error("Expected a present restored Day Log slot");
      }

      queryClient.setQueryData(slotQuery.queryKey, {
        ...current,
        breakfast: [
          { ...breakfastEntry, calories: 987654, name: marker },
          ...current.breakfast!.slice(1),
        ],
      });
    },
    { accountId, marker },
  );
}

async function setStalePrivateQuery(page: Page, accountId: string, marker: string): Promise<void> {
  await page.evaluate(
    ({ accountId, marker }) => {
      const queryClient = window.__TANSTACK_QUERY_CLIENT__;
      const slotQuery = queryClient
        .getQueryCache()
        .getAll()
        .find(
          ({ queryKey }) => queryKey[0] === "dayLogs" && queryKey[1] === accountId && queryKey[2] === "slot",
        );
      if (!slotQuery) throw new Error("Expected a restored Day Log slot");
      queryClient.setQueryData(slotQuery.queryKey, { revivedByStaleTab: marker });
    },
    { accountId, marker },
  );
}

async function dispatchVisibilityResume(page: Page): Promise<void> {
  await page.evaluate(() => {
    let state: DocumentVisibilityState = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    state = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

function persistedBreakfastNames(snapshot: StoredSnapshot): string[] {
  return snapshot.persistedClient.clientState.queries.flatMap(({ queryKey, state }) => {
    if (queryKey[0] !== "dayLogs" || queryKey[2] !== "slot") return [];
    const data = state.data as { breakfast?: Array<{ name?: string }> } | null | undefined;
    return data?.breakfast?.flatMap(({ name }) => (name ? [name] : [])) ?? [];
  });
}

function setDistinctiveTodaySlot(snapshot: StoredSnapshot, calories: number): string {
  const slotQueries = snapshot.persistedClient.clientState.queries.filter(
    ({ queryKey }) => queryKey[0] === "dayLogs" && queryKey[2] === "slot",
  );
  const query = slotQueries
    .sort((left, right) => String(left.queryKey[3]).localeCompare(String(right.queryKey[3])))
    .at(-1)!;
  const date = String(query.queryKey[3]);
  query.state.dataUpdatedAt = Date.now();
  query.state.data = {
    id: "3299278b-12d8-477f-b146-b626c2061f36",
    date,
    breakfast: [
      {
        id: "c5500bb3-1f5e-4544-a6d6-6998435f4693",
        meal: "BREAKFAST",
        name: `Cached ${calories}`,
        brand: null,
        calories,
        totalFatGrams: 1,
        saturatedFatGrams: null,
        cholesterolMg: null,
        sodiumMg: null,
        totalCarbohydrateGrams: 1,
        fiberGrams: null,
        sugarGrams: null,
        proteinGrams: 1,
        chosenQuantity: 1,
        chosenUnit: "serving",
        quantityServing: 1,
        servingLabel: "serving",
        quantityMass: null,
        massUnit: null,
        quantityVolume: null,
        volumeUnit: null,
      },
    ],
    lunch: [],
    dinner: [],
    snacks: [],
    weight: null,
  };
  return date;
}

test("opens private storage only after session confirmation and falls back when IndexedDB is denied", async ({
  browser,
  page,
}) => {
  await page.addInitScript(() => {
    const originalOpen = indexedDB.open.bind(indexedDB);
    let openCount = 0;
    Object.defineProperty(window, "__dayLogCacheOpenCount", { get: () => openCount });
    indexedDB.open = ((...args: Parameters<IDBFactory["open"]>) => {
      openCount += 1;
      return originalOpen(...args);
    }) as IDBFactory["open"];
  });
  await page.goto("signup-login");

  let heldSessionRequest: Route | undefined;
  await page.route("**/api/v1/auth/session", async (route) => {
    if (route.request().method() === "GET") {
      heldSessionRequest = route;
      return;
    }
    await route.continue();
  });
  const startSession = page.getByRole("button", { name: "Start local test session" }).click();
  await expect.poll(() => Boolean(heldSessionRequest)).toBe(true);
  expect(
    await page.evaluate(
      () => (window as unknown as { __dayLogCacheOpenCount: number }).__dayLogCacheOpenCount,
    ),
  ).toBe(0);
  await heldSessionRequest!.continue();
  await startSession;
  await expect(page.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __dayLogCacheOpenCount: number }).__dayLogCacheOpenCount,
    ),
  ).toBeGreaterThan(0);

  const deniedContext = await browser.newContext();
  await deniedContext.addInitScript(() => {
    indexedDB.open = (() => {
      throw new DOMException("denied", "SecurityError");
    }) as IDBFactory["open"];
  });
  const deniedPage = await deniedContext.newPage();
  await startLocalTestSession(deniedPage);
  await expect(deniedPage.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
  await deniedContext.close();
});

test("falls back to online queries when IndexedDB storage is corrupt", async ({ page }) => {
  await page.goto("signup-login");
  await createCorruptDayLogCacheDatabase(page);

  const dayLogResponse = page.waitForResponse("**/api/v1/daylogs?**");
  await page.getByRole("button", { name: "Start local test session" }).click();

  expect((await dayLogResponse).ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();
});

test("falls back to online queries when an existing snapshot has no lifecycle fence", async ({ page }) => {
  await startLocalTestSession(page);
  const accountId = await getConfirmedAccountId(page);
  await waitForSnapshot(page, accountId);
  await writeSnapshot(page, accountId, (snapshot) => {
    setDistinctiveTodaySlot(snapshot, 777);
  });
  await deleteLifecycleGeneration(page, accountId);

  await page.route("**/api/v1/daylogs?**", (route) => route.abort());
  await page.reload();

  await expect(page.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Calories" })).not.toContainText("777");
});

test("skips malformed persisted clients and replaces them after an online fetch", async ({ page }) => {
  await startLocalTestSession(page);
  const accountId = await getConfirmedAccountId(page);
  await waitForSnapshot(page, accountId);
  await writeSnapshot(page, accountId, (snapshot) => {
    setDistinctiveTodaySlot(snapshot, 987654);
    snapshot.persistedClient.clientState.mutations = "corrupt" as unknown as unknown[];
  });

  const dayLogResponse = page.waitForResponse("**/api/v1/daylogs?**");
  await page.reload();

  expect((await dayLogResponse).ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Calories" })).not.toContainText("987654");
  await expect
    .poll(async () => {
      const snapshot = await readStoreValue<StoredSnapshot>(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId);
      return Array.isArray(snapshot?.persistedClient.clientState.mutations);
    })
    .toBe(true);
});

test("purges a stale tab when pageshow detects a missed revocation", async ({ context, page }) => {
  const { accountId, stalePage } = await prepareRevokedStalePage(context, page);
  await setStalePrivateQuery(stalePage, accountId, "pageshow stale cache");
  await stalePage.evaluate(() => window.dispatchEvent(new Event("pageshow")));

  await expect(stalePage).toHaveURL(/signup-login/);
  expect(await readStoreValue(stalePage, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId)).toBeUndefined();
  expect(
    await stalePage.evaluate(() =>
      window.__TANSTACK_QUERY_CLIENT__
        .getQueryCache()
        .getAll()
        .filter(({ queryKey }) => queryKey[0] === "dayLogs")
        .map(({ queryKey }) => queryKey),
    ),
  ).toEqual([]);
});

test("purges a stale tab when visibility returns to visible after a missed revocation", async ({
  context,
  page,
}) => {
  const { accountId, stalePage } = await prepareRevokedStalePage(context, page);
  await setStalePrivateQuery(stalePage, accountId, "visibility stale cache");
  await dispatchVisibilityResume(stalePage);

  await expect(stalePage).toHaveURL(/signup-login/);
  expect(await readStoreValue(stalePage, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId)).toBeUndefined();
  expect(
    await stalePage.evaluate(() =>
      window.__TANSTACK_QUERY_CLIENT__
        .getQueryCache()
        .getAll()
        .filter(({ queryKey }) => queryKey[0] === "dayLogs")
        .map(({ queryKey }) => queryKey),
    ),
  ).toEqual([]);
});

test("rejects stale restore and persistence after a durable generation mismatch", async ({ context, page }) => {
  await context.addInitScript(
    ({ lifecycleStore, snapshotStore }) => {
      const originalTransaction = IDBDatabase.prototype.transaction;
      let completedWriteCount = 0;
      Object.defineProperty(window, "__dayLogCacheWriteCompletionCount", {
        get: () => completedWriteCount,
      });
      Object.defineProperty(window, "__resetDayLogCacheWriteCompletionCount", {
        value: () => {
          completedWriteCount = 0;
        },
      });
      IDBDatabase.prototype.transaction = function (
        storeNames: string | string[] | DOMStringList,
        mode?: IDBTransactionMode,
        options?: IDBTransactionOptions,
      ) {
        const transaction = originalTransaction.call(this, storeNames, mode, options);
        const names = typeof storeNames === "string" ? [storeNames] : Array.from(storeNames);
        if (mode === "readwrite" && names.includes(lifecycleStore) && names.includes(snapshotStore)) {
          transaction.addEventListener(
            "complete",
            () => {
              completedWriteCount += 1;
            },
            { once: true },
          );
        }
        return transaction;
      } as IDBDatabase["transaction"];
    },
    { lifecycleStore: DAY_LOG_CACHE_LIFECYCLE_STORE, snapshotStore: DAY_LOG_CACHE_SNAPSHOT_STORE },
  );
  await startLocalTestSession(page);
  const accountId = await getConfirmedAccountId(page);
  await waitForSnapshot(page, accountId);
  const generation = await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, accountId);

  await writeSnapshot(page, accountId, (snapshot) => {
    setDistinctiveTodaySlot(snapshot, 888);
  });
  const persistedBeforeFence = await readStoreValue<StoredSnapshot>(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId);
  expect(persistedBeforeFence?.generation).toBe(generation);

  await context.route("**/api/v1/daylogs?**", (route) => route.abort());
  const stalePage = await context.newPage();
  await stalePage.goto("");
  await expect(stalePage.getByRole("region", { name: "Calories" })).toContainText("888");

  const staleWriteMarker = "durably fenced stale write";
  await writeLifecycleGeneration(page, accountId, (generation ?? 0) + 1);
  expect(await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, accountId)).toBe(
    (generation ?? 0) + 1,
  );
  await stalePage.evaluate(() => {
    (
      window as unknown as { __resetDayLogCacheWriteCompletionCount: () => void }
    ).__resetDayLogCacheWriteCompletionCount();
  });
  await setValidStaleSlot(stalePage, accountId, staleWriteMarker);
  await expect
    .poll(() =>
      stalePage.evaluate(
        () =>
          (window as unknown as { __dayLogCacheWriteCompletionCount: number })
            .__dayLogCacheWriteCompletionCount,
      ),
    )
    .toBeGreaterThan(0);

  const persistedAfterFence = await readStoreValue<StoredSnapshot>(
    stalePage,
    DAY_LOG_CACHE_SNAPSHOT_STORE,
    accountId,
  );
  expect(persistedAfterFence).toBeTruthy();
  expect(persistedAfterFence?.generation).toBe(generation);
  expect(persistedBreakfastNames(persistedAfterFence!)).not.toContain(staleWriteMarker);

  await stalePage.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(stalePage).toHaveURL(/signup-login/);
  expect(
    await stalePage.evaluate(() =>
      window.__TANSTACK_QUERY_CLIENT__
        .getQueryCache()
        .getAll()
        .filter(({ queryKey }) => queryKey[0] === "dayLogs")
        .map(({ queryKey }) => queryKey),
    ),
  ).toEqual([]);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.__TANSTACK_QUERY_CLIENT__
        .getQueryCache()
        .getAll()
        .filter(
          ({ queryKey, state }) =>
            queryKey[0] === "dayLogs" && queryKey[2] === "slot" && state.data !== undefined,
        )
        .map(({ queryKey }) => queryKey),
    ),
  ).toEqual([]);
});

test("restores only the confirmed account's allow-listed slots before background validation", async ({
  page,
}) => {
  await startLocalTestSession(page);
  const accountId = await getConfirmedAccountId(page);
  await waitForSnapshot(page, accountId);

  await writeSnapshot(page, accountId, (snapshot) => {
    setDistinctiveTodaySlot(snapshot, 777);
    const template = structuredClone(snapshot.persistedClient.clientState.queries[0]);
    snapshot.persistedClient.clientState.queries.push(
      {
        ...template,
        queryHash: hashKey(["unrelatedPrivateQuery"]),
        queryKey: ["unrelatedPrivateQuery"],
        state: { ...template.state, data: { secret: "must-not-hydrate" } },
      },
      {
        ...template,
        queryHash: hashKey(["authenticatedSession", "persisted-marker"]),
        queryKey: ["authenticatedSession", "persisted-marker"],
        state: { ...template.state, data: { accessToken: "must-not-hydrate" } },
      },
    );
    snapshot.persistedClient.clientState.mutations = [{ secret: "must-not-hydrate" }];
  });

  const otherAccountId = "95434f9a-da1f-47dd-8175-a26ff42ee11e";
  const ownSnapshot = await readStoreValue<StoredSnapshot>(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId);
  await page.evaluate(
    ({ databaseName, otherAccountId, snapshot, stores }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(databaseName);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction(stores, "readwrite");
          const other = structuredClone(snapshot!);
          other.accountId = otherAccountId;
          other.generation = 0;
          other.persistedClient.clientState.queries.forEach(
            (query: StoredSnapshot["persistedClient"]["clientState"]["queries"][number]) => {
              if (query.queryKey[0] === "dayLogs") query.queryKey[1] = otherAccountId;
            },
          );
          const lifecycle = transaction.objectStore(stores[0]);
          lifecycle.put(0, otherAccountId);
          transaction.objectStore(stores[1]).put(other, otherAccountId);
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
    {
      databaseName: DAY_LOG_CACHE_DATABASE_NAME,
      otherAccountId,
      snapshot: ownSnapshot,
      stores: [DAY_LOG_CACHE_LIFECYCLE_STORE, DAY_LOG_CACHE_SNAPSHOT_STORE],
    },
  );

  await page.route("**/api/v1/daylogs?**", () => new Promise(() => undefined));
  await page.reload();

  await expect(page.getByRole("region", { name: "Calories" })).toContainText("777");
  const restoredState = await page.evaluate(() => {
    const queryClient = window.__TANSTACK_QUERY_CLIENT__;
    return {
      session: queryClient.getQueryData(["authenticatedSession"]),
      authMarker: queryClient.getQueryData(["authenticatedSession", "persisted-marker"]),
      unrelated: queryClient.getQueryData(["unrelatedPrivateQuery"]),
      mutationCount: queryClient.getMutationCache().getAll().length,
      keys: queryClient
        .getQueryCache()
        .getAll()
        .map(({ queryKey }) => queryKey),
    };
  });
  expect(restoredState.session).not.toHaveProperty("accessToken");
  expect(restoredState.authMarker).toBeUndefined();
  expect(restoredState.unrelated).toBeUndefined();
  expect(restoredState.mutationCount).toBe(0);
  expect(restoredState.keys).not.toContainEqual([
    "dayLogs",
    otherAccountId,
    expect.anything(),
    expect.anything(),
  ]);
  expect(await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, otherAccountId)).toBe(1);
  expect(await readStoreValue(page, DAY_LOG_CACHE_SNAPSHOT_STORE, otherAccountId)).toBeUndefined();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/signup-login/);
  expect(await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, accountId)).toBe(1);
  expect(await readStoreValue(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId)).toBeUndefined();
  expect(await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, otherAccountId)).toBe(1);
  expect(await readStoreValue(page, DAY_LOG_CACHE_SNAPSHOT_STORE, otherAccountId)).toBeUndefined();
});

test("revokes durable and in-memory state only after successful server logout", async ({ page }) => {
  await startLocalTestSession(page);
  const accountId = await getConfirmedAccountId(page);
  await waitForSnapshot(page, accountId);
  const generation = await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, accountId);

  await page.route("**/api/v1/auth/session", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 500, body: "failed" });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to log out");
  expect(await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, accountId)).toBe(generation);
  expect(await readStoreValue(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId)).toBeTruthy();

  await page.unroute("**/api/v1/auth/session");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/signup-login/);
  expect(await readStoreValue<number>(page, DAY_LOG_CACHE_LIFECYCLE_STORE, accountId)).toBe(
    (generation ?? 0) + 1,
  );
  expect(await readStoreValue(page, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId)).toBeUndefined();
});

test("a stale tab that misses broadcast cannot re-persist after revocation and purges on focus", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    class NoDeliveryBroadcastChannel {
      addEventListener() {}
      close() {}
      postMessage() {}
      removeEventListener() {}
    }
    Object.defineProperty(window, "BroadcastChannel", { value: NoDeliveryBroadcastChannel });
  });
  await startLocalTestSession(page);
  const accountId = await getConfirmedAccountId(page);
  await waitForSnapshot(page, accountId);
  const stalePage = await context.newPage();
  await stalePage.goto("");
  await expect(stalePage.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/signup-login/);

  await stalePage.evaluate(
    ({ accountId }) => {
      const queryClient = window.__TANSTACK_QUERY_CLIENT__;
      const slotQuery = queryClient
        .getQueryCache()
        .getAll()
        .find(
          ({ queryKey }) => queryKey[0] === "dayLogs" && queryKey[1] === accountId && queryKey[2] === "slot",
        );
      if (slotQuery) queryClient.setQueryData(slotQuery.queryKey, { revivedByStaleTab: true });
    },
    { accountId },
  );
  await stalePage.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(stalePage).toHaveURL(/signup-login/);
  expect(await readStoreValue(stalePage, DAY_LOG_CACHE_SNAPSHOT_STORE, accountId)).toBeUndefined();
  const privateKeys = await stalePage.evaluate(() =>
    window.__TANSTACK_QUERY_CLIENT__
      .getQueryCache()
      .getAll()
      .filter(({ queryKey }) => queryKey[0] === "dayLogs")
      .map(({ queryKey }) => queryKey),
  );
  expect(privateKeys).toEqual([]);
});
