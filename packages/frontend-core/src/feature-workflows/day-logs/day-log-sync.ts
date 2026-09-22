import type { DayLog, DayLogSnapshot, DayLogSyncSlot } from "../../verticals/day-logs/models/day-log.js";

export const DAY_LOG_VALIDATION_FRESHNESS_MS = 60 * 60 * 1_000;

export type DayLogDateRange = { startDate: string; endDate: string };
export type DayLogSlotState = DayLogSnapshot & { dataUpdatedAt: number; isError: boolean; isInvalidated: boolean };
export interface DayLogQueryCache {
  getQueryState<T>(queryKey: readonly unknown[]): { data?: T; dataUpdatedAt?: number; isInvalidated?: boolean; status?: string } | undefined;
  getQueryData<T>(queryKey: readonly unknown[]): T | undefined;
  setQueryData<T>(queryKey: readonly unknown[], data: T, options?: { updatedAt?: number }): unknown;
  removeQueries(filters: { queryKey: readonly unknown[] }): unknown;
}

export const dayLogSlotQueryKey = (accountId: string, date: string) => ["dayLogs", accountId, "slot", date] as const;
export const dayLogSlotVersionQueryKey = (accountId: string, date: string) => ["dayLogs", accountId, "slotVersion", date] as const;
export const dayLogSyncQueryKey = (accountId: string, range: DayLogDateRange) => ["dayLogs", accountId, "sync", range.startDate, range.endDate] as const;

export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  while (cursor.toISOString().slice(0, 10) <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function getDayLogSyncManifest(queryClient: DayLogQueryCache, accountId: string, range: DayLogDateRange): Record<string, number | null> {
  const known: Record<string, number | null> = {};
  for (const date of dateRange(range.startDate, range.endDate)) {
    const state = queryClient.getQueryState<DayLog | null>(dayLogSlotQueryKey(accountId, date));
    if (state?.status === "error" || state?.data === undefined) continue;
    if (state.data === null) known[date] = null;
    else {
      const version = queryClient.getQueryData<number>(dayLogSlotVersionQueryKey(accountId, date));
      if (version !== undefined) known[date] = version;
    }
  }
  return known;
}

export function getDayLogsWithStalenessState(queryClient: DayLogQueryCache, accountId: string, range: DayLogDateRange): DayLogSlotState[] {
  return dateRange(range.startDate, range.endDate).map((date) => {
    const state = queryClient.getQueryState<DayLog | null>(dayLogSlotQueryKey(accountId, date));
    return { date, data: state?.data, dataUpdatedAt: state?.dataUpdatedAt ?? 0, isError: state?.status === "error", isInvalidated: state?.isInvalidated ?? false };
  });
}

export function doesDayLogSlotNeedValidation(slot: DayLogSlotState, now: number): boolean {
  return slot.data === undefined || slot.isError || slot.isInvalidated || now - slot.dataUpdatedAt >= DAY_LOG_VALIDATION_FRESHNESS_MS;
}

export function doesDayLogRangeNeedValidation(range: DayLogDateRange, slots: readonly DayLogSlotState[], now: number): boolean {
  const byDate = new Map(slots.map((slot) => [slot.date, slot]));
  return dateRange(range.startDate, range.endDate).some((date) => {
    const slot = byDate.get(date);
    return slot === undefined || doesDayLogSlotNeedValidation(slot, now);
  });
}

export function applyDayLogSyncResult(queryClient: DayLogQueryCache, accountId: string, range: DayLogDateRange, slots: readonly DayLogSyncSlot[] | null, dataUpdatedAt: number): void {
  const returnedByDate = new Map(slots?.map((slot) => [slot.date, slot]));
  for (const date of dateRange(range.startDate, range.endDate)) {
    const returned = returnedByDate.get(date);
    const current = queryClient.getQueryData<DayLog | null>(dayLogSlotQueryKey(accountId, date));
    const next = returned ? returned.snapshot.data : current;
    if (next === undefined) continue;
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, date), next, { updatedAt: dataUpdatedAt });
    if (returned?.snapshot.data === null) queryClient.removeQueries({ queryKey: dayLogSlotVersionQueryKey(accountId, date) });
    else if (returned) queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, date), returned.versionNumber, { updatedAt: dataUpdatedAt });
  }
}
