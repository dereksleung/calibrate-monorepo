import { describe, expect, it } from "vitest";

import { buildDayLog, buildFoodEntry } from "./__mocks__/day-log.js";
import { DayLogSchema, type DayLogSnapshot } from "./day-log.js";

describe("Day Log frontend model", () => {
  it("keeps nullable meals and distinguishes Known-empty from unloaded snapshots", () => {
    const dayLog = buildDayLog({ lunch: [buildFoodEntry()] });
    const snapshots: DayLogSnapshot[] = [
      { date: dayLog.date, data: dayLog },
      { date: "2026-09-04", data: null },
      { date: "2026-09-05", data: undefined },
    ];
    expect(DayLogSchema.parse(dayLog).breakfast).toBeNull();
    expect(snapshots[0]?.data).toEqual(dayLog);
    expect(snapshots[1]?.data).toBeNull();
    expect(snapshots[2]?.data).toBeUndefined();
  });
});
