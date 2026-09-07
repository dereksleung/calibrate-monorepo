import { useIsRestoring, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { clearAuthenticatedSession, getAuthenticatedSession } from "../auth/authenticated-session.ts";
import {
  DAY_LOG_CACHE_BUSTER,
  DAY_LOG_CACHE_RETENTION_MS,
  dayLogSlotQueryKeyPrefix,
  isPersistableDayLogQueryData,
} from "./day-log-cache.ts";
import {
  DAY_LOG_CACHE_BROADCAST_CHANNEL,
  acquireDayLogCacheLease,
  type DayLogCacheLease,
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

function HydratedLeaseBoundary({
  children,
  lease,
  onFenceFailure,
}: {
  children: React.ReactNode;
  lease: DayLogCacheLease;
  onFenceFailure: () => Promise<void>;
}) {
  const isRestoring = useIsRestoring();
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (isRestoring) return;
    let active = true;
    setIsCurrent(false);
    void lease
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
  }, [isRestoring, lease, onFenceFailure]);

  if (!isCurrent) return null;
  return <>{children}</>;
}

function LeasePersistenceBoundary({
  accountId,
  children,
  lease,
}: {
  accountId: string;
  children: React.ReactNode;
  lease: DayLogCacheLease;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [revoked, setRevoked] = useState(false);
  const [leaseReady, setLeaseReady] = useState(false);
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
      if (!(await lease.isCurrent().catch(() => false))) await purgeRevokedSession();
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
              event.data.generation > lease.generation
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
    void lease
      .isCurrent()
      .catch(() => false)
      .then(async (current) => {
        if (!activeRef.current || revocationStartedRef.current) return;
        if (!current) {
          await purgeRevokedSession();
          return;
        }
        hydrationStartedRef.current = true;
        setLeaseReady(true);
      });

    return () => {
      activeRef.current = false;
      const stopLifecycleChecks = stopLifecycleChecksRef.current;
      stopLifecycleChecksRef.current = undefined;
      stopLifecycleChecks?.();
    };
  }, [accountId, lease, purgeRevokedSession]);

  if (revoked || !leaseReady) return null;

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
        persister: lease,
      }}
    >
      <HydratedLeaseBoundary lease={lease} onFenceFailure={purgeRevokedSession}>
        {children}
      </HydratedLeaseBoundary>
    </PersistQueryClientProvider>
  );
}

export function PrivateDayLogCacheProvider({
  accountId,
  children,
}: {
  accountId: string;
  children: React.ReactNode;
}) {
  const [lease, setLease] = useState<DayLogCacheLease>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLease(undefined);
    void acquireDayLogCacheLease(accountId).then(async (acquiredLease) => {
      if (!active) return;
      const isCurrent = await acquiredLease.isCurrent().catch(() => false);
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
      setLease(acquiredLease);
    });
    return () => {
      active = false;
    };
  }, [accountId, navigate, queryClient]);

  // Do not mount private descendants before a fenced lease exists. Mounting them
  // here and again inside the lease boundary would discard route-local state and
  // briefly expose private query consumers before restoration can be fenced.
  if (!lease) return null;

  return (
    <LeasePersistenceBoundary key={`${accountId}:${lease.generation}`} accountId={accountId} lease={lease}>
      {children}
    </LeasePersistenceBoundary>
  );
}
