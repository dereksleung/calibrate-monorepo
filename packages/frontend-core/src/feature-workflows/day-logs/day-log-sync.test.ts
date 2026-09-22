import { describe, expect, it } from "vitest";
import { doesDayLogRangeNeedValidation, type DayLogSlotState } from "./day-log-sync.js";

describe("doesDayLogRangeNeedValidation", () => {
  it("requires validation for an unloaded slot", () => {
    const slots: DayLogSlotState[] = [{ date: "2026-05-21", data: undefined, dataUpdatedAt: 0, isError: false, isInvalidated: false }];
    expect(doesDayLogRangeNeedValidation({ startDate: "2026-05-21", endDate: "2026-05-21" }, slots, 1)).toBe(true);
  });
});
