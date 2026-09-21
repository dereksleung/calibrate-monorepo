import { useIsRestoring, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { clearAuthenticatedSession, getAuthenticatedSession } from "../auth/authenticated-session.ts";
import {
  DAY_LOG_CACHE_BUSTER,
  DAY_LOG_CACHE_RETENTION_MS,
  dayLogSlotQueryKeyPrefix,
  dayLogSlotVersionQueryKeyPrefix,
  isPersistableDayLogQueryData,
} from "./day-log-cache.ts";
import {
  DAY_LOG_CACHE_BROADCAST_CHANNEL,
  acquireDayLogCacheAccess,
  type DayLogCacheAccess,
  type DayLogCacheRevocation,
} from "./indexed-db-day-log-cache.ts";

const LIFECYCLE_CHECK_INTERVAL_MS = 15_000;

export async function clearPrivateDayLogMemory(queryClient: QueryClient, accountId?: string): Promise<void> {
  const queryKey = accountId ? ["dayLogs", accountId] : ["dayLogs"];
  await queryClient.cancelQueries({ queryKey });
  queryClient.removeQueries({ queryKey });
}

function isRevocation(value: unknown): value is DayLogCacheRevocation & { type: "revoked" } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DayLogCacheRevocation & { type: "revoked" }>;
  return (
    candidate.type === "revoked" &&
    typeof candidate.accountId === "string" &&
    typeof candidate.generation === "number" &&
    Number.isSafeInteger(candidate.generation) &&
    candidate.generation >= 0
  );
}

/**
 * Waits until the cache is finished restoring from IndexedDB before rendering children.
 * Checks the fence one last time after finishing restoring, and before rendering private
 * UI, to see if it should revoke cache access. 
 * 
 * After that, privacy is protected by the CacheAccessLifecycleGate detecting revocation
 * while the app is running and every 15 seconds while visible, and the fenced IndexedDB
 * persistence adapter independently preventing stale access from restoring, writing or
 * deleting a private cache snapshot.
 */
function HydratedCacheAccessGate({
  children,
  cacheAccess,
  onFenceFailure,
}: {
  children: React.ReactNode;
  cacheAccess: DayLogCacheAccess;
  onFenceFailure: () => Promise<void>;
}) {
  const isRestoring = useIsRestoring();
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (isRestoring) return;
    let active = true;
    setIsCurrent(false);
    void cacheAccess
      .isCurrent()
      .catch(() => false)
      .then((current) => {
        if (!active) return;
        if (!current) {
          void onFenceFailure();
          return;
        }
        setIsCurrent(true);
      });
    return () => {
      active = false;
    };
  }, [isRestoring, cacheAccess, onFenceFailure]);

  if (!isCurrent) return null;
  return <>{children}</>;
}

/**
 * Sets up page lifecycle moments that can check the fence and revoke cache access. 
 * The current moments are on page show, page focus, page visibility change to visible
 * and every 15 seconds, and BroadcastChannel listeners.  
 * 
 * Gates restoring the Tanstack cache by gating rendering TanStack's PersistQueryClientProvider.
 */
