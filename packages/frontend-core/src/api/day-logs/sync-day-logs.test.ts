import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { buildDayLog, buildFoodEntry } from "../../shared/models/day-logs/__mocks__/day-log.js";
import { mapDayLogSyncResponse, syncDayLogs } from "./sync-day-logs.js";

const input = {
  startDate: "2026-09-02",
  endDate: "2026-09-03",
  known: { "2026-09-02": null, "2026-09-03": 3 },
};

describe("private Day Log sync endpoint", () => {
  it("posts a validated manifest and accepts bodyless success", async () => {
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(null));
    await expect(syncDayLogs({ request } as unknown as ApiTransport, input)).resolves.toBeNull();
    expect(request).toHaveBeenCalledWith({
      path: "/daylogs:sync",
      method: "POST",
      body: input,
      responseBodySchema: expect.any(Object),
    });
  });

  it("rejects an invalid request before transport and validates the response", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ slots: [{ date: "2026-09-03", versionNumber: 3, dayLog: null }] }),
    );
    expect(() =>
      syncDayLogs({ request } as unknown as ApiTransport, {
        ...input,
        known: { "2026-09-04": null },
      }),
    ).toThrow();
    expect(request).not.toHaveBeenCalled();
    await expect(syncDayLogs({ request } as unknown as ApiTransport, input)).rejects.toThrow();
  });

  it("maps every accepted field into independent frontend data and preserves nullable meals", () => {
    const entry = buildFoodEntry();
    const source = buildDayLog({ lunch: [entry] });
    const mapped = mapDayLogSyncResponse({
      slots: [
        { date: "2026-09-02", versionNumber: null, dayLog: null },
        { date: "2026-09-03", versionNumber: 4, dayLog: source },
      ],
    });
    expect(mapped).toEqual({
      slots: [
        { date: "2026-09-02", versionNumber: null, dayLog: null },
        { date: "2026-09-03", versionNumber: 4, dayLog: source },
      ],
    });
    expect(mapped?.slots[1]?.dayLog).not.toBe(source);
    expect(mapped?.slots[1]?.dayLog && mapped.slots[1].dayLog.lunch?.[0]).not.toBe(entry);
    expect(mapDayLogSyncResponse(null)).toBeNull();
  });
});
