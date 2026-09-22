import type { DayLog } from "./day-log.js";

export type DayLogSyncSlot = {
  date: string;
  versionNumber: number | null;
  dayLog: DayLog | null;
};

/** `null` means every submitted known slot is still current. */
export type DayLogSyncResult = { slots: DayLogSyncSlot[] } | null;
