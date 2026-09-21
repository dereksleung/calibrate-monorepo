import { createApiTransport } from "@calibrate/frontend-core/transport";

/** Base URL for REST calls; uses the runtime `fetch` (so tests can `vi.spyOn(globalThis, "fetch")`). */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const apiTransport = createApiTransport({
  baseUrl: apiBaseUrl,
  getHeaders: () => ({
    Origin: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  }),
});
