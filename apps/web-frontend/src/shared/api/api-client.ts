import { createApiTransport } from "@calibrate/api-client";

/** Base URL for REST calls; uses the runtime `fetch` (so tests can `vi.spyOn(globalThis, "fetch")`). */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const apiTransport = createApiTransport({
  baseUrl: apiBaseUrl,
  // TO-DO: Replace with real auth token retrieval logic
  // Temp to unblock UI before authentication / login / signup is implemented
  getAccessToken: () => import.meta.env.VITE_TEMP_DEV_ACCESS_TOKEN,
});
