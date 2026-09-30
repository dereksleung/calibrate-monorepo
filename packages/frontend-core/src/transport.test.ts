import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createApiTransport } from "./transport.js";

describe("transport credentials", () => {
  it.each([undefined, "include", "omit", "same-origin"] as const)(
    "passes %s credentials with include as the default",
    async (credentials) => {
      const fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const transport = createApiTransport({ baseUrl: "https://api.example.com", fetch, credentials });
      await transport.request({ path: "/auth/session", method: "DELETE", responseBodySchema: z.null() });
      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/auth/session",
        expect.objectContaining({ credentials: credentials ?? "include" }),
      );
    },
  );
});
