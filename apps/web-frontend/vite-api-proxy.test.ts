import { describe, expect, it } from "vitest";

import { createViteApiProxy, resolveViteApiProxyTarget } from "./vite-api-proxy.ts";

describe("vite API proxy", () => {
  it("defaults the proxy target to the primary local backend", () => {
    expect(resolveViteApiProxyTarget({})).toBe("http://localhost:3001");
  });

  it("uses API_PROXY_TARGET when it is a non-empty origin", () => {
    expect(resolveViteApiProxyTarget({ API_PROXY_TARGET: " http://localhost:3011 " })).toBe(
      "http://localhost:3011",
    );
  });

  it("proxies /api to the resolved backend origin without rewriting paths", () => {
    expect(createViteApiProxy("http://localhost:3011")).toEqual({
      "/api": {
        target: "http://localhost:3011",
        changeOrigin: true,
      },
    });
  });
});
