import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { buildUpdateDayLogWeightCommand } from "../../verticals/day-logs/models/__mocks__/update-day-log-weight.js";
import { mapUpdateDayLogWeightResponse, updateDayLogWeight } from "./update-day-log-weight.js";

describe("updateDayLogWeight", () => {
  it("validates the date, sends storage-precision weight, and accepts the compact result", async () => {
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse({ versionNumber: 2 }));

    await expect(
      updateDayLogWeight({ request } as unknown as ApiTransport, "2026-05-18", { weight: 182.45 }),
    ).resolves.toEqual({ versionNumber: 2 });

    expect(request).toHaveBeenCalledWith({
      path: "/daylogs/2026-05-18/weight",
      method: "PUT",
      body: { weight: 182.5 },
      responseBodySchema: expect.any(Object),
    });
  });

  it("strips a legacy client version field before transport", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ versionNumber: 1, createdDayLogId: "day-log-1" }),
    );

    await expect(
      updateDayLogWeight({ request } as unknown as ApiTransport, "2026-05-18", {
        weight: 182.5,
        versionNumber: 4,
      } as never),
    ).resolves.toEqual({ versionNumber: 1, createdDayLogId: "day-log-1" });

    expect(request.mock.calls[0]?.[0].body).toEqual({ weight: 182.5 });
  });

  it("rejects invalid input before making a request", () => {
    const request = vi.fn();
    const transport = { request } as unknown as ApiTransport;

    expect(() => updateDayLogWeight(transport, "2026-05-19", { weight: 0 })).toThrow();
    expect(() => updateDayLogWeight(transport, "2026-05-19", { weight: 0.04 })).toThrow();
    expect(() => updateDayLogWeight(transport, "not-a-date", { weight: 180 })).toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a response that is not the compact result", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ versionNumber: 2, weight: 182.5 }),
    );

    await expect(
      updateDayLogWeight({ request } as unknown as ApiTransport, "2026-05-18", { weight: 182.5 }),
    ).rejects.toThrow();
  });

  it("maps the validated acknowledgement and normalized command to frontend data", () => {
    expect(
      mapUpdateDayLogWeightResponse(
        { versionNumber: 1, createdDayLogId: "day-log-1" },
        buildUpdateDayLogWeightCommand({ weight: 182.45 }),
      ),
    ).toEqual({
      updatedWeight: 182.5,
      versionNumber: 1,
      dayLogId: "day-log-1",
    });

    expect(mapUpdateDayLogWeightResponse({ versionNumber: 8 }, buildUpdateDayLogWeightCommand())).toEqual({
      updatedWeight: 182.5,
      versionNumber: 8,
    });
  });
});
