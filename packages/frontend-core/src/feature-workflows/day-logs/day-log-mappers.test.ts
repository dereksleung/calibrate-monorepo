import { describe, expect, it } from "vitest";

import { toDayLogSnapshot } from "./day-log-mappers.js";

describe("toDayLogSnapshot", () => {
  it("maps every day-log field while preserving nullable meals", () => {
    const snapshot = toDayLogSnapshot({
      id: "day-log-1", date: "2026-05-21", breakfast: null, lunch: [], dinner: [], snacks: [], weight: 180.5,
    }, "2026-05-21");

    expect(snapshot).toEqual({
      date: "2026-05-21",
      data: { id: "day-log-1", date: "2026-05-21", breakfast: null, lunch: [], dinner: [], snacks: [], weight: 180.5 },
    });
  });

  it("distinguishes a known-empty slot from an unloaded slot", () => {
    expect(toDayLogSnapshot(null, "2026-05-21")).toEqual({ date: "2026-05-21", data: null });
    expect(toDayLogSnapshot(undefined, "2026-05-21")).toEqual({ date: "2026-05-21", data: undefined });
  });
});
