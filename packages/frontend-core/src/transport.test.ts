import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createApiTransport } from "./transport.js";

describe("createApiTransport", () => {
  it("uses explicitly configured credentials for requests", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      })
    );
    const transport = createApiTransport({
      baseUrl: "https://api.example.test",
      credentials: "omit",
      fetch,
    });

    await transport.request({
      path: "/health",
      responseBodySchema: z.object({ ok: z.boolean() }),
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/health",
      expect.objectContaining({ credentials: "omit" })
    );
  });

  it("defaults credentials to include", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      })
    );
    const transport = createApiTransport({ baseUrl: "https://api.example.test", fetch });

    await transport.request({
      path: "/health",
      responseBodySchema: z.object({ ok: z.boolean() }),
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/health",
      expect.objectContaining({ credentials: "include" })
    );
  });
});
