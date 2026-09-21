import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../transport.js";

import { syncDayLogs } from "./sync-day-logs.js";

const input = {
  startDate: "2026-08-06",
  endDate: "2026-08-12",
  known: { "2026-08-06": null, "2026-08-07": 3 },
};

describe("syncDayLogs", () => {
  it("posts the bounded date manifest and accepts an unchanged response", async () => {
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(null));

    await expect(syncDayLogs({ request } as unknown as ApiTransport, input)).resolves.toBeNull();

    expect(request).toHaveBeenCalledWith({
      path: "/daylogs:sync",
      method: "POST",
      body: input,
      responseBodySchema: expect.any(Object),
    });
  });

  it("rejects an invalid manifest before making a request", () => {
    const request = vi.fn();

    expect(() =>
      syncDayLogs({ request } as unknown as ApiTransport, {
        ...input,
        known: { "2026-08-13": null },
      }),
    ).toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
