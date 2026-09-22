import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { updateDayLogWeight } from "./update-day-log-weight.js";

describe("updateDayLogWeight", () => {
  it("validates the date, sends only the weight, and accepts the compact result", async () => {
    const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse({ versionNumber: 2 }));

    await expect(
      updateDayLogWeight({ request } as unknown as ApiTransport, "2026-05-18", { weight: 182.45 }),
    ).resolves.toEqual({ versionNumber: 2 });

    expect(request).toHaveBeenCalledWith({
      path: "/daylogs/2026-05-18/weight",
      method: "PUT",
      body: { weight: 182.45 },
      responseBodySchema: expect.any(Object),
    });
  });

  it("strips a legacy client version field before transport", async () => {
    const request = vi.fn(async ({ responseBodySchema }) =>
      responseBodySchema.parse({ versionNumber: 1, createdDayLogId: "day-log-1" }),
    );

    await updateDayLogWeight({ request } as unknown as ApiTransport, "2026-05-18", {
      weight: 182.5,
      versionNumber: 4,
    } as never);

    expect(request.mock.calls[0]?.[0].body).toEqual({ weight: 182.5 });
  });
});