function CacheAccessLifecycleGate({
  accountId,
  children,
  cacheAccess,
}: {
  accountId: string;
  children: React.ReactNode;
  cacheAccess: DayLogCacheAccess;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [revoked, setRevoked] = useState(false);
  const [cacheAccessReady, setCacheAccessReady] = useState(false);
  const activeRef = useRef(false);
  const hydrationStartedRef = useRef(false);
  const revocationStartedRef = useRef(false);
  const stopLifecycleChecksRef = useRef<(() => void) | undefined>(undefined);
  const [restoreCompletion] = useState(() => {
    let complete!: () => void;
    const promise = new Promise<void>((resolve) => {
      complete = resolve;
    });
    return { complete, promise };
  });
  const ownsActiveAccount = useCallback(
    () => activeRef.current && getAuthenticatedSession(queryClient)?.user.id === accountId,
    [accountId, queryClient],
  );
  const purgeRevokedSession = useCallback(async () => {
    if (revocationStartedRef.current || !ownsActiveAccount()) return;
    revocationStartedRef.current = true;
    const stopLifecycleChecks = stopLifecycleChecksRef.current;
    stopLifecycleChecksRef.current = undefined;
    stopLifecycleChecks?.();
    setRevoked(true);
    if (hydrationStartedRef.current) await restoreCompletion.promise;
    if (!ownsActiveAccount()) return;
    await clearPrivateDayLogMemory(queryClient, accountId);
    if (!ownsActiveAccount()) return;
    clearAuthenticatedSession(queryClient);
    if (activeRef.current) await navigate({ to: "/signup-login" });
  }, [accountId, navigate, ownsActiveAccount, queryClient, restoreCompletion]);

  useEffect(() => {
    activeRef.current = true;

    const checkFence = async () => {
      if (!(await cacheAccess.isCurrent().catch(() => false))) await purgeRevokedSession();
    };

    const startLifecycleChecks = () => {
      const onPageShow = () => void checkFence();
      const onFocus = () => void checkFence();
      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") void checkFence();
      };
      window.addEventListener("pageshow", onPageShow);
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibilityChange);

      const interval = window.setInterval(() => {
        if (document.visibilityState === "visible") void checkFence();
      }, LIFECYCLE_CHECK_INTERVAL_MS);

      let channel: BroadcastChannel | undefined;
      if (typeof BroadcastChannel !== "undefined") {
        try {
          channel = new BroadcastChannel(DAY_LOG_CACHE_BROADCAST_CHANNEL);
          channel.addEventListener("message", (event) => {
            if (
              isRevocation(event.data) &&
              event.data.accountId === accountId &&
              event.data.generation > cacheAccess.generation
            ) {
              void purgeRevokedSession();
            }
          });
        } catch {
          channel = undefined;
        }
      }

      stopLifecycleChecksRef.current = () => {
        window.clearInterval(interval);
        window.removeEventListener("pageshow", onPageShow);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        channel?.close();
      };
    };

    startLifecycleChecks();
    void cacheAccess
      .isCurrent()
      .catch(() => false)
      .then(async (current) => {
        if (!activeRef.current || revocationStartedRef.current) return;
        if (!current) {
          await purgeRevokedSession();
          return;
        }
        hydrationStartedRef.current = true;
        setCacheAccessReady(true);
      });

    return () => {
      activeRef.current = false;
      const stopLifecycleChecks = stopLifecycleChecksRef.current;
      stopLifecycleChecksRef.current = undefined;
      stopLifecycleChecks?.();
    };
  }, [accountId, cacheAccess, purgeRevokedSession]);

  if (revoked || !cacheAccessReady) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      onError={restoreCompletion.complete}
      onSuccess={restoreCompletion.complete}
      persistOptions={{
        buster: DAY_LOG_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
          shouldDehydrateQuery: (query) =>
            isPersistableDayLogQueryData(query.queryKey, query.state.data, accountId),
        },
        maxAge: DAY_LOG_CACHE_RETENTION_MS,
        persister: cacheAccess,
      }}
    >
      <HydratedCacheAccessGate cacheAccess={cacheAccess} onFenceFailure={purgeRevokedSession}>
        {children}
      </HydratedCacheAccessGate>
    </PersistQueryClientProvider>
  );
}

/**
 * Acquires a generation-fenced IndexedDB cache adapter for this account.
 * It initializes missing lifecycle state and normalizes the legacy
 * confirmed-account marker when necessary. The adapter is used by TanStack
 * Query to restore, persist, and remove this account's fenced cache snapshot.
 */
export function PrivateDayLogCacheProvider({
  accountId,
  children,
}: {
  accountId: string;
  children: React.ReactNode;
}) {
  const [cacheAccess, setCacheAccess] = useState<DayLogCacheAccess>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setCacheAccess(undefined);
    void acquireDayLogCacheAccess(accountId).then(async (acquiredCacheAccess) => {
      // From closures, the useEffect cleanup function will set active to false if 
      // something triggers the effect again, like the accountId changing.
      // This makes the effect ignore an acquisition that resolves after
      // an account change or unmount.
      if (!active) return;
      const isCurrent = await acquiredCacheAccess.isCurrent().catch(() => false);
      if (!active) return;
      if (!isCurrent) {
        await clearPrivateDayLogMemory(queryClient);
        clearAuthenticatedSession(queryClient);
        if (active) await navigate({ to: "/signup-login" });
        return;
      }
      // Native timers cannot represent the 30-day retention window reliably;
      // explicit pruning owns retention for this narrowly scoped query family.
      queryClient.setQueryDefaults(dayLogSlotQueryKeyPrefix(accountId), { gcTime: Infinity });
      queryClient.setQueryDefaults(dayLogSlotVersionQueryKeyPrefix(accountId), { gcTime: Infinity });
      setCacheAccess(acquiredCacheAccess);
    });
    return () => {
      active = false;
    };
  }, [accountId, navigate, queryClient]);

  // Do not mount private descendants before a fenced cache access exists. Mounting them
  // here and again inside the cache-access gate would discard route-local state and
  // briefly expose private query consumers before restoration can be fenced.
  if (!cacheAccess) return null;

  return (
    <CacheAccessLifecycleGate
      key={`${accountId}:${cacheAccess.generation}`}
      accountId={accountId}
      cacheAccess={cacheAccess}
    >
      {children}
    </CacheAccessLifecycleGate>
  );
}
